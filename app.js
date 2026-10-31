/* ==========================================================================
   ROCKWELL AUTOMATION CIP-SHIELD: HIGH-IMPACT BEFORE VS AFTER DIGITAL TWIN
   Engineered for effortless 60-second explanation during technical interviews.
   ========================================================================== */

(function () {
  'use strict';

  // APPLICATION STATE
  const state = {
    mode: 'after',            // 'before' (naive TLS) or 'after' (CIP-Shield fast-path)
    tampered: false,          // CISA AA26-097A logic tampering state
    audioEnabled: false,
    autoDemoRunning: false,
    autoDemoTimer: null,
    
    // Physical kinematic & motion parameters
    robotAngle1: 0,
    robotAngle2: 0,
    robotWeldPhase: 0,
    robotFaultFreeze: false,
    
    // Performance & financial metrics
    currentLatency: 0.84,     // ms
    targetLatency: 0.84,
    jitterStdDev: 0.04,
    downtimeLossIncurred: 0,  // USD accumulated during watchdog faults
    
    // Particle spark system
    sparks: [],
    
    // Led dot matrix rolling message
    dotMatrixStrings: ['RUN ', 'OK  ', 'L85E', '1.0m', 'SYNC'],
    dotMatrixIndex: 0,
    dotMatrixCharTick: 0
  };

  // DOM REFERENCES
  const btnModeBefore = document.getElementById('btnModeBefore');
  const btnModeAfter = document.getElementById('btnModeAfter');
  const btnToggleTamper = document.getElementById('btnToggleTamper');
  const btnTriggerSpike = document.getElementById('btnTriggerSpike');
  const autoDemoBtn = document.getElementById('autoDemoBtn');
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

  // CANVAS INITIALIZATION
  const canvas = document.getElementById('twinCanvas');
  const ctx = canvas.getContext('2d');

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

      // 60Hz transformer background hum
      humOsc = audioCtx.createOscillator();
      humOsc.type = 'sine';
      humOsc.frequency.setValueAtTime(60, audioCtx.currentTime);
      humGain = audioCtx.createGain();
      humGain.gain.setValueAtTime(0.015, audioCtx.currentTime);
      humOsc.connect(humGain);
      humGain.connect(audioCtx.destination);
      humOsc.start();

      // Robotic servo motor whine
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

  // MODE SWITCHING LOGIC (THE HEART OF THE DEMO)
  function setMode(mode) {
    state.mode = mode;

    if (mode === 'before') {
      // ⚠️ BEFORE: THE FLAW (STANDARD TLS RETROFIT)
      btnModeBefore.classList.add('active');
      btnModeAfter.classList.remove('active');
      document.body.classList.remove('mode-after');
      document.body.classList.add('mode-before');

      state.targetLatency = 32.2;
      state.robotFaultFreeze = true;
      playWatchdogTripAlarm();

      // Update PLC Hardware indicators to FAULT
      dotMatrixDisplay.textContent = 'FLT ';
      dotMatrixDisplay.style.color = '#EF4444';
      ledRun.classList.remove('active');
      ledOk.classList.remove('active');
      ledFlt.classList.add('active');
      keySwitchState.textContent = 'TRIPPED';
      cpuLoadText.innerHTML = '<span style="color:#EF4444;">88% SATURATED</span>';

      // Update Viewport Overlay
      overlayBadge.className = 'overlay-badge badge-bad';
      overlayIcon.innerHTML = '&#9888;';
      overlayText.textContent = 'WATCHDOG FAULT: 32.2ms JITTER EXCEEDS 5.0ms LIMIT - ROBOT HALTED';

      // Update Metric Tile 1: Latency
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

      // Update Metric Tile 2: Finance
      financeChipBadge.className = 'chip-badge badge-red';
      financeChipBadge.textContent = 'LINE STOPPAGE INCURRED';
      sessionLossSub.textContent = 'Accumulating $4,333/min during mechanical emergency stop';

      // Candidate Verbal Script HUD for BEFORE
      hudScriptText.innerHTML = `"Sir/Ma'am, look at what happens in the <strong>BEFORE</strong> state: when factory engineers try the naive fix of enabling standard TLS encryption, the cryptographic handshake takes <strong>30 to 45 milliseconds</strong> of controller CPU. Because our ControlLogix motion loop has a strict <strong>5.0 millisecond watchdog limit</strong>, the controller aborts with a Motion Sync Loss. The robot freezes mid-weld, risking catastrophic workpiece damage and accumulating <strong>$4,333 every single minute</strong> in unplanned downtime."`;

    } else {
      // 🛡️ AFTER: THE PROPOSED SOLUTION (CIP-SHIELD FAST-PATH)
      btnModeAfter.classList.add('active');
      btnModeBefore.classList.remove('active');
      document.body.classList.remove('mode-before');
      document.body.classList.add('mode-after');

      state.targetLatency = 0.84;
      state.robotFaultFreeze = false;

      // Update PLC Hardware indicators to RUN
      dotMatrixDisplay.textContent = 'RUN ';
      dotMatrixDisplay.style.color = '#10B981';
      ledRun.classList.add('active');
      ledOk.classList.add('active');
      ledFlt.classList.remove('active');
      keySwitchState.textContent = 'RUN';
      cpuLoadText.innerHTML = '<strong>24% CPU (0.22ms)</strong>';

      // Update Viewport Overlay
      overlayBadge.className = 'overlay-badge badge-good';
      overlayIcon.innerHTML = '&#10003;';
      overlayText.textContent = 'CIP-SHIELD ACTIVE &bull; 0.84ms DETERMINISTIC MOTION NOMINAL';

      // Update Metric Tile 1: Latency
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

      // Update Metric Tile 2: Finance
      financeChipBadge.className = 'chip-badge';
      financeChipBadge.textContent = '$2.60M SAVED / YR';
      sessionLossSub.textContent = 'Zero line stoppage under CIP-Shield fast-path';

      // Candidate Verbal Script HUD for AFTER
      hudScriptText.innerHTML = `"Now, look at the <strong>AFTER</strong> state when my proposed solution—<strong>CIP-Shield</strong>—is active. By offloading authentication directly to Layer 2 via eBPF/XDP on the network card, each CIP frame is verified in just <strong>13.82 microseconds</strong> using Poly1305. Total cyclic latency drops to <strong>0.84 milliseconds</strong>, well within the 1.0 ms RPI budget. Motion determinism is guaranteed, zero watchdog trips occur, and plant floors achieve <strong>$2.6 Million in annual downtime avoidance</strong>."`;
    }
  }

  // CISA AA26-097A LOGIC TAMPERING TOGGLE
  function toggleTampering() {
    state.tampered = !state.tampered;

    const nodes = pipelineTrack.querySelectorAll('.pipe-node');

    if (state.tampered) {
      // Logic Tampering Injected!
      btnToggleTamper.classList.add('active');
      tamperIcon.innerHTML = '&#9888;';
      tamperText.textContent = 'Revert Tamper Injection';

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

      hudScriptText.innerHTML = `"Here is how we address <strong>CISA Advisory AA26-097A</strong>: today, an attacker can upload modified ladder logic directly to controller flash while the offline .ACD file appears pristine. With our 6-stage verification pipeline, any unapproved logic change causes an immediate SHA-256 hash mismatch at Stage 05, triggering an automated quarantine before the rogue logic can execute."`;

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

      // Restore mode HUD
      setMode(state.mode);
    }
  }

  // AUTOMATED 45-SECOND INTERVIEW TOUR
  function runAutoDemo() {
    if (state.autoDemoRunning) {
      clearInterval(state.autoDemoTimer);
      state.autoDemoRunning = false;
      autoDemoBtn.classList.remove('active');
      autoDemoBtn.innerHTML = '<span class="btn-icon">&#9658;</span> Play 45s Demo';
      setMode('after');
      return;
    }

    state.autoDemoRunning = true;
    autoDemoBtn.classList.add('active');
    autoDemoBtn.innerHTML = '&#9724; Stop Demo';

    // Step 1: Start in BEFORE mode (Show the problem)
    setMode('before');

    // Step 2: At 15s, switch to AFTER mode (Show the fix)
    setTimeout(() => {
      if (!state.autoDemoRunning) return;
      setMode('after');
    }, 15000);

    // Step 3: At 30s, demonstrate CISA Logic Attestation
    setTimeout(() => {
      if (!state.autoDemoRunning) return;
      toggleTampering();
    }, 30000);

    // Step 4: At 45s, restore nominal and complete
    setTimeout(() => {
      if (!state.autoDemoRunning) return;
      if (state.tampered) toggleTampering();
      state.autoDemoRunning = false;
      autoDemoBtn.classList.remove('active');
      autoDemoBtn.innerHTML = '<span class="btn-icon">&#9658;</span> Play 45s Demo';
      setMode('after');
    }, 45000);
  }

  // SPARK PARTICLE ENGINE
  function createSparks(x, y, count) {
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 0.75) + (Math.random() * Math.PI * 0.5);
      const speed = 2 + Math.random() * 5;
      state.sparks.push({
        x: x,
        y: y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - (1 + Math.random() * 3),
        life: 1.0,
        decay: 0.02 + Math.random() * 0.03,
        size: 1 + Math.random() * 2
      });
    }
  }

  function updateAndDrawSparks() {
    for (let i = state.sparks.length - 1; i >= 0; i--) {
      const p = state.sparks[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.15; // Gravity
      p.life -= p.decay;

      if (p.life <= 0) {
        state.sparks.splice(i, 1);
        continue;
      }

      ctx.fillStyle = `rgba(255, ${Math.floor(180 * p.life + 75)}, 50, ${p.life})`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // CANVAS RENDERER: 6-AXIS ARTICULATED ROBOT & WORKCELL
  function renderCanvas() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const w = canvas.width;
    const h = canvas.height;

    // 1. Dark Factory Floor Grid
    ctx.strokeStyle = '#121B28';
    ctx.lineWidth = 1;
    for (let x = 0; x < w; x += 40) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }
    for (let y = 0; y < h; y += 40) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }

    // 2. Workcell Safety Zone Border
    ctx.strokeStyle = state.mode === 'before' ? 'rgba(239, 68, 68, 0.4)' : 'rgba(16, 185, 129, 0.4)';
    ctx.lineWidth = 2;
    ctx.setLineDash([8, 6]);
    ctx.strokeRect(30, 30, w - 60, h - 60);
    ctx.setLineDash([]);

    // 3. Robot Base Pedestal
    const baseX = w * 0.38;
    const baseY = h * 0.78;

    // Pedestal Plate
    ctx.fillStyle = '#1E293B';
    ctx.fillRect(baseX - 70, baseY - 12, 140, 24);
    ctx.fillStyle = '#334155';
    ctx.fillRect(baseX - 55, baseY - 32, 110, 20);

    // Warning / Status Beacon on Base
    const beaconColor = state.mode === 'before' ? '#EF4444' : '#10B981';
    ctx.fillStyle = beaconColor;
    ctx.beginPath();
    ctx.arc(baseX + 50, baseY - 40, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowColor = beaconColor;
    ctx.shadowBlur = 10;
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Kinematics Update
    if (!state.robotFaultFreeze) {
      state.robotWeldPhase += 0.025;
      state.robotAngle1 = Math.sin(state.robotWeldPhase) * 0.28 - 0.45;
      state.robotAngle2 = Math.cos(state.robotWeldPhase) * 0.32 + 0.85;
    }

    // Joint 1: Shoulder Turret
    const j1x = baseX;
    const j1y = baseY - 45;

    ctx.fillStyle = '#475569';
    ctx.beginPath();
    ctx.arc(j1x, j1y, 24, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#64748B';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Link 1: Upper Arm
    const arm1Length = 140;
    const j2x = j1x + Math.sin(state.robotAngle1) * arm1Length;
    const j2y = j1y - Math.cos(state.robotAngle1) * arm1Length;

    // Draw Arm 1
    ctx.strokeStyle = state.mode === 'before' ? '#991B1B' : '#0284C7';
    ctx.lineWidth = 20;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(j1x, j1y);
    ctx.lineTo(j2x, j2y);
    ctx.stroke();

    // Hydraulic piston detail on arm 1
    ctx.strokeStyle = '#94A3B8';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(j1x - 8, j1y - 10);
    ctx.lineTo(j2x - 8, j2y + 10);
    ctx.stroke();

    // Joint 2: Elbow
    ctx.fillStyle = '#334155';
    ctx.beginPath();
    ctx.arc(j2x, j2y, 18, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#64748B';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Link 2: Forearm
    const arm2Length = 130;
    const j3x = j2x + Math.sin(state.robotAngle1 + state.robotAngle2) * arm2Length;
    const j3y = j2y - Math.cos(state.robotAngle1 + state.robotAngle2) * arm2Length;

    // Draw Arm 2
    ctx.strokeStyle = state.mode === 'before' ? '#B91C1C' : '#0369A1';
    ctx.lineWidth = 14;
    ctx.beginPath();
    ctx.moveTo(j2x, j2y);
    ctx.lineTo(j3x, j3y);
    ctx.stroke();

    // Wrist & Tool Head (Laser Welder)
    const toolX = j3x + 18;
    const toolY = j3y + 24;

    ctx.fillStyle = '#F59E0B';
    ctx.beginPath();
    ctx.arc(j3x, j3y, 10, 0, Math.PI * 2);
    ctx.fill();

    // Welding Nozzle Tip
    ctx.strokeStyle = '#E2E8F0';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(j3x, j3y);
    ctx.lineTo(toolX, toolY);
    ctx.stroke();

    // 4. Automotive Workpiece (Car Body Panel)
    const workX = w * 0.65;
    const workY = h * 0.72;

    ctx.fillStyle = '#1E293B';
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(workX - 60, workY + 30);
    ctx.lineTo(workX + 90, workY - 20);
    ctx.lineTo(workX + 110, workY + 40);
    ctx.lineTo(workX - 40, workY + 80);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // 5. Welding Arc & Spark Generation
    if (!state.robotFaultFreeze) {
      // Weld Arc Flash
      ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
      ctx.beginPath();
      ctx.arc(toolX, toolY, 5 + Math.random() * 3, 0, Math.PI * 2);
      ctx.fill();

      // Outer Glow
      ctx.fillStyle = 'rgba(56, 189, 248, 0.4)';
      ctx.beginPath();
      ctx.arc(toolX, toolY, 16 + Math.random() * 8, 0, Math.PI * 2);
      ctx.fill();

      // Emit Bouncing Sparks
      createSparks(toolX, toolY, 3);
    } else {
      // E-STOP WARNING HAZARD ON WORKPIECE
      ctx.fillStyle = 'rgba(239, 68, 68, 0.85)';
      ctx.font = 'bold 14px var(--font-mono)';
      ctx.fillText('E-STOP: WELDING ABORTED', toolX - 60, toolY - 20);
    }

    // Render all active particles
    updateAndDrawSparks();

    // 6. Accumulate Downtime Financial Loss if in Fault
    if (state.mode === 'before') {
      // $4,333 / min = $72.21 per second = ~1.20 per frame at 60fps
      state.downtimeLossIncurred += 1.203;
      sessionLossVal.className = 'fin-value-dynamic bad';
      sessionLossVal.textContent = `$${state.downtimeLossIncurred.toFixed(2)}`;
    }

    requestAnimationFrame(renderCanvas);
  }

  // EVENT LISTENERS
  btnModeBefore.addEventListener('click', () => setMode('before'));
  btnModeAfter.addEventListener('click', () => setMode('after'));
  btnToggleTamper.addEventListener('click', toggleTampering);

  btnTriggerSpike.addEventListener('click', () => {
    // Temporary 35ms packet jitter injection
    const prevMode = state.mode;
    setMode('before');
    setTimeout(() => {
      if (prevMode === 'after') setMode('after');
    }, 4000);
  });

  autoDemoBtn.addEventListener('click', runAutoDemo);

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

  // START RUNTIME
  setMode('after');
  requestAnimationFrame(renderCanvas);

})();
