// === js/visuals/components/oscilloscope.js ===
// =========================================================
// REAL-TIME CRT VECTOR OSCILLOSCOPE COMPONENT
// Encapsulates history buffers, index-shift resizing, and rendering
// High-End Analog Beam Intensity Simulation (Phosphor Saturation)
// =========================================================

export class Oscilloscope {
    constructor(width) {
        this.oscHistory = new Float32Array(width).fill(NaN);
        this.oscIndex = 0;
    }

    resize(newWidth) {
        const oldHistory = this.oscHistory;
        const oldLen = oldHistory ? oldHistory.length : 0;
        this.oscHistory = new Float32Array(newWidth).fill(NaN);
        const oldIndex = this.oscIndex;
        this.oscIndex = 0;

        if (oldLen > 0) {
            const copyLen = Math.min(oldLen, newWidth);
            for (let i = 0; i < copyLen; i++) {
                const oldVal = oldHistory[(oldIndex - copyLen + i + oldLen) % oldLen];
                this.oscHistory[i] = oldVal;
            }
            this.oscIndex = copyLen % newWidth;
        }
    }

    clear() {
        this.oscHistory.fill(NaN);
    }

    render(ctx, width, height, stateGetters, lineColor) {
        const currentOscValue = stateGetters.getCurrentOscValue();
        const trackData = stateGetters.getTrackData();
        const trackLength = trackData ? (trackData.length || 0) : 0;

        this.oscHistory[this.oscIndex] = (trackLength === 0) ? 0 : currentOscValue;
        this.oscIndex = (this.oscIndex + 1) % width;

        // --- 1. KOORDINATEN VORBERECHNEN (Vermeidet doppelte Berechnungen) ---
        const yCoords = new Float32Array(width);
        for (let x = 0; x < width; x++) {
            const actualIndex = (this.oscIndex + x) % width;
            const val = this.oscHistory[actualIndex];
            yCoords[x] = isNaN(val) ? NaN : (height / 2) - (val * (height * 0.42));
        }

        // =========================================================
        // --- 2. LAYER 1: DER GLOW (Hintergrund-Glow via 48kHz Filter) ---
        // =========================================================
        ctx.beginPath();
        ctx.lineWidth = 4.0;
        ctx.strokeStyle = lineColor;
        ctx.globalAlpha = 0.25; // Zarter Hintergrund-Glow
        ctx.shadowColor = lineColor;
        ctx.shadowBlur = 10;    // Der warme Röhren-Glow
        
        let isFirst = true;
        for (let x = 0; x < width; x++) {
            const y = yCoords[x];
            if (!isNaN(y)) {
                if (isFirst) {
                    ctx.moveTo(x, y);
                    isFirst = false;
                } else {
                    ctx.lineTo(x, y);
                }
            }
        }
        if (!isFirst) ctx.stroke();
        
        // Schatten und Opazität für den performance-kritischen Core-Loop resetten
        ctx.shadowBlur = 0;
        ctx.globalAlpha = 1.0;

        // =========================================================
        // --- 3. LAYER 2: DER ANALOGE STRAHLKERN (Segment-Faltung) ---
        // =========================================================
        let lastX = -1;
        let lastY = NaN;

        for (let x = 0; x < width; x++) {
            const y = yCoords[x];
            if (isNaN(y)) {
                lastX = -1;
                lastY = NaN;
                continue;
            }

            if (lastX !== -1 && !isNaN(lastY)) {
                // Steigung (Geschwindigkeit des Elektronenstrahls) berechnen
                const dy = Math.abs(y - lastY);
                
                // Normalisieren (Volle Dämpfung bei 45 Pixeln vertikalem Sprung)
                const speedFactor = Math.min(1.0, dy / 45.0);
                
                // Linienstärke schrumpft bei hoher Geschwindigkeit (bis auf 1.0px)
                const widthFactor = 2.8 - (speedFactor * 1.8); 
                
                // Leuchtkraft schrumpft bei hoher Geschwindigkeit (bis auf 35% Alpha)
                const alphaFactor = 1.0 - (speedFactor * 0.65);
                
                ctx.lineWidth = widthFactor;
                ctx.globalAlpha = alphaFactor;
                
                // Sättigungs-Effekt: Bei extrem langsamen Bewegungen (Peaks/Flats) 
                // brennt sich der Strahl weiß glühend in die Netzhaut
                if (speedFactor < 0.12) {
                    ctx.strokeStyle = '#ffffff'; 
                } else {
                    ctx.strokeStyle = lineColor;
                }

                ctx.beginPath();
                ctx.moveTo(lastX, lastY);
                ctx.lineTo(x, y);
                ctx.stroke();
            }

            lastX = x;
            lastY = y;
        }

        // Context-State aufräumen
        ctx.globalAlpha = 1.0;
    }
}