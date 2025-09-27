// orion/src/utils/logger.js
const pino = require('pino');
const pretty = require('pino-pretty');

const stream = pretty({
    colorize: true,
    levelFirst: true,
    translateTime: 'SYS:standard',
    ignore: 'pid,hostname',
});

const logger = pino({ level: 'info' }, stream);

module.exports = logger;