// ==========================================================================
// ROCKWELL AUTOMATION CIP-SHIELD ENTERPRISE SIMULATION ENGINE v2.5
// Designed for Hinjewadi Pune Software Technology Center (STC) Recruitment
// ==========================================================================

document.addEventListener('DOMContentLoaded', () => {
  // Application State
  const state = {
    mode: 'shield', // 'shield' | 'legacy' | 'tls'
    isUnderAttack: false,
    attackQuarantined: false,
    downtimeSeconds: 0,
    downtimeTimer: null,
    latencyHistory: new Array(50).fill(0.84),
    currentLatency: 0.84,
    currentJitter: 0.04,
    currentCpu: 24,
    soundEnabled: false,
    audioCtx: null,
    demoInterval: null,
    demoElapsed: 0
  };

  // DOM Elements
  const modeTabs = document.querySelectorAll('.mode-tab');
  const triggerAttackBtn = document.getElementById('triggerAttackBtn');
  const resetSimBtn = document.getElementById('resetSimBtn');
  const openModalBtn = document.getElementById('openInterviewHelpBtn');
  const closeModalBtn = document.getElementById('closeModalBtn');
  const explainerModal = document.getElementById('explainerModal');

  // QR Modal Elements
  const showQrBtn = document.getElementById('showQrBtn');
  const qrModal = document.getElementById('qrModal');
  const closeQrModalBtn = document.getElementById('closeQrModalBtn');

  // Audio Toggle
  const toggleAudioBtn = document.getElementById('toggleAudioBtn');
  const audioIcon = document.getElementById('audioIcon');

  // Architecture Banner & Guided Demo DOM
  const archBanner = document.getElementById('archBanner');
  const bannerIcon = document.getElementById('bannerIcon');
  const bannerTitle = document.getElementById('bannerTitle');
  const bannerDesc = document.getElementById('bannerDesc');
  const bannerPill = document.getElementById('bannerPill');
  const guidedDemoBtn = document.getElementById('guidedDemoBtn');
  const demoIcon = document.getElementById('demoIcon');
  const demoText = document.getElementById('demoText');

  // Presentation HUD DOM
  const presentationHud = document.getElementById('presentationHud');
  const hudPhaseTag = document.getElementById('hudPhaseTag');
  const hudTimer = document.getElementById('hudTimer');
  const hudProgressFill = document.getElementById('hudProgressFill');
  const hudPitch = document.getElementById('hudPitch');

  // Status & Metrics DOM
  const overallDot = document.getElementById('overallStatusDot');
  const overallText = document.getElementById('overallStatusText');
  const metricLatency = document.getElementById('metricLatency');
  const metricJitter = document.getElementById('metricJitter');
  const metricCpu = document.getElementById('metricCpu');
  const cpuBar = document.getElementById('cpuBar');
  const metricLoss = document.getElementById('metricLoss');
  const syslogConsole = document.getElementById('syslogConsole');

  // Metric status dots
  const dotLatency = document.getElementById('dotLatency');
  const dotJitter = document.getElementById('dotJitter');
  const dotCpu = document.getElementById('dotCpu');
  const dotLoss = document.getElementById('dotLoss');

  // Packet Inspector DOM
  const frameStatus = document.getElementById('frameStatus');
  const serviceByte = document.getElementById('serviceByte');
  const slotByte = document.getElementById('slotByte');
  const frameDesc = document.getElementById('frameDesc');
  const byteOffsetPill = document.getElementById('byteOffsetPill');
  const byteMeaning = document.getElementById('byteMeaning');
  const hexBytes = document.querySelectorAll('.hex-grid .byte');

  // Topology DOM
  const nodeShield = document.getElementById('nodeShield');
  const shieldIcon = document.getElementById('shieldIcon');
  const shieldLabel = document.getElementById('shieldLabel');
  const shieldSub = document.getElementById('shieldSub');
  const shieldBadge = document.getElementById('shieldBadge');
  const enclaveLed = document.getElementById('enclaveLed');
  const ledRun = document.getElementById('ledRun');
  const ledFault = document.getElementById('ledFault');
  const ledIo = document.getElementById('ledIo');
  const ledMotion = document.getElementById('ledMotion');
  const factoryWorkstation = document.getElementById('factoryWorkstation');
  const strobeBeacon = document.getElementById('strobeBeacon');
  const lineSpeed = document.getElementById('lineSpeed');

  const stream1 = document.getElementById('stream1');
  const stream2 = document.getElementById('stream2');
  const stream3 = document.getElementById('stream3');

  // Oscilloscope Canvas
  const canvas = document.getElementById('oscilloscopeCanvas');
  const ctx = canvas.getContext('2d');

  // ==================== 1. WEB AUDIO API SYNTHESIZER ====================
  function initAudio() {
    if (!state.audioCtx) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      state.audioCtx = new AudioContext();
    }
  }

  function playTone(freq, type, duration, vol = 0.1) {
    if (!state.soundEnabled || !state.audioCtx) return;
    try {
      const osc = state.audioCtx.createOscillator();
      const gain = state.audioCtx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, state.audioCtx.currentTime);
      gain.gain.setValueAtTime(vol, state.audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, state.audioCtx.currentTime + duration);
      osc.connect(gain);
      gain.connect(state.audioCtx.destination);
      osc.start();
      osc.stop(state.audioCtx.currentTime + duration);
    } catch (e) {
      // Audio autoplay policy fallback
    }
  }

  function playClick() { playTone(900, 'triangle', 0.04, 0.05); }
  function playAlarm() { playTone(440, 'sawtooth', 0.18, 0.15); }
  function playSuccess() { playTone(600, 'sine', 0.1, 0.08); }

  toggleAudioBtn.addEventListener('click', () => {
    initAudio();
    state.soundEnabled = !state.soundEnabled;
    if (state.soundEnabled) {
      audioIcon.textContent = '🔊';
      toggleAudioBtn.classList.add('highlight');
      playTone(520, 'sine', 0.1, 0.1);
    } else {
      audioIcon.textContent = '🔇';
      toggleAudioBtn.classList.remove('highlight');
    }
  });

  // ==================== 2. INTERACTIVE CIP HEX INSPECTOR ====================
  hexBytes.forEach(byteEl => {
    byteEl.addEventListener('mouseenter', handleByteInspect);
    byteEl.addEventListener('click', handleByteInspect);
  });

  function handleByteInspect(e) {
    const el = e.currentTarget;
    const offset = el.dataset.offset || '0x00';
    const field = el.dataset.field || 'CIP Encapsulation Field';
    byteOffsetPill.textContent = `OFFSET ${offset}`;
    byteMeaning.innerHTML = `<strong>Active Field:</strong> <code>${field}</code>`;
    playClick();
  }

  // ==================== 3. SYSLOG DIAGNOSTIC TERMINAL ====================
  function logMessage(level, text) {
    const time = new Date().toLocaleTimeString('en-US', { hour12: false });
    const line = document.createElement('div');
    line.className = `log-line ${level}`;
    line.textContent = `[${time}] ${text}`;
    syslogConsole.appendChild(line);
    syslogConsole.scrollTop = syslogConsole.scrollHeight;

    while (syslogConsole.children.length > 30) {
      syslogConsole.removeChild(syslogConsole.firstChild);
    }
  }

  // ==================== 4. ARCHITECTURE MODE SWITCHER ====================
  function setMode(newMode) {
    state.mode = newMode;
    state.isUnderAttack = false;
    state.attackQuarantined = false;

    modeTabs.forEach(tab => {
      tab.classList.toggle('active', tab.dataset.mode === newMode);
    });

    if (newMode === 'shield') {
      shieldIcon.textContent = '🛡️';
      shieldLabel.textContent = 'CIP-Shield Proxy';
      shieldSub.textContent = 'eBPF Fast-Path';
      shieldBadge.textContent = 'Active Enclave';
      enclaveLed.style.background = 'var(--cyan-accent)';
      nodeShield.style.opacity = '1';
      nodeShield.classList.remove('faulted');

      archBanner.className = 'architecture-banner green';
      bannerIcon.textContent = '🛡️';
      bannerTitle.textContent = 'PROPOSED: CIP-Shield Hardware Enclave Active';
      bannerPill.textContent = 'LATENCY ≤ 13.82µs VERIFIED';
      bannerPill.style.color = 'var(--cyan-accent)';
      bannerDesc.innerHTML = 'Linux eBPF kernel fast-path offloads cryptography from the ControlLogix CPU. Packets verified at driver layer in &le; 13.82&mu;s. Hard determinism maintained with zero packet jitter.';

      frameStatus.textContent = 'STATUS: 0x0000 (VALIDATED)';
      frameStatus.style.color = 'var(--green-nominal)';
      serviceByte.textContent = '4E';
      serviceByte.className = 'byte highlight';
      slotByte.textContent = '02';
      slotByte.className = 'byte';
      frameDesc.innerHTML = '<strong>Active Encapsulation:</strong> SendRRData (0x006F) | <strong>Service:</strong> Forward Open (0x4E) | <strong>Target Slot:</strong> 0x02 | <strong>Cryptographic Tag:</strong> Poly1305 Valid';

      overallDot.className = 'pulse-indicator';
      overallText.textContent = 'SYSTEM NOMINAL (PROTECTED)';

      setFactoryRunning(true);
      logMessage('info', 'Switched to CIP-Shield Architecture: eBPF zero-copy kernel filter active. Micro-crypto enabled.');
      playSuccess();

    } else if (newMode === 'legacy') {
      shieldIcon.textContent = '⚠️';
      shieldLabel.textContent = 'Direct Passthrough';
      shieldSub.textContent = 'No Encryption';
      shieldBadge.textContent = 'Unprotected';
      enclaveLed.style.background = '#64748B';
      nodeShield.style.opacity = '0.75';
      nodeShield.classList.remove('faulted');

      archBanner.className = 'architecture-banner red';
      bannerIcon.textContent = '⚠️';
      bannerTitle.textContent = 'VULNERABLE: Legacy Brownfield ControlLogix';
      bannerPill.textContent = 'CVE-2024-6242 EXPOSED';
      bannerPill.style.color = '#FF5252';
      bannerDesc.innerHTML = 'ControlLogix communicates in unencrypted plaintext over Port 44818. Vulnerable to CVE-2024-6242 slot bypass and CVE-2026-9637 DoS. Click "Infiltrate CIP Exploit" to test.';

      frameStatus.textContent = 'STATUS: 0x0000 (CLEARTEXT CIP)';
      frameStatus.style.color = '#F59E0B';
      serviceByte.textContent = '4E';
      serviceByte.className = 'byte highlight';
      slotByte.textContent = '02';
      slotByte.className = 'byte';
      frameDesc.innerHTML = '<strong>Active Encapsulation:</strong> SendRRData (0x006F) | <strong>Service:</strong> Forward Open (0x4E) | <strong>Target Slot:</strong> 0x02 | <strong>Cryptographic Tag:</strong> NONE (Plaintext)';

      overallDot.className = 'pulse-indicator warn';
      overallText.textContent = 'SYSTEM VULNERABLE (UNENCRYPTED)';

      setFactoryRunning(true);
      logMessage('warn', 'Switched to Legacy Brownfield Mode: CIP packets traversing Port 44818 unencrypted.');
      playClick();

    } else if (newMode === 'tls') {
      shieldIcon.textContent = '🔐';
      shieldLabel.textContent = 'Standard TLS';
      shieldSub.textContent = 'Heavy Crypto Loop';
      shieldBadge.textContent = 'High Overhead';
      enclaveLed.style.background = 'var(--amber-warning)';
      nodeShield.style.opacity = '1';

      archBanner.className = 'architecture-banner amber';
      bannerIcon.textContent = '🛑';
      bannerTitle.textContent = 'NAIVE FIX: Standard TLS Overloads PLC & Halts Assembly Line';
      bannerPill.textContent = 'WATCHDOG TRIP (32.2ms)';
      bannerPill.style.color = 'var(--amber-warning)';
      bannerDesc.innerHTML = 'Standard TLS 1.3 crypto handshakes spike PLC CPU to 93%, pushing cyclic latency to 32.2ms. This breaches the 5.0ms Safety Watchdog threshold, triggering an automatic E-STOP halt ($4,333/min downtime). Click "CIP-Shield" to restore production!';

      frameStatus.textContent = 'STATUS: 0x001F (BUFFER FULL / JITTER LAG)';
      frameStatus.style.color = 'var(--rok-red)';
      serviceByte.textContent = '16';
      serviceByte.className = 'byte attack-byte';
      slotByte.textContent = '02';
      slotByte.className = 'byte';
      frameDesc.innerHTML = '<strong>Active Encapsulation:</strong> TLS Handshake (0x16) | <strong>Record:</strong> DTLS 1.3 | <strong>Crypto CPU:</strong> 94% Overload | <strong>Latency Drift:</strong> +32.4ms';

      overallDot.className = 'pulse-indicator warn';
      overallText.textContent = 'HIGH JITTER (WATCHDOG BREACH)';

      setTimeout(() => {
        if (state.mode === 'tls') {
          triggerWatchdogHalt();
        }
      }, 1000);

      logMessage('warn', 'Switched to Standard TLS Retrofit: Controller CPU overloaded with asymmetric TLS 1.3 handshakes.');
      playAlarm();
    }
    updateMetrics();
  }

  // ==================== 5. FACTORY PHYSICAL STATE CONTROL ====================
  function setFactoryRunning(isRunning) {
    if (isRunning) {
      factoryWorkstation.classList.remove('halted');
      strobeBeacon.classList.remove('active');
      ledRun.className = 'slot-led green';
      ledFault.className = 'slot-led';
      ledIo.className = 'slot-led green';
      ledMotion.className = 'slot-led green';
      lineSpeed.textContent = 'Output: 450 Units/min';
      lineSpeed.style.color = 'var(--text-muted)';
      stopDowntimeCounter();
    } else {
      factoryWorkstation.classList.add('halted');
      strobeBeacon.classList.add('active');
      ledRun.className = 'slot-led';
      ledFault.className = 'slot-led red';
      ledIo.className = 'slot-led';
      ledMotion.className = 'slot-led';
      lineSpeed.textContent = 'Output: 0 Units/min (HALTED)';
      lineSpeed.style.color = '#FF5252';
      startDowntimeCounter();
      playAlarm();
    }
  }

  function triggerWatchdogHalt() {
    setFactoryRunning(false);
    overallDot.className = 'pulse-indicator fault';
    overallText.textContent = 'WATCHDOG TRIP (E-STOP)';
    logMessage('error', '[WATCHDOG TRIP] Cyclic packet jitter exceeded 5.0ms threshold (measured: 32.22ms). E-Stop triggered to prevent machine damage!');
  }

  // ==================== 6. DOWNTIME LOSS COUNTER ($4,333 / min) ====================
  function startDowntimeCounter() {
    if (!state.downtimeTimer) {
      state.downtimeTimer = setInterval(() => {
        state.downtimeSeconds += 0.2;
        const lossDollars = (state.downtimeSeconds * (4333.33 / 60.0)).toFixed(2);
        metricLoss.textContent = `$${Number(lossDollars).toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
      }, 200);
    }
  }

  function stopDowntimeCounter() {
    if (state.downtimeTimer) {
      clearInterval(state.downtimeTimer);
      state.downtimeTimer = null;
    }
    state.downtimeSeconds = 0;
    metricLoss.textContent = '$0.00';
  }

  // ==================== 7. ATTACK SIMULATION ENGINE (CVE-2024-6242) ====================
  function triggerAttack() {
    if (state.isUnderAttack) return;
    state.isUnderAttack = true;

    logMessage('error', 'ALERT: Malicious CIP Encapsulation Frame detected on Port 44818!');
    logMessage('error', 'PAYLOAD: CVE-2024-6242 Slot Bypass attempt targeting Backplane Slot 0x02.');
    playAlarm();

    createPacket(stream1, true);

    if (state.mode === 'legacy') {
      setTimeout(() => {
        createPacket(stream2, true);
        nodeShield.classList.add('faulted');
        frameStatus.textContent = 'STATUS: 0x0004 (UNAUTHORIZED SETPOINT OVERWRITE)';
        frameStatus.style.color = 'var(--rok-red)';
        serviceByte.textContent = '4D';
        serviceByte.className = 'byte attack-byte';
        slotByte.textContent = '02';
        slotByte.className = 'byte attack-byte';
        frameDesc.innerHTML = '<strong>ATTACK SUCCESSFUL:</strong> Attacker forged CIP payload to write arbitrary motor velocity to Slot 0x02. ControlLogix hijacked.';
      }, 600);

      setTimeout(() => {
        createPacket(stream3, true);
        setFactoryRunning(false);
        overallDot.className = 'pulse-indicator fault';
        overallText.textContent = 'PLC COMPROMISED (CVE-2024-6242)';
        logMessage('error', 'CRITICAL FAULT: Conveyor servo velocity tag overwritten! Safety trip triggered.');
      }, 1200);

    } else if (state.mode === 'shield') {
      setTimeout(() => {
        nodeShield.classList.add('faulted');
        setTimeout(() => nodeShield.classList.remove('faulted'), 500);
        logMessage('success', '[CIP-SHIELD eBPF] XDP kernel hook dropped forged packet in 13.82µs. Attacker isolated.');
        logMessage('info', '[SYNTHESIS] Feeding valid synthetic status beacon to ControlLogix backplane. Determinism preserved.');
        createPacket(stream2, false);
      }, 600);

      setTimeout(() => {
        createPacket(stream3, false);
        frameStatus.textContent = 'STATUS: 0x0000 (ATTACK QUARANTINED - JITTER: 0.04ms)';
        frameStatus.style.color = 'var(--green-nominal)';
        frameDesc.innerHTML = '<strong>CIP-Shield Action:</strong> Cryptographic Poly1305 MAC tag failure detected at driver ring. Frame dropped in 13.82&mu;s. Factory operational.';
        state.isUnderAttack = false;
        playSuccess();
      }, 1200);

    } else if (state.mode === 'tls') {
      setTimeout(() => {
        logMessage('warn', '[TLS PROXY] Cryptographic signature check failed after 34ms processing delay.');
        triggerWatchdogHalt();
        state.isUnderAttack = false;
      }, 800);
    }
  }

  function createPacket(container, isAttack) {
    const packet = document.createElement('div');
    packet.className = `cip-packet ${isAttack ? 'attack' : ''}`;
    container.appendChild(packet);
    setTimeout(() => {
      if (packet.parentNode) {
        packet.parentNode.removeChild(packet);
      }
    }, 1200);
  }

  // ==================== 8. TELEMETRY & METRIC UPDATE LOOP ====================
  function updateMetrics() {
    let targetLatency = 0.84;
    let targetJitter = 0.04;
    let targetCpu = 24;

    if (state.mode === 'shield') {
      targetLatency = 0.82 + (Math.random() * 0.06);
      targetJitter = 0.03 + (Math.random() * 0.02);
      targetCpu = 22 + Math.floor(Math.random() * 6);
      dotLatency.className = 'metric-status-dot green';
      dotJitter.className = 'metric-status-dot green';
      dotCpu.className = 'metric-status-dot green';
      dotLoss.className = 'metric-status-dot green';

    } else if (state.mode === 'legacy') {
      if (state.isUnderAttack) {
        targetLatency = 1.95 + (Math.random() * 0.5);
        targetJitter = 0.45 + (Math.random() * 0.2);
        targetCpu = 48 + Math.floor(Math.random() * 10);
        dotLatency.className = 'metric-status-dot amber';
        dotJitter.className = 'metric-status-dot amber';
      } else {
        targetLatency = 0.81 + (Math.random() * 0.05);
        targetJitter = 0.03 + (Math.random() * 0.02);
        targetCpu = 20 + Math.floor(Math.random() * 5);
        dotLatency.className = 'metric-status-dot green';
        dotJitter.className = 'metric-status-dot green';
      }
      dotCpu.className = 'metric-status-dot green';
      dotLoss.className = 'metric-status-dot green';

    } else if (state.mode === 'tls') {
      targetLatency = 31.8 + (Math.random() * 2.8);
      targetJitter = 15.5 + (Math.random() * 3.5);
      targetCpu = 92 + Math.floor(Math.random() * 6);
      dotLatency.className = 'metric-status-dot red';
      dotJitter.className = 'metric-status-dot red';
      dotCpu.className = 'metric-status-dot red';
      dotLoss.className = 'metric-status-dot red';
    }

    state.currentLatency = targetLatency;
    state.currentJitter = targetJitter;
    state.currentCpu = targetCpu;

    metricLatency.innerHTML = `${targetLatency.toFixed(2)} <span class="unit">ms</span>`;
    metricJitter.innerHTML = `&plusmn;${targetJitter.toFixed(2)} <span class="unit">ms</span>`;
    metricCpu.innerHTML = `${targetCpu} <span class="unit">%</span>`;
    cpuBar.style.width = `${targetCpu}%`;

    if (targetCpu > 80) {
      cpuBar.style.background = 'var(--rok-red)';
    } else if (targetCpu > 40) {
      cpuBar.style.background = 'var(--amber-warning)';
    } else {
      cpuBar.style.background = 'var(--cyan-accent)';
    }

    // Packet channel animations
    if (state.mode !== 'tls' || !factoryWorkstation.classList.contains('halted')) {
      if (Math.random() > 0.4) {
        createPacket(stream1, false);
      }
      if (Math.random() > 0.4) {
        createPacket(stream2, false);
      }
      if (Math.random() > 0.4) {
        createPacket(stream3, false);
      }
    }

    // Update Oscilloscope buffer
    state.latencyHistory.push(targetLatency);
    state.latencyHistory.shift();
  }

  // ==================== 9. AUTHENTIC DIGITAL OSCILLOSCOPE DRAWING ====================
  function drawOscilloscope() {
    const width = canvas.width;
    const height = canvas.height;

    // Background
    ctx.fillStyle = '#060910';
    ctx.fillRect(0, 0, width, height);

    // Dotted CRT Graticule Grid
    ctx.strokeStyle = '#162235';
    ctx.lineWidth = 1;
    ctx.setLineDash([2, 4]);

    for (let x = 0; x < width; x += 40) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    for (let y = 0; y < height; y += 30) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }
    ctx.setLineDash([]);

    // 5.0ms Watchdog Trip Limit Line (Red Dashed)
    const watchdogY = height - (5.0 / 40.0 * (height - 30)) - 15;
    ctx.strokeStyle = '#EF4444';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([6, 4]);
    ctx.beginPath();
    ctx.moveTo(0, watchdogY);
    ctx.lineTo(width, watchdogY);
    ctx.stroke();

    // 1.0ms RPI Target Line (Cyan Dotted)
    const targetY = height - (1.0 / 40.0 * (height - 30)) - 15;
    ctx.strokeStyle = '#06B6D4';
    ctx.lineWidth = 1;
    ctx.setLineDash([2, 4]);
    ctx.beginPath();
    ctx.moveTo(0, targetY);
    ctx.lineTo(width, targetY);
    ctx.stroke();
    ctx.setLineDash([]);

    // Plot Latency Waveform
    ctx.lineWidth = 2.2;
    if (state.currentLatency > 5.0) {
      ctx.strokeStyle = '#FF5252';
      ctx.shadowColor = 'rgba(255, 82, 82, 0.5)';
      ctx.shadowBlur = 8;
    } else {
      ctx.strokeStyle = '#10B981';
      ctx.shadowColor = 'rgba(16, 185, 129, 0.5)';
      ctx.shadowBlur = 6;
    }

    ctx.beginPath();
    const step = width / (state.latencyHistory.length - 1);

    for (let i = 0; i < state.latencyHistory.length; i++) {
      const lat = Math.min(40, state.latencyHistory[i]);
      const x = i * step;
      const y = height - (lat / 40.0 * (height - 30)) - 15;
      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }
    ctx.stroke();
    ctx.shadowBlur = 0; // Reset shadow

    // Glowing Lead Playhead Dot
    const lastX = width - 2;
    const lastY = height - (Math.min(40, state.currentLatency) / 40.0 * (height - 30)) - 15;
    ctx.fillStyle = ctx.strokeStyle;
    ctx.beginPath();
    ctx.arc(lastX, lastY, 4, 0, Math.PI * 2);
    ctx.fill();

    requestAnimationFrame(drawOscilloscope);
  }

  // ==================== 10. 30-SECOND GUIDED PRESENTATION MODE ====================
  function stopGuidedDemo() {
    if (state.demoInterval) {
      clearInterval(state.demoInterval);
      state.demoInterval = null;
    }
    guidedDemoBtn.classList.remove('running');
    demoIcon.textContent = '▶';
    demoText.textContent = '30s Auto Demo';
    presentationHud.style.display = 'none';
    state.demoElapsed = 0;
  }

  function startGuidedDemo() {
    if (state.demoInterval) {
      stopGuidedDemo();
      return;
    }

    initAudio();
    guidedDemoBtn.classList.add('running');
    demoIcon.textContent = '⏹';
    demoText.textContent = 'Stop Demo';
    presentationHud.style.display = 'flex';
    state.demoElapsed = 0;

    logMessage('info', '=== [DEMO STARTED] 30-Second Guided Candidate Presentation Mode ===');
    setMode('legacy');
    hudPhaseTag.textContent = 'PHASE 1 / 3: LEGACY BROWNFIELD BASELINE';
    hudPitch.textContent = "\"Sir/Ma'am, let us observe the legacy ControlLogix brownfield environment running unencrypted on Port 44818...\"";
    const totalSeconds = 25;

    state.demoInterval = setInterval(() => {
      state.demoElapsed += 1;
      const progressPct = Math.min(100, (state.demoElapsed / totalSeconds) * 100);
      hudProgressFill.style.width = `${progressPct}%`;
      const rem = Math.max(0, totalSeconds - state.demoElapsed);
      hudTimer.textContent = `00:${rem < 10 ? '0' : ''}${rem}`;

      // Sequence timeline
      if (state.demoElapsed === 4) {
        hudPhaseTag.textContent = 'PHASE 1 / 3: CYBER EXPLOIT INFILTRATION';
        hudPitch.textContent = '"An attacker injects CVE-2024-6242 slot bypass over Port 44818, hijacking actuator setpoints and faulting the line..."';
        triggerAttack();
      } else if (state.demoElapsed === 9) {
        hudPhaseTag.textContent = 'PHASE 2 / 3: NAIVE TLS RETROFIT FAILS';
        hudPitch.textContent = '"Now we observe the Naive Fix: adding heavy TLS 1.3 encryption directly to the PLC CPU spikes latency to 32ms..."';
        setMode('tls');
      } else if (state.demoElapsed === 13) {
        hudPitch.textContent = '"Because latency breaches 5.0ms, the Safety Watchdog trips! The plant freezes, losing $4,333 every minute..."';
      } else if (state.demoElapsed === 17) {
        hudPhaseTag.textContent = 'PHASE 3 / 3: CIP-SHIELD RESTORES PRODUCTION';
        hudPitch.textContent = '"We activate Project CIP-Shield! The eBPF kernel fast-path offloads crypto in 13.82µs, restoring 0.84ms determinism with zero loss!"';
        setMode('shield');
      } else if (state.demoElapsed >= 25) {
        logMessage('success', '=== [DEMO COMPLETE] CIP-Shield successfully demonstrated: Zero-Jitter + Total Security! ===');
        stopGuidedDemo();
      }
    }, 1000);
  }

  guidedDemoBtn.addEventListener('click', startGuidedDemo);

  // Mode tab listeners
  modeTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      if (state.demoInterval) stopGuidedDemo();
      setMode(tab.dataset.mode);
    });
  });

  // Action buttons
  triggerAttackBtn.addEventListener('click', () => {
    if (state.demoInterval) stopGuidedDemo();
    triggerAttack();
  });

  resetSimBtn.addEventListener('click', () => {
    if (state.demoInterval) stopGuidedDemo();
    setMode('shield');
    logMessage('info', 'Simulation reset to baseline nominal CIP-Shield state.');
    playClick();
  });

  // Modal Dialogs
  openModalBtn.addEventListener('click', () => {
    explainerModal.classList.add('active');
    playClick();
  });
  closeModalBtn.addEventListener('click', () => {
    explainerModal.classList.remove('active');
    playClick();
  });
  explainerModal.addEventListener('click', (e) => {
    if (e.target === explainerModal) explainerModal.classList.remove('active');
  });

  showQrBtn.addEventListener('click', () => {
    qrModal.classList.add('active');
    playClick();
  });
  closeQrModalBtn.addEventListener('click', () => {
    qrModal.classList.remove('active');
    playClick();
  });
  qrModal.addEventListener('click', (e) => {
    if (e.target === qrModal) qrModal.classList.remove('active');
  });

  // Initialize
  setInterval(updateMetrics, 200);
  requestAnimationFrame(drawOscilloscope);
  setMode('shield');
});
