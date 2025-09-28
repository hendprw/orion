<div align="center">
<img src="[https://sdmntpraustraliaeast.oaiusercontent.com/files/00000000-91b8-61fa-8123-6a9f7e64526f/raw?se=2025-09-27T15%3A38%3A19Z&sp=r&sv=2024-08-04&sr=b&scid=02a82f96-d467-5e53-b8d6-f939d34123b1&skoid=8cb40e9f-389f-4cf6-afaa-e5bd4c7fd98c&sktid=a48cca56-e6da-484e-a814-9c849652bcb3&skt=2025-09-26T17%3A00%3A24Z&ske=2025-09-27T17%3A00%3A24Z&sks=b&skv=2024-08-04&sig=uI2sKdAxpE/tkOVRfNUlY6xL/cqcTPn2l21CKOYEVxs%3D](https://sdmntpraustraliaeast.oaiusercontent.com/files/00000000-91b8-61fa-8123-6a9f7e64526f/raw?se=2025-09-27T15%3A38%3A19Z&sp=r&sv=2024-08-04&sr=b&scid=02a82f96-d467-5e53-b8d6-f939d34123b1&skoid=8cb40e9f-389f-4cf6-afaa-e5bd4c7fd98c&sktid=a48cca56-e6da-484e-a814-9c849652bcb3&skt=2025-09-26T17%3A00%3A24Z&ske=2025-09-27T17%3A00%3A24Z&sks=b&skv=2024-08-04&sig=uI2sKdAxpE/tkOVRfNUlY6xL/cqcTPn2l21CKOYEVxs%3D)" alt="Orion Logo" width="200"/>

<h1>Orion Framework</h1>
<p>
<strong>Framework Bot WhatsApp yang Kuat, Modular, dan Ramah Pengembang.</strong>
</p>
<p>
Dibangun di atas <a href="[https://github.com/WhiskeySockets/Baileys](https://github.com/WhiskeySockets/Baileys)">Baileys</a>, Orion menyediakan abstraksi tingkat tinggi untuk memungkinkan Anda fokus membangun fitur luar biasa, bukan kode boilerplate.
</p>
</div>

## ✨ Fitur Inti

  * ⚡️ **Sistem Perintah Modular**: Atur perintah Anda dalam file-file terpisah yang bersih untuk manajemen yang mudah.
  * 🔄 **Hot Reloading**: Perbarui, tambah, atau hapus perintah secara *real-time* tanpa me-restart seluruh bot.
  * 🛡️ **Arsitektur Middleware**: Cegat dan proses pesan sebelum perintah dieksekusi. Sempurna untuk validasi, logging, atau modifikasi. Mendukung *middleware* bawaan dan kustom.
  * ⚙️ **Validasi Argumen Otomatis**: Definisikan aturan untuk argumen perintah (misalnya, jumlah, tipe) langsung di objek perintah untuk validasi otomatis.
  * ⏱️ **Sistem Antrian & Rate Limiting**: Kontrol beban kerja bot dengan sistem antrian per-pengguna dan global yang dapat dikonfigurasi untuk mencegah spam dan *overload*.
  * 🛠️ **Helper Socket yang Ditingkatkan**: Objek `sock` dilengkapi dengan puluhan fungsi pembantu praktis seperti `sock.reply`, `sock.sendImage`, `sock.downloadMedia`, dan banyak lagi.
  * 📦 **Fitur Bawaan Siap Pakai**: Aktifkan dengan mudah perintah umum (`ping`, `add`, `remove`) dan acara grup (penyambutan, selamat tinggal) langsung dari file `.env` Anda.

-----

## 🚀 Instalasi & Mulai Cepat

### 1. Instalasi

Mulai proyek baru dan instal dependensi yang diperlukan. Untuk pengalaman terbaik, gunakan CLI `create-orion-bot`.

```bash
npx create-orion-bot nama-bot-saya
cd nama-bot-saya
npm install
```

Atau, secara manual:

```bash
npm init -y
npm install orion-wa dotenv
```

### 2. Struktur Proyek

Atur proyek Anda dengan struktur berikut untuk skalabilitas maksimum.

