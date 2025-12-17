// =====================================================
// FILE 6: src/core/middlewareHandler.js (ENHANCED)
// =====================================================
const fs = require('fs');
const path = require('path');
const CONSTANTS = require('../config/constants');

/**
 * Enhanced MiddlewareHandler dengan better organization
 */
class MiddlewareHandler {
    constructor(logger, customPath = null) {
        this.middlewares = new Map();
        this.logger = logger;
        this.customPath = customPath;
        this.executionStats = new Map();
        this.loadMiddlewares();
    }

    /**
     * Load all middlewares (builtin + custom)
     */
    loadMiddlewares() {
        // 1. Load builtin middlewares
        const builtinDir = path.join(__dirname, '..', 'middlewares');
        this.loadFromDir(builtinDir, 'builtin');

        // 2. Load custom middlewares jika ada
        if (this.customPath && fs.existsSync(this.customPath)) {
            this.loadFromDir(this.customPath, 'custom');
        }
        
        this.logger.info(`✅ Loaded ${this.middlewares.size} middlewares`);
    }

    /**
     * Load middlewares dari directory
     * @param {string} dirPath - Directory path
     * @param {string} type - Type: 'builtin' or 'custom'
     */
    loadFromDir(dirPath, type) {
        if (!fs.existsSync(dirPath)) return;
        
        const files = fs.readdirSync(dirPath).filter(file => file.endsWith('.js'));
        
        for (const file of files) {
            try {
                const middlewarePath = path.join(dirPath, file);
                delete require.cache[require.resolve(middlewarePath)];
                const middleware = require(middlewarePath);

                if (middleware.name && typeof middleware.execute === 'function') {
                    // Custom middleware akan override builtin jika nama sama
                    this.middlewares.set(middleware.name, {
                        execute: middleware.execute,
                        type,
                        priority: middleware.priority || 0
                    });
                    
                    // Initialize stats
                    this.executionStats.set(middleware.name, {
                        executions: 0,
                        failures: 0,
                        totalTime: 0
                    });
                    
                    this.logger.debug(`Loaded ${type} middleware: ${middleware.name}`);
                }
            } catch (err) {
                this.logger.error({ err, file }, `Failed to load middleware`);
            }
        }
    }

    /**
     * Run middlewares untuk command dengan prioritization
     * @param {object} sock - WhatsApp socket
     * @param {object} m - Parsed message
     * @param {object} command - Command object
     * @returns {Promise<boolean>}
     */
    async run(sock, m, command) {
        // Collect middlewares to run
        const middlewaresToRun = [];

        // 1. Builtin middlewares berdasarkan command properties
        const builtinChecks = [
            { prop: 'isGroupOnly', name: 'isGroupOnly' },
            { prop: 'isAdminOnly', name: 'isAdminOnly' },
            { prop: 'isBotAdminOnly', name: 'isBotAdminOnly' },
            { prop: 'isOwnerOnly', name: 'isOwnerOnly' }
        ];

        for (const check of builtinChecks) {
            if (command[check.prop] && this.middlewares.has(check.name)) {
                middlewaresToRun.push({
                    name: check.name,
                    ...this.middlewares.get(check.name)
                });
            }
        }

        // 2. Custom middlewares dari command
        if (command.middlewares?.length) {
            for (const middlewareName of command.middlewares) {
                if (this.middlewares.has(middlewareName)) {
                    middlewaresToRun.push({
                        name: middlewareName,
                        ...this.middlewares.get(middlewareName)
                    });
                } else {
                    this.logger.warn(`Middleware "${middlewareName}" not found`);
                }
            }
        }

        // Sort by priority (higher first)
        middlewaresToRun.sort((a, b) => b.priority - a.priority);

        // Execute middlewares
        for (const middleware of middlewaresToRun) {
            const startTime = Date.now();
            const stats = this.executionStats.get(middleware.name);
            
            try {
                stats.executions++;
                const result = await middleware.execute(sock, m, command);
                
                const duration = Date.now() - startTime;
                stats.totalTime += duration;
                
                if (!result) {
                    this.logger.debug(`Middleware ${middleware.name} blocked command execution`);
                    return false;
                }
                
            } catch (err) {
                stats.failures++;
                this.logger.error({ 
                    err, 
                    middleware: middleware.name 
                }, 'Middleware execution error');
                
                await sock.reply(m, CONSTANTS.ERRORS.GENERIC);
                return false;
            }
        }
        
        return true; // All middlewares passed
    }

    /**
     * Get middleware statistics
     * @returns {object}
     */
    getStats() {
        return {
            totalMiddlewares: this.middlewares.size,
            stats: Object.fromEntries(this.executionStats)
        };
    }

    /**
     * Reload specific middleware
     * @param {string} name - Middleware name
     */
    reloadMiddleware(name) {
        const middleware = this.middlewares.get(name);
        if (!middleware) {
            this.logger.warn(`Middleware ${name} not found`);
            return false;
        }

        const type = middleware.type;
        const dir = type === 'builtin' 
            ? path.join(__dirname, '..', 'middlewares')
            : this.customPath;
        
        if (!dir) return false;

        const filePath = path.join(dir, `${name}.js`);
        if (!fs.existsSync(filePath)) return false;

        try {
            delete require.cache[require.resolve(filePath)];
            const reloaded = require(filePath);
            
            this.middlewares.set(name, {
                execute: reloaded.execute,
                type,
                priority: reloaded.priority || 0
            });
            
            this.logger.info(`✅ Reloaded middleware: ${name}`);
            return true;
        } catch (err) {
            this.logger.error({ err, name }, 'Failed to reload middleware');
            return false;
        }
    }
}

module.exports = MiddlewareHandler;
