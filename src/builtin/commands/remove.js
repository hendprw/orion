// orion/src/builtin/commands/remove.js
module.exports = {
    name: 'remove',
    aliases: ['kick'],
    description: 'Mengeluarkan anggota dari grup.',
    isGroupOnly: true,
    isBotAdminOnly: true,
    isAdminOnly: true,
    async execute(sock, m) {
        if (m.mentionedJid.length === 0 && !m.isQuoted) {
             return await sock.reply(m, 'Mention target atau reply pesan target.');
        }

        const targetJid = m.mentionedJid[0] || m.quoted.sender;
        
        try {
            await sock.groupParticipantsUpdate(m.chat, [targetJid], 'remove');
        } catch (error) {
            await sock.reply(m, `Gagal mengeluarkan anggota.`);
        }
    }
};