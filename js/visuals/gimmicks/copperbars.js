// === js/visuals/gimmicks/copperbars.js ===
// =========================================================
// REAL-TIME COPPERBARS (RASTERBARS) COMPONENT
// Scanline Quantization & 12-Bit Color Depth Simulation
// =========================================================

export class Copperbars {
    constructor() {
        this.sinTimes = [1.3, 1.9, 1.6, 2.2];
        this.sinOffsets = [0.0, 2.0, 4.0, 1.5];
        this.baseThickness = [18, 14, 12, 10]; 
        this.heightWeights = [0.28, 0.33, 0.22, 0.25];
        
        // Cache, um teure Hex-String-Parsings in der Renderschleife zu verhindern
        this.colorCache = {};
    }

    hexToRgb(hex) {
        if (this.colorCache[hex]) return this.colorCache[hex];
        const r = parseInt(hex.substring(1, 3), 16);
        const g = parseInt(hex.substring(3, 5), 16);
        const b = parseInt(hex.substring(5, 7), 16);
        const rgb = [r, g, b];
        this.colorCache[hex] = rgb;
        return rgb;
    }

    drawCopperbar(ctx, w, y, height, volume, hexStart, hexEnd) {
        if (volume <= 0.01) return;
        
        const cS = this.hexToRgb(hexStart);
        const cE = this.hexToRgb(hexEnd);
        const cBlk = [0, 0, 0];
        const cWht = [255, 255, 255];
        
        // =========================================================
        // GFX UPGRADE: SCANLINE QUANTIZATION
        // Ein Rasterbar ist auf modernen Monitoren ca. 4 Pixel dick, 
        // um die tiefe 320x200 CRT-Auflösung zu simulieren.
        // =========================================================
        const scanlineHeight = 4; 
        const steps = Math.max(1, Math.floor(height / scanlineHeight));
        
        for(let i = 0; i <= steps; i++) {
            let t = i / steps; // Normalisierte Position im Bar (0.0 bis 1.0)
            let r, g, b;
            
            // Linear Interpolation (Lerp) der 5 Gradienten-Wegpunkte
            if (t < 0.18) {
                let n = t / 0.18;
                r = cBlk[0] + (cS[0] - cBlk[0]) * n;
                g = cBlk[1] + (cS[1] - cBlk[1]) * n;
                b = cBlk[2] + (cS[2] - cBlk[2]) * n;
            } else if (t < 0.5) {
                let n = (t - 0.18) / 0.32;
                r = cS[0] + (cWht[0] - cS[0]) * n;
                g = cS[1] + (cWht[1] - cS[1]) * n;
                b = cS[2] + (cWht[2] - cS[2]) * n;
            } else if (t < 0.82) {
                let n = (t - 0.5) / 0.32;
                r = cWht[0] + (cE[0] - cWht[0]) * n;
                g = cWht[1] + (cE[1] - cWht[1]) * n;
                b = cWht[2] + (cE[2] - cWht[2]) * n;
            } else {
                let n = (t - 0.82) / 0.18;
                r = cE[0] + (cBlk[0] - cE[0]) * n;
                g = cE[1] + (cBlk[1] - cE[1]) * n;
                b = cE[2] + (cBlk[2] - cE[2]) * n;
            }
            
            // =========================================================
            // GFX UPGRADE: 12-BIT COLOR BANDING (Amiga OCS Simulation)
            // Wir zerschneiden die 256 Farbstufen pro Kanal per Bitmaske (& 0xF0)
            // auf nur 16 Stufen (4-Bit) und doppeln sie (>> 4), um die Leuchtkraft zu erhalten.
            // =========================================================
            let r4 = (r | 0) & 0xF0; r4 |= (r4 >> 4);
            let g4 = (g | 0) & 0xF0; g4 |= (g4 >> 4);
            let b4 = (b | 0) & 0xF0; b4 |= (b4 >> 4);
            
            ctx.fillStyle = `rgb(${r4}, ${g4}, ${b4})`;
            
            // Zeichne den harten horizontalen Scanline-Block
            let drawY = Math.floor(y + i * scanlineHeight);
            ctx.fillRect(0, drawY, w, scanlineHeight);
        }
    }

    render(ctx, width, height, t, channelVolumes) {
        const isAmiga = document.body.classList.contains('theme-amiga');
        const isAtari = document.body.classList.contains('theme-atari');
        
        const numBars = isAmiga ? 4 : 3;
        const pals = [
            isAtari ? ['#003300', '#00aa00'] : isAmiga ? ['#000066', '#0055ff'] : ['#201a60', '#6c5eb5'],
            isAtari ? ['#333300', '#aaaa00'] : isAmiga ? ['#663300', '#ff8800'] : ['#660033', '#ff00aa'],
            isAtari ? ['#003333', '#00aaaa'] : isAmiga ? ['#330066', '#aa00ff'] : ['#333333', '#aaaaaa'],
            isAmiga ? ['#111111', '#888888'] : []
        ];

        ctx.globalCompositeOperation = "screen"; 
        for (let c = 0; c < numBars; c++) {
            const vol = channelVolumes[c] || 0;
            const punch = vol * 28; 
            
            const yCenter = (height / 2) + Math.sin(t * this.sinTimes[c] + this.sinOffsets[c]) * (height * this.heightWeights[c]);
            this.drawCopperbar(ctx, width, yCenter - (this.baseThickness[c] + punch) / 2, this.baseThickness[c] + punch, vol, pals[c][0], pals[c][1]);
        }
        ctx.globalCompositeOperation = "source-over";
    }
}