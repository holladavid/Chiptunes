// === js/visuals/visualizer.js ===
// =========================================================
// HIGH-PERFORMANCE RETROWAVE VISUALIZER MODULE
// Optimized Phosphor Trail, Clean Copperbars & Demoscene Gimmicks
// =========================================================

export function initVisuals(stateGetters, callbacks) {
    const canvas = document.getElementById('demo-canvas');
    if (!canvas) return;

    const ctx = canvas.getContext('2d', { alpha: false }); 
    
    let historyLength = canvas.width;
    let oscHistory = new Float32Array(historyLength).fill(NaN);
    let oscIndex = 0;

    // --- EASTER EGG STATE ---
    let showGimmick = false;
    const logo = document.getElementById('brand-logo');
    if (logo) {
        logo.addEventListener('click', () => {
            showGimmick = !showGimmick;
            // Visuelles Feedback beim Klicken
            logo.style.filter = 'brightness(2.0)';
            setTimeout(() => logo.style.filter = '', 100);
        });
    }

    // --- C64 STARFIELD DATA ---
    const numStars = 150;
    const stars = Array.from({ length: numStars }, () => ({
        x: (Math.random() - 0.5) * 2000,
        y: (Math.random() - 0.5) * 2000,
        z: Math.random() * 1000 + 10
    }));

    // --- AMIGA CUBE DATA ---
    const cubeVertices = [
        [-1, -1, -1], [ 1, -1, -1], [ 1,  1, -1], [-1,  1, -1],
        [-1, -1,  1], [ 1, -1,  1], [ 1,  1,  1], [-1,  1,  1]
    ];
    const cubeEdges = [
        [0,1], [1,2], [2,3], [3,0], // Hinten
        [4,5], [5,6], [6,7], [7,4], // Vorne
        [0,4], [1,5], [2,6], [3,7]  // Verbindungen
    ];

    function resizeCanvas() {
        const clientWidth = canvas.clientWidth;
        const clientHeight = canvas.clientHeight;
        const maxResolutionWidth = 1280;
        let scale = 1.0;
        
        if (clientWidth > maxResolutionWidth) {
            scale = maxResolutionWidth / clientWidth;
        }
        
        const newWidth = Math.floor(clientWidth * scale);
        const newHeight = Math.floor(clientHeight * scale);
        
        if (canvas.width !== newWidth || canvas.height !== newHeight) {
            const oldHistory = oscHistory;
            const oldLen = oldHistory ? oldHistory.length : 0;
            
            canvas.width = newWidth; 
            canvas.height = newHeight;
            historyLength = canvas.width;
            
            oscHistory = new Float32Array(historyLength).fill(NaN);
            
            if (oldLen > 0) {
                const copyLen = Math.min(oldLen, historyLength);
                for (let i = 0; i < copyLen; i++) {
                    const oldVal = oldHistory[(oscIndex - copyLen + i + oldLen) % oldLen];
                    oscHistory[i] = oldVal;
                }
                oscIndex = copyLen % historyLength;
            }
        }
    }
    
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    
    const startTime = performance.now();
    let hudCounter = 0; 
    const barCount = 48; 
    const peaks = new Array(barCount).fill(0); 

    function drawReticle() {
        const w = canvas.width;
        const h = canvas.height;
        const midY = h / 2;
        
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(0, midY);
        ctx.lineTo(w, midY);
        ctx.stroke();
        
        const divisions = 10;
        const stepX = w / divisions;
        ctx.beginPath();
        for (let i = 1; i < divisions; i++) {
            ctx.moveTo(i * stepX, 0);
            ctx.lineTo(i * stepX, h);
        }
        ctx.stroke();
        ctx.setLineDash([]); 
    }

    function drawCopperbar(y, height, volume, colorStart, colorEnd) {
        if (volume <= 0.01) return;
        const w = canvas.width;
        
        const grad = ctx.createLinearGradient(0, y, 0, y + height);
        grad.addColorStop(0.0, '#000000');
        grad.addColorStop(0.18, colorStart);
        grad.addColorStop(0.5, '#ffffff'); 
        grad.addColorStop(0.82, colorEnd);
        grad.addColorStop(1.0, '#000000');
        
        ctx.fillStyle = grad;
        ctx.fillRect(0, y, w, height);
    }

    // =========================================================
    // THE DEMOSCENE GIMMICKS
    // =========================================================

    function renderC64Starfield(t, volume) {
        const cx = canvas.width / 2;
        const cy = canvas.height / 2;
        // Warp Speed basiert auf der Gesamtlautstärke
        const speed = 2 + (volume * 15); 
        
        ctx.fillStyle = '#6c5eb5'; // C64 Hellblau
        
        stars.forEach(star => {
            star.z -= speed;
            if (star.z <= 1) {
                star.z = 1000;
                star.x = (Math.random() - 0.5) * 2000;
                star.y = (Math.random() - 0.5) * 2000;
            }
            
            // 3D zu 2D Projektion
            const px = cx + (star.x / star.z) * 500;
            const py = cy + (star.y / star.z) * 500;
            
            if (px >= 0 && px <= canvas.width && py >= 0 && py <= canvas.height) {
                const size = Math.max(1, (1000 - star.z) / 200);
                // Je näher, desto weißer
                ctx.fillStyle = star.z < 300 ? '#ffffff' : '#6c5eb5';
                ctx.fillRect(px, py, size, size);
            }
        });
    }

    function renderAmigaCube(t, bassVolume) {
        const cx = canvas.width / 2;
        const cy = canvas.height / 2;
        
        // Rotation Angles
        const rx = t * 0.8;
        const ry = t * 1.2;
        const rz = t * 0.5;
        
        // Der Würfel pulsiert im Takt des Basses (Kanal 0)
        const scale = 80 + (bassVolume * 100);
        
        const projected = [];
        
        // 3D Rotations-Matrix
        cubeVertices.forEach(v => {
            let x = v[0], y = v[1], z = v[2];
            
            // Rot X
            let y1 = y * Math.cos(rx) - z * Math.sin(rx);
            let z1 = y * Math.sin(rx) + z * Math.cos(rx);
            // Rot Y
            let x2 = x * Math.cos(ry) + z1 * Math.sin(ry);
            let z2 = -x * Math.sin(ry) + z1 * Math.cos(ry);
            // Rot Z
            let x3 = x2 * Math.cos(rz) - y1 * Math.sin(rz);
            let y3 = x2 * Math.sin(rz) + y1 * Math.cos(rz);
            
            // Projection
            const fov = 400;
            const zOff = z2 + 4; // Abstand zur Kamera
            const px = cx + (x3 * fov) / zOff * (scale / 100);
            const py = cy + (y3 * fov) / zOff * (scale / 100);
            projected.push({x: px, y: py});
        });
        
        ctx.strokeStyle = '#ff8800'; // Amiga Orange
        ctx.lineWidth = 3;
        ctx.lineJoin = 'round';
        ctx.beginPath();
        
        cubeEdges.forEach(edge => {
            const p1 = projected[edge[0]];
            const p2 = projected[edge[1]];
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);
        });
        
        ctx.stroke();
    }

    function renderAtariBobs(t, volume) {
        const cx = canvas.width / 2;
        const cy = canvas.height / 2;
        const numBobs = 40;
        
        // Das Muster weitet sich bei lauten Tönen aus
        const radius = (canvas.height * 0.25) + (volume * 100);
        
        ctx.fillStyle = '#55ff55'; // Atari ST Grün
        
        for (let i = 0; i < numBobs; i++) {
            // Lissajous Figuren-Mathematik
            const phase = i * 0.15;
            const x = cx + Math.sin(t * 1.5 + phase) * radius * 1.5;
            const y = cy + Math.sin(t * 2.3 + phase) * Math.cos(t * 1.1 + phase) * radius;
            
            // Dicker "Bob" (Pixel-Block)
            const size = 8 + Math.sin(t * 3 + phase) * 4;
            ctx.fillRect(x - size/2, y - size/2, size, size);
        }
    }

    // =========================================================
    // MAIN RENDER LOOP
    // =========================================================

    function draw() {
        if (stateGetters.getEcoMode()) {
            callbacks.updateTimelineUI(); 
            requestAnimationFrame(draw);
            return; 
        }

        const t = (performance.now() - startTime) * 0.001; 
        
        // Background
        ctx.fillStyle = 'rgba(0, 0, 0, 0.38)'; 
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        const isAmiga = document.body.classList.contains('theme-amiga');
        const isAtari = document.body.classList.contains('theme-atari');
        const isC64 = document.body.classList.contains('theme-c64');
        const lineColor = isAtari ? '#55ff55' : isAmiga ? '#ff8800' : '#6c5eb5';
        
        drawReticle();

        const channelVolumes = stateGetters.getChannelVolumes ? stateGetters.getChannelVolumes() : [0, 0, 0, 0];
        let totalVol = 0;
        for (let i=0; i<4; i++) totalVol += channelVolumes[i] || 0;
        const avgVol = totalVol / 4.0;

        // --- EASTER EGG RENDER INJECTION ---
        if (showGimmick) {
            if (isC64) renderC64Starfield(t, avgVol);
            else if (isAmiga) renderAmigaCube(t, channelVolumes[0] || 0); // Reagiert primär auf Kanal 0 (oft Bass/Kick)
            else if (isAtari) renderAtariBobs(t, avgVol);
        }

        // Copperbars
        const numBars = isAmiga ? 4 : 3;
        const pals = [
            isAtari ? ['#003300', '#00aa00'] : isAmiga ? ['#000066', '#0055ff'] : ['#201a60', '#6c5eb5'],
            isAtari ? ['#333300', '#aaaa00'] : isAmiga ? ['#663300', '#ff8800'] : ['#660033', '#ff00aa'],
            isAtari ? ['#003333', '#00aaaa'] : isAmiga ? ['#330066', '#aa00ff'] : ['#333333', '#aaaaaa'],
            isAmiga ? ['#111111', '#888888'] : []
        ];

        const sinTimes = [1.3, 1.9, 1.6, 2.2];
        const sinOffsets = [0.0, 2.0, 4.0, 1.5];
        const baseThickness = [18, 14, 12, 10]; 
        const heightWeights = [0.28, 0.33, 0.22, 0.25];

        ctx.globalCompositeOperation = "screen"; 
        for (let c = 0; c < numBars; c++) {
            let vol = channelVolumes[c] || 0;
            let punch = vol * 28; 
            
            let yCenter = (canvas.height / 2) + Math.sin(t * sinTimes[c] + sinOffsets[c]) * (canvas.height * heightWeights[c]);
            drawCopperbar(yCenter - (baseThickness[c] + punch)/2, (baseThickness[c] + punch), vol, pals[c][0], pals[c][1]);
        }
        ctx.globalCompositeOperation = "source-over";

        // Oscilloscope Line
        const currentOscValue = stateGetters.getCurrentOscValue();
        const trackData = stateGetters.getTrackData();
        const trackLength = trackData ? (trackData.length || 0) : 0;
        
        oscHistory[oscIndex] = (trackLength === 0) ? 0 : currentOscValue;
        oscIndex = (oscIndex + 1) % historyLength; 

        ctx.beginPath();
        ctx.lineWidth = 2.5;
        ctx.strokeStyle = lineColor;
        
        ctx.shadowColor = lineColor;
        ctx.shadowBlur = 10;

        let isFirstPoint = true;
        for (let x = 0; x < historyLength; x++) {
            const actualIndex = (oscIndex + x) % historyLength; 
            const val = oscHistory[actualIndex];
            
            if (!isNaN(val)) {
                const y = (canvas.height / 2) - (val * (canvas.height * 0.42)); 
                if (isFirstPoint) {
                    ctx.moveTo(x, y);
                    isFirstPoint = false;
                } else {
                    ctx.lineTo(x, y);
                }
            }
        }
        
        if (!isFirstPoint) {
            ctx.stroke();
        }
        ctx.shadowBlur = 0; 

        // FFT Analyzer
        const activeAnalyser = stateGetters.getAnalyserNode();
        const isPlaying = stateGetters.getIsPlaying();
        const audioCtx = stateGetters.getAudioContext();

        if (activeAnalyser && isPlaying && audioCtx) {
            const bufferLength = activeAnalyser.frequencyBinCount;
            const dataArray = new Uint8Array(bufferLength);
            activeAnalyser.getByteFrequencyData(dataArray);
            
            const barWidth = (canvas.width / barCount) - 2;
            let x = 0;
            
            const hzPerBin = audioCtx.sampleRate / activeAnalyser.fftSize;
            const minBin = Math.max(1, Math.floor(50 / hzPerBin)); 
            const maxBin = Math.floor(12000 / hzPerBin); 
            let lastEndBin = minBin;
            
            for (let i = 0; i < barCount; i++) {
                const startBin = lastEndBin;
                let endBin = Math.floor(minBin * Math.pow(maxBin / minBin, (i + 1) / barCount));
                if (endBin <= startBin) endBin = startBin + 1;
                lastEndBin = endBin;
                
                let sum = 0;
                for (let b = startBin; b < endBin; b++) sum += dataArray[b];
                const avg = sum / (endBin - startBin);
                
                const heightBoost = 1.0 + (i / barCount) * 0.6;
                const barHeight = ((avg * heightBoost) / 255.0) * (canvas.height * 0.38);
                
                if (barHeight > peaks[i]) peaks[i] = barHeight; 
                else { peaks[i] -= 1.2; if (peaks[i] < 0) peaks[i] = 0; }
                
                ctx.fillStyle = lineColor; 
                ctx.globalAlpha = 0.6;
                ctx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);
                
                if (peaks[i] > 2) {
                    ctx.globalAlpha = 1.0; 
                    ctx.fillStyle = '#ffffff';
                    ctx.fillRect(x, canvas.height - peaks[i] - 3, barWidth, 2);
                }
                x += barWidth + 2;
            }
            ctx.globalAlpha = 1.0;
        }

        hudCounter++;
        callbacks.updateTimelineUI();
        if (hudCounter % 4 === 0) callbacks.updateChipHUD();
        requestAnimationFrame(draw);
    }
    
    draw();
}