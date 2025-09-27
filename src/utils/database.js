// orion/src/utils/database.js
const mongoose = require('mongoose');
const logger = require('./logger');

async function connectDB(mongoURI) {
    if (!mongoURI) {
        logger.error('mongoURI tidak disediakan. Bot tidak dapat terhubung ke database.');
        return;
    }

    try {
        await mongoose.connect(mongoURI);
        logger.info('Berhasil terhubung ke database MongoDB.');
    } catch (err) {
        logger.error({ err }, 'Gagal terhubung ke database MongoDB.');
        process.exit(1);
    }
}

module.exports = { connectDB };