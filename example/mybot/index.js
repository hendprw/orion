require('dotenv').config(); // <-- INI WAJIB DI ATAS SEMUA KODE LAIN
const { Bot, logger } = require('orion-wa');
const path = require('path');
const fs = require('fs').promises;

// Path ke file database JSON
const SETTINGS_FILE = path.join(__dirname, 'data', 'group-settings.json');

/**
 * Mengambil pengaturan dari file JSON.
 * Orion akan memanggil fungsi ini setiap kali ada anggota grup berubah.
 * Anda bisa menggantinya dengan logika database (SQL, MongoDB, dll).
 * @param {string} groupId - JID dari grup.
 * @returns {Promise<object|null>}
 */
async function fetchGroupSettings(groupId) {
    try {
        const data = await fs.readFile(SETTINGS_FILE, 'utf-8');
        const allSettings = JSON.parse(data);
        return allSettings[groupId] || null;
    } catch (error) {
        if (error.code === 'ENOENT') return null;
        console.error("Gagal membaca file pengaturan:", error);
        return null;
    }
}

// Konfigurasi Bot Orion
const bot = new Bot({
    // sessionName & prefix diambil dari .env, bisa di-override di sini
    commandsPath: path.join(__dirname, 'commands'),
    getGroupSettings: fetchGroupSettings,
    defaultCommandCooldown: 5 // Cooldown default 5 detik untuk semua perintah
});

// Jalankan bot
bot.connect();