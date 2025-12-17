// =====================================================
// FILE 2: src/core/commandHandler.js (FIXED)
// =====================================================
const fs = require('fs');
const path = require('path');
const chokidar = require('chokidar');
const EventEmitter = require('events');

/**
 * Enhanced CommandHandler dengan cooldown, stats, dan error recovery
 * @class CommandHandler
 * @extends EventEmitter
 */
class CommandHandler extends EventEmitter {
    constructor(folderPath, logger, defaultCooldown) {
        super();
        this.commands = new Map();
        this.aliases = new Map();
        this.cooldowns = new Map();
        this.folderPath = folderPath ? path.resolve(folderPath) : null;
        this.logger = logger;
        this.defaultCooldown = defaultCooldown || 3;
        this.commandStats = new Map();
        this.loadErrors = [];
    }

    /**
     * Check dan set cooldown dengan atomic operation
     * @param {string} userId - User JID
     * @param {object} command - Command object
     * @returns {{onCooldown: boolean, timeLeft?: number}}
     */
    isUserOnCooldown(userId, command) {
        const now = Date.now();
        const cooldownAmount = (command.cooldown ?? this.defaultCooldown) * 1000;
        
        if (!this.cooldowns.has(userId)) {
            this.cooldowns.set(userId, new Map());
        }
        
        const userCooldowns = this.cooldowns.get(userId);
        
        if (userCooldowns.has(command.name)) {
            const expirationTime = userCooldowns.get(command.name);
            if (now < expirationTime) {
                const timeLeft = Math.ceil((expirationTime - now) / 1000);
                return { onCooldown: true, timeLeft };
            }
        }
        
        userCooldowns.set(command.name, now + cooldownAmount);
        
        // Auto cleanup setelah cooldown selesai
        setTimeout(() => {
            userCooldowns.delete(command.name);
            if (userCooldowns.size === 0) {
                this.cooldowns.delete(userId);
            }
        }, cooldownAmount);

        return { onCooldown: false };
    }

    /**
     * Validasi struktur command
     * @param {object} command - Command object
     * @returns {boolean}
     */
    validateCommandStructure(command) {
        if (!command.name || typeof command.name !== 'string') {
            this.logger.warn('Command missing name or name is not string');
            return false;
        }
        if (!command.execute || typeof command.execute !== 'function') {
            this.logger.warn(`Command ${command.name} missing execute function`);
            return false;
        }
        
        // Validate optional fields
        if (command.aliases && !Array.isArray(command.aliases)) {
            this.logger.warn(`Command ${command.name} aliases must be array`);
            return false;
        }
        
        if (command.cooldown !== undefined && typeof command.cooldown !== 'number') {
            this.logger.warn(`Command ${command.name} cooldown must be number`);
            return false;
        }
        
        return true;
    }

    /**
     * Load single command file dengan proper error handling
     * @param {string} filePath - Absolute path to command file
     */
    loadCommand(filePath) {
        try {
            // Clear cache dengan aman
            const resolvedPath = require.resolve(filePath);
            if (require.cache[resolvedPath]) {
                delete require.cache[resolvedPath];
            }
            
            const command = require(filePath);

            // Validasi command structure
            if (!this.validateCommandStructure(command)) {
                this.loadErrors.push({ file: filePath, error: 'Invalid structure' });
                return;
            }

            // Check for duplicate command names
            if (this.commands.has(command.name)) {
                this.logger.warn(`Command ${command.name} already exists, overwriting...`);
            }

            this.commands.set(command.name, command);
            
            // Register aliases
            if (command.aliases?.length) {
                command.aliases.forEach(alias => {
                    if (this.aliases.has(alias)) {
                        this.logger.warn(`Alias "${alias}" conflict, already used by ${this.aliases.get(alias)}`);
                    }
                    this.aliases.set(alias, command.name);
                });
            }

            // Initialize stats
            if (!this.commandStats.has(command.name)) {
                this.commandStats.set(command.name, { 
                    uses: 0, 
                    errors: 0,
                    lastUsed: null,
                    totalExecutionTime: 0,
                    avgExecutionTime: 0
                });
            }
            
            this.emit('commandLoaded', command.name);
            
        } catch (err) {
            this.logger.error({ err, file: filePath }, 'Failed to load command');
            this.loadErrors.push({ file: filePath, error: err.message });
        }
    }

