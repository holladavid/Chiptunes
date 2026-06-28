// === js/worklets/lib/sid-waveforms.js ===
// =========================================================
// MOS 6581 WAVEFORM GENERATOR & BIT-LOGIC
// Etappe 1: Ringmod Pipeline Fix & Dynamic Floating DAC
// ==========================================

/**
 * Berechnet die bitgenaue 8-Bit Wellenform des MOS 6581.
 * 
 * @param {Object} ch - Referenz auf den Kanal (für Floating DAC State)
 * @param {number} ctrl - 8-Bit Control Register (Gate, Sync, Ring, Test, Tri, Saw, Pulse, Noise)
 * @param {number} phase24 - 24-Bit Phasen-Akkumulator (0 bis 0xFFFFFF)
 * @param {number} pw12 - 12-Bit Pulse Width Register (0 bis 4095)
 * @param {number} lfsr23 - 23-Bit Noise Linear Feedback Shift Register
 * @param {number} ringMSB - MSB des vorherigen Kanals für Ringmodulation
 * @returns {number} 8-Bit DAC Output (0 bis 255)
 */
export function calculateWaveform8Bit(ch, ctrl, phase24, pw12, lfsr23, ringMSB) {
    let out = 0xFF; 
    let hasWave = false;

    if (ctrl & 16) { // Triangle
        // --- ETAPPE 1: Ringmod Pipeline ---
        // Die Ringmodulation invertiert das MSB des Phasen-Akkumulators VOR der eigentlichen
        // Auswertung der Dreiecks-Zählrichtung! Das erzeugt die fehlerfreie Hardware-Symmetrie.
        let bit23 = (phase24 >> 23) & 1;
        if (ctrl & 4) {
            bit23 ^= ringMSB;
        }

        let tri12 = (phase24 >> 11) & 0xFFF;
        if (bit23) {
            tri12 = (~tri12) & 0xFFF;
        }
        
        out &= (tri12 >> 4);
        hasWave = true;
    }

    if (ctrl & 32) { // Sawtooth
        out &= (phase24 >> 16) & 0xFF;
        hasWave = true;
    }

    if (ctrl & 64) { // Pulse
        let testPhase = (phase24 >> 12) & 0xFFF;
        let pulseOut = (testPhase <= pw12) ? 0xFF : 0x00;
        out &= pulseOut;
        hasWave = true;
    }

    if (ctrl & 128) { // Noise
        let noiseOut = ((lfsr23 & 0x400000) >> 15) | 
                       ((lfsr23 & 0x100000) >> 14) | 
                       ((lfsr23 & 0x010000) >> 11) | 
                       ((lfsr23 & 0x002000) >>  9) | 
                       ((lfsr23 & 0x000800) >>  8) | 
                       ((lfsr23 & 0x000080) >>  5) | 
                       ((lfsr23 & 0x000010) >>  3) | 
                       ((lfsr23 & 0x000004) >>  2);  
        out &= noiseOut;
        hasWave = true;
    }

    // --- ETAPPE 1: Dynamic Floating DAC ---
    // Der Ausgang driftet organisch, wenn die Oszillatoren stummgeschaltet werden.
    // Simuliert entladende Kapazitäten und DAC-Leckströme des echten Siliziums.
    if (hasWave) {
        ch.floatingLevel = out;
    } else {
        ch.floatingLevel += (0 - ch.floatingLevel) * 0.0002;
        out = Math.round(ch.floatingLevel);
    }

    return out;
}