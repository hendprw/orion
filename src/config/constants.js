// =====================================================
// FILE: src/config/constants.js
// =====================================================
module.exports = {
    // Queue settings
    QUEUE: {
        ENABLED: process.env.QUEUE_ENABLED === 'true',
        GLOBAL_CONCURRENCY: parseInt(process.env.QUEUE_GLOBAL_CONCURRENCY, 10) || 20,
        GLOBAL_INTERVAL_CAP: parseInt(process.env.QUEUE_GLOBAL_INTERVAL_CAP, 10) || 60,
        GLOBAL_INTERVAL: parseInt(process.env.QUEUE_GLOBAL_INTERVAL, 10) || 1000,
        USER_CONCURRENCY: parseInt(process.env.QUEUE_PER_USER_CONCURRENCY, 10) || 1,
        USER_INTERVAL_CAP: parseInt(process.env.QUEUE_PER_USER_INTERVAL_CAP, 10) || 3,
        USER_INTERVAL: parseInt(process.env.QUEUE_PER_USER_INTERVAL, 10) || 1500
    },
    
    // Bot settings
    BOT: {
        SESSION_NAME: process.env.SESSION_NAME || 'session',
        PREFIX: process.env.PREFIX || '!',
        DEFAULT_COOLDOWN: parseInt(process.env.DEFAULT_COOLDOWN, 10) || 3,
        OWNER_NUMBERS: process.env.OWNER_NUMBERS?.split(',').map(n => n.trim()) || []
    },
    
    // Media settings
    MEDIA: {
        MAX_FILE_SIZE: 50 * 1024 * 1024, // 50MB
        TEMP_DIR: './temp',
        ALLOWED_IMAGE_TYPES: ['image/jpeg', 'image/png', 'image/webp'],
        ALLOWED_VIDEO_TYPES: ['video/mp4', 'video/3gpp'],
        STICKER_MAX_DURATION: 5, // seconds
        COMPRESSION_QUALITY: 70
    },
    
    // Reconnection settings
    RECONNECT: {
        MAX_ATTEMPTS: parseInt(process.env.MAX_RECONNECT_ATTEMPTS, 10) || 5,
        BASE_DELAY: parseInt(process.env.RECONNECT_BASE_DELAY, 10) || 1000,
        MAX_DELAY: parseInt(process.env.RECONNECT_MAX_DELAY, 10) || 30000
    },
    
    // Error messages
    ERRORS: {
        GENERIC: '❌ Maaf, terjadi kesalahan pada sistem.',
        PERMISSION_DENIED: '🚫 Anda tidak memiliki izin untuk command ini.',
        COOLDOWN: '⏱️ Tunggu {time} detik sebelum menggunakan command ini lagi.',
        INVALID_ARGS: '❌ Argumen tidak valid.',
        GROUP_ONLY: '👥 Command ini hanya bisa digunakan di grup.',
        ADMIN_ONLY: '👑 Command ini hanya untuk admin grup.',
        BOT_NOT_ADMIN: '🤖 Bot harus menjadi admin untuk menjalankan command ini.',
        OWNER_ONLY: '👤 Command ini hanya untuk owner bot.',
        MEDIA_TOO_LARGE: '📁 File terlalu besar (max {size}MB).',
        INVALID_MEDIA_TYPE: '🎬 Tipe media tidak didukung.'
    },
    
    // Success messages
    SUCCESS: {
        COMMAND_EXECUTED: '✅ Command berhasil dijalankan.',
        MEMBER_ADDED: '✅ Berhasil menambahkan anggota.',
        MEMBER_REMOVED: '✅ Berhasil mengeluarkan anggota.',
        SETTINGS_UPDATED: '⚙️ Pengaturan berhasil diperbarui.'
    }
};