    /**
     * Load semua commands dari directory secara rekursif
     * @param {string} dir - Directory path
     */
    loadCommandsFromDir(dir) {
        if (!fs.existsSync(dir)) {
            this.logger.warn(`Commands directory not found: ${dir}`);
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
     * Load custom user commands
     */
    loadCustomCommands() {
        if (!this.folderPath) return;
        this.logger.info('Loading custom commands...');
        this.loadCommandsFromDir(this.folderPath);
    }

    /**
     * Load builtin framework commands
     */
    loadBuiltinCommands() {
        this.logger.info('Loading builtin commands...');
        const builtinDir = path.join(__dirname, '..', 'builtin', 'commands');
        if (!fs.existsSync(builtinDir)) {
            this.logger.warn('Builtin commands directory not found');
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
            this.logger.info(`Loaded ${loadedCount} builtin commands`);
        } else {
            this.logger.info('ℹNo builtin commands enabled');
        }
    }

    /**
     * Watch commands directory untuk hot-reloading
     */
    watchCommands() {
        if (!this.folderPath) return;
        this.logger.info(`Hot-reloading enabled for: ${path.basename(this.folderPath)}`);

        const watcher = chokidar.watch(this.folderPath, {
            ignored: /(^|[\/\\])\../,
            persistent: true,
            ignoreInitial: true
        });

        watcher
            .on('change', filePath => {
                this.logger.info(`File changed: ${path.basename(filePath)}`);
                this.loadCommand(filePath);
                this.emit('commandReloaded', path.basename(filePath));
            })
            .on('add', filePath => {
                this.logger.info(`➕ New file detected: ${path.basename(filePath)}`);
                this.loadCommand(filePath);
            })
            .on('unlink', filePath => {
                this.logger.info(`➖ File removed: ${path.basename(filePath)}`);
                const commandName = path.parse(filePath).name;
                this.commands.delete(commandName);
                this.commandStats.delete(commandName);
                this.emit('commandUnloaded', commandName);
            })
            .on('error', error => {
                this.logger.error({ err: error }, 'Watcher error');
            });
    }

    /**
     * Get command by name atau alias
     * @param {string} commandName - Command name or alias
     * @returns {object|null}
     */
    getCommand(commandName) {
        if (this.commands.has(commandName)) {
            return this.commands.get(commandName);
        }
        if (this.aliases.has(commandName)) {
            const mainName = this.aliases.get(commandName);
            return this.commands.get(mainName);
        }
        return null;
    }

    /**
     * Track command usage untuk analytics
     * @param {string} commandName - Command name
     * @param {boolean} success - Execution success status
     * @param {number} executionTime - Execution time in ms
     */
    trackCommandUsage(commandName, success = true, executionTime = 0) {
        const stats = this.commandStats.get(commandName);
        if (stats) {
            stats.uses++;
            stats.lastUsed = new Date();
            if (!success) {
                stats.errors++;
            }
            if (executionTime > 0) {
                stats.totalExecutionTime += executionTime;
                stats.avgExecutionTime = Math.round(stats.totalExecutionTime / stats.uses);
            }
        }
    }

    /**
     * Get comprehensive statistics
     * @returns {object}
     */
    getStats() {
        return {
            totalCommands: this.commands.size,
            totalAliases: this.aliases.size,
            activeCooldowns: this.cooldowns.size,
            loadErrors: this.loadErrors.length,
            commandStats: Object.fromEntries(this.commandStats),
            topCommands: this.getTopCommands(5)
        };
    }

    /**
     * Get top N most used commands
     * @param {number} n - Number of commands
     * @returns {Array}
     */
    getTopCommands(n = 5) {
        return Array.from(this.commandStats.entries())
            .sort((a, b) => b[1].uses - a[1].uses)
            .slice(0, n)
            .map(([name, stats]) => ({ name, uses: stats.uses }));
    }

    /**
     * Clear all cooldowns untuk user tertentu
     * @param {string} userId - User JID
     */
    clearUserCooldowns(userId) {
        this.cooldowns.delete(userId);
    }

    /**
     * Reset command statistics
     */
    resetStats() {
        this.commandStats.forEach(stats => {
            stats.uses = 0;
            stats.errors = 0;
            stats.lastUsed = null;
            stats.totalExecutionTime = 0;
            stats.avgExecutionTime = 0;
        });
        this.logger.info('📊 Statistics reset');
    }
}

module.exports = CommandHandler;
