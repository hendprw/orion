// orion/src/core/Bot.js
const makeWASocket = require('@whiskeysockets/baileys').default;
const { useMultiFileAuthState, fetchLatestBaileysVersion, makeCacheableSignalKeyStore } = require('@whiskeysockets/baileys');
const NodeCache = require('node-cache');
const pino = require('pino');

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
        // Penting: Pastikan dotenv.config() sudah dipanggil di file utama SEBELUM membuat instance Bot
        this.config = {
            sessionName: process.env.SESSION_NAME || 'session',
            prefix: process.env.PREFIX || '!',
            commandsPath: null,
            getGroupSettings: async (groupId) => null,
            defaultCommandCooldown: 3,
            ...config,
        };
        this.sock = null;
        // Sekarang meneruskan defaultCooldown ke constructor CommandHandler
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

            this.logger.info(`Menggunakan Baileys v${version.join('.')}`);

            this.sock = makeWASocket({
                version,
                logger: pino({ level: 'silent' }),
                auth: {
                    creds: state.creds,
                    keys: makeCacheableSignalKeyStore(state.keys, this.logger),
                },
                browser: ['Orion Framework', 'Chrome', '1.0.0'],
                msgRetryCounterCache,
                printQRInTerminal: true,
                cachedGroupMetadata: (jid) => {
                    const cache = new NodeCache({ stdTTL: 3600, useClones: false });
                    return cache.get(jid);
                }
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