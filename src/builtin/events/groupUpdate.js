// orion/src/builtin/events/groupUpdate.js
const logger = require('../../utils/logger');

/**
 * Menangani event welcome/goodbye yang dikontrol via .env.
 * @param {import('@whiskeysockets/baileys').WASocket} sock 
 * @param {object} update 
 */
const builtinGroupUpdateHandler = async (sock, update) => {
    const { id, participants, action } = update;
    const memberJid = participants[0];

    try {
        const groupMetadata = await sock.groupMetadata(id);
        const memberName = `@${memberJid.split('@')[0]}`;
        const groupName = groupMetadata.subject;

        // Logika Welcome Bawaan
        if (action === 'add' && process.env.BUILTIN_WELCOMER_ENABLED === 'true') {
            let welcomeText = process.env.BUILTIN_WELCOMER_MESSAGE || 'Selamat datang %%mention%% di grup %%group%%!';
            welcomeText = welcomeText.replace(/%%mention%%/g, memberName).replace(/%%group%%/g, groupName);
            await sock.sendTextWithMentions(id, welcomeText, [memberJid]);
        }

        // Logika Goodbye Bawaan
        if (action === 'remove' && process.env.BUILTIN_GOODBYE_ENABLED === 'true') {
            let goodbyeText = process.env.BUILTIN_GOODBYE_MESSAGE || 'Selamat tinggal %%mention%%!';
            goodbyeText = goodbyeText.replace(/%%mention%%/g, memberName).replace(/%%group%%/g, groupName);
            await sock.sendTextWithMentions(id, goodbyeText, [memberJid]);
        }

    } catch (err) {
        logger.error({ err }, "Error di handler grup bawaan");
    }
};

module.exports = builtinGroupUpdateHandler;