// =====================================================
// FILE 3: src/core/argumentValidator.js (ENHANCED)
// =====================================================
const CONSTANTS = require('../config/constants');

/**
 * Validate command arguments dengan support untuk optional args
 * @param {object} sock - WhatsApp socket
 * @param {object} m - Parsed message object
 * @param {object} command - Command object
 * @returns {Promise<boolean>}
 */
async function validateArguments(sock, m, command) {
    if (!command.args) return true;

    const { args: rules } = command;
    const userArgs = m.args;

    // Check minimum required arguments
    if (rules.min !== undefined && userArgs.length < rules.min) {
        await sock.reply(m, buildUsageMessage(m, rules, 
            `Minimal ${rules.min} argumen diperlukan.`
        ));
        return false;
    }

    // Check maximum arguments
    if (rules.max !== undefined && userArgs.length > rules.max) {
        await sock.reply(m, buildUsageMessage(m, rules,
            `Maksimal ${rules.max} argumen diperbolehkan.`
        ));
        return false;
    }

    // Validate each argument type
    if (rules.types?.length) {
        for (let i = 0; i < rules.types.length; i++) {
            const typeRule = rules.types[i];
            const arg = userArgs[i];

            // Skip validation untuk optional args yang tidak ada
            if (!arg && typeRule.optional) continue;
            
            // Required arg tidak ada
            if (!arg && !typeRule.optional) {
                await sock.reply(m, buildUsageMessage(m, rules,
                    `Argumen ke-${i + 1} diperlukan.`
                ));
                return false;
            }

            // Validate type
            const validation = validateType(arg, typeRule, m);
            if (!validation.valid) {
                await sock.reply(m, buildUsageMessage(m, rules, validation.error));
                return false;
            }
        }
    }

    return true;
}

/**
 * Validate single argument type
 * @param {string} arg - Argument value
 * @param {object|string} typeRule - Type rule
 * @param {object} m - Parsed message
 * @returns {{valid: boolean, error?: string}}
 */
function validateType(arg, typeRule, m) {
    const type = typeof typeRule === 'string' ? typeRule : typeRule.type;
    
    switch (type) {
        case 'number':
            if (isNaN(arg)) {
                return { valid: false, error: `"${arg}" bukan angka yang valid.` };
            }
            const num = Number(arg);
            // Check range jika ada
            if (typeRule.min !== undefined && num < typeRule.min) {
                return { valid: false, error: `Angka minimal adalah ${typeRule.min}.` };
            }
            if (typeRule.max !== undefined && num > typeRule.max) {
                return { valid: false, error: `Angka maksimal adalah ${typeRule.max}.` };
            }
            break;
            
        case 'mention':
            if (!m.mentionedJid?.length && !m.isQuoted) {
                return { valid: false, error: 'Mention atau reply pesan seseorang.' };
            }
            break;
            
        case 'url':
            try {
                new URL(arg);
            } catch {
                return { valid: false, error: `"${arg}" bukan URL yang valid.` };
            }
            break;
            
        case 'choice':
            if (typeRule.choices && !typeRule.choices.includes(arg.toLowerCase())) {
                return { 
                    valid: false, 
                    error: `Pilihan valid: ${typeRule.choices.join(', ')}` 
                };
            }
            break;

        case 'string':
            if (typeRule.minLength && arg.length < typeRule.minLength) {
                return { valid: false, error: `Teks minimal ${typeRule.minLength} karakter.` };
            }
            if (typeRule.maxLength && arg.length > typeRule.maxLength) {
                return { valid: false, error: `Teks maksimal ${typeRule.maxLength} karakter.` };
            }
            break;

        case 'boolean':
            const validTrue = ['true', 'yes', '1', 'on', 'ya'];
            const validFalse = ['false', 'no', '0', 'off', 'tidak'];
            if (![...validTrue, ...validFalse].includes(arg.toLowerCase())) {
                return { valid: false, error: `Gunakan: ${[...validTrue, ...validFalse].join('/')}` };
            }
            break;
    }
    
    return { valid: true };
}

/**
 * Build formatted usage message
 * @param {object} m - Parsed message
 * @param {object} rules - Argument rules
 * @param {string} error - Error message
 * @returns {string}
 */
function buildUsageMessage(m, rules, error) {
    let msg = `❌ ${error}`;
    
    if (rules.usage) {
        msg += `\n\n📝 *Penggunaan:*\n\`${m.command} ${rules.usage}\``;
    }
    
    if (rules.description) {
        msg += `\n\n📄 *Deskripsi:*\n${rules.description}`;
    }
    
    if (rules.examples?.length) {
        msg += `\n\n💡 *Contoh:*`;
        rules.examples.forEach((ex, idx) => {
            msg += `\n${idx + 1}. \`${m.command} ${ex}\``;
        });
    }
    
    return msg;
}

/**
 * Parse boolean argument value
 * @param {string} arg - Argument value
 * @returns {boolean}
 */
function parseBoolean(arg) {
    const validTrue = ['true', 'yes', '1', 'on', 'ya'];
    return validTrue.includes(arg.toLowerCase());
}

module.exports = { 
    validateArguments,
    validateType,
    buildUsageMessage,
    parseBoolean
};
