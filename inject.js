// inject.js
(function() {
    const original = HTMLCanvasElement.prototype.toDataURL;
    HTMLCanvasElement.prototype.toDataURL = function() {
        const ctx = this.getContext('2d');
        if (ctx) { 
            ctx.fillStyle = 'rgba(0,0,0,0.01)'; 
            ctx.fillRect(0,0,1,1); 
        }
        return original.apply(this, arguments);
    };
    console.log("CryptoShield: Canvas protection injected via World:MAIN");
})();