// src/middlewares/isAdminOnly.js
module.exports = {
    name: 'isAdminOnly',
    execute: async (sock, m, command) => {
        if (command.isAdminOnly && !m.isAdmin) {
            await sock.reply(m, 'Perintah ini hanya untuk admin grup.');
            return false;
        }
        return true;
    }
};