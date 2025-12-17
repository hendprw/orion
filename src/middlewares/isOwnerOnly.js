// =====================================================
// FILE 7: src/middlewares/isOwnerOnly.js (NEW)
// =====================================================
const CONSTANTS = require('../config/constants');

module.exports = {
    name: 'isOwnerOnly',
    priority: 100, // Highest priority
    
    /**
     * Check if user is bot owner
     */
    execute: async (sock, m, command) => {
        if (!command.isOwnerOnly) return true;
        
        const userNumber = m.sender.split('@')[0];
        const isOwner = CONSTANTS.BOT.OWNER_NUMBERS.includes(userNumber);
        
        if (!isOwner) {
            await sock.reply(m, CONSTANTS.ERRORS.OWNER_ONLY);
            return false;
        }
        
        return true;
    }
};
