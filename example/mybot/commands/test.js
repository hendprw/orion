// commands/core/test.js

// Fungsi sleep untuk memberi jeda antar pesan agar tidak terjadi spam
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

module.exports = {
    name: 'test',
    aliases: ['testall', 'uji'],
    description: 'Menjalankan serangkaian tes untuk semua fungsi enhanceSocket.',
    
    async execute(sock, m) {
        // Menggunakan URL gambar yang Anda berikan
        const testImageUrl = 'https://avatars.githubusercontent.com/u/5669388?v=4';
        const localImagePath = 'https://avatars.githubusercontent.com/u/5669388?v=4'; // Diperlukan untuk tes file lokal

        try {
            // --- TES 1: FUNGSI DASAR & TEKS ---
            await sock.reply(m, 'Memulai pengujian fitur Orion Framework...');
            await sleep(1000);

            await sock.react(m, '🧪');
            await sleep(1000);

            const sentMsg = await sock.sendText(m.chat, 'Ini adalah pesan teks biasa.');
            await sleep(2000);
            
            await sock.editMessage(sentMsg.key, 'Pesan ini berhasil diedit!');
            await sleep(2000);

            await sock.sendTextWithMentions(m.chat, `Tes mention untuk @${m.sender.split('@')[0]}`, [m.sender]);
            await sleep(2000);

            // --- TES 2: FUNGSI MEDIA (Kirim & Download) ---
            await sock.reply(m, '--- Memulai Tes Media ---');
            await sleep(1000);

            await sock.sendImage(m.chat, testImageUrl, 'Ini adalah gambar dari URL GitHub.');
            await sleep(3000);
            
            
            // --- TES 3: FUNGSI PESAN KUSTOM (AdReply & Lokasi) ---
            await sock.reply(m, '--- Memulai Tes Pesan Kustom ---');
            await sleep(1000);

            await sock.sendAdReply(
                m.chat,
                'Ini adalah AdReply dengan thumbnail kecil dari URL GitHub.',
                'Profil Pengguna', 'hendprw', testImageUrl,
                { sourceUrl: 'https://github.com/hendprw', quoted: m.msg }
            );
            await sleep(3000);

            await sock.sendAdReply(
                m.chat,
                'Ini adalah AdReply dengan thumbnail BESAR dari file lokal.',
                'Tes Gambar Lokal', 'Aset dari direktori lokal', localImagePath,
                { largeThumb: true, sourceUrl: 'https://www.google.com' }
            );
            await sleep(3000);

            await sock.sendLocationWithImage(m.chat, testImageUrl);
            await sleep(2000);
            
            await sock.reply(m, '✅ Semua tes berhasil dijalankan!');
            await sock.react(m, '🎉');

        } catch (error) {
            console.error('Terjadi error selama pengujian:', error);
            await sock.reply(m, `❌ Terjadi error: ${error.message}`);
        }
    }
};