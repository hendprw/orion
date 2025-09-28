// src/core/middlewareHandler.js
const fs = require('fs');
const path = require('path');

class MiddlewareHandler {
    constructor(logger, customPath = null) {
        this.middlewares = new Map();
        this.logger = logger;
        this.customPath = customPath; // Simpan path kustom
        this.loadMiddlewares();
    }

    loadMiddlewares() {
        // 1. Muat middleware bawaan
        const builtinDir = path.join(__dirname, '..', 'middlewares');
        this.loadFromDir(builtinDir, 'bawaan');

        // 2. Muat middleware kustom jika ada
        if (this.customPath && fs.existsSync(this.customPath)) {
            this.loadFromDir(this.customPath, 'kustom');
        }
        
        this.logger.info(`Total ${this.middlewares.size} middleware berhasil dimuat.`);
    }

    /**
     * Helper untuk memuat middleware dari sebuah direktori.
     * @param {string} dirPath - Path ke direktori.
     * @param {string} type - Tipe middleware ('bawaan' atau 'kustom').
     */
    loadFromDir(dirPath, type) {
        const files = fs.readdirSync(dirPath).filter(file => file.endsWith('.js'));
        for (const file of files) {
            try {
                const middlewarePath = path.join(dirPath, file);
                // Hapus cache untuk hot-reloading di masa depan (jika diperlukan)
                delete require.cache[require.resolve(middlewarePath)]; 
                const middleware = require(middlewarePath);

                if (middleware.name && typeof middleware.execute === 'function') {
                    // Middleware kustom akan menimpa bawaan jika namanya sama
                    this.middlewares.set(middleware.name, middleware.execute);
                    this.logger.info(`Middleware ${type} dimuat: ${middleware.name}`);
                }
            } catch (err) {
                this.logger.error({ err }, `Gagal memuat middleware dari ${file}`);
            }
        }
    }

    async run(sock, m, command) {
        // Jalankan middleware bawaan berdasarkan properti boolean
        const builtinChecks = [
            'isGroupOnly',
            'isAdminOnly',
            'isBotAdminOnly'
        ];

        for (const checkName of builtinChecks) {
            if (command[checkName] && this.middlewares.has(checkName)) {
                const middlewareFunc = this.middlewares.get(checkName);
                const result = await middlewareFunc(sock, m, command);
                if (!result) return false;
            }
        }
        
        // Jalankan middleware kustom berdasarkan nama dari properti 'middlewares'
        if (command.middlewares && Array.isArray(command.middlewares)) {
            for (const middlewareName of command.middlewares) {
                if (this.middlewares.has(middlewareName)) {
                    const middlewareFunc = this.middlewares.get(middlewareName);
                    const result = await middlewareFunc(sock, m, command);
                    if (!result) return false; // Hentikan jika middleware kustom gagal
                } else {
                    this.logger.warn(`Middleware kustom "${middlewareName}" tidak ditemukan.`);
                }
            }
        }
        
        return true; // Semua middleware berhasil dilewati
    }
}

module.exports = MiddlewareHandler;