// =====================================================
// FILE 9: example/commands/utility/stats.js (NEW)
// =====================================================
const { runtime } = require('orion-wa').functions;

module.exports = {
    name: 'stats',
    aliases: ['statistics', 'info'],
    description: 'Menampilkan statistik bot.',
    category: 'utility',
    isOwnerOnly: true,
    
    async execute(sock, m, logger) {
        const bot = global.botInstance; // Set this in index.js
        if (!bot) {
            return await sock.reply(m, '❌ Bot instance tidak tersedia.');
        }

        const stats = bot.getStats();
        const cmdStats = stats.commands;
        
        let text = `*📊 STATISTIK BOT*\n\n`;
        text += `⏱️ *Uptime:* ${runtime(Math.floor(stats.uptime / 1000))}\n`;
        text += `📚 *Commands:* ${cmdStats.totalCommands}\n`;
        text += `🔗 *Aliases:* ${cmdStats.totalAliases}\n`;
        text += `❄️ *Active Cooldowns:* ${cmdStats.activeCooldowns}\n`;
        
        if (stats.queue) {
            text += `\n*🚦 QUEUE SYSTEM*\n`;
            text += `📦 *Global Queue:* ${stats.queue.global.pending}/${stats.queue.global.size}\n`;
            text += `👥 *Active Users:* ${stats.queue.users}\n`;
        }
        
        if (cmdStats.topCommands.length > 0) {
            text += `\n*🏆 TOP COMMANDS*\n`;
            cmdStats.topCommands.forEach((cmd, idx) => {
                text += `${idx + 1}. ${cmd.name}: ${cmd.uses}x\n`;
            });
        }
        
        await sock.reply(m, text);
    }
};
