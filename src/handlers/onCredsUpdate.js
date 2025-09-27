// orion/src/handlers/onCredsUpdate.js

/**
 * Membuat handler untuk event 'creds.update'.
 * @param {Function} saveCreds - Fungsi yang disediakan oleh useMultiFileAuthState.
 * @returns {Function} Handler untuk event.
 */
module.exports = (saveCreds) => {
    return async () => {
        await saveCreds();
    };
};