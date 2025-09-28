// src/middlewares/isGroupOnly.js
module.exports = {
    name: 'isGroupOnly',
    execute: async (sock, m, command) => {
        if (command.isGroupOnly && !m.isGroup) {
            await sock.reply(m, 'Perintah ini hanya bisa digunakan di dalam grup.');
            return false;
        }
        return true;
    }
};