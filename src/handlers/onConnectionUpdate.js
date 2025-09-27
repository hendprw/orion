// orion/src/handlers/onConnectionUpdate.js
const { DisconnectReason } = require('@whiskeysockets/baileys');
const { Boom } = require('@hapi/boom');
const logger = require('../utils/logger');

/**
 * Menangani update koneksi.
 * @param {object} update 
 * @param {Function} connectFn Fungsi untuk menjalankan koneksi ulang.
 */
module.exports = (update, connectFn) => {
    const { connection, lastDisconnect } = update;

    if (connection === 'close') {
        const reason = new Boom(lastDisconnect?.error)?.output?.statusCode;
        const shouldReconnect = reason !== DisconnectReason.loggedOut;
        
        logger.error(`Koneksi terputus: ${DisconnectReason[reason] || 'Unknown'}. Mencoba menghubungkan kembali: ${shouldReconnect}`);

        if (shouldReconnect) {
            connectFn();
        } else {
             logger.error("Tidak dapat terhubung kembali (Logged Out). Hapus folder session dan coba lagi.");
        }
    } else if (connection === 'open') {
        logger.info('Berhasil terhubung ke WhatsApp.');
    }
};