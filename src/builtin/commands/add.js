// src/builtin/commands/add.js
module.exports = {
    name: 'add',
    description: 'Menambahkan anggota ke grup.',
    isGroupOnly: true,
    isBotAdminOnly: true,
    isAdminOnly: true,
    // --- ATURAN ARGUMEN BARU ---
    args: {
        min: 1,
        max: 1,
        usage: '<nomor_hp>',
        types: ['number'] // Memastikan argumen adalah angka
    },
    async execute(sock, m) {
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