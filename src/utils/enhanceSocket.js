// orion/src/utils/enhanceSocket.js
const { getBuffer } = require("./functions");
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

/**
 * Berisi kumpulan fungsi helper untuk mengirim pesan,
 * yang akan disuntikkan ke dalam objek 'sock' saat startup.
 * @param {import('@whiskeysockets/baileys').WASocket} sock - Instance socket Baileys
 */
const enhanceSocketWithHelpers = (sock) => {

    // ========== HELPER DASAR & TEKS ==========

    /**
     * Memberikan reaksi emoji pada sebuah pesan.
     * @param {object} m - Objek pesan yang sudah di-parse.
     * @param {string} emoji - Emoji untuk reaksi.
     */
    sock.react = async (m, emoji) => {
        await sock.sendMessage(m.chat, { react: { text: emoji, key: m.key } });
    };

    /**
     * Membalas pesan dengan teks (mengutip pesan asli).
     * @param {object} m - Objek pesan yang sudah di-parse.
     * @param {string} text - Teks balasan.
     * @param {object} [options={}] - Opsi tambahan dari Baileys.
     */
    sock.reply = async (m, text, options = {}) => {
        await sock.sendMessage(m.chat, { text }, { quoted: m.msg, ...options });
    };

    /**
     * Mengirim pesan teks ke sebuah JID.
     * @param {string} jid - JID tujuan.
     * @param {string} text - Teks yang akan dikirim.
     * @param {object} [options={}] - Opsi tambahan (misal: { quoted: m.msg }).
     */
    sock.sendText = async (jid, text, options = {}) => {
        await sock.sendMessage(jid, { text }, { ...options });
    };

    /**
     * Mengirim pesan teks dengan mention.
     * @param {string} jid - JID tujuan.
     * @param {string} text - Teks yang akan dikirim.
     * @param {string[]} mentions - Array berisi JID yang akan di-mention.
     * @param {object} [options={}] - Opsi tambahan.
     */
    sock.sendTextWithMentions = async (jid, text, mentions, options = {}) => {
        await sock.sendMessage(jid, { text, mentions }, { ...options });
    };

    /**
     * Mengedit teks dari pesan yang sudah dikirim oleh bot.
     * @param {import('@whiskeysockets/baileys').proto.IMessageKey} key - Kunci dari pesan yang ingin diedit.
     * @param {string} newText - Teks baru.
     * @param {object} [options={}] - Opsi tambahan dari Baileys.
     */
    sock.editMessage = async (key, newText, options = {}) => {
        await sock.sendMessage(key.remoteJid, { text: newText, edit: key }, { ...options });
    };
    
    // ========== HELPER PENGIRIMAN MEDIA ==========

    /**
     * Mengirim gambar dari URL atau Buffer.
     * @param {string} jid - JID tujuan.
     * @param {string|Buffer} source - URL gambar atau Buffer.
     * @param {string} [caption=''] - Caption untuk gambar.
     * @param {object} [options={}] - Opsi tambahan.
     */
    sock.sendImage = async (jid, source, caption = '', options = {}) => {
        const buffer = Buffer.isBuffer(source) ? source : await getBuffer(source);
        if (!buffer) return console.error("Gagal mendapatkan buffer gambar untuk dikirim.");
        await sock.sendMessage(jid, { image: buffer, caption }, { ...options });
    };

    /**
     * Mengirim video dari URL atau Buffer.
     * @param {string} jid - JID tujuan.
     * @param {string|Buffer} source - URL video atau Buffer.
     * @param {string} [caption=''] - Caption untuk video.
     * @param {object} [options={}] - Opsi tambahan.
     */
    sock.sendVideo = async (jid, source, caption = '', options = {}) => {
        const buffer = Buffer.isBuffer(source) ? source : await getBuffer(source);
        if (!buffer) return console.error("Gagal mendapatkan buffer video untuk dikirim.");
        await sock.sendMessage(jid, { video: buffer, caption }, { ...options });
    };
};

module.exports = { enhanceSocketWithHelpers };