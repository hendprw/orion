// orion/src/core/Bot.js
const makeWASocket = require('@whiskeysockets/baileys').default;
const pkg = require('../../package.json');
const { useMultiFileAuthState, fetchLatestBaileysVersion, makeCacheableSignalKeyStore } = require('@whiskeysockets/baileys');
const NodeCache = require('node-cache');
const pino = require('pino');
const chalk = require('chalk');
const PQueue = require('p-queue').default;

const CommandHandler = require('./commandHandler');
const MiddlewareHandler = require('./middlewareHandler');
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
            middlewaresPath: null, // <-- Opsi baru untuk middleware kustom
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
        // Teruskan path middleware kustom ke handler
        this.middlewareHandler = new MiddlewareHandler(logger, this.config.middlewaresPath);
        this.logger = logger;

        // Inisialisasi sistem antrian dari file .env
        this.isQueueEnabled = process.env.QUEUE_ENABLED === 'true';

        if (this.isQueueEnabled) {
            this.globalQueue = new PQueue({
                concurrency: parseInt(process.env.QUEUE_GLOBAL_CONCURRENCY, 10) || 10,
                intervalCap: parseInt(process.env.QUEUE_GLOBAL_INTERVAL_CAP, 10) || 50,
                interval: parseInt(process.env.QUEUE_GLOBAL_INTERVAL, 10) || 1000
            });
            
            this.userQueues = new Map();
            this.logger.info('Sistem antrian (Rate Limit) diaktifkan.');
        }
        
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

            this.commandHandler.commands.clear();
            this.commandHandler.aliases.clear();
            this.commandHandler.loadBuiltinCommands();
            
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
        
        this.sock.ev.on('messages.upsert', (m) => onMessage(
            this.sock, 
            m, 
            this.commandHandler,
            this.middlewareHandler,
            this.config.prefix, 
            this.isQueueEnabled ? this.globalQueue : null, 
            this.isQueueEnabled ? this.userQueues : null
        ));
        
        this.sock.ev.on('group-participants.update', (update) => {
            builtinGroupUpdateHandler(this.sock, update);
            customGroupUpdateHandler(this.sock, update);
        });
    }
}

module.exports = Bot;