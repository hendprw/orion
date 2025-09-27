// orion/src/builtin/commands/add.js
module.exports = {
    name: 'add',
    description: 'Menambahkan anggota ke grup.',
    isGroupOnly: true,
    isBotAdminOnly: true,
    isAdminOnly: true,
    async execute(sock, m) {
        if (!m.args[0] && !m.isQuoted) {
            return await sock.reply(m, 'Berikan nomor atau reply pesan target.');
        }

        let targetJid;
        if (m.args[0]) {
            targetJid = m.args[0].replace(/[^0-9]/g, '') + '@s.whatsapp.net';
        } else if (m.isQuoted) {
            targetJid = m.quoted.sender;
        }

        try {
            await sock.groupParticipantsUpdate(m.chat, [targetJid], 'add');
        } catch (error) {
            await sock.reply(m, `Gagal menambahkan anggota. Pastikan nomor valid atau bot adalah admin.`);
        }
    }
};