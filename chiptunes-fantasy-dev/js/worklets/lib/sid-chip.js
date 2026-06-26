// === js/worklets/lib/sid-chip.js ===
// ==========================================
// MOS Technology SID 6581 Sound Chip Emulation
// Cycle-Exact 15-Bit Rate Counter & Exponential ADSR Capacitor Modeling
// ==========================================

const ADSR_RATES_S = [
    0.006, 0.024, 0.054, 0.090, 0.150, 0.260, 0.300, 0.390,
    0.540, 0.800, 1.500, 3.000, 4.500, 5.700, 9.000, 24.00
];

const ENV_ATTACK = 0, ENV_DECAY = 1, ENV_SUSTAIN = 2, ENV_RELEASE = 3;

// Offizielle Hardware-Ratenperioden des SIDs in echten CPU-Zyklen
const RATE_COUNTER_PERIOD = [
    9, 32, 63, 95, 149, 220, 267, 313, 392, 977, 1954, 3126, 3907, 11720, 19530, 31256
];

export class SIDChip {
    constructor() {
        this.regs = new Uint8Array(29);
        this.voices = [
            { freq: 0, pw: 2048, ctrl: 0, env: 0, phase: 0, state: ENV_RELEASE, prevGate: false, waveOut8Bit: 0, env8Bit: 0, lfsr: 0x7FFFFF, rate_counter: 0, exponential_counter: 0, envelope_counter: 0 },
            { freq: 0, pw: 2048, ctrl: 0, env: 0, phase: 0, state: ENV_RELEASE, prevGate: false, waveOut8Bit: 0, env8Bit: 0, lfsr: 0x7FFFFF, rate_counter: 0, exponential_counter: 0, envelope_counter: 0 },
            { freq: 0, pw: 2048, ctrl: 0, env: 0, phase: 0, state: ENV_RELEASE, prevGate: false, waveOut8Bit: 0, env8Bit: 0, lfsr: 0x7FFFFF, rate_counter: 0, exponential_counter: 0, envelope_counter: 0 }
        ];
        this.cutoff = 30; this.resonance = 0; this.filterMode = 0; this.masterVol = 0;
        this.filterLow = 0; this.filterBand = 0;
    }

    writeReg(reg, val) {
        this.regs[reg] = val;
        
        let vIdx = Math.floor(reg / 7);
        if (vIdx < 3) {
            let ch = this.voices[vIdx];
            let base = vIdx * 7;
            ch.freq = this.regs[base] | (this.regs[base+1] << 8);
            ch.pw = this.regs[base+2] | ((this.regs[base+3] & 15) << 8);
            
            let prevCtrl = ch.ctrl;
            ch.ctrl = this.regs[base+4];
            
            let gate = (ch.ctrl & 1) !== 0;
            let prevGate = (prevCtrl & 1) !== 0;
            
            if (gate && !prevGate) ch.state = ENV_ATTACK;
            else if (!gate && prevGate) ch.state = ENV_RELEASE;
            ch.prevGate = gate;

            if (ch.ctrl & 8) {
                ch.phase = 0; 
                ch.lfsr = 0x7FFFFF;
            }
            
        } else if (reg === 21 || reg === 22) {
            let cutoffReg = (this.regs[21] & 7) | (this.regs[22] << 3);
            this.cutoff = 30 + (cutoffReg * 8);
        } else if (reg === 23) {
            this.resonance = (val >> 4) / 15.0;
        } else if (reg === 24) {
            this.filterMode = val;
            this.masterVol = (val & 15) / 15.0;
        }
    }

    // Liefert das Zyklen-Intervall der gewählten Rate aus der Hardware-Tabelle
    getRatePeriod(v, state) {
        let base = v * 7;
        let ad = this.regs[base + 5];
        let sr = this.regs[base + 6];
        
        if (state === ENV_ATTACK) return RATE_COUNTER_PERIOD[ad >> 4];
        if (state === ENV_DECAY) return RATE_COUNTER_PERIOD[ad & 15];
        return RATE_COUNTER_PERIOD[sr & 15]; // RELEASE
    }

