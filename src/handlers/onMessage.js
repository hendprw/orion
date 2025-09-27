// orion/src/handlers/onMessage.js
const { parseMessage } = require('../core/messageParser');
const logger = require('../utils/logger');

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

        // Guard Clauses
        if (command.isGroupOnly && !parsedM.isGroup) {
            return await sock.reply(parsedM, 'Perintah ini hanya bisa digunakan di dalam grup.');
        }
        if (command.isAdminOnly && !parsedM.isAdmin) {
            return await sock.reply(parsedM, 'Perintah ini hanya untuk admin grup.');
        }
        if (command.isBotAdminOnly && !parsedM.isBotAdmin) {
            return await sock.reply(parsedM, 'Bot harus menjadi admin untuk menjalankan perintah ini.');
        }

        // if (commandHandler.isUserOnCooldown(parsedM.sender, command)) {
        //     logger.warn("Pengguna dalam masa cooldown, perintah diabaikan.", {
        //         sender: parsedM.sender,
        //         command: commandName
        //     });
        //     return;
        // }

      logger.info(
  `CMD "${parsedM.command}" dari ${parsedM.sender.split('@')[0]} (${parsedM.isGroup ? parsedM.groupMetadata.subject : 'PM'})`
);

        try {
            await command.execute(sock, parsedM, logger);

        } catch (err) {
            logger.error("Terjadi error saat eksekusi perintah", { 
                command: commandName, 
                sender: parsedM.sender, 
                err: err.stack || err.message 
            });
            await sock.reply(parsedM, 'Maaf, terjadi kesalahan saat menjalankan perintah.');
        }

    } catch (err) {
        logger.error("Terjadi error pada messageHandler", { err: err.stack || err.message });
    }
};
