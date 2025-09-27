// orion/src/core/commandHandler.js
const fs = require('fs');
const path = require('path');
const chokidar = require('chokidar');

class CommandHandler {
    /**
     * @param {string} folderPath - Path ke direktori perintah pengguna.
     * @param {object} logger - Instance logger (pino).
     * @param {number} defaultCooldown - Waktu cooldown default dalam detik.
     */
    constructor(folderPath, logger, defaultCooldown) {
        this.commands = new Map();
        this.aliases = new Map();
        this.cooldowns = new Map();
        this.folderPath = folderPath ? path.resolve(folderPath) : null;
        this.logger = logger;
        // this.defaultCooldown = defaultCooldown || 0; // Default cooldown 3 detik jika tidak disediakan
    }

    // /**
    //  * Memeriksa dan mengatur cooldown untuk pengguna dan perintah.
    //  * @param {string} userId - JID pengguna.
    //  * @param {object} command - Objek perintah yang akan dieksekusi.
    //  * @returns {boolean} `true` jika pengguna dalam masa cooldown, `false` sebaliknya.
    //  */
    // isUserOnCooldown(userId, command) {
    //     const now = Date.now();
    //     const cooldownAmount = (command.cooldown || this.defaultCooldown) * 1000;
        
    //     const userCooldowns = this.cooldowns.get(userId) || new Map();
        
    //     if (userCooldowns.has(command.name)) {
    //         const expirationTime = userCooldowns.get(command.name) + cooldownAmount;
    //         if (now < expirationTime) {
    //             return true;
    //         }
    //     }
        
    //     userCooldowns.set(command.name, now);
    //     this.cooldowns.set(userId, userCooldowns);
        
    //     setTimeout(() => userCooldowns.delete(command.name), cooldownAmount);

    //     return false;
    // }

    /**
     * Memuat sebuah file perintah dan menyimpannya.
     * @param {string} filePath - Path absolut ke file perintah.
     */
    loadCommand(filePath) {
        try {
            delete require.cache[require.resolve(filePath)];
            const command = require(filePath);

            if (!command.name || !command.execute) {
                this.logger.warn(`File perintah dilewati (format tidak valid): ${path.basename(filePath)}`);
                return;
            }

            this.commands.set(command.name, command);
            if (command.aliases && Array.isArray(command.aliases)) {
                command.aliases.forEach(alias => this.aliases.set(alias, command.name));
            }
        } catch (err) {
            this.logger.error({ err }, `Gagal memuat perintah dari file: ${filePath}`);
        }
    }

    /**
     * Memuat semua perintah dari sebuah direktori secara rekursif.
     * @param {string} dir - Path ke direktori.
     */
    loadCommandsFromDir(dir) {
        if (!fs.existsSync(dir)) {
            this.logger.warn(`Direktori perintah tidak ditemukan: ${dir}`);
            return;
        }
        const files = fs.readdirSync(dir);
        for (const file of files) {
            const fullPath = path.join(dir, file);
            if (fs.statSync(fullPath).isDirectory()) {
                this.loadCommandsFromDir(fullPath);
            } else if (file.endsWith('.js')) {
                this.loadCommand(fullPath);
            }
        }
    }

    /**
     * Memuat semua perintah kustom yang disediakan oleh pengguna.
     */
    loadCustomCommands() {
        if (!this.folderPath) return;
        this.logger.info('Memuat perintah kustom dari direktori pengguna...');
        this.loadCommandsFromDir(this.folderPath);
    }

    /**
     * Memuat semua perintah bawaan dari direktori internal framework.
     */
    loadBuiltinCommands() {
        this.logger.info('Memuat perintah bawaan...');
        const builtinDir = path.join(__dirname, '..', 'builtin', 'commands');
        if (!fs.existsSync(builtinDir)) {
            this.logger.warn('Direktori perintah bawaan tidak ditemukan.');
            return;
        }

        const files = fs.readdirSync(builtinDir).filter(file => file.endsWith('.js'));
        let loadedCount = 0;

        for (const file of files) {
            const commandName = path.parse(file).name;
            const envVar = `BUILTIN_COMMAND_${commandName.toUpperCase()}_ENABLED`;

            if (process.env[envVar] === 'true') {
                const filePath = path.join(builtinDir, file);
                this.loadCommand(filePath);
                loadedCount++;
            }
        }
        
        if (loadedCount > 0) {
            this.logger.info(`Total ${loadedCount} perintah bawaan berhasil dimuat.`);
        } else {
            this.logger.info('Tidak ada perintah bawaan yang diaktifkan.');
        }
    }

    watchCommands() {
        if (!this.folderPath) return;
        this.logger.info(`Hot-reloading diaktifkan untuk: ${path.basename(this.folderPath)}`);

        const watcher = chokidar.watch(this.folderPath, {
            ignored: /(^|[\/\\])\../,
            persistent: true,
        });

        watcher
            .on('change', filePath => {
                this.logger.info(`Perubahan pada '${path.basename(filePath)}', memuat ulang semua perintah...`);
                this.commands.clear();
                this.aliases.clear();
                this.loadBuiltinCommands();
                this.loadCustomCommands();
            })
            .on('add', filePath => {
                // this.logger.info(`File baru '${path.basename(filePath)}' terdeteksi, memuat...`);
                this.loadCommand(filePath);
            });
    }

    getCommand(commandName) {
        if (this.commands.has(commandName)) {
            return this.commands.get(commandName);
        }
        if (this.aliases.has(commandName)) {
            const alias = this.aliases.get(commandName);
            return this.commands.get(alias);
        }
        return null;
    }
}

module.exports = CommandHandler;