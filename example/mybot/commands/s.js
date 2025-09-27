// commands/media/sticker.js
const ffmpeg = require('fluent-ffmpeg');
const ffmpegPath = require('@ffmpeg-installer/ffmpeg').path;
ffmpeg.setFfmpegPath(ffmpegPath);
const fs = require('fs').promises;
const path = require('path');
const { randomBytes } = require('crypto');
const {logger } = require('orion-wa');
// const logger = require('../../src/utils/logger'); // Adjust path if needed

const getRandomFileName = (extension) => `${randomBytes(16).toString('hex')}.${extension}`;

module.exports = {
    name: 'sticker',
    aliases: ['s', 'stiker', 'sgif'],
    description: 'Membuat stiker dari gambar atau video menggunakan FFMPEG.',
    cooldown: 10,
    
    async execute(sock, m, logger) {
        logger.info('--- [FFMPEG STICKER] Proses dimulai ---');
        
        const isMediaPresent = m.isMedia || (m.isQuoted && (m.quoted.msg.imageMessage || m.quoted.msg.videoMessage));
        if (!isMediaPresent) {
            return await sock.reply(m, 'Kirim atau reply gambar/video dengan caption `.s`');
        }

        const statusMsg = await sock.reply(m, '⏳ Mengunduh media...');
        const buffer = await sock.downloadMedia(m);
        
        if (!buffer || buffer.length === 0) {
            return await sock.editMessage(statusMsg.key, '❌ Gagal mengunduh media.');
        }

        const inputFileName = getRandomFileName('tmp');
        const outputFileName = getRandomFileName('webp');
        const tempDirPath = './temp';

        try {
            await fs.mkdir(tempDirPath, { recursive: true });
            
            const inputFilePath = path.join(tempDirPath, inputFileName);
            const outputFilePath = path.join(tempDirPath, outputFileName);
            
            await fs.writeFile(inputFilePath, buffer);
            await sock.editMessage(statusMsg.key, '🎨 Mengonversi ke stiker...');
            logger.info(`[FFMPEG STICKER] Memulai konversi FFMPEG untuk file: ${inputFileName}`);
            
            await new Promise((resolve, reject) => {
                // --- PERBAIKAN DI SINI ---
                // Mengubah argumen 'color' menjadi format hex yang lebih kompatibel
                const ffmpegCommand = `scale=512:512:force_original_aspect_ratio=decrease,fps=15,pad=512:512:-1:-1:color=0x00000000`;

                ffmpeg(inputFilePath)
                    .outputOptions([
                        '-vcodec', 'libwebp',
                        '-vf', ffmpegCommand,
                        '-lossless', '0',
                        '-compression_level', '6',
                        '-q:v', '70',
                        '-loop', '0',
                        '-an',
                        '-t', '5'
                    ])
                    .toFormat('webp')
                    .save(outputFilePath)
                    .on('end', resolve)
                    .on('error', reject);
            });

            logger.info(`[FFMPEG STICKER] Konversi berhasil. Mengirim stiker...`);
            
            await sock.sendMessage(m.chat, { sticker: { url: outputFilePath } });
            await sock.sendMessage(m.chat, { delete: statusMsg.key });

        } catch (error) {
            logger.error({ err: error }, '[FFMPEG STICKER] Gagal saat konversi.');
            await sock.editMessage(statusMsg.key, '❌ Gagal membuat stiker. Format media mungkin tidak didukung oleh FFMPEG.');
        } finally {
            // Selalu bersihkan file sementara
            try {
                const files = await fs.readdir(tempDirPath);
                for (const file of files) {
                    await fs.unlink(path.join(tempDirPath, file));
                }
            } catch (cleanupError) {
                logger.error({ err: cleanupError }, '[FFMPEG STICKER] Gagal membersihkan file sementara.');
            }
        }
    }
};