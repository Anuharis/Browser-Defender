document.addEventListener('DOMContentLoaded', async () => {
    const status = (id, msg, color = '#7f8c8d') => {
        const el = document.getElementById(id);
        el.innerText = msg; el.style.color = color;
    };

    const buf2b64 = b => btoa(String.fromCharCode(...new Uint8Array(b)));
    const b642buf = s => Uint8Array.from(atob(s), c => c.charCodeAt(0));

    async function getK(pwd, salt) {
        const m = await crypto.subtle.importKey("raw", new TextEncoder().encode(pwd), "PBKDF2", false, ["deriveKey"]);
        return crypto.subtle.deriveKey(
            { name: "PBKDF2", salt, iterations: 100000, hash: "SHA-256" },
            m, { name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]
        );
    }

    // Шифрование
    document.getElementById('encryptBtn').onclick = async () => {
        const p = document.getElementById('masterKey').value;
        const t = document.getElementById('textData').value;
        if(!p || !t) return alert("Заполните поля");

        const salt = crypto.getRandomValues(new Uint8Array(16));
        const iv = crypto.getRandomValues(new Uint8Array(12));
        const key = await getK(p, salt);
        const enc = await crypto.subtle.encrypt({name:"AES-GCM", iv}, key, new TextEncoder().encode(t));

        const res = new Uint8Array(16 + 12 + enc.byteLength);
        res.set(salt); res.set(iv, 16); res.set(new Uint8Array(enc), 28);
        
        const finalB64 = buf2b64(res);
        status('cryptoStatus', finalB64);
        // Сохраняем в сессию для буфера
        chrome.storage.session.set({ master: p, salt: Array.from(salt) });
    };

    // Расшифровка
    document.getElementById('decryptBtn').onclick = async () => {
        const p = document.getElementById('masterKey').value;
        const b = document.getElementById('textData').value;
        try {
            const d = b642buf(b);
            const key = await getK(p, d.slice(0,16));
            const dec = await crypto.subtle.decrypt({name:"AES-GCM", iv: d.slice(16,28)}, key, d.slice(28));
            status('cryptoStatus', new TextDecoder().decode(dec), '#27ae60');
        } catch(e) { status('cryptoStatus', "Ошибка: неверный ключ", '#e74c3c'); }
    };

    // Поиск пароля в списках утечек
    document.getElementById('checkLeakBtn').onclick = async () => {
    const p = document.getElementById('leakPass').value;
    if (!p) return;
    
    status('leakStatus', "Проверка...");

    try {
        // 1. Генерируем SHA-1 хеш (API Have I Been Pwned использует именно SHA-1, а не SHA-256)
        const msgBuffer = new TextEncoder().encode(p);
        const hashBuffer = await crypto.subtle.digest('SHA-1', msgBuffer);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('').toUpperCase();

        const prefix = hashHex.slice(0, 5);
        const suffix = hashHex.slice(5);

        // 2. Запрос к API (K-Anonymity)
        const response = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`);
        if (!response.ok) throw new Error("Ошибка сети");
        
        const data = await response.text();
        
        // 3. Проверка суффикса в полученном списке
        // Каждая строка ответа выглядит как SUFFIX:COUNT
        const lines = data.split('\n');
        const found = lines.some(line => line.trim().startsWith(suffix));

        if (found) {
            status('leakStatus', "⚠ ПАРОЛЬ СКОМПРОМЕТИРОВАН!", '#e74c3c');
        } else {
            status('leakStatus', "✅ Пароль не найден в базах", '#27ae60');
        }
    } catch (e) {
        console.error(e);
        status('leakStatus', "Ошибка проверки", '#e74c3c');
    }
};

    // Настройки
    const clpT = document.getElementById('clipToggle');
    if (clpT) {
        chrome.storage.local.get(['clip'], r => { clpT.checked = !!r.clip; });
        clpT.onchange = () => chrome.storage.local.set({clip: clpT.checked});
    }

    // Очистка
    const cls = m => chrome.browsingData.remove(m===0?{}:{since:Date.now()-m*60000}, {cache:true,cookies:true,history:true,localStorage:true}, ()=>alert("Готово"));
    document.getElementById('clearShort').onclick = () => cls(30);
    document.getElementById('clearFull').onclick = () => cls(0);
});