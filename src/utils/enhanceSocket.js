// orion/src/utils/enhanceSocket.js
const { downloadMediaMessage } = require('@whiskeysockets/baileys');
const { EventEmitter } = require('events');
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const { getBuffer } = require("./functions");
const logger = require('./logger');

/**
 * Helper internal untuk membuat objek contextInfo secara dinamis.
 * @param {object} options - Opsi dari fungsi pengirim (cth: { isAi: true, mentions: [...] }).
 * @returns {object|undefined}
 */
const createContextInfo = (options = {}) => {
    let contextInfo = {};
    let hasContext = false;

    // Menambahkan label AI jika opsi isAi bernilai true
    if (options.isAi === true) {
        contextInfo.messageAttribution = { isAi: true };
        hasContext = true;
    }

    // Menambahkan mention jika ada
    if (options.mentions && Array.isArray(options.mentions) && options.mentions.length > 0) {
        contextInfo.mentionedJid = options.mentions;
        hasContext = true;
    }

    // Menggabungkan dengan contextInfo yang sudah ada dari adReply
    if (options.externalAdReply) {
        contextInfo.externalAdReply = options.externalAdReply;
        hasContext = true;
    }

    return hasContext ? contextInfo : undefined;
};

/**
 * Berisi kumpulan fungsi helper untuk disuntikkan ke dalam objek 'sock'.
 * @param {import('@whiskeysockets/baileys').WASocket} sock - Instance socket Baileys
 */
const enhanceSocketWithHelpers = (sock) => {

    // ========== HELPER DASAR & TEKS ==========

    sock.react = async (m, emoji) => {
        return await sock.sendMessage(m.chat, { react: { text: emoji, key: m.key } });
    };

    /**
     * Membalas pesan dengan teks dan mendukung label AI.
     */
    sock.reply = async (m, text, options = {}) => {
        const message = {
            text,
            contextInfo: createContextInfo(options)
        };
        return await sock.sendMessage(m.chat, message, { quoted: m.msg, ...options });
    };

    /**
     * Mengirim pesan teks ke sebuah JID dan mendukung label AI.
     */
    sock.sendText = async (jid, text, options = {}) => {
        const message = {
            text,
            contextInfo: createContextInfo(options)
        };
        return await sock.sendMessage(jid, message, { ...options });
    };
    
    /**
     * Mengirim pesan teks dengan mention dan mendukung label AI.
     */
    sock.sendTextWithMentions = async (jid, text, mentions, options = {}) => {
        // Gabungkan mentions ke dalam options agar bisa diproses oleh createContextInfo
        const newOptions = { ...options, mentions };
        const message = {
            text,
            contextInfo: createContextInfo(newOptions)
        };
        return await sock.sendMessage(jid, message, { ...options });
    };

    sock.editMessage = async (key, newText, options = {}) => {
        return await sock.sendMessage(key.remoteJid, { text: newText, edit: key }, { ...options });
    };

    // ========== HELPER MEDIA & PESAN KUSTOM ==========

    sock.downloadMedia = async (m) => {
        const getMessageWithMedia = (parsedMsg) => {
            const supportedMediaTypes = ['imageMessage', 'videoMessage', 'stickerMessage'];
            if (parsedMsg.isQuoted) {
                const quotedMsgContent = parsedMsg.quoted.msg;
                for (const type of supportedMediaTypes) {
                    if (quotedMsgContent?.[type]) {
                        return { message: quotedMsgContent };
                    }
                }
            }
            if (parsedMsg.isMedia) {
                return parsedMsg.msg;
            }
            return null;
        }
        const messageToDownload = getMessageWithMedia(m);
        if (!messageToDownload) {
            await sock.reply(m, 'Tidak ada media yang bisa diunduh dari pesan ini.');
            return null;
        }
        try {
            const stream = await downloadMediaMessage(
                messageToDownload,
                'buffer', {}, { logger, reuploadRequest: sock.updateMediaMessage }
            );
            return stream;
        } catch (error) {
            await sock.reply(m, 'Gagal mengunduh media dari server WhatsApp.');
            return null;
        }
    };

    /**
     * Mengirim gambar dan mendukung label AI.
     */
    sock.sendImage = async (jid, source, caption = '', options = {}) => {
        const buffer = Buffer.isBuffer(source) ? source : await getBuffer(source);
        if (!buffer) return console.error("Gagal mendapatkan buffer gambar.");
        const message = {
            image: buffer,
            caption,
            contextInfo: createContextInfo(options)
        };
        return await sock.sendMessage(jid, message, { ...options });
    };

    /**
     * Mengirim video dan mendukung label AI.
     */
    sock.sendVideo = async (jid, source, caption = '', options = {}) => {
        const buffer = Buffer.isBuffer(source) ? source : await getBuffer(source);
        if (!buffer) return console.error("Gagal mendapatkan buffer video.");
        const message = {
            video: buffer,
            caption,
            contextInfo: createContextInfo(options)
        };
        return await sock.sendMessage(jid, message, { ...options });
    };

    /**
     * Mengirim pesan dengan ad-reply dan mendukung label AI.
     */
    sock.sendAdReply = async (jid, text, title, body, thumb, options = {}) => {
        let thumbBuffer;
        if (Buffer.isBuffer(thumb)) thumbBuffer = thumb;
        else if (fs.existsSync(thumb)) thumbBuffer = await fs.promises.readFile(thumb);
        else thumbBuffer = await getBuffer(thumb);

        if (!thumbBuffer) {
            logger.error("Gagal mendapatkan buffer gambar untuk ad-reply.");
            return await sock.sendText(jid, text, options);
        }

        const jpegThumbnail = await sharp(thumbBuffer).jpeg().toBuffer();
        
        // Buat objek adReply untuk diteruskan ke createContextInfo
        const adReplyOptions = {
            ...options,
            externalAdReply: {
                title,
                body,
                mediaType: 1,
                renderLargerThumbnail: options.largeThumb || false,
                thumbnail: jpegThumbnail,
                sourceUrl: options.sourceUrl || ''
            }
        };

        const message = {
            text,
            contextInfo: createContextInfo(adReplyOptions)
        };
        return await sock.sendMessage(jid, message, { ...options });
    };

    // ... (sisa fungsi seperti sendLocationWithImage dan createMessageCollector tetap sama) ...
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