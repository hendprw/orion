// orion/src/utils/functions.js

/**
 * Mengambil konten dari URL dan mengubahnya menjadi Buffer.
 * @param {string} url - URL dari sumber yang akan diambil.
 * @param {object} options - Opsi tambahan untuk fetch.
 * @returns {Promise<Buffer|null>}
 */
const getBuffer = async (url, options = {}) => {
    try {
        const res = await fetch(url, options);
        if (!res.ok) throw new Error(`Failed to fetch: ${res.status} ${res.statusText}`);
        
        const ab = await res.arrayBuffer();
        return Buffer.from(ab);
    } catch (e) {
        console.error(`Error in getBuffer for url: ${url}`, e);
        return null;
    }
};

/**
 * Menjeda eksekusi selama beberapa milidetik.
 * @param {number} ms - Waktu jeda dalam milidetik.
 */
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
* Memilih satu item acak dari sebuah array.
* @param {Array<any>} list - Array yang akan dipilih itemnya.
* @returns {any}
*/
const pickRandom = (list) => {
    if (!list || list.length === 0) return undefined;
    return list[Math.floor(Math.random() * list.length)];
};

/**
 * Mengubah detik menjadi format waktu yang mudah dibaca (Hari, Jam, Menit, Detik).
 * @param {number} seconds - Jumlah detik.
 * @returns {string}
 */
const runtime = (seconds) => {
    seconds = Number(seconds);
    if (isNaN(seconds) || seconds < 0) return "0 detik";

    const d = Math.floor(seconds / (3600 * 24));
    const h = Math.floor(seconds % (3600 * 24) / 3600);
    const m = Math.floor(seconds % 3600 / 60);
    const s = Math.floor(seconds % 60);
    
    let result = '';
    if (d > 0) result += `${d} hari, `;
    if (h > 0) result += `${h} jam, `;
    if (m > 0) result += `${m} menit, `;
    if (s > 0 || result === '') result += `${s} detik`;
    
    return result.trim().replace(/,$/, '');
};

/**
 * Men-generate string acak dengan panjang tertentu.
 * @param {number} length - Panjang string yang diinginkan.
 * @returns {string}
 */
const generateRandomString = (length) => {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    const charactersLength = characters.length;
    for (let i = 0; i < length; i++) {
        result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
    return result;
};

module.exports = {
    getBuffer,
    sleep,
    pickRandom,
    runtime,
    generateRandomString
};