```
my-bot/
├── commands/
│   └── utility/
│       └── ping.js
├── middlewares/
│   └── checkPremium.js
├── session/
├── .env
└── index.js
```

### 3. Titik Masuk `index.js`

File ini adalah jantung dari bot Anda.

```javascript
//index.js
require('dotenv').config();
const { Bot } = require('orion-wa');
const path = require('path');

// Inisialisasi Orion Bot dengan konfigurasi Anda
const bot = new Bot({
    // Path ke direktori perintah kustom Anda
    commandsPath: path.join(__dirname, 'commands'),
    
    // (Opsional) Path ke direktori middleware kustom Anda
    middlewaresPath: path.join(__dirname, 'middlewares'),
});


bot.connect();
```

-----

## 核心概念 (Konsep Inti)

Memahami konsep inti Orion adalah kunci untuk membuka potensi penuhnya.

### 🔹 Objek Perintah

Setiap file `.js` di dalam direktori `commands` Anda adalah modul perintah. Ia harus mengekspor objek dengan properti berikut:

| Properti | Tipe | Deskripsi |
| :--- | :--- | :--- |
| `name` | `string` | **Wajib.** Nama utama untuk memicu perintah. |
| `execute` | `function` | **Wajib.** Fungsi yang berjalan saat perintah dipanggil. Menerima `(sock, m, logger)`. |
| `aliases` | `string[]` | Nama alternatif untuk perintah. |
| `description`| `string` | Penjelasan singkat yang digunakan oleh perintah bantuan. |
| `category` | `string` | Digunakan untuk mengelompokkan perintah di menu bantuan. |
| `cooldown` | `number` | Cooldown spesifik perintah dalam detik, menimpa default. |
| `isGroupOnly`| `boolean` | Jika `true`, perintah hanya bisa digunakan di grup. |
| `isAdminOnly`| `boolean` | Jika `true`, hanya admin grup yang bisa menjalankannya. |
| `isBotAdminOnly`|`boolean` | Jika `true`, perintah hanya berfungsi jika bot adalah admin grup. |
| `isOwnerOnly`| `boolean` | Jika `true`, hanya pemilik bot (didefinisikan di `.env`) yang bisa menggunakannya. |
| `args` | `object` | Objek yang mendefinisikan aturan validasi untuk argumen (lihat Penggunaan Lanjutan). |
| `middlewares`| `string[]` | Array nama *middleware* kustom yang akan dijalankan sebelum perintah. |

**Contoh Perintah: `commands/utility/kick.js`**

```javascript
module.exports = {
    name: 'kick',
    aliases: ['tendang'],
    description: 'Mengeluarkan anggota dari grup.',
    category: 'admin',
    isGroupOnly: true,
    isAdminOnly: true,
    isBotAdminOnly: true,
    // Aturan validasi untuk argumen
    args: {
        min: 1,
        usage: '@mention',
        types: ['mention']
    },
    // Menjalankan middleware kustom (jika ada)
    middlewares: ['logKickAction'], 
    
    async execute(sock, m) {
        const targetJid = m.mentionedJid[0] || m.quoted.sender;
        await sock.groupParticipantsUpdate(m.chat, [targetJid], 'remove');
        await sock.reply(m, `Berhasil mengeluarkan @${targetJid.split('@')[0]}`);
    }
};
```

### 🔹 Arsitektur Middleware

*Middleware* adalah fungsi yang berjalan di antara parsing pesan dan eksekusi perintah. Gunakan untuk validasi, *logging*, atau memodifikasi permintaan.

  * **Middleware Bawaan**: Diaktifkan dengan properti boolean pada objek perintah seperti `isGroupOnly: true`.
  * **Middleware Kustom**: Buat file di direktori `middlewares/` Anda, lalu terapkan menggunakan properti `middlewares: ['namaMiddleware']` pada perintah.

**Contoh Middleware Kustom: `middlewares/checkPremium.js`**

```javascript
module.exports = {
    name: 'checkPremium',
    async execute(sock, m, command) {
        // ...logika untuk memeriksa apakah m.sender adalah pengguna premium...
        const isPremium = true; // Ganti dengan logika database Anda
        
        if (!isPremium) {
            await sock.reply(m, 'Perintah ini hanya untuk pengguna premium!');
            return false; // Menghentikan eksekusi
        }
        return true; // Lanjutkan ke perintah
    }
}
```

