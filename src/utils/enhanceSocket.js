// orion/src/utils/enhanceSocket.js
const { downloadMediaMessage } = require('@whiskeysockets/baileys');
const { EventEmitter } = require('events');
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const { getBuffer } = require("./functions");
const logger = require('./logger');

/**
 * Berisi kumpulan fungsi helper untuk disuntikkan ke dalam objek 'sock'.
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
        return await sock.sendMessage(m.chat, { react: { text: emoji, key: m.key } });
    };

    /**
     * Membalas pesan dengan teks (mengutip pesan asli).
     * @param {object} m - Objek pesan yang sudah di-parse.
     * @param {string} text - Teks balasan.
     * @param {object} [options={}] - Opsi tambahan dari Baileys.
     */
    sock.reply = async (m, text, options = {}) => {
        return await sock.sendMessage(m.chat, { text }, { quoted: m.msg, ...options });
    };

    /**
     * Mengirim pesan teks ke sebuah JID.
     * @param {string} jid - JID tujuan.
     * @param {string} text - Teks yang akan dikirim.
     * @param {object} [options={}] - Opsi tambahan (misal: { quoted: m.msg }).
     * @returns {Promise<import('@whiskeysockets/baileys').proto.WebMessageInfo>}
     */
    sock.sendText = async (jid, text, options = {}) => {
        return await sock.sendMessage(jid, { text }, { ...options });
    };

    /**
     * Mengirim pesan teks dengan mention.
     * @param {string} jid - JID tujuan.
     * @param {string} text - Teks yang akan dikirim.
     * @param {string[]} mentions - Array berisi JID yang akan di-mention.
     * @param {object} [options={}] - Opsi tambahan.
     */
    sock.sendTextWithMentions = async (jid, text, mentions, options = {}) => {
        return await sock.sendMessage(jid, { text, mentions }, { ...options });
    };

    /**
     * Mengedit teks dari pesan yang sudah dikirim oleh bot.
     * @param {import('@whiskeysockets/baileys').proto.IMessageKey} key - Kunci dari pesan yang ingin diedit.
     * @param {string} newText - Teks baru.
     * @param {object} [options={}] - Opsi tambahan dari Baileys.
     */
    sock.editMessage = async (key, newText, options = {}) => {
        return await sock.sendMessage(key.remoteJid, { text: newText, edit: key }, { ...options });
    };
    
    // ========== HELPER MEDIA & PESAN KUSTOM ==========
// Ganti HANYA fungsi sock.downloadMedia di file enhanceSocket.js Anda

