
<div align="center">
  <img src="https://i.imgur.com/your-logo.png" alt="Orion Logo" width="150"/>
  <h1>Orion Framework</h1>
  <p>
    <strong>Framework Bot WhatsApp yang Kuat, Modular, dan Developer-Friendly.</strong>
  </p>
  <p>
    Dibangun di atas Baileys untuk memberikan performa tinggi dan stabilitas, dengan abstraksi tingkat tinggi agar Anda bisa fokus membangun fitur-fitur luar biasa.
  </p>
</div>

## ✨ Fitur Utama

Orion dirancang dengan serangkaian fitur canggih untuk mempercepat dan menyederhanakan proses pengembangan bot Anda:

* ⚡️ **Struktur Perintah Modular**: Organisasikan perintah Anda dalam file-file terpisah yang bersih dan mudah dikelola.
* 🔄 **Hot Reloading**: Perbarui, tambah, atau hapus perintah secara *real-time* tanpa perlu me-restart bot.
* 🛡️ **Sistem Middleware**: Cegat dan proses data sebelum perintah dieksekusi untuk *logging*, validasi, atau modifikasi.
* 🛠️ **Puluhan Fungsi Helper**: Objek `sock` diperkaya dengan fungsi-fungsi praktis seperti `sock.reply`, `sock.sendImage`, `sock.downloadMedia`, dan banyak lagi.
* ⏱️ **Manajemen Cooldown**: Cegah *spamming* dengan fitur *cooldown* bawaan yang dapat dikonfigurasi per perintah atau secara global.
* ⚙️ **Mode Pengembangan**: Isolasi bot agar hanya merespons *owner* saat Anda sedang melakukan *coding* atau *debugging*.
* 📦 **Fitur Bawaan Siap Pakai**: Aktifkan perintah umum (`ping`, `help`) dan *event* grup (welcomer, goodbye) dengan mudah melalui file `.env`.

---

## 🚀 Instalasi & Setup Cepat

### 1. Instalasi
Mulailah proyek baru dan instal dependensi yang diperlukan.

```bash
npm init -y
npm install orion-wa dotenv
````

### 2\. Struktur Proyek

Susun proyek Anda dengan struktur berikut untuk skalabilitas maksimal.

```
my-bot/
├── commands/
│   └── utility/
│       └── my-command.js
├── session/
├── .env
└── index.js
```

### 3\. Quick Start: `index.js`

Buat file `index.js` Anda. Ini adalah jantung dari bot Anda.

```javascript
// index.js
require('dotenv').config(); // Muat variabel lingkungan
const { Bot } = require('orion-wa');
const path = require('path');

// Inisialisasi Bot Orion dengan konfigurasi
const bot = new Bot({
    // Tentukan path ke direktori perintah kustom Anda
    commandsPath: path.join(__dirname, 'commands'),
    
    // Atur cooldown default untuk semua perintah (dalam detik)
    defaultCommandCooldown: 5 
});

// (Opsional) Gunakan sistem middleware untuk logging atau validasi
const loggerMiddleware = (sock, m, next) => {
    console.log(`[EXEC] Perintah '${m.command}' dari ${m.sender.split('@')[0]}`);
    next(); // Lanjutkan ke middleware berikutnya atau eksekusi perintah
};
bot.use(loggerMiddleware);

