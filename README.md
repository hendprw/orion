# Orion Framework

Orion adalah *framework* bot WhatsApp yang kuat, modular, dan efisien, dibangun di atas Baileys. Didesain untuk kemudahan penggunaan dan skalabilitas, memungkinkan Anda membangun bot WhatsApp kompleks dengan cepat.

## Fitur

-   **Struktur Modular**: Logika terpisah dalam file perintah yang mudah dikelola.
-   **Hot Reload**: Perbarui perintah secara otomatis tanpa me-restart bot.
-   **Manajemen Sesi**: Dibangun di atas `useMultiFileAuthState` untuk sesi yang andal.
-   **Cooldown Perintah**: Fitur bawaan untuk mencegah *spamming* perintah.
-   **Handler Kustom**: Mudah mengimplementasikan logika kustom untuk event grup.
-   **Puluhan Helper Functions**: Dilengkapi dengan fungsi pembantu untuk mengirim media, mereply, dll.

## Instalasi & Setup

1.  **Install package:**
    ```bash
    npm install orion-wa dotenv
    ```

2.  **Buat file `.env`** di direktori root proyek Anda untuk menyimpan konfigurasi:
    ```env
    # File: .env
    SESSION_NAME=mysession
    PREFIX=!
    ```

3.  **Struktur Proyek Anda:**
    ```
    my-bot/
    ├── commands/
    │   └── util/
    │       └── ping.js
    ├── data/
    │   └── group-settings.json
    ├── session/
    ├── .env
    └── index.js
    ```

---

## Contoh Penggunaan Lengkap

### `index.js` (File Utama)

```javascript
const { Bot } = require('orion-wa');
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

## Fitur Bawaan (Built-in)

Orion dilengkapi dengan beberapa fitur bawaan yang dapat diaktifkan melalui file `.env`. Ini memungkinkan Anda untuk memiliki fungsionalitas dasar tanpa perlu membuat perintah dari nol.

### Konfigurasi

Salin isi dari `.env.example` ke file baru bernama `.env` dan atur nilainya ke `true` untuk fitur yang ingin Anda aktifkan.

### Daftar Fitur Bawaan

**Perintah:**
-   **ping**: Mengecek latensi bot.
    -   `.env`: `BUILTIN_COMMAND_PING_ENABLED=true`
-   **add**: Menambahkan anggota ke grup (memerlukan admin).
    -   `.env`: `BUILTIN_COMMAND_ADD_ENABLED=true`
-   **remove/kick**: Mengeluarkan anggota dari grup (memerlukan admin).
    -   `.env`: `BUILTIN_COMMAND_REMOVE_ENABLED=true`

**Event Grup:**
-   **Welcomer**: Mengirim pesan selamat datang saat anggota baru bergabung.
    -   `.env`: `BUILTIN_WELCOMER_ENABLED=true`
    -   Kustomisasi pesan: `BUILTIN_WELCOMER_MESSAGE="Teks Anda di sini"`
-   **Goodbye**: Mengirim pesan selamat tinggal saat anggota keluar.
    -   `.env`: `BUILTIN_GOODBYE_ENABLED=true`
    -   Kustomisasi pesan: `BUILTIN_GOODBYE_MESSAGE="Teks Anda di sini"`

**Catatan**: Fitur event grup bawaan ini berjalan *bersamaan* dengan fitur `getGroupSettings` kustom Anda. Anda bisa menggunakan keduanya atau salah satunya.