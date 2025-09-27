// orion/src/handlers/onMessage.js
const { parseMessage } = require('../core/messageParser');
const logger = require('../utils/logger');

/**
 * Handler utama untuk setiap pesan yang masuk.
 * @param {import('../core/Bot')} bot - Instance Bot utama
 * @param {object} m - M-Object dari Baileys
 */
module.exports = async (bot, m) => {
    const msg = m.messages[0];
    // Ambil semua properti yang dibutuhkan dari instance bot
    const { sock, commandHandler, prefix, middlewares } = bot; 

    try {
        const parsedM = await parseMessage(sock, msg);
        if (!parsedM) return;
        
        // --- FITUR BARU: DEVELOPMENT MODE ---
        const isDevMode = process.env.DEVELOPMENT_MODE === 'true';
        const ownerJid = process.env.BOT_OWNER;

        if (isDevMode && parsedM.sender !== ownerJid) {
            // Jika mode dev aktif dan pengirim bukan owner, abaikan pesan.
            logger.warn(`Pesan dari ${parsedM.sender.split('@')[0]} diabaikan (Development Mode).`);
            return;
        }
        
        if (!parsedM.body || !parsedM.body.startsWith(prefix)) return;

        const args = parsedM.body.slice(prefix.length).trim().split(/ +/);
        const commandName = args.shift().toLowerCase();
        
        const command = commandHandler.getCommand(commandName);
        if (!command) return;
        
        parsedM.args = args;
        parsedM.command = commandName;

        // Gerbang (Guard Clauses)
        if (command.isGroupOnly && !parsedM.isGroup) {
            return await sock.reply(parsedM, 'Perintah ini hanya bisa digunakan di dalam grup.');
        }
        if (command.isAdminOnly && !parsedM.isAdmin) {
             return await sock.reply(parsedM, 'Perintah ini hanya untuk admin grup.');
        }
        if (command.isBotAdminOnly && !parsedM.isBotAdmin) {
             return await sock.reply(parsedM, 'Bot harus menjadi admin untuk menjalankan perintah ini.');
        }

        if (commandHandler.isUserOnCooldown(parsedM.sender, command)) {
            logger.warn({
                sender: parsedM.sender,
                command: commandName
            }, 'Pengguna dalam masa cooldown, perintah diabaikan.');
            return;
        }

        logger.info({ 
            from: parsedM.sender.split('@')[0], 
            command: parsedM.command, 
            group: parsedM.isGroup ? (await sock.groupMetadata(parsedM.chat)).subject : 'PM' 
        }, 'Perintah diterima');
        
        // --- LOGIKA MIDDLEWARE ---
        let middlewareIndex = 0;
        const next = async () => {
            if (middlewareIndex < middlewares.length) {
                const currentMiddleware = middlewares[middlewareIndex];
                middlewareIndex++;
                // Panggil middleware berikutnya dalam rantai
                await currentMiddleware(sock, parsedM, next);
            } else {
                // Jika semua middleware selesai, jalankan perintah
                await command.execute(sock, parsedM, commandHandler);
            }
        };

        try {
            // Mulai rantai eksekusi dari middleware pertama
            await next();

        } catch (err) {
            logger.error({ 
                err, 
                command: commandName, 
                sender: parsedM.sender 
            }, "Terjadi error saat eksekusi perintah");
            await sock.reply(parsedM, 'Maaf, terjadi kesalahan saat menjalankan perintah.');
        }

    } catch (err) {
        logger.error({ err }, "Terjadi error pada messageHandler");
    }
};