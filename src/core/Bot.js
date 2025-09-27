// orion/src/core/Bot.js
const makeWASocket = require('@whiskeysockets/baileys').default;
const pkg = require('../../package.json');
const { useMultiFileAuthState, fetchLatestBaileysVersion, makeCacheableSignalKeyStore } = require('@whiskeysockets/baileys');
const NodeCache = require('node-cache');
const pino = require('pino');
const chalk = require('chalk');

const CommandHandler = require('./commandHandler');
const onConnectionUpdate = require('../handlers/onConnectionUpdate');
const onCredsUpdate = require('../handlers/onCredsUpdate');
const onMessage = require('../handlers/onMessage');
const createGroupUpdateHandler = require('../handlers/onGroupUpdate');
const { enhanceSocketWithHelpers } = require('../utils/enhanceSocket');
const logger = require('../utils/logger');
const builtinGroupUpdateHandler = require('../builtin/events/groupUpdate');

const msgRetryCounterCache = new NodeCache();

class Bot {
    constructor(config = {}) {
        this.config = {
            sessionName: process.env.SESSION_NAME || 'session',
            prefix: process.env.PREFIX || '!',
            commandsPath: null,
            getGroupSettings: async (groupId) => null,
            defaultCommandCooldown: 3,
            ...config,
        };
        this.sock = null;
        this.commandHandler = new CommandHandler(
            this.config.commandsPath, 
            logger, 
            this.config.defaultCommandCooldown
        );
        this.logger = logger;
        this.connect = this.connect.bind(this);
    }

    async connect() {
    try {
        const { state, saveCreds } = await useMultiFileAuthState(this.config.sessionName);
        const { version } = await fetchLatestBaileysVersion();

        // Banner ASCII ORION
        console.log(chalk.cyanBright(`
    ______     _______    __      ______    _____  ___   
   /    " \\   /"      \\  |" \\    /    " \\  (\\\"   \\|"  \\  
  // ____  \\ |:        | ||  |  // ____  \\ |.\\\\   \\    | 
 /  /    ) :)|_____/   ) |:  | /  /    ) :)|: \\.   \\\\  | 
(: (____/ //  //      /  |.  |(: (____/ // |.  \\    \\. | 
 \\        /  |:  __   \\  /\\  |\\\\        /  |    \\    \\ | 
  \\\"_____/   |__|  \\___)(__\\_|_)\\\"_____/    \\___|\\____\\) 
        `));

        // Info versi
        console.log(
            chalk.greenBright(`🚀 Orion WhatsApp Framework v${pkg.version}`)
        );

        // Separator
        console.log(chalk.gray('='.repeat(60)));

        this.sock = makeWASocket({
            version,
            logger: pino({ level: 'silent' }),
            auth: {
                creds: state.creds,
                keys: makeCacheableSignalKeyStore(state.keys, this.logger),
            },
            browser: ['Orion Framework', 'Chrome', pkg.version],
            msgRetryCounterCache,
            printQRInTerminal: false,
        });

            
            enhanceSocketWithHelpers(this.sock);

            // --- Urutan Pemuatan yang Benar ---
            this.commandHandler.commands.clear();
            this.commandHandler.aliases.clear();

            // Muat perintah bawaan DULU
            this.commandHandler.loadBuiltinCommands();
            
            // Muat perintah kustom PENGGUNA (bisa menimpa bawaan jika nama sama)
            if (this.config.commandsPath) {
                this.commandHandler.loadCustomCommands();
                this.commandHandler.watchCommands();
            }

            this.logger.info(`Total ${this.commandHandler.commands.size} perintah & ${this.commandHandler.aliases.size} alias berhasil dimuat.`);

            this.registerHandlers(saveCreds);
            
            return this.sock;
        } catch (error) {
            this.logger.error({ err: error }, "Gagal memulai koneksi bot.");
            process.exit(1);
        }
    }

    registerHandlers(saveCreds) {
        const customGroupUpdateHandler = createGroupUpdateHandler(this.config.getGroupSettings);

        this.sock.ev.on('creds.update', onCredsUpdate(saveCreds));
        this.sock.ev.on('connection.update', (update) => onConnectionUpdate(update, this.connect));
        this.sock.ev.on('messages.upsert', (m) => onMessage(this.sock, m, this.commandHandler, this.config.prefix));
        
        this.sock.ev.on('group-participants.update', (update) => {
            builtinGroupUpdateHandler(this.sock, update);
            customGroupUpdateHandler(this.sock, update);
        });
    }
}

module.exports = Bot;