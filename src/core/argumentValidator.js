// src/core/argumentValidator.js

async function validateArguments(sock, m, command) {
    if (!command.args) return true;

    const { args: rules } = command;
    const userArgs = m.args;

    if (rules.min && userArgs.length < rules.min) {
        let replyMsg = `Perintah ini membutuhkan minimal ${rules.min} argumen.`;
        if(rules.usage) replyMsg += `\n\nPenggunaan: *${m.command} ${rules.usage}*`;
        await sock.reply(m, replyMsg);
        return false;
    }

    if (rules.max && userArgs.length > rules.max) {
        let replyMsg = `Perintah ini hanya menerima maksimal ${rules.max} argumen.`;
        if(rules.usage) replyMsg += `\n\nPenggunaan: *${m.command} ${rules.usage}*`;
        await sock.reply(m, replyMsg);
        return false;
    }

    if (rules.types && Array.isArray(rules.types)) {
        for (let i = 0; i < rules.types.length; i++) {
            const type = rules.types[i];
            const arg = userArgs[i];

            if (!arg) continue;

            let isValid = true;
            let errorMsg = '';

            switch (type) {
                case 'number':
                    if (isNaN(arg)) {
                        isValid = false;
                        errorMsg = `Argumen ke-${i + 1} harus berupa angka.`;
                    }
                    break;
                case 'mention':
                    if (!m.mentionedJid || m.mentionedJid.length === 0) {
                        isValid = false;
                        errorMsg = `Argumen ke-${i + 1} harus berupa mention (@user).`;
                    }
                    break;
            }

            if (!isValid) {
                if(rules.usage) errorMsg += `\n\nPenggunaan: *${m.command} ${rules.usage}*`;
                await sock.reply(m, errorMsg);
                return false;
            }
        }
    }

    return true;
}

module.exports = { validateArguments };