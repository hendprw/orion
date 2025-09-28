// src/middlewares/isBotAdminOnly.js
module.exports = {
    name: 'isBotAdminOnly',
    execute: async (sock, m, command) => {
        if (command.isBotAdminOnly && !m.isBotAdmin) {
            await sock.reply(m, 'Bot harus menjadi admin untuk menjalankan perintah ini.');
            return false;
        }
        return true;
    }
};