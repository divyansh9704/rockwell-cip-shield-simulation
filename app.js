// ==========================================================================
// ROCKWELL AUTOMATION CYBER-PHYSICAL INDUSTRIAL SUITE v3.0
// Designed for Hinjewadi Pune Software Technology Center (STC) Recruitment
// ==========================================================================

document.addEventListener('DOMContentLoaded', () => {
  // ==================== STATE MANAGEMENT ====================
  const state = {
    currentSuite: 'motion', // 'motion' | 'trust' | 'dos' | 'pitch'
    motionMode: 'shield',   // 'shield' | 'legacy' | 'tls'
    isUnderAttack: false,
    factoryRunning: true,
    downtimeSeconds: 0,
    downtimeTimer: null,
    
    // Telemetry
    latencyHistory: new Array(60).fill(0.84),
    currentLatency: 0.84,
    currentJitter: 0.04,
    currentCpu: 24,
    
    // Audio FX
    audioEnabled: false,
    audioCtx: null,
    
    // Digital Twin Kinematics & Particles
    robotAngle: 0,
    weldSparks: [],
    conveyorOffset: 0,
    dotMatrixIndex: 0,
    dotMatrixStrings: ['RUN ', 'OK  ', 'L85E', '1.0m', 'SYNC', '4481'],
    
    // Trust Gap Suite
    isTampered: false,
    pipelineRunning: false,

    // Auto Pitch Tour
    tourActive: false,
    tourTimer: null,
    tourStep: 0
  };

  // ==================== DOM ELEMENTS ====================
  // Suite Tabs
  const domainTabs = document.querySelectorAll('.domain-tab');
  const suiteViews = {
    motion: document.getElementById('viewSuiteMotion'),
    trust: document.getElementById('viewSuiteTrust'),
    dos: document.getElementById('viewSuiteDos'),
    pitch: document.getElementById('viewSuitePitch')
  };

  // Header
  const overallDot = document.getElementById('overallDot');
  const overallStatusText = document.getElementById('overallStatusText');
  const toggleAudioBtn = document.getElementById('toggleAudioBtn');
  const showQrBtn = document.getElementById('showQrBtn');
  const qrModal = document.getElementById('qrModal');
  const closeQrModalBtn = document.getElementById('closeQrModalBtn');
  const autoTourBtn = document.getElementById('autoTourBtn');

  // Candidate Verbal HUD
  const hudPhaseIndicator = document.getElementById('hudPhaseIndicator');
  const hudScriptText = document.getElementById('hudScriptText');

  // Suite 1 Elements (Motion & Jitter)
  const archButtons = document.querySelectorAll('.arch-btn');
  const infiltrateAttackBtn = document.getElementById('infiltrateAttackBtn');
  const resetMotionSimBtn = document.getElementById('resetMotionSimBtn');
  const twinCanvas = document.getElementById('digitalTwinCanvas');
  const twinCtx = twinCanvas.getContext('2d');
  const scopeCanvas = document.getElementById('scopeCanvas');
  const scopeCtx = scopeCanvas.getContext('2d');
  
  // Suite 1 Metrics
  const valLatency = document.getElementById('valLatency');
  const subLatency = document.getElementById('subLatency');
  const barLatency = document.getElementById('barLatency');
  const dotLatency = document.getElementById('dotLatency');

  const valJitter = document.getElementById('valJitter');
  const subJitter = document.getElementById('subJitter');
  const barJitter = document.getElementById('barJitter');
  const dotJitter = document.getElementById('dotJitter');

  const valCpu = document.getElementById('valCpu');
  const subCpu = document.getElementById('subCpu');
  const barCpu = document.getElementById('barCpu');
  const dotCpu = document.getElementById('dotCpu');

  const valLoss = document.getElementById('valLoss');
  const barLoss = document.getElementById('barLoss');
  const dotLoss = document.getElementById('dotLoss');

  const cellStatusPill = document.getElementById('cellStatusPill');
  const hwPlcModel = document.getElementById('hwPlcModel');
  const hwPtpSync = document.getElementById('hwPtpSync');
  const hwRobotStatus = document.getElementById('hwRobotStatus');
  const hexStream = document.getElementById('hexStream');
  const syslogTerminal = document.getElementById('syslogTerminal');
  const tagCryptoStatus = document.getElementById('tagCryptoStatus');
  const packetCrcBadge = document.getElementById('packetCrcBadge');

  // Suite 2 Elements (Trust Gap)
  const tamperToggle = document.getElementById('tamperToggle');
  const runPipelineBtn = document.getElementById('runPipelineBtn');
  const pipelineConsole = document.getElementById('pipelineConsole');
  const pipelineStatusBadge = document.getElementById('pipelineStatusBadge');
  const trustNodeWorkstation = document.getElementById('trustNodeWorkstation');
  const trustNodeController = document.getElementById('trustNodeController');
  const trustNodeHmi = document.getElementById('trustNodeHmi');
  const statusWorkstation = document.getElementById('statusWorkstation');
  const acdFileName = document.getElementById('acdFileName');
  const acdFileHash = document.getElementById('acdFileHash');
  const statusPlcLogic = document.getElementById('statusPlcLogic');
  const rung1Code = document.getElementById('rung1Code');
  const rung1Flag = document.getElementById('rung1Flag');
  const rung2Code = document.getElementById('rung2Code');
  const rung2Flag = document.getElementById('rung2Flag');
  const rung3Code = document.getElementById('rung3Code');
  const rung3Flag = document.getElementById('rung3Flag');
  const statusHmi = document.getElementById('statusHmi');
  const hmiGreenLight = document.getElementById('hmiGreenLight');
  const hmiEstop = document.getElementById('hmiEstop');
  const hmiSafety = document.getElementById('hmiSafety');
  const pSteps = [1, 2, 3, 4, 5, 6].map(i => document.getElementById(`pStep${i}`));

  // Suite 3 Elements (DoS)
  const sendMalformedCipBtn = document.getElementById('sendMalformedCipBtn');
  const recoverControllerBtn = document.getElementById('recoverControllerBtn');
  const dosReadoutBox = document.getElementById('dosReadoutBox');

  // ==================== 1. SUITE SWITCHING ====================
  function switchSuite(suiteName) {
    state.currentSuite = suiteName;
    domainTabs.forEach(tab => {
      tab.classList.toggle('active', tab.dataset.suite === suiteName);
    });
    Object.keys(suiteViews).forEach(key => {
      suiteViews[key].classList.toggle('active', key === suiteName);
    });

    updateCandidateHud();
  }

  domainTabs.forEach(tab => {
    tab.addEventListener('click', () => switchSuite(tab.dataset.suite));
  });

  // Candidate Verbal Scripts per Suite/Mode
  function updateCandidateHud() {
    if (state.currentSuite === 'motion') {
      if (state.motionMode === 'shield') {
        hudPhaseIndicator.textContent = 'SUITE 1 • PROPOSED CIP-SHIELD (HARD DETERMINISM)';
        hudScriptText.innerHTML = `"Sir/Ma'am, in heavy manufacturing running ControlLogix 5580 controllers, high-speed robotic motion requires packet delivery in <strong>under 1.0 millisecond</strong>. Our proposed <strong>CIP-Shield architecture</strong> uses Linux eBPF kernel offloading to inspect Poly1305 MAC tags in <strong>13.82 microseconds</strong>. This provides Zero-Trust crypto with zero jitter, keeping the assembly line running at 100% capacity."`;
      } else if (state.motionMode === 'legacy') {
        hudPhaseIndicator.textContent = 'SUITE 1 • LEGACY BROWNFIELD (CVE-2024-6242 VULNERABLE)';
        hudScriptText.innerHTML = `"Notice the legacy brownfield scenario: to maintain the 1ms motion limit, plants run unencrypted CIP on Port 44818. This leaves the backplane vulnerable to <strong>CVE-2024-6242</strong>, allowing an attacker to bypass slot permissions and overwrite servo velocity tags directly."`;
      } else if (state.motionMode === 'tls') {
        hudPhaseIndicator.textContent = 'SUITE 1 • NAIVE TLS RETROFIT (WATCHDOG TRIP)';
        hudScriptText.innerHTML = `"Here is the real dilemma: when operators try the naive fix of enabling standard TLS, the heavy crypto handshake spikes latency to <strong>32 milliseconds</strong>. That breaches the 5.0ms hardware watchdog limit, tripping the E-Stop and costing the plant <strong>$4,333 every single minute</strong> in unplanned downtime."`;
      }
    } else if (state.currentSuite === 'trust') {
      hudPhaseIndicator.textContent = 'SUITE 2 • LOGIC TRUST GAP (CISA AA26-097A)';
      hudScriptText.innerHTML = `"Moving to the software plane, CISA advisory AA26-097A revealed that adversaries modify Studio 5000 <code>.ACD</code> project files directly, disabling emergency shutdown rungs while the HMI still shows normal. Today, CISA recommends a manual visual comparison. My proposal introduces a <strong>Signed Baseline Pipeline</strong> that gates downloads and uses canonical L5X diffing to prove runtime integrity."`;
    } else if (state.currentSuite === 'dos') {
      hudPhaseIndicator.textContent = 'SUITE 3 • CIP INPUT VALIDATION FAULT (CVE-2026-9637)';
      hudScriptText.innerHTML = `"It is vital to distinguish between logic tampering and availability bugs: <strong>CVE-2026-9637</strong> is an input length validation flaw that triggers a Major Nonrecoverable Fault. The fix here is straightforward firmware upgrading (v36.013+), whereas project tampering requires supply chain manifest signing."`;
    } else if (state.currentSuite === 'pitch') {
      hudPhaseIndicator.textContent = 'SUITE 4 • EXECUTIVE SUMMARY & ROI';
      hudScriptText.innerHTML = `"In summary, this dual architecture bridges both planes: eBPF solves the real-time motion physics at the network layer, while Signed Baselines solve the supply chain trust gap in software engineering. This saves $2.6 Million per plant annually without requiring multi-million-dollar hardware rip-and-replace."`;
    }
  }

  // ==================== 2. WEB AUDIO SYNTHESIZER ====================
  function initAudio() {
    if (!state.audioCtx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      state.audioCtx = new AudioCtx();
    }
    if (state.audioCtx.state === 'suspended') {
      state.audioCtx.resume();
    }
  }

  toggleAudioBtn.addEventListener('click', () => {
    state.audioEnabled = !state.audioEnabled;
    toggleAudioBtn.classList.toggle('highlight', state.audioEnabled);
    if (state.audioEnabled) {
      initAudio();
      playTone(520, 0.1, 'sine');
    }
  });

  function playTone(freq, duration, type = 'sine', gainVal = 0.08) {
    if (!state.audioEnabled || !state.audioCtx) return;
    try {
      const osc = state.audioCtx.createOscillator();
      const gain = state.audioCtx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, state.audioCtx.currentTime);
      gain.gain.setValueAtTime(gainVal, state.audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, state.audioCtx.currentTime + duration);
      osc.connect(gain);
      gain.connect(state.audioCtx.destination);
      osc.start();
      osc.stop(state.audioCtx.currentTime + duration);
    } catch (e) {}
  }

  function playAlarm() {
    playTone(880, 0.25, 'sawtooth', 0.15);
    setTimeout(() => playTone(587, 0.3, 'sawtooth', 0.15), 180);
  }

  function playSuccess() {
    playTone(440, 0.1, 'sine', 0.08);
    setTimeout(() => playTone(659, 0.15, 'sine', 0.08), 80);
  }

  // ==================== 3. SUITE 1 ARCHITECTURE MODES ====================
  function setMotionMode(mode) {
    state.motionMode = mode;
    archButtons.forEach(btn => btn.classList.toggle('active', btn.dataset.mode === mode));

    if (mode === 'shield') {
      setFactoryRunning(true);
      overallDot.className = 'status-pulse-dot';
      overallStatusText.textContent = 'CIP-SHIELD NOMINAL &bull; 0.84ms';
      tagCryptoStatus.textContent = 'Poly1305 MAC Verified in 13.82µs';
      tagCryptoStatus.className = 'field-tag green';
      packetCrcBadge.textContent = 'CRC32: 0x94B2E1 &bull; VALID';
      packetCrcBadge.style.color = '#6EE7B7';
      stopDowntimeCounter();
      logSyslog('info', '[MODE] Switched to CIP-Shield Architecture: eBPF kernel fast-path active.');
      playSuccess();

    } else if (mode === 'legacy') {
      setFactoryRunning(true);
      overallDot.className = 'status-pulse-dot';
      overallStatusText.textContent = 'UNENCRYPTED CIP (PORT 44818)';
      tagCryptoStatus.textContent = 'Plaintext CIP (No Encryption)';
      tagCryptoStatus.className = 'field-tag';
      packetCrcBadge.textContent = 'CRC32: 0x94B2E1 &bull; UNENCRYPTED';
      packetCrcBadge.style.color = '#94A3B8';
      stopDowntimeCounter();
      logSyslog('warn', '[MODE] Switched to Legacy Brownfield: Unencrypted CIP exposed on Port 44818.');

    } else if (mode === 'tls') {
      logSyslog('error', '[MODE] Switched to Standard TLS Retrofit: Controller CPU overloaded with TLS 1.3 handshakes.');
      triggerWatchdogHalt();
    }

    updateCandidateHud();
    updateHexDump();
  }

  archButtons.forEach(btn => {
    btn.addEventListener('click', () => setMotionMode(btn.dataset.mode));
  });

  function setFactoryRunning(running) {
    state.factoryRunning = running;
    if (running) {
      cellStatusPill.textContent = 'CYCLE ACTIVE &bull; 450 UNITS/MIN';
      cellStatusPill.style.color = '#6EE7B7';
      cellStatusPill.style.borderColor = 'rgba(16, 185, 129, 0.3)';
      hwRobotStatus.textContent = 'WELDING (J1-J6 NOMINAL)';
      hwRobotStatus.className = 'hw-val green';
      stopDowntimeCounter();
    } else {
      cellStatusPill.textContent = 'LINE HALTED &bull; 0 UNITS/MIN (E-STOP)';
      cellStatusPill.style.color = '#F87171';
      cellStatusPill.style.borderColor = 'rgba(212, 27, 44, 0.4)';
      hwRobotStatus.textContent = 'E-STOP TRIPPED (ZERO MOTION)';
      hwRobotStatus.className = 'hw-val red';
      startDowntimeCounter();
      playAlarm();
    }
  }

  function triggerWatchdogHalt() {
    setFactoryRunning(false);
    overallDot.className = 'status-pulse-dot fault';
    overallStatusText.textContent = 'WATCHDOG TRIP (E-STOP)';
    logSyslog('error', '[WATCHDOG] Cyclic latency exceeded 5.0ms threshold (measured: 32.4ms). Controller triggered safety E-Stop!');
  }

  // Downtime Counter ($4,333 / min)
  function startDowntimeCounter() {
    if (!state.downtimeTimer) {
      state.downtimeTimer = setInterval(() => {
        state.downtimeSeconds += 0.25;
        const lossDollars = (state.downtimeSeconds * (4333.33 / 60.0)).toFixed(2);
        valLoss.textContent = `$${Number(lossDollars).toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
        const pct = Math.min(100, (state.downtimeSeconds / 30) * 100);
        barLoss.style.width = `${pct}%`;
      }, 250);
    }
  }

  function stopDowntimeCounter() {
    if (state.downtimeTimer) {
      clearInterval(state.downtimeTimer);
      state.downtimeTimer = null;
    }
    state.downtimeSeconds = 0;
    valLoss.textContent = '$0.00';
    barLoss.style.width = '0%';
  }

  // Infiltrate Exploit Packet
  infiltrateAttackBtn.addEventListener('click', () => {
    if (state.isUnderAttack) return;
    state.isUnderAttack = true;

    logSyslog('error', '[SECURITY] Infiltrating forged CIP encapsulation frame targeting Backplane Slot 0x02...');
    playAlarm();

    if (state.motionMode === 'legacy') {
      setTimeout(() => {
        setFactoryRunning(false);
        overallDot.className = 'status-pulse-dot fault';
        overallStatusText.textContent = 'PLC HIJACKED (CVE-2024-6242)';
        logSyslog('error', '[CRITICAL] CVE-2024-6242 slot bypass succeeded: Motor velocity overwritten! Safety trip triggered.');
        updateHexDump(true);
        state.isUnderAttack = false;
      }, 700);

    } else if (state.motionMode === 'shield') {
      setTimeout(() => {
        logSyslog('success', '[CIP-SHIELD eBPF] XDP driver hook intercepted forged frame: Poly1305 MAC failure.');
        logSyslog('info', '[SYNTHETIC KEEP-ALIVE] Injected synthetic nominal beacon into 1756 backplane. 0.84ms determinism preserved.');
        state.isUnderAttack = false;
        playSuccess();
      }, 600);

    } else if (state.motionMode === 'tls') {
      setTimeout(() => {
        logSyslog('warn', '[TLS PROXY] Cryptographic signature verification failed after 34ms processing backlog.');
        triggerWatchdogHalt();
        state.isUnderAttack = false;
      }, 600);
    }
  });

  resetMotionSimBtn.addEventListener('click', () => {
    state.isUnderAttack = false;
    setMotionMode('shield');
    logSyslog('info', '[RESET] Diagnostic registers cleared. All industrial nodes nominal.');
  });

  // ==================== 4. PACKET HEX INSPECTOR DUMP ====================
  function updateHexDump(isAttack = false) {
    let bytes = [
      '6F', '00', '18', '00', 'A4', '12', 'B8', '00',
      '4E', '02', '20', '67', '24', '01', '00', '00',
      '00', '00', '00', '00', 'A1', '0F', '7B', '9C',
      '02', '1A', '00', '00', 'E4', '5D', '11', '00'
    ];

    if (isAttack) {
      bytes[8] = '4D'; // Malicious Set_Attribute
      bytes[9] = '02'; // Target slot
    }

    hexStream.innerHTML = '';
    const row = document.createElement('div');
    row.className = 'hex-row';

    const offsetSpan = document.createElement('span');
    offsetSpan.className = 'hex-offset';
    offsetSpan.textContent = '0x0000:';

    const bytesContainer = document.createElement('div');
    bytesContainer.className = 'hex-bytes';

    let asciiStr = '';

    bytes.slice(0, 16).forEach((b, idx) => {
      const span = document.createElement('span');
      span.className = 'h-byte';
      span.textContent = b;
      if (idx === 8 && isAttack) span.className = 'h-byte danger';
      else if (idx === 8 || idx === 9) span.className = 'h-byte hl';
      bytesContainer.appendChild(span);
      asciiStr += (idx === 8 ? 'N' : '.');
    });

    const asciiSpan = document.createElement('span');
    asciiSpan.className = 'hex-ascii';
    asciiSpan.textContent = asciiStr;

    row.appendChild(offsetSpan);
    row.appendChild(bytesContainer);
    row.appendChild(asciiSpan);
    hexStream.appendChild(row);
  }
  updateHexDump();

  function logSyslog(type, msg) {
    const entry = document.createElement('div');
    entry.className = `log-entry ${type}`;
    const timestamp = new Date().toTimeString().split(' ')[0];
    entry.textContent = `[${timestamp}] ${msg}`;
    syslogTerminal.prepend(entry);
  }

  // ==================== 5. HIGH-FIDELITY DIGITAL TWIN RENDERING (CANVAS) ====================
  function drawDigitalTwin() {
    const w = twinCanvas.width;
    const h = twinCanvas.height;

    twinCtx.fillStyle = '#080C14';
    twinCtx.fillRect(0, 0, w, h);

    // 1. Industrial Floor Datum Grid
    twinCtx.strokeStyle = '#121B2A';
    twinCtx.lineWidth = 1;
    for (let x = 0; x < w; x += 30) {
      twinCtx.beginPath();
      twinCtx.moveTo(x, 0);
      twinCtx.lineTo(x, h);
      twinCtx.stroke();
    }
    for (let y = 0; y < h; y += 30) {
      twinCtx.beginPath();
      twinCtx.moveTo(0, y);
      twinCtx.lineTo(w, y);
      twinCtx.stroke();
    }

    // 2. ControlLogix 1756 Chassis Rack (Left Viewport)
    drawControlLogixRack(25, 35);

    // 3. Heavy Industrial Conveyor (Center-Right)
    drawConveyor(220, 155, 390);

    // 4. 6-Axis Articulated Industrial Robot Arm (Right)
    drawRobotArm(460, 175);

    // 5. Laser Sparks & Workcell Lighting
    drawParticles();

    // 6. Xenon Beacon Tower
    drawBeacon(185, 30);

    requestAnimationFrame(drawDigitalTwin);
  }

  // Draw Realistic ControlLogix 5580 1756 Chassis
  function drawControlLogixRack(x, y) {
    const rw = 145;
    const rh = 175;

    // Extruded aluminum bezel shadow
    twinCtx.fillStyle = '#04070D';
    twinCtx.fillRect(x + 3, y + 3, rw, rh);

    // Chassis housing (Brushed aluminum & black powder coat)
    const rackGrad = twinCtx.createLinearGradient(x, y, x + rw, y);
    rackGrad.addColorStop(0, '#1E293B');
    rackGrad.addColorStop(0.5, '#2A3A52');
    rackGrad.addColorStop(1, '#1A2435');
    twinCtx.fillStyle = rackGrad;
    twinCtx.fillRect(x, y, rw, rh);
    twinCtx.strokeStyle = '#384B66';
    twinCtx.lineWidth = 1.5;
    twinCtx.strokeRect(x, y, rw, rh);

    // Top Header with Allen-Bradley Logo Bar
    twinCtx.fillStyle = '#D41B2C';
    twinCtx.fillRect(x + 5, y + 5, rw - 10, 14);
    twinCtx.fillStyle = '#FFFFFF';
    twinCtx.font = 'bold 8px Inter, sans-serif';
    twinCtx.fillText('Allen-Bradley  ControlLogix 5580', x + 10, y + 15);

    // Slot 0: 1756-L85E CPU Controller Module
    drawPlcSlot(x + 8, y + 24, 30, rh - 30, 'CPU', true);

    // Slot 1: 1756-EN4TR Dual Gigabit Ethernet Adapter
    drawPlcSlot(x + 41, y + 24, 30, rh - 30, 'EN4TR', false, true);

    // Slot 2: 1756-IB16 Digital Input (16 LED Matrix)
    drawPlcSlot(x + 74, y + 24, 30, rh - 30, 'IB16', false, false, true);

    // Slot 3: 1756-OB16 Digital Output (16 LED Matrix)
    drawPlcSlot(x + 107, y + 24, 30, rh - 30, 'OB16', false, false, false, true);
  }

  function drawPlcSlot(sx, sy, sw, sh, label, isCpu = false, isNet = false, isIb = false, isOb = false) {
    twinCtx.fillStyle = '#101724';
    twinCtx.fillRect(sx, sy, sw, sh);
    twinCtx.strokeStyle = '#1F2C40';
    twinCtx.lineWidth = 1;
    twinCtx.strokeRect(sx, sy, sw, sh);

    // Slot label
    twinCtx.fillStyle = '#64748B';
    twinCtx.font = '7.5px JetBrains Mono, monospace';
    twinCtx.fillText(label, sx + 4, sy + 12);

    if (isCpu) {
      // 4-character green LED dot-matrix display
      twinCtx.fillStyle = '#050D09';
      twinCtx.fillRect(sx + 4, sy + 18, 22, 10);
      twinCtx.fillStyle = state.factoryRunning ? '#10B981' : '#D41B2C';
      twinCtx.font = 'bold 7px JetBrains Mono, monospace';
      const displayText = state.factoryRunning ? state.dotMatrixStrings[state.dotMatrixIndex % state.dotMatrixStrings.length] : 'FLT ';
      twinCtx.fillText(displayText, sx + 6, sy + 26);

      // Status LEDs: RUN, FLT, I/O
      drawLedDot(sx + 7, sy + 36, state.factoryRunning ? '#10B981' : '#334155', 'RUN');
      drawLedDot(sx + 7, sy + 46, !state.factoryRunning ? '#D41B2C' : '#334155', 'FLT');
      drawLedDot(sx + 7, sy + 56, state.factoryRunning ? '#10B981' : '#334155', 'OK');

      // Key Switch (RUN position)
      twinCtx.fillStyle = '#475569';
      twinCtx.beginPath();
      twinCtx.arc(sx + 15, sy + 80, 5, 0, Math.PI * 2);
      twinCtx.fill();
      twinCtx.strokeStyle = '#E2E8F0';
      twinCtx.lineWidth = 1.5;
      twinCtx.beginPath();
      twinCtx.moveTo(sx + 15, sy + 80);
      twinCtx.lineTo(sx + 15, sy + 75); // Vertical = RUN
      twinCtx.stroke();
    }

    if (isNet) {
      // RJ45 Dual Ports with blinking link LEDs
      twinCtx.fillStyle = '#060B12';
      twinCtx.fillRect(sx + 5, sy + 22, 20, 16);
      twinCtx.fillRect(sx + 5, sy + 44, 20, 16);
      // Link LEDs
      const blink = (Math.floor(Date.now() / 150) % 2 === 0) && state.factoryRunning;
      drawLedDot(sx + 7, sy + 20, blink ? '#10B981' : '#334155');
      drawLedDot(sx + 18, sy + 20, blink ? '#F59E0B' : '#334155');
      drawLedDot(sx + 7, sy + 42, blink ? '#10B981' : '#334155');
      drawLedDot(sx + 18, sy + 42, blink ? '#F59E0B' : '#334155');
    }

    if (isIb || isOb) {
      // 16-channel LED indicator matrix (4 rows of 4)
      for (let r = 0; r < 6; r++) {
        for (let c = 0; c < 2; c++) {
          const ledOn = state.factoryRunning && ((r * 2 + c + Math.floor(Date.now() / 200)) % 3 !== 0);
          const color = isIb ? (ledOn ? '#F59E0B' : '#1E293B') : (ledOn ? '#10B981' : '#1E293B');
          drawLedDot(sx + 8 + c * 10, sy + 24 + r * 10, color);
        }
      }
    }
  }

  function drawLedDot(lx, ly, color, lbl) {
    twinCtx.fillStyle = color;
    twinCtx.beginPath();
    twinCtx.arc(lx, ly, 2.2, 0, Math.PI * 2);
    twinCtx.fill();

    if (lbl) {
      twinCtx.fillStyle = '#64748B';
      twinCtx.font = '6px JetBrains Mono, monospace';
      twinCtx.fillText(lbl, lx + 5, ly + 2);
    }
  }

  // Draw Heavy Conveyor
  function drawConveyor(cx, cy, len) {
    // Bed frame
    twinCtx.fillStyle = '#111827';
    twinCtx.fillRect(cx, cy, len, 24);
    twinCtx.strokeStyle = '#374151';
    twinCtx.lineWidth = 1.5;
    twinCtx.strokeRect(cx, cy, len, 24);

    // Stainless flight rails
    twinCtx.fillStyle = '#4B5563';
    twinCtx.fillRect(cx, cy - 2, len, 3);
    twinCtx.fillRect(cx, cy + 23, len, 3);

    // Rollers
    if (state.factoryRunning) {
      state.conveyorOffset = (state.conveyorOffset + 2) % 24;
    }
    twinCtx.strokeStyle = '#1F2937';
    twinCtx.lineWidth = 1;
    for (let r = cx; r < cx + len; r += 12) {
      const rx = r + (state.factoryRunning ? (state.conveyorOffset % 12) : 0);
      if (rx < cx + len - 2) {
        twinCtx.beginPath();
        twinCtx.moveTo(rx, cy + 2);
        twinCtx.lineTo(rx, cy + 22);
        twinCtx.stroke();
      }
    }

    // Machined Automotive Parts moving on conveyor
    for (let p = 0; p < 4; p++) {
      const px = cx + ((p * 95 + state.conveyorOffset * 2) % len);
      drawMachinedPart(px, cy - 12);
    }
  }

  function drawMachinedPart(px, py) {
    twinCtx.fillStyle = '#64748B';
    twinCtx.fillRect(px, py, 26, 12);
    twinCtx.strokeStyle = '#94A3B8';
    twinCtx.lineWidth = 1;
    twinCtx.strokeRect(px, py, 26, 12);

    // Detail milling pockets
    twinCtx.fillStyle = '#334155';
    twinCtx.fillRect(px + 4, py + 2, 7, 8);
    twinCtx.fillRect(px + 15, py + 2, 7, 8);
  }

  // Draw 6-Axis Heavy Articulated Robot Arm
  function drawRobotArm(rx, ry) {
    if (state.factoryRunning) {
      state.robotAngle += 0.04;
    }
    const sweep = Math.sin(state.robotAngle) * 0.25;

    // 1. Pedestal Base
    twinCtx.fillStyle = '#1E293B';
    twinCtx.fillRect(rx - 22, ry + 10, 44, 20);
    twinCtx.strokeStyle = '#475569';
    twinCtx.lineWidth = 1.5;
    twinCtx.strokeRect(rx - 22, ry + 10, 44, 20);

    // 2. Base Joint (Turret J1)
    twinCtx.fillStyle = '#D41B2C'; // Rockwell Crimson
    twinCtx.beginPath();
    twinCtx.arc(rx, ry + 10, 16, Math.PI, 0);
    twinCtx.fill();
    twinCtx.strokeStyle = '#FFFFFF';
    twinCtx.lineWidth = 1;
    twinCtx.stroke();

    // Joint 2 (Shoulder)
    const j2x = rx - 5;
    const j2y = ry - 12;

    // Bicep Linkage
    const bicepLen = 65;
    const bicepAngle = -Math.PI / 2.3 + sweep * 0.4;
    const j3x = j2x + Math.cos(bicepAngle) * bicepLen;
    const j3y = j2y + Math.sin(bicepAngle) * bicepLen;

    // Draw Bicep Body
    twinCtx.strokeStyle = '#1E293B';
    twinCtx.lineWidth = 14;
    twinCtx.beginPath();
    twinCtx.moveTo(j2x, j2y);
    twinCtx.lineTo(j3x, j3y);
    twinCtx.stroke();

    // Red Accent on Arm Link
    twinCtx.strokeStyle = '#D41B2C';
    twinCtx.lineWidth = 8;
    twinCtx.beginPath();
    twinCtx.moveTo(j2x + 4, j2y);
    twinCtx.lineTo(j3x - 4, j3y);
    twinCtx.stroke();

    // Hydraulic Actuator Cylinder
    twinCtx.strokeStyle = '#94A3B8';
    twinCtx.lineWidth = 3;
    twinCtx.beginPath();
    twinCtx.moveTo(j2x + 8, j2y + 6);
    twinCtx.lineTo(j3x + 6, j3y + 12);
    twinCtx.stroke();

    // Joint 3 (Elbow) Pivot
    twinCtx.fillStyle = '#334155';
    twinCtx.beginPath();
    twinCtx.arc(j3x, j3y, 8, 0, Math.PI * 2);
    twinCtx.fill();

    // Forearm Linkage
    const forearmLen = 55;
    const forearmAngle = Math.PI / 4 + sweep * 0.8;
    const j4x = j3x + Math.cos(forearmAngle) * forearmLen;
    const j4y = j3y + Math.sin(forearmAngle) * forearmLen;

    twinCtx.strokeStyle = '#1E293B';
    twinCtx.lineWidth = 10;
    twinCtx.beginPath();
    twinCtx.moveTo(j3x, j3y);
    twinCtx.lineTo(j4x, j4y);
    twinCtx.stroke();

    // Wrist Flange & Laser Tooling
    twinCtx.fillStyle = '#64748B';
    twinCtx.beginPath();
    twinCtx.arc(j4x, j4y, 6, 0, Math.PI * 2);
    twinCtx.fill();

    // Laser Optics Nozzle pointing straight down to part
    const tipX = j4x;
    const tipY = j4y + 16;
    twinCtx.strokeStyle = '#CBD5E1';
    twinCtx.lineWidth = 4;
    twinCtx.beginPath();
    twinCtx.moveTo(j4x, j4y);
    twinCtx.lineTo(tipX, tipY);
    twinCtx.stroke();

    // Laser Beam & Optical Spot (Active only if running)
    if (state.factoryRunning) {
      const weldY = 153;
      twinCtx.strokeStyle = 'rgba(6, 182, 212, 0.8)';
      twinCtx.lineWidth = 2;
      twinCtx.beginPath();
      twinCtx.moveTo(tipX, tipY);
      twinCtx.lineTo(tipX, weldY);
      twinCtx.stroke();

      // Optical focal glow
      const glow = twinCtx.createRadialGradient(tipX, weldY, 1, tipX, weldY, 15);
      glow.addColorStop(0, '#FFFFFF');
      glow.addColorStop(0.3, '#38BDF8');
      glow.addColorStop(1, 'transparent');
      twinCtx.fillStyle = glow;
      twinCtx.beginPath();
      twinCtx.arc(tipX, weldY, 15, 0, Math.PI * 2);
      twinCtx.fill();

      // Emit sparks
      if (Math.random() > 0.3) {
        for (let i = 0; i < 3; i++) {
          state.weldSparks.push({
            x: tipX,
            y: weldY,
            vx: (Math.random() - 0.5) * 5,
            vy: -Math.random() * 4 - 1,
            life: 1.0
          });
        }
      }
    }
  }

  function drawParticles() {
    for (let i = state.weldSparks.length - 1; i >= 0; i--) {
      const p = state.weldSparks[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.2; // Gravity
      p.life -= 0.05;

      if (p.life <= 0) {
        state.weldSparks.splice(i, 1);
        continue;
      }

      twinCtx.fillStyle = `rgba(255, 235, 59, ${p.life})`;
      twinCtx.beginPath();
      twinCtx.arc(p.x, p.y, 1.5, 0, Math.PI * 2);
      twinCtx.fill();
    }
  }

  function drawBeacon(bx, by) {
    twinCtx.fillStyle = '#0F172A';
    twinCtx.fillRect(bx, by + 40, 6, 60);

    const isFault = !state.factoryRunning;
    const isWarn = state.motionMode === 'legacy' && state.isUnderAttack;

    // Green lens
    drawBeaconLens(bx - 3, by + 24, (!isFault && !isWarn) ? '#10B981' : '#1E293B', true);
    // Amber lens
    drawBeaconLens(bx - 3, by + 12, isWarn ? '#F59E0B' : '#1E293B', isWarn);
    // Red Xenon Strobe lens
    const flashRed = isFault && (Math.floor(Date.now() / 200) % 2 === 0);
    drawBeaconLens(bx - 3, by, isFault ? (flashRed ? '#EF4444' : '#7F1D1D') : '#1E293B', isFault);
  }

  function drawBeaconLens(lx, ly, col, glow = false) {
    twinCtx.fillStyle = col;
    twinCtx.fillRect(lx, ly, 12, 10);
    twinCtx.strokeStyle = '#000';
    twinCtx.lineWidth = 1;
    twinCtx.strokeRect(lx, ly, 12, 10);
    if (glow) {
      twinCtx.shadowColor = col;
      twinCtx.shadowBlur = 8;
      twinCtx.strokeRect(lx, ly, 12, 10);
      twinCtx.shadowBlur = 0;
    }
  }

  // Dot Matrix Rolling Timer
  setInterval(() => {
    state.dotMatrixIndex++;
  }, 1200);

  // ==================== 6. KEYSIGHT DIGITAL OSCILLOSCOPE ====================
  function drawScope() {
    const sw = scopeCanvas.width;
    const sh = scopeCanvas.height;

    // CRT Screen Background
    scopeCtx.fillStyle = '#03070E';
    scopeCtx.fillRect(0, 0, sw, sh);

    // 10x8 Calibrated Graticule
    scopeCtx.strokeStyle = '#0F1B2B';
    scopeCtx.lineWidth = 1;
    scopeCtx.setLineDash([2, 4]);

    const numCols = 10;
    const numRows = 8;
    for (let c = 1; c < numCols; c++) {
      const gx = (sw / numCols) * c;
      scopeCtx.beginPath();
      scopeCtx.moveTo(gx, 0);
      scopeCtx.lineTo(gx, sh);
      scopeCtx.stroke();
    }
    for (let r = 1; r < numRows; r++) {
      const gy = (sh / numRows) * r;
      scopeCtx.beginPath();
      scopeCtx.moveTo(0, gy);
      scopeCtx.lineTo(sw, gy);
      scopeCtx.stroke();
    }
    scopeCtx.setLineDash([]);

    // Watchdog Threshold Line (5.0ms)
    const tripY = sh - (5.0 / 40.0) * sh;
    scopeCtx.strokeStyle = 'rgba(239, 68, 68, 0.7)';
    scopeCtx.lineWidth = 1.5;
    scopeCtx.setLineDash([4, 4]);
    scopeCtx.beginPath();
    scopeCtx.moveTo(0, tripY);
    scopeCtx.lineTo(sw, tripY);
    scopeCtx.stroke();
    scopeCtx.setLineDash([]);

    // RPI 1.0ms Target Line
    const rpiY = sh - (1.0 / 40.0) * sh;
    scopeCtx.strokeStyle = 'rgba(6, 182, 212, 0.5)';
    scopeCtx.lineWidth = 1;
    scopeCtx.beginPath();
    scopeCtx.moveTo(0, rpiY);
    scopeCtx.lineTo(sw, rpiY);
    scopeCtx.stroke();

    // Actual Latency Waveform Sweep (Phosphor Persistence)
    const pts = state.latencyHistory;
    const stepX = sw / (pts.length - 1);

    scopeCtx.strokeStyle = state.motionMode === 'tls' ? '#EF4444' : '#06B6D4';
    scopeCtx.shadowColor = state.motionMode === 'tls' ? '#EF4444' : '#06B6D4';
    scopeCtx.shadowBlur = 8;
    scopeCtx.lineWidth = 2.5;

    scopeCtx.beginPath();
    pts.forEach((val, i) => {
      const px = i * stepX;
      const clampedVal = Math.min(38, val);
      const py = sh - (clampedVal / 40.0) * sh;
      if (i === 0) scopeCtx.moveTo(px, py);
      else scopeCtx.lineTo(px, py);
    });
    scopeCtx.stroke();
    scopeCtx.shadowBlur = 0;

    requestAnimationFrame(drawScope);
  }

  // Telemetry Metric Generator Loop
  setInterval(() => {
    let targetLatency = 0.84;
    let targetJitter = 0.04;
    let targetCpu = 24;

    if (state.motionMode === 'shield') {
      targetLatency = 0.82 + Math.random() * 0.05;
      targetJitter = 0.03 + Math.random() * 0.02;
      targetCpu = 22 + Math.floor(Math.random() * 5);
      dotLatency.className = 'tile-dot green';
      dotJitter.className = 'tile-dot green';
      dotCpu.className = 'tile-dot green';
      barLatency.style.background = 'var(--cyan-scope)';
      barJitter.style.background = 'var(--cyan-scope)';
      barCpu.style.background = 'var(--cyan-scope)';

    } else if (state.motionMode === 'legacy') {
      if (state.isUnderAttack) {
        targetLatency = 2.45 + Math.random() * 0.8;
        targetJitter = 0.75 + Math.random() * 0.3;
        targetCpu = 52 + Math.floor(Math.random() * 12);
        dotLatency.className = 'tile-dot amber';
        dotJitter.className = 'tile-dot amber';
      } else {
        targetLatency = 0.81 + Math.random() * 0.04;
        targetJitter = 0.03 + Math.random() * 0.02;
        targetCpu = 20 + Math.floor(Math.random() * 4);
        dotLatency.className = 'tile-dot green';
        dotJitter.className = 'tile-dot green';
      }
      dotCpu.className = 'tile-dot green';

    } else if (state.motionMode === 'tls') {
      targetLatency = 32.1 + Math.random() * 2.5;
      targetJitter = 16.2 + Math.random() * 3.0;
      targetCpu = 94 + Math.floor(Math.random() * 5);
      dotLatency.className = 'tile-dot red';
      dotJitter.className = 'tile-dot red';
      dotCpu.className = 'tile-dot red';
      barLatency.style.background = 'var(--rok-red)';
      barJitter.style.background = 'var(--rok-red)';
      barCpu.style.background = 'var(--rok-red)';
    }

    state.currentLatency = targetLatency;
    state.currentJitter = targetJitter;
    state.currentCpu = targetCpu;

    valLatency.innerHTML = `${targetLatency.toFixed(2)} <span class="unit">ms</span>`;
    valJitter.innerHTML = `&plusmn;${targetJitter.toFixed(2)} <span class="unit">ms</span>`;
    valCpu.innerHTML = `${targetCpu} <span class="unit">%</span>`;

    barLatency.style.width = `${Math.min(100, (targetLatency / 40.0) * 100)}%`;
    barJitter.style.width = `${Math.min(100, (targetJitter / 20.0) * 100)}%`;
    barCpu.style.width = `${targetCpu}%`;

    // Push into buffer
    state.latencyHistory.push(targetLatency);
    state.latencyHistory.shift();

    // Scope HUD stats
    document.getElementById('scopePkPk').textContent = `${(targetLatency * 1.08).toFixed(2)} ms`;
    document.getElementById('scopeRms').textContent = `${(targetJitter * 0.95).toFixed(3)} ms`;
    document.getElementById('scopeEye').textContent = state.motionMode === 'tls' ? '12.4%' : '98.4%';
  }, 100);

  // ==================== 7. SUITE 2: SOFTWARE TRUST GAP ENGINE ====================
  tamperToggle.addEventListener('change', () => {
    state.isTampered = tamperToggle.checked;

    if (state.isTampered) {
      trustNodeWorkstation.classList.add('tampered');
      statusWorkstation.textContent = 'MALICIOUS LOGIC INJECTED';
      statusWorkstation.className = 't-node-status bad';
      acdFileHash.textContent = 'SHA-256: e92b...fa01 (FORGED)';
      
      statusPlcLogic.textContent = 'SAFETY OVERRIDDEN';
      statusPlcLogic.className = 't-node-status bad';
      rung1Code.textContent = '|--[/]-- E-STOP_BYPASSED ------( )-- SAFE_ENABLE --|';
      rung1Flag.textContent = 'DISABLED'; rung1Flag.className = 'rung-flag bad';

      rung2Code.textContent = '|--[ ]-- ALARM_MUTED ----------( )-- TRIP_ALARM --|';
      rung2Flag.textContent = 'SILENCED'; rung2Flag.className = 'rung-flag bad';

      rung3Code.textContent = '|--[ ]-- MAX_SPEED_UNLOCKED ----( )-- MOTION_PERMIT --|';
      rung3Flag.textContent = 'OVERRIDDEN'; rung3Flag.className = 'rung-flag bad';

      statusHmi.textContent = 'DECEPTIVE NORMAL';
      hmiGreenLight.textContent = 'NORMAL (SAFETY MUTED)';
      hmiGreenLight.className = 'hmi-green-light warn';
      hmiEstop.textContent = 'BYPASSED';
      hmiSafety.textContent = 'SIL-3 UNPROTECTED';
      hmiSafety.style.color = '#F87171';

      pipelineConsole.innerHTML = '<span style="color:#F87171; font-weight:700;">WARNING:</span> Workstation .ACD file has been tampered. Downstream ladder logic still compiles, but safety shutoff rungs are disabled. The operator SCADA view remains calm. Press "Execute Attestation Pipeline" to test automated cryptographic gating.';
      playAlarm();

    } else {
      trustNodeWorkstation.classList.remove('tampered');
      statusWorkstation.textContent = 'APPROVED FILE';
      statusWorkstation.className = 't-node-status good';
      acdFileHash.textContent = 'SHA-256: 8a4f...31c2 (Signed)';

      statusPlcLogic.textContent = 'RUNNING APPROVED';
      statusPlcLogic.className = 't-node-status good';
      rung1Code.textContent = '|--[ ]-- E-STOP_HEALTHY -------( )-- SAFE_ENABLE --|';
      rung1Flag.textContent = 'ARMED'; rung1Flag.className = 'rung-flag good';

      rung2Code.textContent = '|--[/]-- OVER_PRESSURE_HIGH ---( )-- TRIP_ALARM --|';
      rung2Flag.textContent = 'ACTIVE'; rung2Flag.className = 'rung-flag good';

      rung3Code.textContent = '|--[ ]-- ROBOT_INTERLOCK -------( )-- MOTION_PERMIT --|';
      rung3Flag.textContent = 'ENFORCED'; rung3Flag.className = 'rung-flag good';

      statusHmi.textContent = 'SYSTEM HEALTHY';
      hmiGreenLight.textContent = 'ALL SYSTEMS GREEN';
      hmiGreenLight.className = 'hmi-green-light';
      hmiEstop.textContent = 'MONITORED';
      hmiSafety.textContent = 'SIL-3 NORMAL';
      hmiSafety.style.color = '';

      pipelineConsole.textContent = 'Normal signed baseline restored. Press "Execute Attestation Pipeline" to step through verification.';
      resetPipelineSteps();
    }
  });

  function resetPipelineSteps() {
    pSteps.forEach(s => s.className = 'p-step');
    pipelineStatusBadge.textContent = 'READY FOR VERIFICATION RUN';
    pipelineStatusBadge.style.color = 'var(--cyan-scope)';
  }

  runPipelineBtn.addEventListener('click', () => {
    if (state.pipelineRunning) return;
    state.pipelineRunning = true;
    resetPipelineSteps();

    const tampered = state.isTampered;
    const seq = [
      { step: 0, text: '[STAGE 01] Generating cryptographic manifest: Hashing .ACD binary and canonical L5X XML. Binding controller hardware UUID and engineer private key.' },
      { step: 1, text: tampered ? '[STAGE 02 GATE BLOCKED] Jump Host verified manifest signature: HASH MISMATCH DETECTED. Unapproved modifications found! Port 44818 channel locked.' : '[STAGE 02 GATEWAY] Jump Host verified ECDSA signature against corporate HSM certificate authority. Download channel approved.' },
      { step: 2, text: tampered ? '[STAGE 03 DOWNLOAD ABORTED] Malicious package quarantined. Zero unverified bytes delivered to ControlLogix backplane.' : '[STAGE 03 CIP DOWNLOAD] Transmitting verified package over Port 44818 to 1756-L85E controller.' },
      { step: 3, text: tampered ? '[STAGE 04 UPLOAD SKIPPED] No new image was downloaded.' : '[STAGE 04 POST-DOWNLOAD UPLOAD] Automatically reading back running compiled memory image from controller into isolated verification sandbox VM.' },
      { step: 4, text: tampered ? '[STAGE 05 DIFF REPORT] Quarantined package diff: Rung 0001 (E-Stop) and Rung 0002 (Pressure Alarm) were bypassed.' : '[STAGE 05 CANONICAL L5X DIFF] Exporting uploaded memory image to canonical XML: Hash matches signed manifest 100.0%. Zero unauthorized rungs.' },
      { step: 5, text: tampered ? '[STAGE 06 SECURITY INCIDENT] Attestation failed: Security alert dispatched to FactoryTalk DataMosaix SIEM. Incident logged to WORM storage.' : '[STAGE 06 WORM ATTESTATION] Cryptographic verification receipt committed to Write-Once-Read-Many immutable audit ledger. Controller approved for production.' }
    ];

    let idx = 0;
    function runNext() {
      if (idx > 0) {
        const prev = pSteps[seq[idx - 1].step];
        prev.classList.remove('active');
        prev.classList.add(tampered && idx - 1 >= 1 ? 'bad' : 'good');
      }

      if (idx >= seq.length) {
        state.pipelineRunning = false;
        if (tampered) {
          pipelineStatusBadge.textContent = 'ATTEMPT QUARANTINED (EVIDENCE STORED)';
          pipelineStatusBadge.style.color = '#F87171';
          pipelineConsole.innerHTML = '<span style="color:#F87171; font-weight:700;">RELEASE BLOCKED:</span> The Signed Baseline Pipeline stopped the modified logic before it ever touched physical hardware. Cryptographic evidence preserved in WORM storage. This replaces manual "visual comparison" with automated mathematical proof.';
          playAlarm();
        } else {
          pipelineStatusBadge.textContent = 'ATTESTATION COMPLETE (VERIFIED OK)';
          pipelineStatusBadge.style.color = '#6EE7B7';
          pipelineConsole.innerHTML = '<span style="color:#6EE7B7; font-weight:700;">VERIFICATION SUCCESSFUL:</span> Running PLC memory image matches the approved signed baseline 100%. Audit proof registered in WORM storage.';
          playSuccess();
        }
        return;
      }

      const item = seq[idx];
      const el = pSteps[item.step];
      el.classList.add('active');
      pipelineConsole.textContent = item.text;
      playTone(400 + idx * 60, 0.08, 'sine');
      idx++;
      setTimeout(runNext, 700);
    }
    runNext();
  });

  // ==================== 8. SUITE 3: CVE-2026-9637 DOS ENGINE ====================
  sendMalformedCipBtn.addEventListener('click', () => {
    dosReadoutBox.innerHTML = '<span style="color:#F87171; font-weight:700;">MAJOR NONRECOVERABLE FAULT (MNRF) TRIGGERED!</span><br>Malformed CIP length header crashed firmware parser on Port 44818. Controller halted. Outputs safe-stated to 0. <strong>Requires physical on-site power cycle.</strong>';
    playAlarm();
  });

  recoverControllerBtn.addEventListener('click', () => {
    dosReadoutBox.innerHTML = 'Power cycle completed. Firmware v36.013 booted. Memory initialized. Controller status: RUNNING &bull; Health: OK &bull; Line: NOMINAL.';
    playSuccess();
  });

  // ==================== 9. AUTO PITCH TOUR (45 SECONDS) ====================
  autoTourBtn.addEventListener('click', () => {
    if (state.tourActive) {
      stopAutoTour();
      return;
    }
    startAutoTour();
  });

  function startAutoTour() {
    state.tourActive = true;
    autoTourBtn.classList.add('highlight');
    autoTourBtn.querySelector('.btn-lbl').textContent = 'Stop Tour';

    const steps = [
      { suite: 'motion', mode: 'legacy', time: 10000, script: '1/3: Observe the legacy ControlLogix brownfield. Unencrypted CIP is exposed on Port 44818 to maintain the 1ms motion limit...' },
      { suite: 'motion', mode: 'tls', time: 11000, script: '2/3: Here is the naive fix: enabling standard TLS causes 32ms jitter spikes, tripping the 5ms hardware watchdog and burning $4,333/min...' },
      { suite: 'motion', mode: 'shield', time: 11000, script: '3/3: CIP-Shield solves this with eBPF offload: 0.84ms latency, zero line stops, and $2.6M annual savings...' },
      { suite: 'trust', tamper: true, time: 13000, script: 'Bonus: Now examine the Software Trust Gap (CISA AA26-097A). Gating downloads with signed baselines proves runtime logic matches approved code.' }
    ];

    let currentIdx = 0;
    function execTourStep() {
      if (!state.tourActive || currentIdx >= steps.length) {
        stopAutoTour();
        return;
      }
      const st = steps[currentIdx];
      switchSuite(st.suite);
      if (st.mode) setMotionMode(st.mode);
      if (st.tamper !== undefined) {
        tamperToggle.checked = st.tamper;
        tamperToggle.dispatchEvent(new Event('change'));
      }
      currentIdx++;
      state.tourTimer = setTimeout(execTourStep, st.time);
    }
    execTourStep();
  }

  function stopAutoTour() {
    state.tourActive = false;
    clearTimeout(state.tourTimer);
    autoTourBtn.classList.remove('highlight');
    autoTourBtn.querySelector('.btn-lbl').textContent = 'Auto Pitch';
    switchSuite('motion');
    setMotionMode('shield');
  }

  // ==================== 10. QR MODAL CONTROLS ====================
  showQrBtn.addEventListener('click', () => qrModal.classList.add('open'));
  closeQrModalBtn.addEventListener('click', () => qrModal.classList.remove('open'));
  qrModal.addEventListener('click', (e) => {
    if (e.target === qrModal) qrModal.classList.remove('open');
  });

  // Start Rendering Loops
  drawDigitalTwin();
  drawScope();
  updateCandidateHud();
});
