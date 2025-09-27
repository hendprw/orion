// orion/src/index.js
const Bot = require('./core/Bot');
const CommandHandler = require('./core/commandHandler');
const MessageParser = require('./core/messageParser');
const baileys = require('@whiskeysockets/baileys');
const logger = require('./utils/logger')

module.exports = {
    Bot,
    CommandHandler,
    MessageParser,
    baileys,
    logger
};