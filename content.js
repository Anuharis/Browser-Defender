// content.js - Изолированный мир
document.addEventListener('copy', (e) => {
    chrome.storage.local.get(['clip'], (res) => {
        if (!res || !res.clip) return;

        const sel = window.getSelection().toString();
        if (!sel || sel.startsWith("SAFE_DATA_V3:")) return;

        // Отправляем текст на шифрование в background.js
        chrome.runtime.sendMessage({ type: "ENCRYPT_CLIP", text: sel }, (response) => {
            if (response) {
                // Записываем зашифрованный текст в буфер
                navigator.clipboard.writeText(response).then(() => {
                    console.log("CryptoShield: Clipboard data secured.");
                }).catch(err => {
                    console.error("CryptoShield: Clipboard write failed", err);
                });
            }
        });
    });
});