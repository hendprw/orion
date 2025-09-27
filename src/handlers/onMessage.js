// orion/src/handlers/onMessage.js
const { parseMessage } = require('../core/messageParser');
const logger = require('../utils/logger');

/**
 * Handler utama untuk setiap pesan yang masuk.
 * @param {import('@whiskeysockets/baileys').WASocket} sock 
 * @param {object} m M-Object dari Baileys
 * @param {CommandHandler} commandHandler
 * @param {string} prefix
 */
module.exports = async (sock, m, commandHandler, prefix) => {
    const msg = m.messages[0];

    try {
        const parsedM = await parseMessage(sock, msg);
        if (!parsedM) return;
        
        // Pengguna library bisa menambahkan middleware mereka di sini
        // Contoh: await runMiddleware(parsedM);

        if (!parsedM.body || !parsedM.body.startsWith(prefix)) return;

        const args = parsedM.body.slice(prefix.length).trim().split(/ +/);
        const commandName = args.shift().toLowerCase();
        
        const command = commandHandler.getCommand(commandName);
        if (!command) return;
        
        // Menambahkan args dan commandName ke objek parsedM
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

        logger.info({ 
            from: parsedM.sender.split('@')[0], 
            command: parsedM.command, 
            group: parsedM.isGroup ? parsedM.groupMetadata.subject : 'PM' 
        }, 'Perintah diterima');
        
        await command.execute(sock, parsedM);

    } catch (err) {
        logger.error({ err }, "Terjadi error pada messageHandler");
    }
};