sock.downloadMedia = async (m) => {
    // Fungsi helper untuk menemukan pesan yang berisi media
    const getMessageWithMedia = (parsedMsg) => {
        // logger.info('--- [DEBUG] Mencari media ---');
        const supportedMediaTypes = ['imageMessage', 'videoMessage', 'stickerMessage'];

        if (parsedMsg.isQuoted) {
            // logger.info('[DEBUG] Pesan adalah sebuah reply. Mengecek media di dalam quote...');
            const quotedMsgContent = parsedMsg.quoted.msg;
            for (const type of supportedMediaTypes) {
                if (quotedMsgContent?.[type]) {
                    // logger.info(`[DEBUG] Media ditemukan di dalam quote (Tipe: ${type}).`);
                    return { message: quotedMsgContent };
                }
            }
        }
        
        if (parsedMsg.isMedia) {
            // logger.info(`[DEBUG] Media ditemukan di pesan saat ini (Tipe: ${parsedMsg.type}).`);
            return parsedMsg.msg;
        }

        // logger.warn('[DEBUG] Tidak ada media yang ditemukan.');
        return null;
    }

    const messageToDownload = getMessageWithMedia(m);

    if (!messageToDownload) {
        await sock.reply(m, 'Tidak ada media yang bisa diunduh dari pesan ini.');
        return null;
    }

    try {
        // logger.info('[DEBUG] Memulai proses unduh dari server WhatsApp...');
        const stream = await downloadMediaMessage(
            messageToDownload,
            'buffer',
            {},
            { logger, reuploadRequest: sock.updateMediaMessage }
        );
        // logger.info(`[DEBUG] Media berhasil diunduh. Ukuran Buffer: ${stream.length} bytes.`);
        return stream;
    } catch (error) {
        // logger.error({ err: error }, '[DEBUG] Gagal mengunduh media.');
        await sock.reply(m, 'Gagal mengunduh media dari server WhatsApp.');
        return null;
    }
};

    /**
     * Mengirim gambar dari URL, Buffer, atau path file lokal.
     * @param {string} jid - JID tujuan.
     * @param {string|Buffer} source - URL, Buffer, atau path file.
     * @param {string} [caption=''] - Caption untuk gambar.
     * @param {object} [options={}] - Opsi tambahan.
     */
    sock.sendImage = async (jid, source, caption = '', options = {}) => {
        const buffer = Buffer.isBuffer(source) ? source : await getBuffer(source);
        if (!buffer) return console.error("Gagal mendapatkan buffer gambar.");
        return await sock.sendMessage(jid, { image: buffer, caption }, { ...options });
    };

    /**
     * Mengirim video dari URL, Buffer, atau path file lokal.
     * @param {string} jid - JID tujuan.
     * @param {string|Buffer} source - URL, Buffer, atau path file.
     * @param {string} [caption=''] - Caption untuk video.
     * @param {object} [options={}] - Opsi tambahan.
     */
    sock.sendVideo = async (jid, source, caption = '', options = {}) => {
        const buffer = Buffer.isBuffer(source) ? source : await getBuffer(source);
        if (!buffer) return console.error("Gagal mendapatkan buffer video.");
        return await sock.sendMessage(jid, { video: buffer, caption }, { ...options });
    };

    /**
     * Mengirim pesan dengan ad-reply (link preview kustom).
     * @param {string} jid - JID tujuan.
     * @param {string} text - Teks utama pesan.
     * @param {string} title - Judul preview.
     * @param {string} body - Deskripsi kecil di bawah judul.
     * @param {string|Buffer} thumb - Path file lokal, URL, atau Buffer untuk thumbnail.
     * @param {object} [options={}] - Opsi tambahan { largeThumb: boolean, sourceUrl: string, quoted: object, mentions: [] }.
     */
    sock.sendAdReply = async (jid, text, title, body, thumb, options = {}) => {
        let thumbBuffer;
        if (Buffer.isBuffer(thumb)) {
            thumbBuffer = thumb;
        } else if (fs.existsSync(thumb)) {
            thumbBuffer = await fs.promises.readFile(thumb);
        } else {
            thumbBuffer = await getBuffer(thumb);
        }

        if (!thumbBuffer) {
            logger.error("Gagal mendapatkan buffer gambar untuk ad-reply.");
            return await sock.sendText(jid, text, options);
        }

        const jpegThumbnail = await sharp(thumbBuffer).jpeg().toBuffer();

        const message = {
            text: text,
            contextInfo: {
                mentionedJid: options.mentions || [],
                externalAdReply: {
                    title: title,
                    body: body,
                    mediaType: 1,
                    renderLargerThumbnail: options.largeThumb || false,
                    thumbnail: jpegThumbnail,
                    sourceUrl: options.sourceUrl || ''
                }
            }
        };
        return await sock.sendMessage(jid, message, { ...options });
    };

    /**
     * Mengirim pesan lokasi dengan gambar thumbnail kustom.
     * @param {string} jid - JID tujuan.
     * @param {string|Buffer} image - URL atau Buffer gambar thumbnail.
     * @param {object} [options={}] - Opsi tambahan dari Baileys.
     */
    sock.sendLocationWithImage = async (jid, image, options = {}) => {
        const imageBuffer = Buffer.isBuffer(image) ? image : await getBuffer(image);
        if (!imageBuffer) return console.error("Gagal mendapatkan buffer gambar untuk lokasi.");

        const jpegThumbnail = await sharp(imageBuffer).jpeg().toBuffer();
        
        const locationMessage = {
            location: {
                degreesLatitude: -6.2087634,
                degreesLongitude: 106.845599,
            },
            jpegThumbnail: jpegThumbnail
        };
        return await sock.sendMessage(jid, locationMessage, { ...options });
    };

    /**
     * Membuat message collector untuk menunggu pesan berikutnya.
     * @param {Function} filter - Fungsi (msg) => boolean untuk memfilter pesan yang diinginkan.
     * @param {object} options - Opsi, terutama { time: number } dalam milidetik.
     * @returns {EventEmitter} Collector yang meng-emit 'collect' dan 'end'.
     */
    sock.createMessageCollector = (filter, options) => {
        const collector = new EventEmitter();
        let collected = new Map();
    
        const listener = (m) => {
            const msg = m.messages[0];
            if (filter(msg)) {
                collected.set(msg.key.id, msg);
                collector.emit('collect', msg);
            }
        };
        
        sock.ev.on('messages.upsert', listener);
        
        const stop = () => {
            sock.ev.off('messages.upsert', listener);
            collector.emit('end', collected);
        };
        
        collector.stop = stop;
        setTimeout(stop, options.time);
        
        return collector;
    };
};

module.exports = { enhanceSocketWithHelpers };