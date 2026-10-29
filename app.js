// ROCKWELL AUTOMATION CIP-SHIELD INDUSTRIAL SIMULATION ENGINE

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
    packetCounter: 0
  };

  // DOM Elements
  const modeTabs = document.querySelectorAll('.mode-tab');
  const triggerAttackBtn = document.getElementById('triggerAttackBtn');
  const resetSimBtn = document.getElementById('resetSimBtn');
  const openModalBtn = document.getElementById('openInterviewHelpBtn');
  const closeModalBtn = document.getElementById('closeModalBtn');
  const explainerModal = document.getElementById('explainerModal');

  // Status & Metrics DOM
  const overallDot = document.getElementById('overallStatusDot');
  const overallText = document.getElementById('overallStatusText');
  const metricLatency = document.getElementById('metricLatency');
  const metricJitter = document.getElementById('metricJitter');
  const metricCpu = document.getElementById('metricCpu');
  const cpuBar = document.getElementById('cpuBar');
  const metricLoss = document.getElementById('metricLoss');
  const syslogConsole = document.getElementById('syslogConsole');

  // Topology DOM
  const nodeShield = document.getElementById('nodeShield');
  const shieldIcon = document.getElementById('shieldIcon');
  const shieldLabel = document.getElementById('shieldLabel');
  const shieldSub = document.getElementById('shieldSub');
  const shieldBadge = document.getElementById('shieldBadge');
  const ledRun = document.getElementById('ledRun');
  const ledFault = document.getElementById('ledFault');
  const ledIo = document.getElementById('ledIo');
  const factoryGraphic = document.querySelector('.factory-graphic');
  const lineSpeed = document.getElementById('lineSpeed');

  const stream1 = document.getElementById('stream1');
  const stream2 = document.getElementById('stream2');
  const stream3 = document.getElementById('stream3');

  // Oscilloscope Canvas
  const canvas = document.getElementById('oscilloscopeCanvas');
  const ctx = canvas.getContext('2d');

  // 1. Syslog Logger Helper
  function logMessage(type, message) {
    const line = document.createElement('div');
    line.className = `log-line ${type}`;
    const timestamp = new Date().toLocaleTimeString();
    line.innerHTML = `[${timestamp}] ${message}`;
    syslogConsole.appendChild(line);
    syslogConsole.scrollTop = syslogConsole.scrollHeight;

    // Keep log buffer bounded
    if (syslogConsole.children.length > 30) {
      syslogConsole.removeChild(syslogConsole.children[0]);
    }
  }

  // 2. Mode Switching Logic
  function setMode(newMode) {
    state.mode = newMode;
    state.isUnderAttack = false;
    state.attackQuarantined = false;

    modeTabs.forEach(tab => {
      if (tab.dataset.mode === newMode) {
        tab.classList.add('active');
      } else {
        tab.classList.remove('active');
      }
    });

    if (newMode === 'shield') {
      shieldIcon.textContent = '🛡️';
      shieldLabel.textContent = 'CIP-Shield Proxy';
      shieldSub.textContent = 'eBPF Fast-Path';
      shieldBadge.textContent = 'Active Enclave';
      shieldBadge.style.color = 'var(--cyan-accent)';
      shieldBadge.style.background = '#0E1B2A';
      nodeShield.style.opacity = '1';
      nodeShield.classList.remove('faulted');

      overallDot.className = 'pulse-indicator';
      overallText.textContent = 'SYSTEM NOMINAL (PROTECTED)';

      setFactoryRunning(true);
      logMessage('info', 'Switched to CIP-Shield Architecture: eBPF zero-copy kernel filter active. Micro-crypto enabled.');
    } else if (newMode === 'legacy') {
      shieldIcon.textContent = '⚠️';
      shieldLabel.textContent = 'Direct Bypass';
      shieldSub.textContent = 'No Inspection';
      shieldBadge.textContent = 'Unprotected';
      shieldBadge.style.color = 'var(--rok-red)';
      shieldBadge.style.background = 'rgba(212, 27, 44, 0.15)';
      nodeShield.style.opacity = '0.7';

      overallDot.className = 'pulse-indicator warn';
      overallText.textContent = 'UNENCRYPTED BROWNFIELD';

      setFactoryRunning(true);
      logMessage('warn', 'Switched to Legacy Brownfield: Unencrypted CIP protocol. Susceptible to CVE-2024-6242 slot bypass.');
    } else if (newMode === 'tls') {
      shieldIcon.textContent = '🔐';
      shieldLabel.textContent = 'Standard TLS';
      shieldSub.textContent = 'Heavy Crypto Loop';
      shieldBadge.textContent = 'High Overhead';
      shieldBadge.style.color = 'var(--amber-warning)';
      shieldBadge.style.background = 'rgba(255, 179, 0, 0.15)';
      nodeShield.style.opacity = '1';

      overallDot.className = 'pulse-indicator warn';
      overallText.textContent = 'HIGH JITTER (WATCHDOG BREACH)';

      // TLS triggers watchdog failure automatically
      setTimeout(() => {
        if (state.mode === 'tls') {
          triggerWatchdogHalt();
        }
      }, 1200);

      logMessage('warn', 'Switched to Standard TLS Retrofit: Controller CPU overloaded with TLS 1.3 handshakes.');
    }
    updateMetrics();
  }

  // 3. Factory Physical State Control
  function setFactoryRunning(isRunning) {
    if (isRunning) {
      factoryGraphic.classList.remove('halted');
      ledRun.className = 'led-light green';
      ledFault.className = 'led-light off';
      ledIo.className = 'led-light green';
      lineSpeed.textContent = 'Output: 120 Units/min';
      stopDowntimeTimer();
    } else {
      factoryGraphic.classList.add('halted');
      ledRun.className = 'led-light off';
      ledFault.className = 'led-light red';
      ledIo.className = 'led-light off';
      lineSpeed.textContent = 'Output: 0 Units/min (HALTED)';
      startDowntimeTimer();
    }
  }

  // 4. Financial Downtime Counter
  function startDowntimeTimer() {
    if (state.downtimeTimer) return;
    state.downtimeTimer = setInterval(() => {
      state.downtimeSeconds++;
      // Industrial automotive rate: $260,000 / hour = $72.22 / sec
      const loss = state.downtimeSeconds * 72.22;
      metricLoss.textContent = `$${loss.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }, 1000);
  }

  function stopDowntimeTimer() {
    if (state.downtimeTimer) {
      clearInterval(state.downtimeTimer);
      state.downtimeTimer = null;
    }
  }

  function triggerWatchdogHalt() {
    setFactoryRunning(false);
    overallDot.className = 'pulse-indicator fault';
    overallText.textContent = 'WATCHDOG TRIP (E-STOP)';
    logMessage('error', '[WATCHDOG] Cyclic latency exceeded 5.0ms threshold (measured: 32.4ms). Controller triggered safety E-Stop!');
  }

  function triggerPlcCrash() {
    setFactoryRunning(false);
    overallDot.className = 'pulse-indicator fault';
    overallText.textContent = 'MAJOR FAULT (MNRF)';
    nodeShield.classList.add('faulted');
    logMessage('error', '[CRITICAL] Malformed CIP packet (CVE-2026-9637) penetrated chassis! Memory parsing exception.');
    logMessage('error', '[MNRF] Major Non-Recoverable Fault on ControlLogix 5580! Manual chassis power-cycle required!');
  }

  // 5. Trigger CIP Attack Simulation
  triggerAttackBtn.addEventListener('click', () => {
    state.isUnderAttack = true;
    logMessage('warn', '🚨 INJECTING CIP EXPLOIT PACKET: Forged Service 0x4E with Slot Bypass Payload (CVE-2024-6242)...');

    // Spawn red packet in stream 1
    spawnPacket(stream1, true);

    if (state.mode === 'legacy') {
      setTimeout(() => {
        spawnPacket(stream2, true);
        setTimeout(() => {
          spawnPacket(stream3, true);
          triggerPlcCrash();
        }, 500);
      }, 500);
    } else if (state.mode === 'tls') {
      setTimeout(() => {
        logMessage('warn', '[CIP-SECURITY] Encrypted packet arrived, but cryptographic decryption buffer full.');
        triggerWatchdogHalt();
      }, 600);
    } else if (state.mode === 'shield') {
      setTimeout(() => {
        // Intercept at CIP-Shield
        logMessage('success', '🛡️ [CIP-SHIELD INTERCEPT] eBPF filter caught illegal Service 0x4E payload! Threat quarantined in ring buffer.');
        logMessage('info', '⚡ [SYNTHETIC KEEP-ALIVE] Injecting deterministic safe beacon to ControlLogix backplane (Latency: 0.84ms).');
        logMessage('success', '📡 [SOC DISPATCH] Incident report & threat signature streamed to FactoryTalk DataMosaix.');
        
        // Green packet continues to PLC
        spawnPacket(stream2, false);
        spawnPacket(stream3, false);
      }, 500);
    }
  });

  // Reset Simulation
  resetSimBtn.addEventListener('click', () => {
    state.downtimeSeconds = 0;
    metricLoss.textContent = '$0.00';
    setMode('shield');
    logMessage('info', 'Simulation reset to baseline state.');
  });

  // Modal Handlers
  openModalBtn.addEventListener('click', () => {
    explainerModal.classList.add('active');
  });

  closeModalBtn.addEventListener('click', () => {
    explainerModal.classList.remove('active');
  });

  explainerModal.addEventListener('click', (e) => {
    if (e.target === explainerModal) {
      explainerModal.classList.remove('active');
    }
  });

  // Mode Tab Click Events
  modeTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      setMode(tab.dataset.mode);
    });
  });

  // Packet Animation Generator
  function spawnPacket(container, isAttack) {
    const packet = document.createElement('div');
    packet.className = `cip-packet ${isAttack ? 'attack' : ''}`;
    container.appendChild(packet);
    setTimeout(() => {
      if (packet.parentNode) {
        packet.parentNode.removeChild(packet);
      }
    }, 1200);
  }

  // Periodic Normal Packet Stream
  setInterval(() => {
    if (state.mode === 'shield' || (!state.isUnderAttack && state.mode === 'legacy')) {
      spawnPacket(stream1, false);
      setTimeout(() => spawnPacket(stream2, false), 400);
      setTimeout(() => spawnPacket(stream3, false), 800);
    }
  }, 1400);

  // 6. Real-Time Telemetry Simulation Loop
  function updateMetrics() {
    let targetLatency = 0.84;
    let targetJitter = 0.04;
    let targetCpu = 24;

    if (state.mode === 'shield') {
      targetLatency = 0.82 + (Math.random() * 0.06);
      targetJitter = 0.03 + (Math.random() * 0.02);
      targetCpu = 23 + Math.floor(Math.random() * 4);
    } else if (state.mode === 'legacy') {
      if (factoryGraphic.classList.contains('halted')) {
        targetLatency = 0.00;
        targetJitter = 0.00;
        targetCpu = 99;
      } else {
        targetLatency = 0.81 + (Math.random() * 0.08);
        targetJitter = 0.04 + (Math.random() * 0.03);
        targetCpu = 22 + Math.floor(Math.random() * 5);
      }
    } else if (state.mode === 'tls') {
      targetLatency = 26.0 + (Math.random() * 12.0);
      targetJitter = 12.0 + (Math.random() * 6.0);
      targetCpu = 92 + Math.floor(Math.random() * 6);
    }

    state.currentLatency = targetLatency;
    state.currentJitter = targetJitter;
    state.currentCpu = targetCpu;

    // Update DOM Metrics
    metricLatency.innerHTML = `${targetLatency.toFixed(2)} <span class="unit">ms</span>`;
    metricJitter.innerHTML = `&plusmn;${targetJitter.toFixed(2)} <span class="unit">ms</span>`;
    metricCpu.innerHTML = `${targetCpu} <span class="unit">%</span>`;
    cpuBar.style.width = `${Math.min(100, targetCpu)}%`;

    if (targetCpu > 80) {
      cpuBar.style.background = 'var(--rok-red)';
      metricCpu.className = 'metric-val red';
    } else {
      cpuBar.style.background = 'var(--cyan-accent)';
      metricCpu.className = 'metric-val';
    }

    if (targetLatency > 5.0) {
      metricLatency.className = 'metric-val red';
    } else {
      metricLatency.className = 'metric-val green';
    }

    // Push to oscilloscope buffer
    state.latencyHistory.push(targetLatency);
    state.latencyHistory.shift();
  }

  // 7. Oscilloscope Canvas Renderer
  function drawOscilloscope() {
    const width = canvas.width;
    const height = canvas.height;

    // Clear background
    ctx.fillStyle = '#080C14';
    ctx.fillRect(0, 0, width, height);

    // Draw Grid Lines
    ctx.strokeStyle = '#1E293B';
    ctx.lineWidth = 1;
    for (let x = 0; x < width; x += 50) {
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

    // Draw 5.0ms Watchdog Trip Threshold Line (Red Dashed)
    const watchdogY = height - (5.0 / 40.0 * (height - 30)) - 15;
    ctx.strokeStyle = '#D41B2C';
    ctx.setLineDash([6, 4]);
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(0, watchdogY);
    ctx.lineTo(width, watchdogY);
    ctx.stroke();
    ctx.setLineDash([]); // Reset dash

    // Watchdog Text Label
    ctx.fillStyle = '#D41B2C';
    ctx.font = '9px "JetBrains Mono", monospace';
    ctx.fillText('WATCHDOG LIMIT (5.0 ms)', 10, watchdogY - 4);

    // Draw 1.0ms RPI Target Line (Cyan Dotted)
    const targetY = height - (1.0 / 40.0 * (height - 30)) - 15;
    ctx.strokeStyle = '#00F0FF';
    ctx.setLineDash([2, 4]);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, targetY);
    ctx.lineTo(width, targetY);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = '#00F0FF';
    ctx.fillText('TARGET RPI (1.0 ms)', width - 130, targetY - 4);

    // Draw Live Latency Trace (Green Curve)
    ctx.strokeStyle = state.currentLatency > 5.0 ? '#D41B2C' : '#00E676';
    ctx.lineWidth = 2;
    ctx.beginPath();

    const step = width / (state.latencyHistory.length - 1);
    for (let i = 0; i < state.latencyHistory.length; i++) {
      const val = state.latencyHistory[i];
      // Scale val (0ms to 40ms) to canvas height
      const y = height - (Math.min(40, val) / 40.0 * (height - 30)) - 15;
      const x = i * step;
      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }
    ctx.stroke();

    // Draw Current Scan Head Indicator
    const lastX = width - 2;
    const lastY = height - (Math.min(40, state.currentLatency) / 40.0 * (height - 30)) - 15;
    ctx.fillStyle = ctx.strokeStyle;
    ctx.beginPath();
    ctx.arc(lastX, lastY, 4, 0, Math.PI * 2);
    ctx.fill();

    requestAnimationFrame(drawOscilloscope);
  }

  // Start Animation Loops
  setInterval(updateMetrics, 200);
  requestAnimationFrame(drawOscilloscope);
  setMode('shield');
});
