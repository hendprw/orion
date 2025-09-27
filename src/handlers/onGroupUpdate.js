// orion/src/handlers/onGroupUpdate.js
const logger = require('../utils/logger');

/**
 * Membuat handler untuk event 'group-participants.update'.
 * @param {Function} getGroupSettings - Fungsi async (groupId) => Promise<Object|null> yang Anda sediakan untuk mengambil data dari DB.
 * @returns {Function} Handler yang akan dieksekusi oleh Baileys.
 */
const createGroupUpdateHandler = (getGroupSettings) => {
    /**
     * @param {import('@whiskeysockets/baileys').WASocket} sock 
     * @param {object} update 
     */
    return async (sock, update) => {
        const { id, participants, action } = update;
        const memberJid = participants[0];

        try {
            // 1. Panggil fungsi yang disediakan pengguna untuk mengambil pengaturan
            const groupSettings = await getGroupSettings(id);
            if (!groupSettings) return; // Jika tidak ada pengaturan, hentikan

            const groupMetadata = await sock.groupMetadata(id);

            // 2. Logika untuk pesan selamat datang (add)
            if (action === 'add' && groupSettings.welcome?.enabled) {
                let welcomeText = groupSettings.welcome.message || 'Selamat datang %%mention%% di grup %%group%%!';

                // Ganti placeholder
                welcomeText = welcomeText.replace(/%%group%%/g, groupMetadata.subject);
                welcomeText = welcomeText.replace(/%%mention%%/g, `@${memberJid.split('@')[0]}`);
                
                await sock.sendTextWithMentions(id, welcomeText, [memberJid]);
            }
            
            // 3. Logika untuk pesan selamat tinggal (remove)
            if (action === 'remove' && groupSettings.goodbye?.enabled) {
                let goodbyeText = groupSettings.goodbye.message || 'Selamat tinggal %%mention%%!';
                
                // Ganti placeholder
                goodbyeText = goodbyeText.replace(/%%group%%/g, groupMetadata.subject);
                goodbyeText = goodbyeText.replace(/%%mention%%/g, `@${memberJid.split('@')[0]}`);

                await sock.sendTextWithMentions(id, goodbyeText, [memberJid]);
            }

        } catch (err) {
            logger.error({ err }, "Error di group participants handler");
        }
    };
};

module.exports = createGroupUpdateHandler;