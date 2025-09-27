// orion/src/core/commandHandler.js
const fs = require('fs');
const path = require('path');
const chokidar = require('chokidar');

class CommandHandler {
    constructor(folderPath, logger) {
        this.commands = new Map();
        this.aliases = new Map();
        this.folderPath = folderPath ? path.resolve(folderPath) : null;
        this.logger = logger;
    }

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

    loadAllCommands() {
        if (!this.folderPath) return;
        this.logger.info('Memuat semua perintah dari direktori...');
        this.commands.clear();
        this.aliases.clear();
        this.loadCommandsFromDir(this.folderPath);
        this.logger.info(`Total ${this.commands.size} perintah & ${this.aliases.size} alias berhasil dimuat.`);
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
                this.logger.info(`Perubahan pada '${path.basename(filePath)}', memuat ulang...`);
                this.loadCommand(filePath);
            })
            .on('add', filePath => {
                this.logger.info(`File baru '${path.basename(filePath)}' terdeteksi, memuat...`);
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