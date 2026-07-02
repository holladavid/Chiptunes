// === js/visuals/gimmicks/copperbars.js ===
// =========================================================
// REAL-TIME COPPERBARS (RASTERBARS) COMPONENT
// System-Specific Color Banding & Audio-Reactive Amplitude
// =========================================================

export class Copperbars {
    constructor() {
        this.sinTimes = [0.6, 0.85, 0.7, 0.95];
        this.sinOffsets = [0.0, 2.0, 4.0, 1.5];
        
        // GFX UPGRADE: Massive, authentische Demoscene-Breite!
        // Vorher: [18, 14, 12, 10] -> viel zu dünn für moderne Displays.
        // Jetzt: Bis zu 160 Pixel dick, simuliert breite Register-Verläufe.
        this.baseThickness = [160, 120, 90, 70]; 
        
        this.heightWeights = [0.28, 0.33, 0.22, 0.25];
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

    drawCopperbar(ctx, w, y, height, volume, hexStart, hexEnd, scanlineHeight, colorBitShift) {
        if (volume <= 0.01) return;
        
        const cS = this.hexToRgb(hexStart);
        const cE = this.hexToRgb(hexEnd);
        const cBlk = [0, 0, 0];
        const cWht = [255, 255, 255];
        
        const steps = Math.max(1, Math.floor(height / scanlineHeight));
        
        for(let i = 0; i <= steps; i++) {
            let t = i / steps; 
            let r, g, b;
            
            // Linear Interpolation der Wegpunkte
            if (t < 0.18) {
                let n = t / 0.18;
                r = cBlk[0] + (cS[0] - cBlk[0]) * n;
                g = cBlk[1] + (cS[1] - cBlk[1]) * n;
                b = cBlk[2] + (cBlk[2] - cBlk[2]) * n; 
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
            // GFX UPGRADE: SYSTEM-SPECIFIC COLOR DEPTH
            // Wir quantisieren die Farbe hart durch Bit-Shifting, basierend
            // auf der Architektur des aktiven Rechners.
            // =========================================================
            let mask = (0xFF >> colorBitShift) << colorBitShift;
            let r_q = (r | 0) & mask; r_q |= (r_q >> (8 - colorBitShift));
            let g_q = (g | 0) & mask; g_q |= (g_q >> (8 - colorBitShift));
            let b_q = (b | 0) & mask; b_q |= (b_q >> (8 - colorBitShift));
            
            ctx.fillStyle = `rgb(${r_q}, ${g_q}, ${b_q})`;
            
            let drawY = Math.floor(y + i * scanlineHeight);
            ctx.fillRect(0, drawY, w, scanlineHeight);
        }
    }

 render(ctx, width, height, t, channelVolumes) {
        const isAmiga = document.body.classList.contains('theme-amiga');
        const isAtari = document.body.classList.contains('theme-atari');
        const isC64 = document.body.classList.contains('theme-c64');
        
        const numBars = isAmiga ? 4 : 3;
        const pals = [
            isAtari ? ['#003300', '#00aa00'] : isAmiga ? ['#000066', '#0055ff'] : ['#201a60', '#6c5eb5'],
            isAtari ? ['#333300', '#aaaa00'] : isAmiga ? ['#663300', '#ff8800'] : ['#660033', '#ff00aa'],
            isAtari ? ['#003333', '#00aaaa'] : isAmiga ? ['#330066', '#aa00ff'] : ['#333333', '#aaaaaa'],
            isAmiga ? ['#111111', '#888888'] : []
        ];

        let scanlineHeight = 4;
        let colorBitShift = 4; 
        
        if (isAtari) {
            colorBitShift = 5; 
        } else if (isC64) {
            scanlineHeight = 8; 
            colorBitShift = 6;  
        }

        for (let c = 0; c < numBars; c++) {
            const vol = channelVolumes[c] || 0;
            
            // GFX UPGRADE: Das Pulsen (Punch) an die neue, wuchtige Balkengröße anpassen
            const punch = Math.pow(vol, 1.5) * 40; // Vorher 20, jetzt atmet der fette Balken sanft mit
            
            // Die Y-Auslenkung bleibt dynamisch, aber smooth
            const dynamicAmplitude = (height * this.heightWeights[c]) + (punch * 0.5);
            const yCenter = (height / 2) + Math.sin(t * this.sinTimes[c] + this.sinOffsets[c]) * dynamicAmplitude;
            
            this.drawCopperbar(ctx, width, yCenter - (this.baseThickness[c] + punch) / 2, this.baseThickness[c] + punch, vol, pals[c][0], pals[c][1], scanlineHeight, colorBitShift);
        }
    }
}