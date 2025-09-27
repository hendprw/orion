// orion/src/core/messageParser.js
const { jidNormalizedUser } = require('@whiskeysockets/baileys');

async function parseMessage(sock, msg) {
    if (!msg.message || msg.key.fromMe || msg.key.remoteJid === 'status@broadcast') {
        return null;
    }

    const m = {};
    m.msg = msg;
    m.key = msg.key;
    m.chat = m.key.remoteJid;
    m.isGroup = m.chat.endsWith('@g.us');
    m.sender = m.isGroup ? (msg.key.participant || msg.key.remoteJid) : msg.key.remoteJid;
    m.senderName = msg.pushName || 'No Name';
    
    const type = Object.keys(msg.message)[0];
    m.type = type;
    const msgContent = msg.message[type];
    
    m.body = msg.message.conversation || msg.message.extendedTextMessage?.text || msg.message.imageMessage?.caption || msg.message.videoMessage?.caption || '';
    m.args = m.body.trim().split(/ +/).slice(1);

    m.isMedia = (type === 'imageMessage' || type === 'videoMessage' || type === 'audioMessage' || type === 'stickerMessage' || type === 'documentMessage');

    // --- LOGIKA BARU UNTUK MENDETEKSI REPLY ---
    const contextInfo = msgContent?.contextInfo || msg.message.extendedTextMessage?.contextInfo;
    m.isQuoted = !!contextInfo?.quotedMessage;
    // --- AKHIR LOGIKA BARU ---

    m.mentionedJid = contextInfo?.mentionedJid || [];
    
    if (m.isQuoted) {
        m.quoted = {
            key: contextInfo.stanzaId,
            sender: contextInfo.participant,
            msg: contextInfo.quotedMessage
        };
    }
    
    if (m.isGroup) {
        try {
            m.groupMetadata = await sock.groupMetadata(m.chat);
            const botJid = jidNormalizedUser(sock.user.id);
            const senderInfo = m.groupMetadata.participants.find(p => p.id === m.sender);
            const botInfo = m.groupMetadata.participants.find(p => p.jid === botJid);
            m.isAdmin = !!senderInfo?.admin;
            m.isBotAdmin = !!botInfo?.admin;
        } catch (e) {
            console.error("Gagal mengambil metadata grup:", e);
            m.isAdmin = false;
            m.isBotAdmin = false;
        }
    }

    return m;
}

module.exports = { parseMessage };