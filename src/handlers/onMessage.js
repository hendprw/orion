// =====================================================
// FILE 4: src/handlers/onMessage.js (IMPROVED)
// =====================================================
const { parseMessage } = require('../core/messageParser');
const { validateArguments } = require('../core/argumentValidator');
const CONSTANTS = require('../config/constants');
const logger = require('../utils/logger');
const PQueue = require('p-queue').default;

/**
 * Enhanced message handler dengan error boundaries dan retry logic
 */
module.exports = async (sock, m, commandHandler, middlewareHandler, prefix, globalQueue, userQueues) => {
    const msg = m.messages[0];

    try {
        const parsedM = await parseMessage(sock, msg);
        if (!parsedM) return;
        
        // Early exit untuk non-command messages
        if (!parsedM.body?.startsWith(prefix)) return;

        const args = parsedM.body.slice(prefix.length).trim().split(/ +/);
        const commandName = args.shift().toLowerCase();
        
        const command = commandHandler.getCommand(commandName);
        if (!command) return;
        
        parsedM.args = args;
        parsedM.command = commandName;

        // 1. Check cooldown SEBELUM middleware
        const cooldownStatus = commandHandler.isUserOnCooldown(parsedM.sender, command);
        if (cooldownStatus.onCooldown) {
            const cooldownMsg = CONSTANTS.ERRORS.COOLDOWN.replace('{time}', cooldownStatus.timeLeft);
            await sock.reply(parsedM, cooldownMsg);
            return;
        }

        // 2. Run middleware dengan proper error handling
        try {
            const passedMiddleware = await middlewareHandler.run(sock, parsedM, command);
            if (!passedMiddleware) return;
        } catch (middlewareError) {
            logger.error({ err: middlewareError }, 'Middleware execution failed');
            await sock.reply(parsedM, CONSTANTS.ERRORS.GENERIC);
            return;
        }

        // 3. Validate arguments
        const areArgsValid = await validateArguments(sock, parsedM, command);
        if (!areArgsValid) return;
        
        // 4. Execute command dengan comprehensive tracking
        const executeCommand = async () => {
            const startTime = Date.now();
            
            logger.info({
                command: parsedM.command,
                user: parsedM.sender.split('@')[0],
                chat: parsedM.isGroup ? parsedM.groupMetadata.subject : 'DM',
                args: parsedM.args
            }, '🎯 Executing command');
            
            try {
                // Execute dengan timeout protection
                await Promise.race([
                    command.execute(sock, parsedM, logger),
                    new Promise((_, reject) => 
                        setTimeout(() => reject(new Error('Command timeout')), 60000)
                    )
                ]);
                
                // Track successful execution
                const duration = Date.now() - startTime;
                commandHandler.trackCommandUsage(commandName, true, duration);
                
                logger.info({
                    command: commandName,
                    duration: `${duration}ms`,
                    user: parsedM.sender.split('@')[0]
                }, '✅ Command completed');
                
            } catch (err) {
                // Track failed execution
                const duration = Date.now() - startTime;
                commandHandler.trackCommandUsage(commandName, false, duration);
                
                logger.error({ 
                    err: err.stack || err.message,
                    command: commandName, 
                    sender: parsedM.sender,
                    args: parsedM.args,
                    duration: `${duration}ms`
                }, '❌ Command execution error');
                
                // User-friendly error message
                const errorMsg = err.userMessage || CONSTANTS.ERRORS.GENERIC;
                await sock.reply(parsedM, errorMsg);
            }
        };

        // 5. Queue or execute directly
        if (globalQueue && userQueues) {
            const senderId = parsedM.sender;
            
            // Lazy initialize user queue
            if (!userQueues.has(senderId)) {
                userQueues.set(senderId, new PQueue({
                    concurrency: CONSTANTS.QUEUE.USER_CONCURRENCY,
                    intervalCap: CONSTANTS.QUEUE.USER_INTERVAL_CAP,
                    interval: CONSTANTS.QUEUE.USER_INTERVAL
                }));
            }
            
            const userQueue = userQueues.get(senderId);
            
            // Add to queue dengan error handling
            userQueue.add(() => globalQueue.add(executeCommand))
                .catch(err => {
                    logger.error({ err, user: senderId }, 'Queue error');
                    sock.reply(parsedM, '⚠️ Sistem sedang sibuk, coba lagi dalam beberapa saat.');
                });
        } else {
            await executeCommand();
        }

    } catch (err) {
        logger.error({ 
            err: err.stack || err.message,
            msgId: msg.key.id,
            sender: msg.key.participant || msg.key.remoteJid
        }, '💥 Fatal error in message handler');
    }
};
