// ==========================================
// EMU CORE REGISTRY (AudioWorklets)
// ==========================================

export const workletRegistry = {
    atari: [
        { id: 'ym-standard', name: 'YM2149 (Standard)', file: 'js/worklets/atari/ym-worklet.js', processor: 'ym-processor' },
        // NEU: Der PolyBLEP Premium Core!
        { id: 'ym-exact', name: 'YM2149 (PolyBLEP Anti-Aliasing)', file: 'js/worklets/atari/ym-exact.js', processor: 'ym-exact-processor' }
    ],
    c64: [
        { id: 'sid-6581', name: 'MOS SID 6581 (Classic)', file: 'js/worklets/c64/sid-worklet.js', processor: 'sid-processor' }
    ],
    amiga: [
        { id: 'paula-standard', name: 'MOS Paula 8364', file: 'js/worklets/amiga/paula-worklet.js', processor: 'paula-processor' }
    ]
};