# Orion Framework

Orion adalah *framework* bot WhatsApp yang kuat, modular, dan efisien, dibangun di atas Baileys. Didesain untuk kemudahan penggunaan dan skalabilitas, memungkinkan Anda membangun bot WhatsApp kompleks dengan cepat.

## Fitur

-   **Modular**: Struktur berbasis perintah yang mudah diperluas.
-   **Hot Reload**: Perintah dapat di-update secara otomatis tanpa me-restart bot.
-   **Handler Kustom**: Mudah mengimplementasikan logika kustom untuk event grup.
-   **Helper Functions**: Dilengkapi dengan puluhan fungsi pembantu.

## Instalasi

```bash
npm install orion-wa
```

## Cara Penggunaan

### Contoh: Bot dengan Fitur Welcome/Goodbye

**1. Struktur Proyek Anda:**
```
my-bot/
├── commands/
│   └── ping.js
├── data/
│   └── group-settings.json  // Contoh penyimpanan data menggunakan file JSON
├── session/
└── index.js
```

**2. Siapkan Penyimpanan Data Anda (Contoh: `group-settings.json`):**
```json
{
  "12036304...g.us": {
    "welcome": {
      "enabled": true,
      "message": "Hai %%mention%%! Selamat datang di %%group%% 👋"
    },
    "goodbye": {
      "enabled": false
    }
  }
}
```

**3. Implementasikan Logika Anda di `index.js`:**
```javascript
const { Bot } = require('orion-wa');
const path = require('path');
const fs = require('fs').promises;

// Path ke file database JSON Anda
const SETTINGS_FILE = path.join(__dirname, 'data', 'group-settings.json');

/**
 * Fungsi ini akan mengambil data dari file JSON.
 * Orion akan memanggil fungsi ini setiap kali ada anggota grup berubah.
 * Anda bisa mengganti logika ini untuk membaca dari database SQL, MongoDB, dll.
 */
async function fetchGroupSettings(groupId) {
    try {
        const data = await fs.readFile(SETTINGS_FILE, 'utf-8');
        const allSettings = JSON.parse(data);
        return allSettings[groupId] || null; // Kembalikan pengaturan untuk grup spesifik
    } catch (error) {
        // Jika file tidak ada, kembalikan null
        if (error.code === 'ENOENT') return null; 
        console.error("Gagal membaca file pengaturan:", error);
        return null;
    }
}

// Konfigurasi Bot Orion
const bot = new Bot({
    sessionName: 'session',
    prefix: '!',
    commandsPath: path.join(__dirname, 'commands'),
    getGroupSettings: fetchGroupSettings // "Suntikkan" fungsi Anda ke bot
});

// Jalankan bot
bot.connect();
```

Dengan pendekatan ini, *framework* **Orion** Anda menjadi jauh lebih profesional, fleksibel, dan menarik bagi audiens developer yang lebih luas.