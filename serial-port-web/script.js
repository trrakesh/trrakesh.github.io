let port = null;
let reader = null;
let inputDone = null;
let outputDone = null;
let outputStream = null;

const connectBtn = document.getElementById('connect');
const disconnectBtn = document.getElementById('disconnect');
const sendBtn = document.getElementById('sendBtn');
const sendInput = document.getElementById('sendInput');
const logEl = document.getElementById('log');
const baudSelect = document.getElementById('baudSelect');
const baudCustom = document.getElementById('baudCustom');
const statusDot = document.getElementById('statusDot');
const statusText = document.getElementById('statusText');
const statusBadge = document.getElementById('statusBadge');
const clearLogBtn = document.getElementById('clearLog');
const copyLogBtn = document.getElementById('copyLog');
const downloadLogBtn = document.getElementById('downloadLog');
const autoScrollEl = document.getElementById('autoScroll');
const lineEndingEl = document.getElementById('lineEnding');
const reconnectToggle = document.getElementById('reconnectToggle');

function nowTs() { return new Date().toISOString(); }
function setStatus(connected, text) {
  statusBadge.classList.toggle('online', connected);
  statusText.textContent = text || (connected ? 'Connected' : 'Disconnected');
}

function log(msg, type = 'info') {
  const ts = nowTs();
  const line = `[${ts}] ${msg}`;
  logEl.textContent += line + '\n';
  if (autoScrollEl.checked) logEl.scrollTop = logEl.scrollHeight;
}

function getBaud() {
  if (!baudSelect) return 9600;
  if (baudSelect.value === 'custom') return Number(baudCustom.value) || 9600;
  return Number(baudSelect.value) || 9600;
}

function saveSettings() {
  const b = getBaud();
  localStorage.setItem('serial.baud', String(b));
  localStorage.setItem('serial.autoReconnect', reconnectToggle.checked ? '1' : '0');
}

function loadSettings() {
  const b = localStorage.getItem('serial.baud');
  if (b) {
    const options = Array.from(baudSelect.options).map(o => o.value);
    if (options.includes(String(b))) {
      baudSelect.value = String(b);
      document.getElementById('baudCustomWrap').style.display = 'none';
    } else {
      baudSelect.value = 'custom';
      document.getElementById('baudCustomWrap').style.display = '';
      baudCustom.value = String(b);
    }
  }
  const r = localStorage.getItem('serial.autoReconnect');
  reconnectToggle.checked = r === '1';
}

async function connect() {
  if (!('serial' in navigator)) {
    alert('Web Serial API not supported in this browser. Use Chrome or Edge.');
    return;
  }

  try {
    port = await navigator.serial.requestPort();
    await port.open({ baudRate: getBaud() });

    // show device info when available
    try {
      const info = port.getInfo ? port.getInfo() : {};
      if (info.usbVendorId || info.usbProductId) {
        log(`Device: vendor=${info.usbVendorId || 'n/a'} product=${info.usbProductId || 'n/a'}`);
      }
    } catch (e) {}

    const decoder = new TextDecoderStream();
    inputDone = port.readable.pipeTo(decoder.writable);
    reader = decoder.readable.getReader();

    const encoder = new TextEncoderStream();
    outputDone = encoder.readable.pipeTo(port.writable);
    outputStream = encoder.writable;

    setStatus(true, 'Connected');
    connectBtn.disabled = true;
    disconnectBtn.disabled = false;
    sendBtn.disabled = false;

    readLoop();
    saveSettings();
  } catch (err) {
    console.error(err);
    log('Connection error: ' + err);
    setStatus(false, 'Error');
  }
}

async function readLoop() {
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      if (value) log(value);
    }
  } catch (err) {
    console.error(err);
    log('Read error: ' + err);
  } finally {
    if (reader) {
      try { await reader.cancel(); } catch(e){}
      reader.releaseLock();
      reader = null;
    }
    setStatus(false, 'Disconnected');
    connectBtn.disabled = false;
    disconnectBtn.disabled = true;
    sendBtn.disabled = true;

    // attempt auto-reconnect if enabled
    if (reconnectToggle.checked) {
      log('Attempting auto-reconnect...');
      setTimeout(() => connect().catch(()=>{}), 1500);
    }
  }
}

async function disconnect() {
  try {
    if (reader) {
      await reader.cancel();
      await inputDone.catch(() => {});
      reader = null;
      inputDone = null;
    }

    if (outputStream) {
      try {
        const writer = outputStream.getWriter();
        await writer.close();
      } catch(e){}
      await outputDone;
      outputStream = null;
      outputDone = null;
    }

    if (port) {
      await port.close();
      port = null;
    }

    setStatus(false, 'Disconnected');
    connectBtn.disabled = false;
    disconnectBtn.disabled = true;
    sendBtn.disabled = true;

    log('Disconnected');
  } catch (err) {
    console.error(err);
    log('Disconnect error: ' + err);
  }
}

async function send() {
  if (!outputStream) return;
  const writer = outputStream.getWriter();
  try {
    const ending = lineEndingEl.value || '';
    const text = sendInput.value + ending;
    await writer.write(text);
    log('Sent: ' + text.replace(/\r/g,'\\r').replace(/\n/g,'\\n'));
  } catch (err) {
    console.error(err);
    log('Send error: ' + err);
  } finally {
    writer.releaseLock();
  }
}

function clearLog() { logEl.textContent = ''; }
function copyLog() { navigator.clipboard?.writeText(logEl.textContent || ''); }
function downloadLog() {
  const blob = new Blob([logEl.textContent || ''], {type:'text/plain'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = `serial-log-${Date.now()}.txt`;
  document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
}

connectBtn.addEventListener('click', connect);
disconnectBtn.addEventListener('click', disconnect);
sendBtn.addEventListener('click', send);
clearLogBtn.addEventListener('click', clearLog);
copyLogBtn.addEventListener('click', copyLog);
downloadLogBtn.addEventListener('click', downloadLog);
window.addEventListener('beforeunload', async () => { if (port) await disconnect(); });

loadSettings();
  baudSelect.addEventListener('change', () => {
    const wrap = document.getElementById('baudCustomWrap');
    if (baudSelect.value === 'custom') {
      wrap.style.display = '';
      baudCustom.focus();
    } else {
      wrap.style.display = 'none';
      saveSettings();
    }
  });
  baudCustom.addEventListener('change', saveSettings);
  reconnectToggle.addEventListener('change', saveSettings);

