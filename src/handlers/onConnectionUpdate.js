// orion/src/handlers/onConnectionUpdate.js
const { DisconnectReason } = require('@whiskeysockets/baileys');
const { Boom } = require('@hapi/boom');
const logger = require('../utils/logger');
const qrcode = require('qrcode-terminal'); // <-- Tambahkan ini

/**
 * Menangani update koneksi.
 * @param {object} update 
 * @param {Function} connectFn Fungsi untuk menjalankan koneksi ulang.
 */
module.exports = (update, connectFn) => {
    const { connection, lastDisconnect, qr } = update; // <-- Tambahkan 'qr'

    // === AWAL BLOK BARU ===
    // Logika untuk menampilkan QR code di terminal
    if (qr) {
        logger.info('QR Code diterima, silakan scan:');
        qrcode.generate(qr, { small: true });
    }
    // === AKHIR BLOK BARU ===

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