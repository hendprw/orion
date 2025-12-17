// =====================================================
// FILE 8: src/core/Bot.js (ENHANCED)
// =====================================================
const makeWASocket = require('@whiskeysockets/baileys').default;
const pkg = require('../../package.json');
const { 
    useMultiFileAuthState, 
    fetchLatestBaileysVersion, 
    makeCacheableSignalKeyStore 
} = require('@whiskeysockets/baileys');
const NodeCache = require('node-cache');
const pino = require('pino');
const chalk = require('chalk');
const PQueue = require('p-queue').default;

const CommandHandler = require('./commandHandler');
const MiddlewareHandler = require('./middlewareHandler');
const onConnectionUpdate = require('../handlers/onConnectionUpdate');
const onCredsUpdate = require('../handlers/onCredsUpdate');
const onMessage = require('../handlers/onMessage');
const createGroupUpdateHandler = require('../handlers/onGroupUpdate');
const { enhanceSocketWithHelpers } = require('../utils/enhanceSocket');
const builtinGroupUpdateHandler = require('../builtin/events/groupUpdate');
const CONSTANTS = require('../config/constants');
const logger = require('../utils/logger');

const msgRetryCounterCache = new NodeCache();

/**
 * Enhanced Bot class dengan better configuration
 */
class Bot {
    constructor(config = {}) {
        this.config = {
            sessionName: CONSTANTS.BOT.SESSION_NAME,
            prefix: CONSTANTS.BOT.PREFIX,
            commandsPath: null,
            middlewaresPath: null,
            getGroupSettings: async () => null,
            defaultCommandCooldown: CONSTANTS.BOT.DEFAULT_COOLDOWN,
            ...config,
        };
        
        this.sock = null;
        this.commandHandler = new CommandHandler(
            this.config.commandsPath, 
            logger, 
            this.config.defaultCommandCooldown
        );
        this.middlewareHandler = new MiddlewareHandler(logger, this.config.middlewaresPath);
        this.logger = logger;
        this.startTime = Date.now();

        // Initialize queue system
        this.isQueueEnabled = CONSTANTS.QUEUE.ENABLED;
        
        if (this.isQueueEnabled) {
            this.globalQueue = new PQueue({
                concurrency: CONSTANTS.QUEUE.GLOBAL_CONCURRENCY,
                intervalCap: CONSTANTS.QUEUE.GLOBAL_INTERVAL_CAP,
                interval: CONSTANTS.QUEUE.GLOBAL_INTERVAL
            });
            
            this.userQueues = new Map();
            this.logger.info('🚦 Queue system enabled');
        }
        
        // Bind methods
        this.connect = this.connect.bind(this);
        
        // Setup event listeners untuk command handler
        this.setupCommandHandlerEvents();
    }

    /**
     * Setup event listeners untuk command handler
     */
    setupCommandHandlerEvents() {
        this.commandHandler.on('commandLoaded', (name) => {
            this.logger.debug(`Command loaded: ${name}`);
        });
        
        this.commandHandler.on('commandReloaded', (file) => {
            this.logger.info(`🔄 Command reloaded: ${file}`);
        });
        
        this.commandHandler.on('commandUnloaded', (name) => {
            this.logger.info(`➖ Command unloaded: ${name}`);
        });
    }

