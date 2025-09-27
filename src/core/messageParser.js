// orion/src/core/messageParser.js

/**
 * Mem-parsing pesan masuk menjadi format yang lebih mudah digunakan.
 * @param {import('@whiskeysockets/baileys').WASocket} sock 
 * @param {import('@whiskeysockets/baileys').proto.IWebMessageInfo} msg 
 * @returns {Promise<object|null>} Objek pesan yang sudah diparsing atau null.
 */
async function parseMessage(sock, msg) {
    if (!msg.message || msg.key.fromMe || msg.key.remoteJid === 'status@broadcast') {
        return null;
    }

    const m = {};
    m.msg = msg;
    m.key = msg.key;
    m.chat = m.key.remoteJid;
    m.isGroup = m.chat.endsWith('@g.us');
    m.sender = m.isGroup ? (m.key.participant || m.key.remoteJid) : m.key.remoteJid;
    m.senderName = msg.pushName || 'No Name';
    
    const type = Object.keys(msg.message)[0];
    m.type = type;
    
    m.body = msg.message.conversation || msg.message.extendedTextMessage?.text || msg.message.imageMessage?.caption || msg.message.videoMessage?.caption || '';

    m.isMedia = (type === 'imageMessage' || type === 'videoMessage' || type === 'audioMessage' || type === 'stickerMessage' || type === 'documentMessage');
    m.isQuoted = type === 'extendedTextMessage' && msg.message.extendedTextMessage.contextInfo?.quotedMessage;
    m.mentionedJid = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
    
    if (m.isQuoted) {
        m.quoted = {
            key: msg.message.extendedTextMessage.contextInfo.stanzaId,
            sender: msg.message.extendedTextMessage.contextInfo.participant,
            msg: msg.message.extendedTextMessage.contextInfo.quotedMessage
        };
    }
    
    if (m.isGroup) {
        m.groupMetadata = await sock.groupMetadata(m.chat);
        const botJid = sock.user.id.split(':')[0] + '@s.whatsapp.net';
        const senderInfo = m.groupMetadata.participants.find(p => p.id === m.sender);
        const botInfo = m.groupMetadata.participants.find(p => p.id === botJid);
        
        m.isAdmin = senderInfo?.admin === 'admin' || senderInfo?.admin === 'superadmin';
        m.isBotAdmin = botInfo?.admin === 'admin' || botInfo?.admin === 'superadmin';
    }

    return m;
}

module.exports = { parseMessage };