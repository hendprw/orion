// =====================================================
// FILE 5: src/handlers/onConnectionUpdate.js (ENHANCED)
// =====================================================
const { DisconnectReason } = require('@whiskeysockets/baileys');
const { Boom } = require('@hapi/boom');
const qrcode = require('qrcode-terminal');
const CONSTANTS = require('../config/constants');
const logger = require('../utils/logger');

// Reconnect strategy dengan exponential backoff
let reconnectAttempts = 0;
let reconnectTimeout = null;

/**
 * Enhanced connection update handler dengan reconnection strategy
 */
module.exports = (update, connectFn) => {
    const { connection, lastDisconnect, qr } = update;

    // Display QR code dengan formatting yang lebih baik
    if (qr) {
        console.log('\n' + '═'.repeat(60));
        logger.info('📱 Scan QR Code berikut dengan WhatsApp:');
        console.log('═'.repeat(60));
        qrcode.generate(qr, { small: true });
        console.log('═'.repeat(60));
        console.log('💡 Tips: Buka WhatsApp → Settings → Linked Devices → Link a Device\n');
    }

    if (connection === 'close') {
        const statusCode = new Boom(lastDisconnect?.error)?.output?.statusCode;
        const reason = DisconnectReason[statusCode] || 'Unknown';
        const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
        
        logger.warn({
            statusCode,
            reason,
            shouldReconnect,
            attempts: reconnectAttempts
        }, '🔌 Connection closed');

        if (shouldReconnect && reconnectAttempts < CONSTANTS.RECONNECT.MAX_ATTEMPTS) {
            // Clear previous timeout if exists
            if (reconnectTimeout) {
                clearTimeout(reconnectTimeout);
            }

            // Exponential backoff dengan cap
            const delay = Math.min(
                CONSTANTS.RECONNECT.BASE_DELAY * Math.pow(2, reconnectAttempts),
                CONSTANTS.RECONNECT.MAX_DELAY
            );
            
            reconnectAttempts++;
            
            logger.info({
                delay: `${delay}ms`,
                attempt: `${reconnectAttempts}/${CONSTANTS.RECONNECT.MAX_ATTEMPTS}`
            }, '🔄 Reconnecting...');
            
            reconnectTimeout = setTimeout(() => {
                connectFn();
            }, delay);
            
        } else if (reconnectAttempts >= CONSTANTS.RECONNECT.MAX_ATTEMPTS) {
            logger.error('❌ Max reconnection attempts reached. Manual restart required.');
            logger.info('Please restart the bot manually.');
            process.exit(1);
        } else {
            logger.error('🚪 Logged out. Delete session folder and restart bot.');
            logger.info('Steps: 1) Delete "session" folder, 2) Restart bot, 3) Scan QR');
            process.exit(0);
        }
        
    } else if (connection === 'open') {
        reconnectAttempts = 0; // Reset on successful connection
        if (reconnectTimeout) {
            clearTimeout(reconnectTimeout);
            reconnectTimeout = null;
        }
        logger.info('✅ Successfully connected to WhatsApp');
        
    } else if (connection === 'connecting') {
        logger.info('🔄 Connecting to WhatsApp...');
    }
};
