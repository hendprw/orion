// orion/src/core/Bot.js
require('dotenv').config(); // Memuat variabel dari file .env

const makeWASocket = require('@whiskeysockets/baileys').default;
const { useMultiFileAuthState, fetchLatestBaileysVersion, makeCacheableSignalKeyStore, DisconnectReason } = require('@whiskeysockets/baileys');
const NodeCache = require('node-cache');
const pino = require('pino');
const { Boom } = require('@hapi/boom');
const fs = require('fs');

const CommandHandler = require('./commandHandler');
const onConnectionUpdate = require('../handlers/onConnectionUpdate');
const onCredsUpdate = require('../handlers/onCredsUpdate');
const onMessage = require('../handlers/onMessage');
const createGroupUpdateHandler = require('../handlers/onGroupUpdate');
const { enhanceSocketWithHelpers } = require('../utils/enhanceSocket');
const logger = require('../utils/logger');

const msgRetryCounterCache = new NodeCache();

/**
 * Kelas utama Orion Bot Framework.
 */
class Bot {
    /**
     * @param {object} config - Konfigurasi untuk instance bot.
     * @param {string} [config.sessionName='session'] - Nama folder untuk menyimpan file sesi.
     * @param {string} [config.prefix='!'] - Prefix untuk mendeteksi perintah.
     * @param {string} [config.commandsPath] - Path absolut ke direktori perintah.
     * @param {Function} [config.getGroupSettings] - Fungsi async untuk mengambil pengaturan grup.
     * @param {number} [config.defaultCommandCooldown=3] - Waktu jeda (cooldown) default per perintah dalam detik.
     */
    constructor(config = {}) {
        this.config = {
            sessionName: process.env.SESSION_NAME || 'session',
            prefix: process.env.PREFIX || '!',
            commandsPath: null,
            getGroupSettings: async (groupId) => null,
            defaultCommandCooldown: 3, // Cooldown default 3 detik
            ...config,
        };

        this.validateConfig(); // Validasi konfigurasi

        this.sock = null;
        this.commandHandler = new CommandHandler(this.config.commandsPath, logger, this.config.defaultCommandCooldown);
        this.logger = logger;
        this.connect = this.connect.bind(this);
    }

    /**
     * Memvalidasi konfigurasi yang diberikan.
     * @private
     */
    validateConfig() {
        if (this.config.commandsPath && !fs.existsSync(this.config.commandsPath)) {
            this.logger.error(`Direktori perintah tidak ditemukan: ${this.config.commandsPath}`);
            process.exit(1);
        }
    }

    /**
     * Menginisialisasi koneksi bot ke WhatsApp.
     */
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

            if (this.config.commandsPath) {
                this.commandHandler.loadAllCommands();
                this.commandHandler.watchCommands();
            }

            this.registerHandlers(saveCreds);
            
            return this.sock;
        } catch (error) {
            this.logger.error({ err: error }, "Gagal memulai koneksi bot.");
            process.exit(1);
        }
    }

    /**
     * Mendaftarkan semua event handler Baileys.
     * @private
     * @param {Function} saveCreds - Fungsi untuk menyimpan kredensial sesi.
     */
    registerHandlers(saveCreds) {
        const onGroupUpdate = createGroupUpdateHandler(this.config.getGroupSettings);

        this.sock.ev.on('creds.update', onCredsUpdate(saveCreds));
        this.sock.ev.on('connection.update', (update) => onConnectionUpdate(update, this.connect));
        this.sock.ev.on('messages.upsert', (m) => onMessage(this.sock, m, this.commandHandler, this.config.prefix));
        this.sock.ev.on('group-participants.update', (update) => onGroupUpdate(this.sock, update));
    }
}

module.exports = Bot;