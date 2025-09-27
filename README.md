# Orion Framework

Orion adalah *framework* bot WhatsApp yang kuat, modular, dan efisien, dibangun di atas Baileys. Didesain untuk kemudahan penggunaan dan skalabilitas, memungkinkan Anda membangun bot WhatsApp kompleks dengan cepat.

## Fitur

- **Modern & Cepat**: Dibangun dengan Baileys terbaru.
- **Modular**: Struktur berbasis perintah yang mudah diperluas.
- **Hot Reload**: Perintah dapat di-update secara otomatis tanpa me-restart bot.
- **Handler Kustom**: Mudah mengimplementasikan logika kustom untuk event grup.
- **Helper Functions**: Dilengkapi dengan puluhan fungsi pembantu untuk mengirim berbagai jenis pesan.
- **Parsing Pesan Otomatis**: Pesan masuk di-parsing menjadi objek yang mudah dikelola.

## Instalasi

```bash
npm install orion-wa mongoose
```

## Cara Penggunaan

### Contoh 1: Bot Perintah Sederhana

**1. Struktur Folder:**
```
my-bot/
├── commands/
│   └── ping.js
├── session/
└── index.js
```

**2. Perintah `ping.js`:**
```javascript
module.exports = {
    name: 'ping',
    execute: async (sock, m) => {
        await sock.reply(m, 'Pong!');
    }
};
```

**3. File Utama `index.js`:**
```javascript
const { Bot } = require('orion-wa');
const path = require('path');

const bot = new Bot({
    sessionName: 'session',
    prefix: '!',
    commandsPath: path.join(__dirname, 'commands')
});

bot.connect();
```

---

### Contoh 2: Menggunakan Handler Grup (Welcome/Goodbye)

**1. Buat Model Database (Contoh dengan Mongoose):**
```javascript
// models/Group.js
const mongoose = require('mongoose');

const groupSchema = new mongoose.Schema({
    groupId: { type: String, required: true, unique: true },
    welcome: {
        enabled: { type: Boolean, default: false },
        message: { type: String, default: 'Selamat datang %%mention%% di grup %%group%%!' }
    },
    goodbye: {
        enabled: { type: Boolean, default: false },
        message: { type: String, default: 'Selamat tinggal %%mention%%!' }
    }
});

module.exports = mongoose.model('Group', groupSchema);
```

**2. Implementasikan di `index.js`:**
```javascript
const { Bot } = require('orion-wa');
const path = require('path');
const mongoose = require('mongoose');
const Group = require('./models/Group'); // Impor model Anda

// Fungsi untuk mengambil data dari database
// Orion akan memanggil fungsi ini setiap kali ada anggota grup berubah
async function fetchGroupSettings(groupId) {
    try {
        const settings = await Group.findOne({ groupId }).lean();
        return settings;
    } catch (error) {
        console.error("Gagal mengambil pengaturan grup:", error);
        return null;
    }
}

// Koneksi ke DB
mongoose.connect('mongodb://localhost:27017/bot_db')
    .then(() => console.log('Terhubung ke MongoDB'));

const bot = new Bot({
    sessionName: 'session',
    prefix: '!',
    commandsPath: path.join(__dirname, 'commands'),
    getGroupSettings: fetchGroupSettings // Suntikkan fungsi Anda ke bot
});

bot.connect();
```

Dengan cara ini, logic welcome/goodbye berada di dalam library, tetapi **sumber datanya (database) sepenuhnya dikontrol oleh Anda**. Ini adalah pendekatan terbaik untuk sebuah framework.