// orion/src/handlers/onMessage.js
const { parseMessage } = require('../core/messageParser');
const logger = require('../utils/logger');
const PQueue = require('p-queue').default;
const { validateArguments } = require('../core/argumentValidator'); // <-- IMPORT VALIDATOR

// Terima middlewareHandler sebagai argumen baru
module.exports = async (sock, m, commandHandler, middlewareHandler, prefix, globalQueue, userQueues) => {
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

        // 1. Jalankan middleware
        const passedMiddleware = await middlewareHandler.run(sock, parsedM, command);
        if (!passedMiddleware) {
            return; // Hentikan eksekusi jika salah satu middleware gagal
        }

        // 2. Validasi argumen
        const areArgsValid = await validateArguments(sock, parsedM, command);
        if (!areArgsValid) return;
        
        // Fungsi untuk mengeksekusi perintah
        const executeCommand = async () => {
            logger.info(
              `EKSEKUSI: Menjalankan CMD "${parsedM.command}" dari ${parsedM.sender.split('@')[0]} (${parsedM.isGroup ? parsedM.groupMetadata.subject : 'PM'})`
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
        };

        // 3. Jalankan perintah (via antrian atau langsung)
        if (globalQueue && userQueues) {
            const senderId = parsedM.sender;
            if (!userQueues.has(senderId)) {
                userQueues.set(senderId, new PQueue({
                    concurrency: parseInt(process.env.QUEUE_PER_USER_CONCURRENCY, 10) || 1,
                    intervalCap: parseInt(process.env.QUEUE_PER_USER_INTERVAL_CAP, 10) || 3,
                    interval: parseInt(process.env.QUEUE_PER_USER_INTERVAL, 10) || 1500
                }));
            }
            const userQueue = userQueues.get(senderId);
            userQueue.add(() => {
                logger.info(`[USER_QUEUE] Pengguna ${senderId.split('@')[0]} lolos. Menambahkan CMD "${commandName}" ke antrian global.`);
                globalQueue.add(executeCommand);
            }).catch(err => {
                 logger.error("Error saat menambahkan ke antrian pengguna", { err });
            });
        } else {
            await executeCommand();
        }

    } catch (err) {
        logger.error("Terjadi error pada messageHandler", { err: err.stack || err.message });
    }
};