### 🔹 Objek Pesan yang Di-parse (`m`)

Setiap perintah dan *middleware* menerima objek pesan `m` yang sudah di-parse untuk interaksi yang mudah.

| Properti | Tipe | Deskripsi |
| :--- | :--- | :--- |
| `msg` | `object` | Objek pesan mentah dari Baileys. |
| `key` | `object` | Kunci unik pesan (`id`, `remoteJid`, dll.). |
| `chat` | `string` | JID dari obrolan (grup atau pribadi). |
| `sender` | `string` | JID dari penulis pesan. |
| `isGroup` | `boolean` | `true` jika pesan berasal dari grup. |
| `body` | `string` | Konten teks lengkap dari pesan. |
| `args` | `string[]` | Array argumen yang mengikuti perintah. |
| `command` | `string` | Nama perintah yang dieksekusi. |
| `isMedia` | `boolean` | `true` jika pesan berisi media (gambar, video, stiker). |
| `isQuoted` | `boolean` | `true` jika pesan adalah balasan ke pesan lain. |
| `quoted` | `object` | Berisi detail pesan yang dibalas (`key`, `sender`, `msg`). |
| `groupMetadata`|`object`| Metadata grup (jika `isGroup`), berisi subjek, partisipan, dll. |
| `isAdmin` | `boolean` | `true` jika pengirim adalah admin grup. |
| `isBotAdmin` | `boolean` | `true` jika bot adalah admin di grup. |

-----

## ⚙️ Konfigurasi (`.env`)

Buat file `.env` di root proyek Anda untuk mengonfigurasi bot Anda.

```env
# --- KONFIGURASI INTI ---
SESSION_NAME=mysession
PREFIX=!

# --- FITUR BAWAAN (atur ke 'true' untuk mengaktifkan) ---
BUILTIN_COMMAND_PING_ENABLED=true
BUILTIN_COMMAND_ADD_ENABLED=true
BUILTIN_COMMAND_REMOVE_ENABLED=true

# --- EVENT GRUP BAWAAN ---
BUILTIN_WELCOMER_ENABLED=true
BUILTIN_WELCOMER_MESSAGE="Hai %%mention%%! Selamat datang di %%group%%."
BUILTIN_GOODBYE_ENABLED=true
BUILTIN_GOODBYE_MESSAGE="Yah, %%mention%% telah meninggalkan kita..."

# --- PENGATURAN ANTRIAN (RATE LIMIT) ---
# Aktifkan sistem antrian untuk mencegah spam dan overload
QUEUE_ENABLED=true
# Pengaturan Antrian Global (mengontrol semua perintah dari semua pengguna)
QUEUE_GLOBAL_CONCURRENCY=20
QUEUE_GLOBAL_INTERVAL_CAP=60
QUEUE_GLOBAL_INTERVAL=1000
# Pengaturan Antrian per Pengguna (mengontrol satu pengguna)
QUEUE_PER_USER_CONCURRENCY=1
QUEUE_PER_USER_INTERVAL_CAP=3
QUEUE_PER_USER_INTERVAL=1500
```

-----

## 🤝 Berkontribusi

Kontribusi adalah apa yang membuat komunitas sumber terbuka menjadi tempat yang luar biasa untuk belajar, menginspirasi, dan berkreasi. Setiap kontribusi yang Anda buat **sangat dihargai**.

Jika Anda memiliki saran yang akan membuat ini lebih baik, silakan *fork* repo dan buat *pull request*. Anda juga bisa langsung membuka *issue* dengan tag "enhancement".

1.  *Fork* Proyek
2.  Buat Cabang Fitur Anda (`git checkout -b feature/FiturLuarBiasa`)
3.  *Commit* Perubahan Anda (`git commit -m 'Menambahkan FiturLuarBiasa'`)
4.  *Push* ke Cabang (`git push origin feature/FiturLuarBiasa`)
5.  Buka *Pull Request*

## 📜 Lisensi

Proyek ini didistribusikan di bawah Lisensi MIT. Lihat `LICENSE` untuk informasi lebih lanjut.