    // === DIE NEUE NATIVE EXPONENTIELLE ADSR-KLOCKSCHLEIFE ===
    clockEnvelope(v, cycles) {
        let ch = this.voices[v];
        if (ch.state === ENV_SUSTAIN) {
            let sr = this.regs[v * 7 + 6];
            // Sustain-Level Double-Nibble Verdopplung (0x8 -> 0x88 / 136)
            ch.envelope_counter = (sr >> 4) | ((sr >> 4) << 4);
            return;
        }

        let ratePeriod = this.getRatePeriod(v, ch.state);

        while (cycles > 0) {
            if (ch.rate_counter <= 0) {
                ch.rate_counter += ratePeriod; // Zähler neu laden

                // Bestimmen des Exponential-Teilers basierend auf der aktuellen Lautstärke
                let expPeriod = 1;
                if (ch.state !== ENV_ATTACK) {
                    let envVal = ch.envelope_counter;
                    if (envVal >= 93) expPeriod = 1;
                    else if (envVal >= 54) expPeriod = 2;
                    else if (envVal >= 26) expPeriod = 4;
                    else if (envVal >= 14) expPeriod = 8;
                    else if (envVal >= 6) expPeriod = 16;
                    else expPeriod = 30;
                }

                ch.exponential_counter++;
                if (ch.exponential_counter >= expPeriod) {
                    ch.exponential_counter = 0;

                    // Envelope-Wert inkrementieren oder dekrementieren
                    if (ch.state === ENV_ATTACK) {
                        ch.envelope_counter++;
                        if (ch.envelope_counter >= 255) {
                            ch.envelope_counter = 255;
                            ch.state = ENV_DECAY;
                        }
                    } else if (ch.state === ENV_DECAY) {
                        let sr = this.regs[v * 7 + 6];
                        let sustainVal = (sr >> 4) | ((sr >> 4) << 4);
                        
                        if (ch.envelope_counter > sustainVal) {
                            ch.envelope_counter--;
                        } else {
                            ch.state = ENV_SUSTAIN;
                        }
                    } else if (ch.state === ENV_RELEASE) {
                        if (ch.envelope_counter > 0) {
                            ch.envelope_counter--;
                        }
                    }
                }
            }
            
            let step = Math.min(cycles, ch.rate_counter);
            ch.rate_counter -= step;
            cycles -= step;
        }
    }

    synthesizeVoice(v, clock, sampleRate, cyclesToRun) {
        let ch = this.voices[v];

        // 1. Taktgenaues ADSR-Update basierend auf den verflossenen CPU-Zyklen!
        this.clockEnvelope(v, cyclesToRun);

        // 2. Phasen-Akkumulator & Noise-Shift berechnen
        if ((ch.ctrl & 8) === 0) {
            let oldAcc = Math.floor(ch.phase * 16777216.0);
            let phaseInc = ((ch.freq * clock) / 16777216.0) / sampleRate;
            ch.phase += phaseInc;
            
            let newAcc = Math.floor(ch.phase * 16777216.0);
            ch.phase %= 1.0;

            // LFSR Noise Shift (16x f_out)
            let oldStep = Math.floor(oldAcc / 524288) & 31;
            let newStep = Math.floor(newAcc / 524288) & 31;
            let shifts = (newStep - oldStep + 32) & 31;

            for (let s = 0; s < shifts; s++) {
                let bit = ((ch.lfsr >> 22) ^ (ch.lfsr >> 17)) & 1;
                ch.lfsr = ((ch.lfsr << 1) & 0x7FFFFF) | bit;
            }
        }

        // 8-Bit Wellenformen (0-255)
        let tri8 = ch.phase < 0.5 ? Math.floor(ch.phase * 2.0 * 255) : Math.floor((1.0 - ch.phase) * 2.0 * 255);
        let saw8 = Math.floor((1.0 - ch.phase) * 255);
        let pulse8 = ch.phase > (ch.pw / 4095.0) ? 255 : 0;
        let noise8 = (ch.lfsr >> 15) & 0xFF; 

        let waveOut8 = 255;
        let hasWave = false;

        // Bitgenaue analoge Dioden-AND-Mischung
        if (ch.ctrl & 16) { waveOut8 &= tri8; hasWave = true; }
        if (ch.ctrl & 32) { waveOut8 &= saw8; hasWave = true; }
        if (ch.ctrl & 64) { waveOut8 &= pulse8; hasWave = true; }
        if (ch.ctrl & 128) { waveOut8 &= noise8; hasWave = true; }

        if (!hasWave) waveOut8 = 0; 

        // Speichern für Hubbard-Hack und Visualizer
        ch.waveOut8Bit = waveOut8;
        ch.env8Bit = ch.envelope_counter;

        let waveOutFloat = (waveOut8 / 127.5) - 1.0;
        // Bipolar modulieren mit dem hochpräzisen, exponentiellen Envelope-Wert
        return waveOutFloat * (ch.envelope_counter / 255.0);
    }
}