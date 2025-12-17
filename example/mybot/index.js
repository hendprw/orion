// =====================================================
// FILE 14: example/mybot/index.js (ENHANCED)
// =====================================================
require('dotenv').config();
const { Bot, logger } = require('orion-wa');
const path = require('path');
const fs = require('fs').promises;

// Path ke file database JSON
const SETTINGS_FILE = path.join(__dirname, 'data', 'group-settings.json');

/**
 * Fetch group settings from JSON file
 */
async function fetchGroupSettings(groupId) {
    try {
        const data = await fs.readFile(SETTINGS_FILE, 'utf-8');
        const allSettings = JSON.parse(data);
        return allSettings[groupId] || null;
    } catch (error) {
        if (error.code === 'ENOENT') return null;
        logger.error({ err: error }, "Failed to read settings file");
        return null;
    }
}

// Initialize Bot
const bot = new Bot({
    commandsPath: path.join(__dirname, 'commands'),
    middlewaresPath: path.join(__dirname, 'middlewares'),
    getGroupSettings: fetchGroupSettings,
    defaultCommandCooldown: 5
});

// Make bot instance globally accessible for stats command
global.botInstance = bot;

// Graceful shutdown handler
process.on('SIGINT', async () => {
    logger.info('Received SIGINT signal');
    await bot.shutdown();
});

process.on('SIGTERM', async () => {
    logger.info('Received SIGTERM signal');
    await bot.shutdown();
});

// Handle uncaught errors
process.on('uncaughtException', (err) => {
    logger.error({ err }, '💥 Uncaught Exception');
    process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
    logger.error({ reason }, '💥 Unhandled Rejection');
});

// Start bot
bot.connect().then(() => {
    logger.info('🎉 Bot started successfully');
}).catch(err => {
    logger.error({ err }, '❌ Failed to start bot');
    process.exit(1);
});
