const TRUSTED = ['google.com', 'yandex.ru', 'apple.com', 'github.com', 'vk.com'];

function lev(a, b) {
    const m = Array.from({length:b.length+1}, (_,i)=>[i]);
    for(let j=0; j<=a.length; j++) m[0][j]=j;
    for(let i=1; i<=b.length; i++)
        for(let j=1; j<=a.length; j++)
            m[i][j] = b[i-1]===a[j-1]?m[i-1][j-1] : Math.min(m[i-1][j-1]+1, m[i][j-1]+1, m[i-1][j]+1);
    return m[b.length][a.length];
}

chrome.tabs.onUpdated.addListener((id, info, tab) => {
    if (info.status === 'complete' && tab.url?.startsWith('http')) {
        const host = new URL(tab.url).hostname.replace('www.', '');
        for (const t of TRUSTED) {
            const d = lev(host, t);
            if (d > 0 && d <= 2) {
                chrome.scripting.executeScript({
                    target: {tabId: id},
                    func: (domain) => alert(`ОПАСНОСТЬ: Сайт маскируется под ${domain}!`)
                });
                break;
            }
        }
    }
});

async function encryptForBuffer(text) {
    const sess = await chrome.storage.session.get(['master', 'salt']);
    if (!sess.master) return null;
    
    const salt = new Uint8Array(sess.salt);
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const enc = new TextEncoder();
    
    const mK = await crypto.subtle.importKey("raw", enc.encode(sess.master), "PBKDF2", false, ["deriveKey"]);
    const key = await crypto.subtle.deriveKey(
        { name: "PBKDF2", salt, iterations: 100000, hash: "SHA-256" },
        mK, { name: "AES-GCM", length: 256 }, false, ["encrypt"]
    );
    
    const crypted = await crypto.subtle.encrypt({name:"AES-GCM", iv}, key, enc.encode(text));
    const res = new Uint8Array(16 + 12 + crypted.byteLength);
    res.set(salt); res.set(iv, 16); res.set(new Uint8Array(crypted), 28);
    return "SAFE_DATA_V3:" + btoa(String.fromCharCode(...res));
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg.type === "ENCRYPT_CLIP") {
        encryptForBuffer(msg.text).then(sendResponse);
        return true;
    }
});