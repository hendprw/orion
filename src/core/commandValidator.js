// orion/src/core/commandValidator.js

/**
 * Memvalidasi argumen perintah berdasarkan aturan yang didefinisikan.
 * @param {object} command - Objek perintah yang memiliki properti 'args'.
 * @param {object} parsedM - Objek pesan yang sudah di-parse.
 * @returns {{isValid: boolean, reply: string|null}} - Hasil validasi.
 */
function validateArgs(command, parsedM) {
    // Jika tidak ada aturan validasi, anggap selalu valid.
    if (!command.args) {
        return { isValid: true, reply: null };
    }

    const { args: validationRules } = command;
    const { args: userArgs, mentionedJid } = parsedM;
    const commandName = command.name;

    // 1. Validasi Jumlah Argumen Minimal
    if (validationRules.min && userArgs.length < validationRules.min) {
        const reply = validationRules.usage || `Error: Perintah '!${commandName}' memerlukan minimal ${validationRules.min} argumen.`;
        return { isValid: false, reply };
    }

    // 2. Validasi Jumlah Argumen Maksimal
    if (validationRules.max && userArgs.length > validationRules.max) {
        const reply = validationRules.usage || `Error: Perintah '!${commandName}' hanya menerima maksimal ${validationRules.max} argumen.`;
        return { isValid: false, reply };
    }

    // 3. Validasi Tipe Argumen (jika didefinisikan)
    if (validationRules.types && Array.isArray(validationRules.types)) {
        for (let i = 0; i < validationRules.types.length; i++) {
            const expectedType = validationRules.types[i];
            const arg = userArgs[i];

            // Jika argumen tidak ada padahal tipenya diharapkan, lewati (sudah ditangani min args).
            if (!arg) continue;

            let typeIsValid = true;

            switch (expectedType) {
                case 'number':
                    // Cek apakah argumen adalah angka
                    if (isNaN(arg)) {
                        typeIsValid = false;
                    }
                    break;
                case 'mention':
                    // Cek apakah ada mention di posisi pertama
                    if (i === 0 && mentionedJid.length === 0) {
                        typeIsValid = false;
                    }
                    // Validasi mention yang lebih kompleks bisa ditambahkan di sini
                    break;
                // Tambahkan tipe lain sesuai kebutuhan (e.g., 'url', 'email')
            }

            if (!typeIsValid) {
                const reply = validationRules.usage || `Error: Argumen ke-${i + 1} untuk '!${commandName}' harus berupa '${expectedType}'.`;
                return { isValid: false, reply };
            }
        }
    }

    // Jika semua validasi lolos
    return { isValid: true, reply: null };
}

module.exports = { validateArgs };