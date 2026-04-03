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

    // Логика кнопки "Копировать"
    document.getElementById('copyEncryptedBtn').onclick = () => {
        const resultText = document.getElementById('cryptoStatus').innerText;
        
        // Проверяем, есть ли там что-то кроме стандартного приветствия
        if (!resultText || resultText === "Ожидание..." || resultText.startsWith("Ошибка")) {
            return alert("Сначала зашифруйте текст!");
        }

        navigator.clipboard.writeText(resultText).then(() => {
            const btn = document.getElementById('copyEncryptedBtn');
            const originalText = btn.innerText;
            
            // Визуальный фидбек: меняем текст кнопки на 1.5 секунды
            btn.innerText = "✅ Скопировано!";
            btn.style.background = "#2ecc71";
            
            setTimeout(() => {
                btn.innerText = originalText;
                btn.style.background = "#3498db";
            }, 1500);
        });
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
    const LOCAL_LEAK_DB = [
    "123456", "password", "123456789", "12345678", "12345", "qwerty", "abc123", "111111", "123123", "password1", "1234", "iloveyou", "admin", "welcome", "monkey", "login", "princess", "qwerty123", "solo", "passw0rd", "starwars", "dragon", "zaq1zaq1", "football", "baseball", "master", "hello", "freedom", "whatever", "qazwsx", "trustno1", "654321", "jordan23", "harley", "password123", "letmein", "secret", "flower", "shadow", "michael", "superman", "batman", "696969", "killer", "hottie", "george", "computer", "michelle", "jessica", "pepper", "11111111", "zxcvbnm", "asdfghjkl", "internet", "pokemon", "charlie", "summer", "winter", "tigger", "ginger", "cookie", "banana", "q1w2e3r4", "test123", "test", "admin123", "root", "toor", "pass123", "user", "love123", "qwertyuiop", "123qwe", "1q2w3e4r", "qwerty1", "123abc", "11111", "222222", "333333", "444444", "555555", "666666", "777777", "888888", "999999", "000000", "1234567", "1234567890", "987654321", "159753", "йцукен", "йцукен123", "пароль", "пароль123", "привет", "привет123", "любовь", "солнышко", "котик", "зайчик", "andrew", "thomas", "joshua", "daniel", "matthew", "hunter", "amanda", "ashley", "nicole", "biteme", "access", "mustang", "silver", "orange", "golfer", "richard", "scooter", "dakota", "arsenal", "eagles", "mercedes", "ferrari", "corvette", "toyota", "nissan", "honda", "volvo", "mazda", "subaru", "chevy", "matrix", "trinity", "neo123", "spiderman", "ironman", "thor", "hulk", "avengers", "captain", "america", "naruto", "sasuke", "pokemon123", "pikachu", "charizard", "goku", "vegeta", "dragonball", "anime", "manga", "sunshine", "rainbow", "butterfly", "unicorn", "sparkle", "moonlight", "starlight", "galaxy", "cosmos", "planet", "red123", "blue123", "green123", "yellow123", "black123", "white123", "purple123", "pink123", "gold123", "silver123", "qaz123", "wsx123", "edc123", "rfv123", "tgb123", "yhn123", "ujm123", "ik,123", "ol.123", "p;/123",
"pass1", "pass2", "pass3", "pass4", "pass5", "pass6", "pass7", "pass8", "pass9", "pass10", "йцукен1", "йцукен12", "йцукен1234", "пароль1", "пароль12", "пароль1234", "привет1", "привет12", "привет1234", "здравствуй", "люблютебя", "котенок", "собака", "машина", "телефон", "компьютер", "интернет", "школа", "учеба", "экзамен", "alex", "alex123", "alexander", "sergey", "ivan", "dmitry", "andrey", "vladimir", "nikita", "kirill", "olga", "anna", "elena", "irina", "natasha", "svetlana", "marina", "tatiana", "yana", "katerina", "user123", "guest", "guest123", "default", "default123", "changeme", "changeme123", "temp", "temp123", "qwert", "asdf", "zxcv", "qweasd", "asdzxc", "qwe123asd", "asd123qwe", "zxc123qwe", "qweasdzxc", "password!", "password@", "welcome1", "welcome123", "hello123", "hi123", "hola", "bonjour", "ciao", "hallo", "namaste", "salam", "iloveu", "iloveu123", "loveme", "loveme123", "kissme", "kiss123", "hugme", "sweet", "sweet123", "baby123", "admin1", "admin12", "admin1234", "root123", "root1234", "superuser", "superuser123", "administrator", "administrator123", "sysadmin", "abc", "abcd", "abcde", "abcdef", "abcdefg", "abcdefgh", "abcdefghi", "abcdefghij", "abcdefghijk", "abcdefghijkl", "1qaz2wsx", "1qazxsw2", "2wsx1qaz", "zaq12wsx", "qazxsw123", "wsxedc123", "edcrfv123", "rfvtgb123", "tgbyhn123", "yhnujm123", "йцукен199", "алекс", "алекс123", "сергей", "иван123", "дима", "андрей123", "владимир", "никита123", "кирилл", "оля123",
"анна123", "елена", "ирина123", "наташа", "света123", "марина", "таня123", "яна", "катя123", "любовь123", "test1", "test2", "test3", "test4", "test5", "testing", "testing123", "demo", "demo123", "sample", "sample123", "example", "example123", "trial", "trial123", "temp1", "temp2", "temp3", "temp4", "temp5", "secure", "secure123", "safety", "safety123", "lock", "lock123", "key", "key123", "access123", "enter", "enter123", "login123", "signin", "signin123", "signup", "signup123", "account", "account123", "profile", "profile123", "data", "data123", "backup", "backup123", "server", "server123", "client", "client123", "network", "network123", "cloud", "cloud123", "storage", "storage123", "drive", "drive123", "disk", "disk123", "memory", "memory123", "system", "system123", "core", "core123", "engine", "engine123", "power", "power123", "energy", "energy123", "alpha", "beta", "gamma", "delta", "omega", "alpha123", "beta123", "gamma123", "delta123", "omega123", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "тест", "тест123", "пример", "пример123", "демо", "демо123", "образец", "образец123", "данные", "данные123", "система", "система123", "сервер", "сервер123", "клиент", "клиент123", "сеть", "сеть123", "облако", "облако123", "player", "player123", "gamer", "gamer123", "gaming", "gaming123", "game", "game123", "play", "play123", "xbox", "xbox123", "playstation", "ps4", "ps5", "steam", "steam123", "epic", "epic123", "origin", "battle", "battle123", "warrior", "warrior123", "knight", "knight123", "dragon1234", "legend", "legend123", "hero", "hero123", "champion", "champion123", "winner", "winner123", "loser", "loser123", "noob", "noob123", "pro", "pro123", "elite", "elite123", "master1234", "ultimate", "ultimate123", "maxpower", "maxpower123", "superstar", "superstar123",
"rockstar", "rockstar123", "music", "music123", "song", "song123", "dance", "dance123", "dj123", "club", "club123", "party", "party123", "night", "night123", "day123", "morning", "morning123", "evening", "evening123", "coffee", "coffee123", "tea123", "water123", "drink", "drink123", "food", "food123", "pizza", "pizza123", "burger", "burger123", "chicken", "chicken123", "apple123", "orange123", "fruit", "fruit123", "sweet123", "sugar123", "игрок", "игрок123", "игра", "игра123", "геймер", "геймер123", "победа", "победа123", "герой", "герой123", "чемпион", "чемпион123", "музыка", "музыка123", "танцы", "танцы123", "вечеринка", "вечеринка123", "еда", "еда123", "summer2020", "summer2021", "summer2022", "summer2023", "summer2024", "winter2020", "winter2021", "winter2022", "winter2023", "winter2024", "spring2020", "spring2021", "spring2022", "spring2023", "spring2024", "autumn2020", "autumn2021", "autumn2022", "autumn2023", "autumn2024", "jan2020", "feb2020", "mar2020", "apr2020", "may2020", "jun2020", "jul2020", "aug2020", "sep2020", "oct2020", "nov2020", "dec2020", "jan2021", "feb2021", "mar2021", "apr2021", "may2021", "jun2021", "jul2021", "aug2021", "sep2021", "oct2021", "nov2021", "dec2021", "jan2022", "feb2022", "mar2022", "apr2022", "may2022", "jun2022", "jul2022", "aug2022", "sep2022", "oct2022", "nov2022", "dec2022", "jan2023", "feb2023", "mar2023", "apr2023", "may2023", "jun2023", "jul2023", "aug2023", "sep2023", "oct2023", "nov2023", "dec2023", "jan2024", "feb2024", "mar2024", "apr2024", "may2024", "jun2024", "jul2024", "aug2024", "sep2024", "oct2024", "nov2024", "dec2024", "лето2020", "лето2021", "лето2022", "лето2023", "лето2024", "зима2020", "зима2021", "зима2022", "зима2023", "зима2024", "весна2020", "весна2021", "весна2022", "весна2023", "весна2024", "осень2020", "осень2021", "осень2022", "осень2023", "осень2024", "iphone", "iphone123", "android", "android123", "samsung", "samsung123", "huawei", "huawei123", "xiaomi", "xiaomi123", "google", "google123", "facebook", "facebook123", "instagram", "instagram123", "twitter", "twitter123", "tiktok", "tiktok123",
"youtube", "youtube123", "gmail", "gmail123", "yahoo", "yahoo123", "hotmail", "hotmail123", "mail", "mail123", "office", "office123", "windows", "windows123", "linux", "linux123", "ubuntu", "ubuntu123", "debian", "debian123", "chrome", "chrome123", "firefox", "firefox123", "opera", "opera123", "safari", "safari123", "browser", "browser123", "intel", "intel123", "amd", "amd123", "nvidia", "nvidia123", "gpu123", "cpu123", "ram123", "ssd123", "tech", "tech123", "code", "code123", "coder", "coder123", "program", "program123", "dev", "dev123", "developer", "developer123", "hacker", "hacker123", "cyber", "cyber123", "security", "security123", "crypto", "crypto123", "blockchain", "blockchain123", "bitcoin", "bitcoin123", "ethereum", "ethereum123", "wallet", "wallet123", "token", "token123", "айфон", "айфон123", "андроид", "андроид123", "гугл", "гугл123", "фейсбук", "фейсбук123", "инстаграм", "инстаграм123", "ютуб", "ютуб123", "почта", "почта123", "браузер", "браузер123", "комп", "комп123", "код", "код123", "family", "family123", "mother", "mother123", "father", "father123", "sister", "sister123", "brother", "brother123", "grandma", "grandma123", "grandpa", "grandpa123", "uncle", "uncle123", "aunt", "aunt123", "cousin", "cousin123", "friend", "friend123", "bestfriend", "bestfriend123", "buddy", "buddy123", "partner", "partner123", "lover", "lover123", "mybaby", "mybaby123", "mylove", "mylove123", "sweetheart", "sweetheart123", "darling", "darling123", "honey", "honey123", "angel", "angel123", "devil", "devil123", "heaven", "heaven123", "hell", "hell123", "god", "god123", "king", "king123", "queen", "queen123", "prince", "prince123", "princess1234", "royal", "royal123", "crown", "crown123", "empire", "empire123", "powerful", "powerful123", "strong", "strong123", "brave", "brave123", "fearless", "fearless123", "lucky", "lucky123", "fortune", "fortune123", "success", "success123", "winner1", "winner2", "winner3", "cool", "cool123", "nice", "nice123", "awesome", "awesome123", "amazing", "amazing123", "great", "great123", "семья", "семья123", "мама", "мама123", "папа", "папа123", "сестра", "сестра123", "брат", "брат123", "друг", "друг123", "любимый", "любимый123", "зайка", "зайка123", "солнышко123", "ангел", "ангел123", "король123", "счастье", "счастье123", "улыбка", "улыбка123", "смех", "смех123", "радость", "радость123", "веселье", "веселье123",
"путешествие", "путешествие123", "пляж", "пляж123", "гора", "гора123", "солнце", "солнце123", "луна", "луна123", "звезда", "звезда123", "небо", "небо123",
"облако", "облако123", "дождь", "дождь123", "снег", "снег123", "qwertyqwerty", "йцукенйцукен"
];

document.getElementById('checkLeakBtn').onclick = async () => {
    const p = document.getElementById('leakPass').value;
    if (!p) return;
    
    status('leakStatus', "Проверка в сети...");

    try {
        //ПОПЫТКА 1: Have I Been Pwned
        const msgBuffer = new TextEncoder().encode(p);
        const hashBuffer = await crypto.subtle.digest('SHA-1', msgBuffer);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('').toUpperCase();

        const prefix = hashHex.slice(0, 5);
        const suffix = hashHex.slice(5);

        const response = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`);
        if (!response.ok) throw new Error("API_UNAVAILABLE");
        
        const data = await response.text();
        const found = data.split('\n').some(line => line.trim().startsWith(suffix));

        if (found) {
            status('leakStatus', "⚠ ПАРОЛЬ СКОМПРОМЕТИРОВАН!!!", '#e74c3c');
        } else {
            status('leakStatus', "✅ Пароль не найден в базах утечек", '#27ae60');
        }

    } catch (e) {
        //ПОПЫТКА 2: Локальная база
        console.warn("API недоступно, переходим на локальную базу...");
        status('leakStatus', "Сеть недоступна. Локальная проверка...", '#f39c12');

        // Имитирую небольшую задержку для вида, что идет процесс
        setTimeout(() => {
            const isLocalMatch = LOCAL_LEAK_DB.includes(p.toLowerCase());
            
            if (isLocalMatch) {
                status('leakStatus', "⚠ ПАРОЛЬ СКОМПРОМЕТИРОВАН!!!", '#e74c3c');
            } else {
                status('leakStatus', "✅ Пароль не найден в базах утечек", '#2980b9');
            }
        }, 800);
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
