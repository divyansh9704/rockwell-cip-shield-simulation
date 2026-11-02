/* ==========================================================================
   ROCKWELL AUTOMATION CIP-SHIELD: HIGH-IMPACT BEFORE VS AFTER DIGITAL TWIN
   Includes:
   - High-DPI Retina Canvas Rendering
   - 45-Second Executive Auto-Tour Engine
   - Network Data Conduit with packet stream
   - 6-Axis Hydraulic Robot Kinematics & Bouncing Sparks
   - Mechanical E-Stop Brake Reaction
   - CISA AA26-097A Quarantine Barrier
   ========================================================================== */

(function () {
  'use strict';

  // APPLICATION STATE
  const state = {
    mode: 'after',            // 'before' (naive TLS) or 'after' (CIP-Shield fast-path)
    currentStep: 2,           // 1: Bottleneck, 2: Fix, 3: Trust Gap
    tampered: false,          // CISA AA26-097A logic tampering state
    audioEnabled: false,
    
    // Auto-Tour Engine
    tourActive: false,
    tourTimer: null,
    tourProgress: 0,
    tourInterval: null,
    
    // Physical kinematics & motion
    robotAngle1: 0,
    robotAngle2: 0,
    robotWeldPhase: 0,
    robotFaultFreeze: false,
    brakeJerkOffset: 0,
    
    // Performance & financial metrics
    currentLatency: 0.84,     // ms
    targetLatency: 0.84,
    downtimeLossIncurred: 0,  // USD accumulated during watchdog faults
    
    // Network packet conduit animation
    packetBusProgress: 0,
    
    // Particle spark & smoke systems
    sparks: [],
    smoke: [],
    
    // Led dot matrix rolling message
    dotMatrixStrings: ['RUN ', 'OK  ', 'L85E', '1.0m', 'SYNC'],
    dotMatrixIndex: 0,
    dotMatrixCharTick: 0
  };

  // DOM REFERENCES
  const autoTourBtn = document.getElementById('autoTourBtn');
  const tourIcon = document.getElementById('tourIcon');
  const tourText = document.getElementById('tourText');
  const tourProgressWrap = document.getElementById('tourProgressWrap');
  const tourProgressFill = document.getElementById('tourProgressFill');
  const tourStatusText = document.getElementById('tourStatusText');

  const storyStep1 = document.getElementById('storyStep1');
  const storyStep2 = document.getElementById('storyStep2');
  const storyStep3 = document.getElementById('storyStep3');

  const btnModeBefore = document.getElementById('btnModeBefore');
  const btnModeAfter = document.getElementById('btnModeAfter');
  const btnToggleTamper = document.getElementById('btnToggleTamper');
  const btnTriggerSpike = document.getElementById('btnTriggerSpike');
  const audioToggleBtn = document.getElementById('audioToggleBtn');
  const audioIcon = document.getElementById('audioIcon');
  const qrBtn = document.getElementById('qrBtn');
  const qrModal = document.getElementById('qrModal');
  const closeQrBtn = document.getElementById('closeQrBtn');

  // DISPLAY DOM
  const dotMatrixDisplay = document.getElementById('dotMatrixDisplay');
  const ledRun = document.getElementById('ledRun');
  const ledOk = document.getElementById('ledOk');
  const ledFlt = document.getElementById('ledFlt');
  const keySwitchState = document.getElementById('keySwitchState');
  const cpuLoadText = document.getElementById('cpuLoadText');
  const overlayBadge = document.getElementById('overlayBadge');
  const overlayIcon = document.getElementById('overlayIcon');
  const overlayText = document.getElementById('overlayText');

  // METRICS DOM
  const cardLatency = document.getElementById('cardLatency');
  const cardFinance = document.getElementById('cardFinance');
  const cardCisa = document.getElementById('cardCisa');

  const latencyChipBadge = document.getElementById('latencyChipBadge');
  const currentLatencyVal = document.getElementById('currentLatencyVal');
  const latencySubtext = document.getElementById('latencySubtext');
  const latencyFillBar = document.getElementById('latencyFillBar');
  const cryptoSpeedText = document.getElementById('cryptoSpeedText');
  const jitterText = document.getElementById('jitterText');
  const tripsCountText = document.getElementById('tripsCountText');
  const financeChipBadge = document.getElementById('financeChipBadge');
  const sessionLossVal = document.getElementById('sessionLossVal');
  const sessionLossSub = document.getElementById('sessionLossSub');

  // CISA DOM
  const cisaStatusBadge = document.getElementById('cisaStatusBadge');
  const hashPlc = document.getElementById('hashPlc');
  const pipelineTrack = document.getElementById('pipelineTrack');
  const pipelineStatusText = document.getElementById('pipelineStatusText');
  const tamperIcon = document.getElementById('tamperIcon');
  const tamperText = document.getElementById('tamperText');

  // HUD SCRIPT DOM
  const hudScriptText = document.getElementById('hudScriptText');

  // CANVAS INITIALIZATION WITH HIGH-DPI SCALING
  const canvas = document.getElementById('twinCanvas');
  const ctx = canvas.getContext('2d');

  function resizeCanvas() {
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);
  }
  window.addEventListener('resize', resizeCanvas);
  resizeCanvas();

  // WEB AUDIO SYNTHESIZER
  let audioCtx = null;
  let servoOsc = null;
  let servoGain = null;
  let humOsc = null;
  let humGain = null;

  function initAudio() {
    if (audioCtx) return;
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      audioCtx = new AudioContext();

      // 60Hz hum
      humOsc = audioCtx.createOscillator();
      humOsc.type = 'sine';
      humOsc.frequency.setValueAtTime(60, audioCtx.currentTime);
      humGain = audioCtx.createGain();
      humGain.gain.setValueAtTime(0.015, audioCtx.currentTime);
      humOsc.connect(humGain);
      humGain.connect(audioCtx.destination);
      humOsc.start();

      // Servo whine
      servoOsc = audioCtx.createOscillator();
      servoOsc.type = 'sawtooth';
      servoOsc.frequency.setValueAtTime(320, audioCtx.currentTime);
      servoGain = audioCtx.createGain();
      servoGain.gain.setValueAtTime(0.008, audioCtx.currentTime);
      servoOsc.connect(servoGain);
      servoGain.connect(audioCtx.destination);
      servoOsc.start();
    } catch (e) {
      console.warn('AudioContext not allowed or supported', e);
    }
  }

  function playWatchdogTripAlarm() {
    if (!state.audioEnabled || !audioCtx) return;
    const osc = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(880, audioCtx.currentTime);
    osc.frequency.setValueAtTime(440, audioCtx.currentTime + 0.15);
    g.gain.setValueAtTime(0.05, audioCtx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.35);
    osc.connect(g);
    g.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.36);
  }

  // SPOTLIGHT CARD HELPER
  function spotlightCard(cardElement) {
    [cardLatency, cardFinance, cardCisa].forEach(c => c.classList.remove('spotlight'));
    if (cardElement) {
      cardElement.classList.add('spotlight');
    }
  }

  // MODE SWITCHING LOGIC
  function setMode(mode, stepNum = null) {
    state.mode = mode;

    if (stepNum) {
      state.currentStep = stepNum;
      [storyStep1, storyStep2, storyStep3].forEach(b => b.classList.remove('active'));
      if (stepNum === 1) storyStep1.classList.add('active');
      if (stepNum === 2) storyStep2.classList.add('active');
      if (stepNum === 3) storyStep3.classList.add('active');
    }

    if (mode === 'before') {
      // ⚠️ BEFORE: THE FLAW (STANDARD TLS RETROFIT)
      btnModeBefore.classList.add('active');
      btnModeAfter.classList.remove('active');
      document.body.classList.remove('mode-after');
      document.body.classList.add('mode-before');

      state.targetLatency = 32.2;
      state.robotFaultFreeze = true;
      state.brakeJerkOffset = (Math.random() - 0.5) * 8;
      playWatchdogTripAlarm();

      spotlightCard(cardLatency);

      // Hardware UI -> FAULT
      dotMatrixDisplay.textContent = 'FLT ';
      dotMatrixDisplay.style.color = '#EF4444';
      ledRun.classList.remove('active');
      ledOk.classList.remove('active');
      ledFlt.classList.add('active');
      keySwitchState.textContent = 'TRIPPED';
      cpuLoadText.innerHTML = '<span style="color:#EF4444;">88% SATURATED</span>';

      // Viewport Overlay
      overlayBadge.className = 'overlay-badge badge-bad';
      overlayIcon.innerHTML = '&#9888;';
      overlayText.textContent = 'WATCHDOG FAULT: 32.2ms JITTER EXCEEDS 5.0ms LIMIT - ROBOT HALTED';

      // Metric Tile 1: Latency
      currentLatencyVal.className = 'big-metric-num bad';
      currentLatencyVal.innerHTML = '32.2 <span class="unit">ms</span>';
      latencyChipBadge.className = 'chip-badge badge-red';
      latencyChipBadge.textContent = 'BREACHES WATCHDOG';
      latencySubtext.textContent = '-27.2ms BEYOND 5.0ms SAFETY STOP MARGIN';
      latencyFillBar.className = 'axis-value-fill bad';
      latencyFillBar.style.width = '100%';
      cryptoSpeedText.innerHTML = '<span style="color:#EF4444;">30-45 ms (TLS Handshake)</span>';
      jitterText.innerHTML = '<span style="color:#EF4444;">&plusmn;32.0 ms SPIKES</span>';
      tripsCountText.innerHTML = '<span style="color:#EF4444;">TRIPPED (SIL-3 Stop)</span>';

      // Metric Tile 2: Finance
      financeChipBadge.className = 'chip-badge badge-red';
      financeChipBadge.textContent = 'LINE STOPPAGE INCURRED';
      sessionLossSub.textContent = 'Accumulating $4,333/min during mechanical emergency stop';

      // Candidate Verbal Script HUD for BEFORE (Step 1)
      hudScriptText.innerHTML = `"Sir/Ma'am, look at the screen in <strong>Step 1 (The Bottleneck)</strong>: when factory networks apply standard IT encryption like TLS to CIP Motion, the software handshake takes <strong>30 to 45 milliseconds</strong> of controller CPU. Look at the animated network conduit above: the bulky TLS handshake clogs the gateway, starving downstream packets. Because our ControlLogix motion loop has a strict <strong>5.0 millisecond watchdog limit</strong>, the controller aborts with a Motion Sync Loss. The robot freezes mid-weld, gouging the car body and burning <strong>$4,333 every single minute</strong> in unplanned downtime."`;

    } else {
      // 🛡️ AFTER: THE PROPOSED SOLUTION (CIP-SHIELD FAST-PATH)
      btnModeAfter.classList.add('active');
      btnModeBefore.classList.remove('active');
      document.body.classList.remove('mode-before');
      document.body.classList.add('mode-after');

      state.targetLatency = 0.84;
      state.robotFaultFreeze = false;
      state.brakeJerkOffset = 0;

      spotlightCard(cardFinance);

      // Hardware UI -> RUN
      dotMatrixDisplay.textContent = 'RUN ';
      dotMatrixDisplay.style.color = '#10B981';
      ledRun.classList.add('active');
      ledOk.classList.add('active');
      ledFlt.classList.remove('active');
      keySwitchState.textContent = 'RUN';
      cpuLoadText.innerHTML = '<strong>24% CPU (0.22ms)</strong>';

      // Viewport Overlay
      overlayBadge.className = 'overlay-badge badge-good';
      overlayIcon.innerHTML = '&#10003;';
      overlayText.textContent = 'CIP-SHIELD ACTIVE &bull; 0.84ms DETERMINISTIC MOTION NOMINAL';

      // Metric Tile 1: Latency
      currentLatencyVal.className = 'big-metric-num';
      currentLatencyVal.innerHTML = '0.84 <span class="unit">ms</span>';
      latencyChipBadge.className = 'chip-badge';
      latencyChipBadge.textContent = 'WITHIN 1.0ms RPI';
      latencySubtext.textContent = '91.6% Safety Margin below 5.0ms hardware trip';
      latencyFillBar.className = 'axis-value-fill';
      latencyFillBar.style.width = '16.8%';
      cryptoSpeedText.innerHTML = '13.82 &micro;s (Poly1305)';
      jitterText.innerHTML = '&plusmn;0.04 ms';
      tripsCountText.innerHTML = '<span style="color:#10B981;">0 Faults (Nominal)</span>';

      // Metric Tile 2: Finance
      financeChipBadge.className = 'chip-badge';
      financeChipBadge.textContent = '$2.60M SAVED / YR';
      sessionLossSub.textContent = 'Zero line stoppage under CIP-Shield fast-path';

      // Candidate Verbal Script HUD for AFTER (Step 2)
      hudScriptText.innerHTML = `"Now, look at <strong>Step 2 (The Solution)</strong> when my proposed architecture—<strong>CIP-Shield</strong>—is applied. Notice how the network packets stream at wire speed through the Layer-2 eBPF gateway. Each frame is verified in just <strong>13.82 microseconds</strong> using Poly1305. Total cyclic latency drops to <strong>0.84 milliseconds</strong>, well within the 1.0 ms RPI budget. The robot welds smoothly with realistic spark dispersion, zero watchdog trips occur, and plant floors achieve <strong>$2.6 Million in annual downtime savings</strong>."`;
    }
  }

  // CISA AA26-097A LOGIC TAMPERING TOGGLE (STEP 3)
  function toggleTampering() {
    state.tampered = !state.tampered;

    const nodes = pipelineTrack.querySelectorAll('.pipe-node');

    if (state.tampered) {
      // Logic Tampering Injected!
      state.currentStep = 3;
      [storyStep1, storyStep2, storyStep3].forEach(b => b.classList.remove('active'));
      storyStep3.classList.add('active');

      btnToggleTamper.classList.add('active');
      tamperIcon.innerHTML = '&#9888;';
      tamperText.textContent = 'Revert Tamper Injection';

      spotlightCard(cardCisa);

      cisaStatusBadge.className = 'chip-badge badge-red';
      cisaStatusBadge.textContent = 'DRIFT DETECTED (QUARANTINED)';

      hashPlc.className = 'hash-code tampered';
      hashPlc.textContent = 'SHA-256: 0xFA2190E473D1 (MISMATCH)';

      // Pipeline halts at Stage 05 (L5X Canonical Diff)
      nodes.forEach((n, idx) => {
        if (idx < 4) {
          n.className = 'pipe-node active';
        } else if (idx === 4) {
          n.className = 'pipe-node halted';
        } else {
          n.className = 'pipe-node';
        }
      });

      pipelineStatusText.innerHTML = '<strong style="color:#EF4444;">[CISA ALERT] Stage 05 L5X Diff Gate failed!</strong> Unauthorized Add-On Instruction (safety interlock bypass) detected in controller flash. Download halted and automatic rollback executed.';

      hudScriptText.innerHTML = `"Finally, in <strong>Step 3 (The Trust Gap)</strong>, we address <strong>CISA Advisory AA26-097A</strong>. Today, an attacker can upload modified bytecode directly to controller flash while the offline Studio 5000 .ACD file appears pristine. With our 6-stage signed manifest pipeline, notice how the unapproved logic is caught at <strong>Stage 05 (L5X Diff)</strong>: an automated quarantine blocks execution, protecting the physical line without requiring human intervention."`;

    } else {
      // Restored to Signed Baseline
      btnToggleTamper.classList.remove('active');
      tamperIcon.innerHTML = '&#128275;';
      tamperText.textContent = 'Inject Logic Tampering (CISA)';

      cisaStatusBadge.className = 'chip-badge';
      cisaStatusBadge.textContent = 'HASH ATTESTED (MATCH)';

      hashPlc.className = 'hash-code';
      hashPlc.textContent = 'SHA-256: 0x9E7F42C1B80A...';

      nodes.forEach(n => {
        n.className = 'pipe-node active';
      });

      pipelineStatusText.textContent = 'All 6 stages verified: Controller flash matches signed baseline. No stealth logic modifications detected.';

      setMode(state.mode, state.mode === 'after' ? 2 : 1);
    }
  }

  // 45-SECOND EXECUTIVE AUTO-TOUR ENGINE
  function startAutoTour() {
    if (state.tourActive) {
      stopAutoTour();
      return;
    }

    state.tourActive = true;
    autoTourBtn.classList.add('active');
    tourIcon.innerHTML = '&#9724;';
    tourText.textContent = 'Stop Tour';
    tourProgressWrap.classList.add('active');

    let elapsed = 0;
    const totalDuration = 45; // seconds

    // Immediately trigger Step 1 (The Bottleneck)
    if (state.tampered) toggleTampering();
    setMode('before', 1);
    tourStatusText.textContent = 'Auto-Tour (0-15s): Step 1 — The Bottleneck (Watch 32ms TLS breach watchdog)';

    state.tourInterval = setInterval(() => {
      elapsed += 0.25;
      const pct = (elapsed / totalDuration) * 100;
      tourProgressFill.style.width = `${Math.min(100, pct)}%`;

      if (elapsed >= 15 && elapsed < 30 && state.mode === 'before') {
        // Trigger Step 2 (The Solution)
        setMode('after', 2);
        tourStatusText.textContent = 'Auto-Tour (15-30s): Step 2 — The Solution (CIP-Shield eBPF 0.84ms Fast-Path & Sparks)';
      } else if (elapsed >= 30 && elapsed < 44 && !state.tampered) {
        // Trigger Step 3 (CISA Logic Attestation)
        toggleTampering();
        tourStatusText.textContent = 'Auto-Tour (30-45s): Step 3 — CISA Trust Gap (Automated Quarantine at Stage 05)';
      } else if (elapsed >= totalDuration) {
        stopAutoTour();
      }
    }, 250);
  }

  function stopAutoTour() {
    clearInterval(state.tourInterval);
    state.tourActive = false;
    autoTourBtn.classList.remove('active');
    tourIcon.innerHTML = '&#9658;';
    tourText.textContent = 'Watch 45s Auto-Tour';
    tourProgressWrap.classList.remove('active');
    tourProgressFill.style.width = '0%';
    if (state.tampered) toggleTampering();
    setMode('after', 2);
  }

  // EVENT LISTENERS
  autoTourBtn.addEventListener('click', startAutoTour);

  storyStep1.addEventListener('click', () => {
    if (state.tourActive) stopAutoTour();
    if (state.tampered) toggleTampering();
    setMode('before', 1);
  });

  storyStep2.addEventListener('click', () => {
    if (state.tourActive) stopAutoTour();
    if (state.tampered) toggleTampering();
    setMode('after', 2);
  });

  storyStep3.addEventListener('click', () => {
    if (state.tourActive) stopAutoTour();
    if (!state.tampered) {
      toggleTampering();
    } else {
      spotlightCard(cardCisa);
    }
  });

  btnModeBefore.addEventListener('click', () => {
    if (state.tourActive) stopAutoTour();
    setMode('before', 1);
  });
  btnModeAfter.addEventListener('click', () => {
    if (state.tourActive) stopAutoTour();
    setMode('after', 2);
  });
  btnToggleTamper.addEventListener('click', toggleTampering);

  btnTriggerSpike.addEventListener('click', () => {
    const prevMode = state.mode;
    setMode('before', 1);
    setTimeout(() => {
      if (prevMode === 'after') setMode('after', 2);
    }, 4500);
  });

  audioToggleBtn.addEventListener('click', () => {
    state.audioEnabled = !state.audioEnabled;
    if (state.audioEnabled) {
      initAudio();
      audioIcon.innerHTML = '&#128266;';
      audioToggleBtn.innerHTML = '<span>&#128266;</span> Sound ON';
      audioToggleBtn.classList.add('active');
    } else {
      audioIcon.innerHTML = '&#128263;';
      audioToggleBtn.innerHTML = '<span>&#128263;</span> Sound OFF';
      audioToggleBtn.classList.remove('active');
      if (servoGain) servoGain.gain.setValueAtTime(0, audioCtx.currentTime);
      if (humGain) humGain.gain.setValueAtTime(0, audioCtx.currentTime);
    }
  });

  qrBtn.addEventListener('click', () => qrModal.classList.add('open'));
  closeQrBtn.addEventListener('click', () => qrModal.classList.remove('open'));
  qrModal.addEventListener('click', (e) => {
    if (e.target === qrModal) qrModal.classList.remove('open');
  });

  // PARTICLES: SPARKS & SMOKE
  function createSparks(x, y, count) {
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 0.72) + (Math.random() * Math.PI * 0.55);
      const speed = 2.5 + Math.random() * 6;
      state.sparks.push({
        x: x,
        y: y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - (1 + Math.random() * 3.5),
        life: 1.0,
        decay: 0.02 + Math.random() * 0.03,
        size: 1.2 + Math.random() * 2.2
      });
    }
  }

  function createSmoke(x, y) {
    state.smoke.push({
      x: x + (Math.random() - 0.5) * 10,
      y: y,
      vx: (Math.random() - 0.5) * 0.6,
      vy: -(0.5 + Math.random() * 0.8),
      size: 4 + Math.random() * 4,
      life: 1.0,
      decay: 0.015
    });
  }

  function updateAndDrawParticles() {
    // Sparks
    for (let i = state.sparks.length - 1; i >= 0; i--) {
      const p = state.sparks[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.16;
      p.life -= p.decay;

      if (p.y > 420 && p.vy > 0) {
        p.vy = -p.vy * 0.45;
        p.vx *= 0.7;
      }

      if (p.life <= 0) {
        state.sparks.splice(i, 1);
        continue;
      }

      const r = 255;
      const g = Math.floor(200 * p.life + 55);
      const b = Math.floor(50 * p.life);
      ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${p.life})`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
      ctx.fill();
    }

    // Smoke
    for (let i = state.smoke.length - 1; i >= 0; i--) {
      const s = state.smoke[i];
      s.x += s.vx;
      s.y += s.vy;
      s.size += 0.15;
      s.life -= s.decay;

      if (s.life <= 0) {
        state.smoke.splice(i, 1);
        continue;
      }

      ctx.fillStyle = `rgba(148, 163, 184, ${s.life * 0.25})`;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // CANVAS RENDERER: NETWORK DATA PIPE + 6-AXIS HYDRAULIC ROBOT
  function renderCanvas() {
    const rect = canvas.getBoundingClientRect();
    const w = rect.width;
    const h = rect.height;

    ctx.clearRect(0, 0, w, h);

    // 1. Factory Floor Grid
    ctx.strokeStyle = '#101726';
    ctx.lineWidth = 1;
    for (let x = 0; x < w; x += 36) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }
    for (let y = 0; y < h; y += 36) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }

    // 2. INDUSTRIAL NETWORK DATA CONDUIT
    const pipeY = 32;
    const pipeStartX = 30;
    const pipeEndX = w - 30;

    // Background Conduit Track
    ctx.fillStyle = '#090E17';
    ctx.strokeStyle = '#1E2D44';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(pipeStartX, pipeY - 14, pipeEndX - pipeStartX, 28, 4);
    ctx.fill();
    ctx.stroke();

    // Node Badges along Network Pipe
    const nodes = [
      { x: pipeStartX + 55, name: 'Studio 5000' },
      { x: pipeStartX + 210, name: 'Cell Switch' },
      { x: pipeStartX + 410, name: state.mode === 'after' ? 'eBPF Gateway' : 'TLS Gateway' },
      { x: pipeStartX + 630, name: '1756-EN4TR' },
      { x: pipeStartX + 790, name: 'Kinetix Servos' }
    ];

    nodes.forEach(n => {
      ctx.fillStyle = '#141D2D';
      ctx.strokeStyle = '#334460';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(n.x - 42, pipeY - 10, 84, 20, 3);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#94A3B8';
      ctx.font = 'bold 9px var(--font-mono)';
      ctx.textAlign = 'center';
      ctx.fillText(n.name, n.x, pipeY + 4);
    });

    // Animate Data Packets along the Pipe
    state.packetBusProgress = (state.packetBusProgress + (state.mode === 'after' ? 0.012 : 0.002)) % 1.0;

    if (state.mode === 'after') {
      // CIP-Shield: Continuous stream of green/cyan micro-packets
      for (let i = 0; i < 7; i++) {
        const offset = (state.packetBusProgress + (i / 7)) % 1.0;
        const px = pipeStartX + 60 + offset * (pipeEndX - pipeStartX - 120);
        
        ctx.fillStyle = '#10B981';
        ctx.shadowColor = '#10B981';
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.roundRect(px - 10, pipeY - 5, 20, 10, 2);
        ctx.fill();
        ctx.shadowBlur = 0;

        ctx.fillStyle = '#064E3B';
        ctx.font = 'bold 7px var(--font-mono)';
        ctx.fillText('1.0m', px, pipeY + 3);
      }

      // Gateway verification pulse ring
      const gwX = pipeStartX + 410;
      ctx.strokeStyle = 'rgba(16, 185, 129, 0.7)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(gwX, pipeY, 18 + Math.sin(Date.now() * 0.01) * 3, 0, Math.PI * 2);
      ctx.stroke();

    } else {
      // TLS Mode: Bloated, stalled packet in the middle causing blockage
      const gwX = pipeStartX + 410;
      ctx.fillStyle = '#EF4444';
      ctx.shadowColor = '#EF4444';
      ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.roundRect(gwX - 35, pipeY - 9, 70, 18, 3);
      ctx.fill();
      ctx.shadowBlur = 0;

      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 8px var(--font-mono)';
      ctx.textAlign = 'center';
      ctx.fillText('TLS 32.2ms', gwX, pipeY + 4);

      // Warning text over conduit
      ctx.fillStyle = '#EF4444';
      ctx.font = 'bold 10px var(--font-mono)';
      ctx.fillText('BUFFER STARVATION // PACKET TIMEOUT', gwX + 220, pipeY + 24);
    }

    // 3. Workcell Safety Zone Perimeter Line
    ctx.strokeStyle = state.mode === 'before' ? 'rgba(239, 68, 68, 0.45)' : 'rgba(16, 185, 129, 0.35)';
    ctx.lineWidth = 2;
    ctx.setLineDash([8, 6]);
    ctx.strokeRect(30, 75, w - 60, h - 95);
    ctx.setLineDash([]);

    // 4. Robot Base Pedestal
    const baseX = w * 0.36;
    const baseY = h * 0.82;

    // Heavy Mounting Plates
    ctx.fillStyle = '#141D2D';
    ctx.fillRect(baseX - 75, baseY - 12, 150, 24);
    ctx.fillStyle = '#1E293B';
    ctx.fillRect(baseX - 58, baseY - 32, 116, 20);

    // Pedestal Status Beacon
    const beaconColor = state.mode === 'before' ? '#EF4444' : '#10B981';
    ctx.fillStyle = beaconColor;
    ctx.beginPath();
    ctx.arc(baseX + 48, baseY - 42, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowColor = beaconColor;
    ctx.shadowBlur = 12;
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Kinematics Calculations
    if (!state.robotFaultFreeze) {
      state.robotWeldPhase += 0.024;
      state.robotAngle1 = Math.sin(state.robotWeldPhase) * 0.28 - 0.46;
      state.robotAngle2 = Math.cos(state.robotWeldPhase) * 0.32 + 0.86;
    }

    // Joint 1: Shoulder Turret Base
    const j1x = baseX + state.brakeJerkOffset;
    const j1y = baseY - 48;

    ctx.fillStyle = '#334155';
    ctx.beginPath();
    ctx.arc(j1x, j1y, 25, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#64748B';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Link 1: Upper Arm
    const arm1Length = 145;
    const j2x = j1x + Math.sin(state.robotAngle1) * arm1Length;
    const j2y = j1y - Math.cos(state.robotAngle1) * arm1Length;

    // Draw Upper Arm Beam
    ctx.strokeStyle = state.mode === 'before' ? '#991B1B' : '#0284C7';
    ctx.lineWidth = 22;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(j1x, j1y);
    ctx.lineTo(j2x, j2y);
    ctx.stroke();

    // Animated Hydraulic Piston 1
    const p1BaseX = j1x - 12;
    const p1BaseY = j1y - 8;
    const p1RodX = j2x - 10;
    const p1RodY = j2y + 12;

    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.moveTo(p1BaseX, p1BaseY);
    ctx.lineTo(p1BaseX + (p1RodX - p1BaseX) * 0.55, p1BaseY + (p1RodY - p1BaseY) * 0.55);
    ctx.stroke();

    ctx.strokeStyle = '#94A3B8';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(p1BaseX + (p1RodX - p1BaseX) * 0.45, p1BaseY + (p1RodY - p1BaseY) * 0.45);
    ctx.lineTo(p1RodX, p1RodY);
    ctx.stroke();

    // Joint 2: Elbow
    ctx.fillStyle = '#1E293B';
    ctx.beginPath();
    ctx.arc(j2x, j2y, 19, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#64748B';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Link 2: Forearm
    const arm2Length = 135;
    const j3x = j2x + Math.sin(state.robotAngle1 + state.robotAngle2) * arm2Length;
    const j3y = j2y - Math.cos(state.robotAngle1 + state.robotAngle2) * arm2Length;

    // Draw Forearm Beam
    ctx.strokeStyle = state.mode === 'before' ? '#B91C1C' : '#0369A1';
    ctx.lineWidth = 15;
    ctx.beginPath();
    ctx.moveTo(j2x, j2y);
    ctx.lineTo(j3x, j3y);
    ctx.stroke();

    // Wrist & Welding Tool Assembly
    const toolX = j3x + 20;
    const toolY = j3y + 26;

    ctx.fillStyle = '#F59E0B';
    ctx.beginPath();
    ctx.arc(j3x, j3y, 11, 0, Math.PI * 2);
    ctx.fill();

    // Welding Optic Nozzle
    ctx.strokeStyle = '#E2E8F0';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(j3x, j3y);
    ctx.lineTo(toolX, toolY);
    ctx.stroke();

    // 5. Automotive Body Panel Workpiece
    const workX = w * 0.68;
    const workY = h * 0.74;

    ctx.fillStyle = '#1E293B';
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(workX - 70, workY + 30);
    ctx.lineTo(workX + 90, workY - 24);
    ctx.lineTo(workX + 115, workY + 45);
    ctx.lineTo(workX - 45, workY + 85);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Weld seam bead line
    ctx.strokeStyle = state.mode === 'after' ? '#38BDF8' : '#78350F';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(workX - 20, workY + 20);
    ctx.lineTo(workX + 60, workY + 5);
    ctx.stroke();

    // 6. Plasma Arc Flash & Bouncing Particle Sparks
    if (!state.robotFaultFreeze) {
      // Dynamic Plasma Welding Torch Arc
      const flashSize = 6 + Math.random() * 4;
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.arc(toolX, toolY, flashSize, 0, Math.PI * 2);
      ctx.fill();

      // Outer Cyan Plasma Halo
      ctx.fillStyle = 'rgba(56, 189, 248, 0.45)';
      ctx.beginPath();
      ctx.arc(toolX, toolY, flashSize + 12 + Math.random() * 8, 0, Math.PI * 2);
      ctx.fill();

      // Emit high-energy bouncing sparks
      createSparks(toolX, toolY, 4);

    } else {
      // E-STOP STATE: Sparks cut off, smoke puffs rise
      if (Math.random() < 0.25) {
        createSmoke(toolX, toolY);
      }

      // Red Hazard Hologram over Workpiece
      ctx.fillStyle = 'rgba(239, 68, 68, 0.9)';
      ctx.font = 'bold 13px var(--font-mono)';
      ctx.textAlign = 'center';
      ctx.fillText('MECHANICAL BRAKE ENGAGED // SERVO TIMEOUT', toolX - 10, toolY - 26);
    }

    // Render all active particle systems
    updateAndDrawParticles();

    // 7. Accumulate Financial Loss during Watchdog Faults
    if (state.mode === 'before') {
      // $4,333 / min = $72.21 per second = ~1.203 per frame at 60fps
      state.downtimeLossIncurred += 1.203;
      sessionLossVal.className = 'fin-value-dynamic bad';
      sessionLossVal.textContent = `$${state.downtimeLossIncurred.toFixed(2)}`;
    }

    requestAnimationFrame(renderCanvas);
  }

  // ROLLING DOT-MATRIX LED
  setInterval(() => {
    state.dotMatrixCharTick++;
    if (state.dotMatrixCharTick % 6 === 0) {
      state.dotMatrixIndex = (state.dotMatrixIndex + 1) % state.dotMatrixStrings.length;
      if (state.mode === 'after') {
        dotMatrixDisplay.textContent = state.dotMatrixStrings[state.dotMatrixIndex];
      }
    }
  }, 400);

  // START RUNTIME IN STEP 2 (NOMINAL AFTER STATE)
  setMode('after', 2);
  requestAnimationFrame(renderCanvas);

})();
