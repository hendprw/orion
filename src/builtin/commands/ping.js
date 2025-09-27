// orion/src/builtin/commands/ping.js
module.exports = {
    name: 'ping',
    description: 'Mengecek kecepatan respon bot.',
    async execute(sock, m) {
        await sock.reply(m, 'Pong!');
    }
};