    /**
     * Display startup banner
     */
    displayBanner() {
        console.log(chalk.cyanBright(`
    ______     _______    __      ______    _____  ___   
   /    " \\   /"      \\  |" \\    /    " \\  (\\\"   \\|"  \\  
  // ____  \\ |:        | ||  |  // ____  \\ |.\\\\   \\    | 
 /  /    ) :)|_____/   ) |:  | /  /    ) :)|: \\.   \\\\  | 
(: (____/ //  //      /  |.  |(: (____/ // |.  \\    \\. | 
 \\        /  |:  __   \\  /\\  |\\\\        /  |    \\    \\ | 
  \\\"_____/   |__|  \\___)(__\\_|_)\\\"_____/    \\___|\\____\\) 
        `));

        console.log(chalk.greenBright(`🚀 Orion WhatsApp Framework v${pkg.version}`));
        console.log(chalk.gray('═'.repeat(60)));
        console.log(chalk.white(`📦 Session: ${this.config.sessionName}`));
        console.log(chalk.white(`⚡ Prefix: ${this.config.prefix}`));
        console.log(chalk.white(`🔧 Cooldown: ${this.config.defaultCommandCooldown}s`));
        console.log(chalk.white(`🚦 Queue: ${this.isQueueEnabled ? 'Enabled' : 'Disabled'}`));
        console.log(chalk.gray('═'.repeat(60)));
    }

    /**
     * Connect bot to WhatsApp
     */
    async connect() {
        try {
            this.displayBanner();
            
            const { state, saveCreds } = await useMultiFileAuthState(this.config.sessionName);
            const { version } = await fetchLatestBaileysVersion();

            this.sock = makeWASocket({
                version,
                logger: pino({ level: 'silent' }),
                auth: {
                    creds: state.creds,
                    keys: makeCacheableSignalKeyStore(state.keys, this.logger),
                },
                browser: ['Orion Framework', 'Chrome', pkg.version],
                msgRetryCounterCache,
                printQRInTerminal: false,
                getMessage: async (key) => {
                    return { conversation: '' };
                }
            });
            
            // Enhance socket dengan helper functions
            enhanceSocketWithHelpers(this.sock);

            // Load commands
            this.commandHandler.commands.clear();
            this.commandHandler.aliases.clear();
            this.commandHandler.loadBuiltinCommands();
            
            if (this.config.commandsPath) {
                this.commandHandler.loadCustomCommands();
                this.commandHandler.watchCommands();
            }

            const cmdStats = this.commandHandler.getStats();
            this.logger.info(`Loaded ${cmdStats.totalCommands} commands & ${cmdStats.totalAliases} aliases`);

            // Register event handlers
            this.registerHandlers(saveCreds);
            
            return this.sock;
            
        } catch (error) {
            this.logger.error({ err: error }, "❌ Failed to start bot");
            process.exit(1);
        }
    }

    /**
     * Register all event handlers
     */
    registerHandlers(saveCreds) {
        const customGroupUpdateHandler = createGroupUpdateHandler(this.config.getGroupSettings);

        this.sock.ev.on('creds.update', onCredsUpdate(saveCreds));
        
        this.sock.ev.on('connection.update', (update) => 
            onConnectionUpdate(update, this.connect)
        );
        
        this.sock.ev.on('messages.upsert', (m) => onMessage(
            this.sock, 
            m, 
            this.commandHandler,
            this.middlewareHandler,
            this.config.prefix, 
            this.isQueueEnabled ? this.globalQueue : null, 
            this.isQueueEnabled ? this.userQueues : null
        ));
        
        this.sock.ev.on('group-participants.update', (update) => {
            builtinGroupUpdateHandler(this.sock, update);
            customGroupUpdateHandler(this.sock, update);
        });
    }

    /**
     * Get bot statistics
     * @returns {object}
     */
    getStats() {
        return {
            uptime: Date.now() - this.startTime,
            commands: this.commandHandler.getStats(),
            middlewares: this.middlewareHandler.getStats(),
            queue: this.isQueueEnabled ? {
                global: {
                    size: this.globalQueue.size,
                    pending: this.globalQueue.pending
                },
                users: this.userQueues.size
            } : null
        };
    }

    /**
     * Graceful shutdown
     */
    async shutdown() {
        this.logger.info('🛑 Shutting down bot...');
        
        if (this.sock) {
            await this.sock.logout();
        }
        
        if (this.globalQueue) {
            await this.globalQueue.onIdle();
        }
        
        this.logger.info('✅ Bot shutdown complete');
        process.exit(0);
    }
}

module.exports = Bot;