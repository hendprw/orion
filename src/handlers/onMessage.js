// orion/src/handlers/onMessage.js
const { parseMessage } = require('../core/messageParser');
const logger = require('../utils/logger');

/**
 * @param {import('@whiskeysockets/baileys').WASocket} sock 
 * @param {object} m - M-Object dari Baileys
 * @param {CommandHandler} commandHandler
 * @param {string} prefix
 */
module.exports = async (sock, m, commandHandler, prefix) => {
    const msg = m.messages[0];

    try {
        const parsedM = await parseMessage(sock, msg);
        if (!parsedM) return;
        
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

        // Pemeriksaan Cooldown
        if (commandHandler.isUserOnCooldown(parsedM.sender, command)) {
            logger.warn({
                sender: parsedM.sender,
                command: commandName
            }, 'Pengguna dalam masa cooldown.');
            return await sock.reply(parsedM, 'Mohon tunggu beberapa saat sebelum menggunakan perintah ini lagi.');
        }

        logger.info({ 
            from: parsedM.sender.split('@')[0], 
            command: parsedM.command, 
            group: parsedM.isGroup ? parsedM.groupMetadata.subject : 'PM' 
        }, 'Perintah diterima');
        
        // Blok try-catch spesifik untuk eksekusi perintah
        try {
            await command.execute(sock, parsedM);
        } catch (err) {
            logger.error({ 
                err, 
                command: commandName, 
                sender: parsedM.sender 
            }, "Terjadi error saat eksekusi perintah");
            await sock.reply(parsedM, 'Maaf, terjadi kesalahan saat menjalankan perintah.');
        }

    } catch (err) {
        // Blok catch ini sekarang untuk error di luar eksekusi (misal: parsing)
        logger.error({ err }, "Terjadi error pada messageHandler");
    }
};