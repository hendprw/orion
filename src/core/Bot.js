// orion/src/core/Bot.js
const makeWASocket = require('@whiskeysockets/baileys').default;
const { useMultiFileAuthState, fetchLatestBaileysVersion, makeCacheableSignalKeyStore, DisconnectReason } = require('@whiskeysockets/baileys');
const NodeCache = require('node-cache');
const pino = require('pino');
const { Boom } = require('@hapi/boom');

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
 * Mengelola koneksi, handler, dan semua fungsionalitas inti.
 */
class Bot {
    /**
     * @param {object} config - Konfigurasi untuk instance bot.
     * @param {string} [config.sessionName='session'] - Nama folder untuk menyimpan file sesi.
     * @param {string} [config.prefix='!'] - Prefix yang digunakan untuk mendeteksi perintah.
     * @param {string} [config.commandsPath] - Path absolut ke direktori yang berisi file-file perintah Anda.
     * @param {Function} [config.getGroupSettings] - Fungsi async (groupId) => Promise<Object|null> untuk mengambil pengaturan grup dari sumber data Anda (DB, file JSON, dll).
     */
    constructor(config = {}) {
        this.config = {
            sessionName: 'session',
            prefix: '!',
            commandsPath: null,
            getGroupSettings: async (groupId) => null, // Fungsi default yang tidak melakukan apa-apa
            ...config,
        };
        this.sock = null;
        this.commandHandler = new CommandHandler(this.config.commandsPath, logger);
        this.logger = logger;

        // Binding `this` untuk memastikan konteks yang benar saat rekoneksi
        this.connect = this.connect.bind(this);
    }

    /**
     * Menginisialisasi koneksi bot ke WhatsApp.
     * Metode ini akan membuat instance socket, memuat perintah, dan mendaftarkan semua event handler.
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
                // Meng-cache metadata grup untuk performa yang lebih baik
                cachedGroupMetadata: (jid) => {
                    const cache = new NodeCache({ stdTTL: 3600, useClones: false }); // Cache selama 1 jam
                    return cache.get(jid);
                }
            });
            
            // "Suntikkan" fungsi-fungsi helper ke dalam instance socket
            enhanceSocketWithHelpers(this.sock);

            // Muat atau muat ulang semua perintah jika path disediakan
            if (this.config.commandsPath) {
                this.commandHandler.loadAllCommands();
                this.commandHandler.watchCommands(); // Aktifkan hot-reloading
            }

            // Daftarkan semua event handler dari Baileys
            this.registerHandlers(saveCreds);
            
            return this.sock;
        } catch (error) {
            this.logger.error({ err: error }, "Gagal memulai koneksi bot.");
            process.exit(1); // Keluar jika terjadi error fatal saat startup
        }
    }

    /**
     * Mendaftarkan semua event handler Baileys ke instance socket.
     * @private
     * @param {Function} saveCreds - Fungsi untuk menyimpan kredensial sesi.
     */
    registerHandlers(saveCreds) {
        // Buat handler grup dengan fungsi kustom yang disediakan pengguna
        const onGroupUpdate = createGroupUpdateHandler(this.config.getGroupSettings);

        // Handler untuk setiap event
        this.sock.ev.on('creds.update', onCredsUpdate(saveCreds));
        this.sock.ev.on('connection.update', (update) => onConnectionUpdate(update, this.connect));
        this.sock.ev.on('messages.upsert', (m) => onMessage(this.sock, m, this.commandHandler, this.config.prefix));
        this.sock.ev.on('group-participants.update', (update) => onGroupUpdate(this.sock, update));
    }
}

module.exports = Bot;