// Hubungkan bot ke WhatsApp
bot.connect();
```

-----

## 核心概念 (Core Concepts)

Memahami konsep inti Orion adalah kunci untuk memaksimalkan potensinya.

### 🔹 Objek Perintah

Setiap file `.js` di dalam direktori `commands` Anda adalah sebuah modul perintah. Modul ini harus mengekspor sebuah objek dengan properti-properti berikut:

| Properti | Tipe | Deskripsi |
| :--- | :--- | :--- |
| `name` | `string` | **Wajib.** Nama utama untuk memanggil perintah. |
| `execute` | `function` | **Wajib.** Fungsi yang akan dieksekusi. |
| `aliases` | `string[]` | Nama alternatif untuk perintah. |
| `description` | `string` | Penjelasan singkat tentang fungsi perintah (digunakan oleh `!help`). |
| `category` | `string` | Kategori untuk pengelompokan di `!help`. |
| `cooldown` | `number` | Waktu jeda (detik) spesifik untuk perintah ini, menimpa *default*. |
| `isGroupOnly` | `boolean` | Jika `true`, perintah hanya bisa dijalankan di grup. |
| `isAdminOnly` | `boolean` | Jika `true`, hanya admin grup yang bisa menjalankan. |
| `isBotAdminOnly` | `boolean` | Jika `true`, perintah hanya berjalan jika bot adalah admin. |
| `isOwnerOnly` | `boolean` | Jika `true`, hanya *owner* yang didefinisikan di `.env` yang bisa menjalankan. |

### 🔹 Objek Pesan (`m`)

Setiap perintah dan *middleware* menerima objek `m` yang sudah di-*parse* dan kaya akan informasi. Ini menyederhanakan interaksi dengan pesan yang masuk.

| Properti | Tipe | Deskripsi |
| :--- | :--- | :--- |
| `msg` | `object` | Objek pesan mentah dari Baileys. |
| `key` | `object` | Kunci unik dari pesan (`id`, `remoteJid`, dll.). |
| `chat` | `string` | JID dari obrolan (grup atau pribadi). |
| `sender` | `string` | JID dari pengirim pesan. |
| `isGroup` | `boolean` | `true` jika pesan berasal dari grup. |
| `body` | `string` | Isi teks lengkap dari pesan. |
| `args` | `string[]` | Array argumen setelah perintah. |
| `command` | `string` | Nama perintah yang dieksekusi. |
| `isMedia` | `boolean` | `true` jika pesan berisi media (gambar, video, stiker). |
| `isQuoted` | `boolean` | `true` jika pesan me-reply pesan lain. |
| `quoted` | `object` | Berisi detail pesan yang di-reply (`key`, `sender`, `msg`). |
| `groupMetadata` | `object`| Metadata grup (jika `isGroup`), berisi subjek, partisipan, dll. |
| `isAdmin` | `boolean` | `true` jika pengirim adalah admin grup. |
| `isBotAdmin` | `boolean` | `true` jika bot adalah admin di grup tersebut. |

### 🔹 Penanganan Event Grup

Orion menangani anggota yang bergabung atau keluar grup melalui **fitur bawaan** yang dikontrol sepenuhnya dari file `.env` Anda. Ini adalah cara yang cepat dan mudah untuk mengaktifkan pesan selamat datang dan selamat tinggal.

Cukup atur variabel berikut di file `.env` Anda:

```env
# Aktifkan atau nonaktifkan fitur welcomer
BUILTIN_WELCOMER_ENABLED=true
# Kustomisasi pesan (%%mention%% dan %%group%% adalah placeholder)
BUILTIN_WELCOMER_MESSAGE="Selamat datang %%mention%% di %%group%%!"

# Aktifkan atau nonaktifkan fitur goodbye
BUILTIN_GOODBYE_ENABLED=true
BUILTIN_GOODBYE_MESSAGE="Selamat jalan %%mention%%..."
```

-----

## ⚙️ Konfigurasi (`.env`)

Buat file `.env` di root proyek Anda dan isi dengan konfigurasi berikut.

```env
# --- KONFIGURASI INTI ---
SESSION_NAME=mysession
PREFIX=!

# --- PENGATURAN PENGEMBANGAN ---
# Atur ke 'true' untuk membuat bot hanya merespon owner.
DEVELOPMENT_MODE=false
# Ganti dengan nomor WhatsApp Anda (format: 628xxxxxxxxxx@s.whatsapp.net)
BOT_OWNER_JID=

# --- FITUR BAWAAN (isi 'true' untuk mengaktifkan) ---
BUILTIN_COMMAND_PING_ENABLED=true
BUILTIN_COMMAND_HELP_ENABLED=true
BUILTIN_COMMAND_ADD_ENABLED=true
BUILTIN_COMMAND_REMOVE_ENABLED=true

# --- EVENT GRUP BAWAAN ---
BUILTIN_WELCOMER_ENABLED=true
BUILTIN_WELCOMER_MESSAGE="Hai %%mention%%! Selamat datang di surga %%group%%. Jangan lupa baca deskripsi ya!"
BUILTIN_GOODBYE_ENABLED=true
BUILTIN_GOODBYE_MESSAGE="Yah, %%mention%% meninggalkan kita..."
```

-----

## 🤝 Kontribusi

Kami sangat terbuka untuk kontribusi\! Jika Anda ingin membantu, silakan *fork* repositori ini dan buat *pull request*. Untuk perubahan besar, mohon buka *issue* terlebih dahulu untuk mendiskusikan apa yang ingin Anda ubah.

## 📜 Lisensi

Proyek ini dilisensikan di bawah Lisensi MIT.

```
```