const fileTableBody = document.querySelector('#fileTable tbody');
const addRowButton = document.getElementById('addRow');
const flashButton = document.getElementById('flashButton');
const connectButton = document.getElementById('connectButton');
const disconnectButton = document.getElementById('disconnectButton');
const messageEl = document.getElementById('message');
let rowCount = 0;
let port = null;
let reader = null;
let writer = null;
let transport = null;
let term = null;

function createRow() {
  rowCount += 1;
  const row = document.createElement('tr');

  const offsetCell = document.createElement('td');
  const offsetInput = document.createElement('input');
  offsetInput.type = 'text';
  offsetInput.value = '0x1000';
  offsetInput.className = 'offset-input';
  offsetInput.setAttribute('aria-label', `Flash offset for row ${rowCount}`);
  offsetCell.appendChild(offsetInput);

  const fileCell = document.createElement('td');
  const fileInput = document.createElement('input');
  fileInput.type = 'file';
  fileInput.accept = '.bin,.elf,.hex,.img';
  fileInput.dataset.status = 'empty';
  fileInput.addEventListener('change', handleFileChange);
  fileCell.appendChild(fileInput);

  const statusCell = document.createElement('td');
  const statusLabel = document.createElement('span');
  statusLabel.className = 'status-label loading';
  statusLabel.textContent = 'No file selected';
  statusCell.appendChild(statusLabel);

  const actionCell = document.createElement('td');
  const removeButton = document.createElement('button');
  removeButton.type = 'button';
  removeButton.className = 'secondary-btn';
  removeButton.textContent = 'Remove';
  removeButton.addEventListener('click', () => {
    row.remove();
    updateMessage();
  });
  actionCell.appendChild(removeButton);

  row.append(offsetCell, fileCell, statusCell, actionCell);
  fileTableBody.appendChild(row);
  updateStatus(statusLabel, 'No file selected', 'warning');
}

function updateStatus(label, text, type) {
  label.textContent = text;
  label.className = `status-label ${type}`;
}

function ensureTerminal() {
  if (term) return term;
  if (window.Terminal) {
    term = new Terminal({cursorBlink:true});
    const el = document.getElementById('xterm');
    term.open(el);
    return term;
  }
  return null;
}

function loadFileData(fileInput) {
  if (!fileInput.files || fileInput.files.length === 0) {
    fileInput.data = null;
    return Promise.resolve(null);
  }

  if (fileInput.data) {
    return Promise.resolve(fileInput.data);
  }

  if (fileInput._dataPromise) {
    return fileInput._dataPromise;
  }

  const file = fileInput.files[0];
  fileInput._dataPromise = new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target.result;
      fileInput.data = result instanceof ArrayBuffer ? new Uint8Array(result) : result;
      fileInput._dataPromise = null;
      resolve(fileInput.data);
    };
    reader.onerror = () => {
      fileInput._dataPromise = null;
      reject(reader.error || new Error('Unable to read file'));
    };
    reader.readAsArrayBuffer(file);
  });

  return fileInput._dataPromise;
}

function handleFileChange(event) {
  const fileInput = event.target;
  const row = fileInput.closest('tr');
  const statusLabel = row.querySelector('.status-label');

  updateStatus(statusLabel, 'Loading file...', 'loading');
  loadFileData(fileInput)
    .then((data) => {
      if (!data) {
        updateStatus(statusLabel, 'No file selected', 'warning');
        return;
      }
      const fileName = fileInput.files[0].name;
      updateStatus(statusLabel, `Ready: ${fileName}`, 'ready');
      updateMessage();
    })
    .catch((error) => {
      updateStatus(statusLabel, 'Failed to load file', 'error');
      showMessage(error.message, 'error');
    });
}

function parseOffset(value) {
  const normalized = value.trim().toLowerCase().replace(/^0x/, '');
  if (/^[0-9a-f]+$/.test(normalized)) {
    return parseInt(normalized, 16);
  }
  return Number(value);
}

function validateRows() {
  const rows = Array.from(fileTableBody.querySelectorAll('tr'));
  const offsets = new Set();

  if (rows.length === 0) {
    return 'Add at least one firmware image before preparing flash.';
  }

  for (let index = 0; index < rows.length; index += 1) {
    const row = rows[index];
    const fileInput = row.querySelector('input[type=file]');
    const offsetInput = row.querySelector('input[type=text]');
    const statusLabel = row.querySelector('.status-label');

    const rawOffset = offsetInput.value;
    const offset = parseOffset(rawOffset);
    if (Number.isNaN(offset)) {
      return `Invalid offset on row ${index + 1}. Use decimal or 0x-prefixed hex.`;
    }

    if (offsets.has(offset)) {
      return `Duplicate offset on row ${index + 1}. Each row needs a unique address.`;
    }
    offsets.add(offset);

    if (!fileInput.files || fileInput.files.length === 0) {
      return `No file selected on row ${index + 1}.`;
    }

    if (!fileInput.data && !fileInput._dataPromise) {
      return `File is not loaded yet for row ${index + 1}.`;
    }

    if (statusLabel.classList.contains('error')) {
      return `The selected file on row ${index + 1} could not be loaded.`;
    }
  }

  return 'success';
}

async function waitForPendingFiles() {
  const fileInputs = Array.from(fileTableBody.querySelectorAll('input[type=file]'));
  const loads = fileInputs
    .filter((input) => input.files.length > 0 && input._dataPromise)
    .map((input) => input._dataPromise);
  if (loads.length === 0) {
    return;
  }
  await Promise.all(loads);
}

function showMessage(text, type = 'success') {
  messageEl.textContent = text;
  messageEl.className = `message ${type}`;
  messageEl.classList.remove('hidden');
}

function clearMessage() {
  messageEl.textContent = '';
  messageEl.className = 'message hidden';
}

function updateMessage() {
  const count = fileTableBody.querySelectorAll('tr').length;
  if (count === 0) {
    showMessage('No firmware images configured. Add one or more rows to continue.', 'error');
  } else {
    clearMessage();
  }
}

async function handleFlashAction() {
  clearMessage();
  await waitForPendingFiles();
  const validation = validateRows();
  if (validation !== 'success') {
    showMessage(validation, 'error');
    return;
  }

  const rows = Array.from(fileTableBody.querySelectorAll('tr'));
  const payload = rows.map((row) => {
    const fileInput = row.querySelector('input[type=file]');
    const offsetInput = row.querySelector('input[type=text]');
    return {
      offset: parseOffset(offsetInput.value),
      fileName: fileInput.files[0].name,
      size: fileInput.data ? fileInput.data.length : 0,
    };
  });

  showMessage(`Ready to flash ${payload.length} image(s).`, 'success');
  console.info('Flash payload', payload);

  // Ensure transport is ready
  if (!transport) {
    showMessage('Not connected to device. Please connect first.', 'error');
    return;
  }

  const term = ensureTerminal();
  if (term) term.writeln('\x1b[32mStarting flash sequence...\x1b[0m');

  // Attempt to get esptool-js API from bundle
  const esptool = await getEsptoolAPI();

  // Perform flashing sequentially for now using the esptool API if present, otherwise stubFlasher
  for (let i = 0; i < payload.length; i++) {
    const row = fileTableBody.querySelectorAll('tr')[i];
    const statusLabel = row.querySelector('.status-label');
    updateStatus(statusLabel, 'Flashing...', 'loading');
    try {
      const fileInput = row.querySelector('input[type=file]');
      const data = await loadFileData(fileInput);
      if (esptool && esptool.flashFile) {
        try {
          await esptool.flashFile({ transport, data, offset: payload[i].offset, fileName: payload[i].fileName, onStdout: (s)=>{ if(term) term.write(s); }, onStderr: (s)=>{ if(term) term.write(s); } });
          updateStatus(statusLabel, 'Flashed', 'ready');
          if (term) term.writeln(`Flashed ${fileInput.files[0].name} @ 0x${payload[i].offset.toString(16)}`);
        } catch (e) {
          updateStatus(statusLabel, 'Error', 'error');
          if (term) term.writeln('\x1b[31m' + (e.message || e) + '\x1b[0m');
        }
      } else if (window.stubFlasher && typeof window.stubFlasher.flash === 'function') {
        await window.stubFlasher.flash(transport, data);
        updateStatus(statusLabel, 'Flashed', 'ready');
        if (term) term.writeln(`Flashed ${fileInput.files[0].name} @ 0x${payload[i].offset.toString(16)}`);
      } else {
        updateStatus(statusLabel, 'No flasher available', 'error');
        if (term) term.writeln('\x1b[31mNo flasher implementation found.\x1b[0m');
      }
    } catch (err) {
      updateStatus(statusLabel, 'Error', 'error');
      if (term) term.writeln('\x1b[31m' + (err.message || err) + '\x1b[0m');
    }
  }
  if (term) term.writeln('\x1b[32mFlash sequence complete.\x1b[0m');
}

async function connectSerial() {
  if (!('serial' in navigator)) {
    showMessage('Web Serial API not supported in this browser.', 'error');
    return;
  }
  try {
    port = await navigator.serial.requestPort();
    await port.open({ baudRate: Number(document.getElementById('baudrate').value) || 115200 });
    writer = port.writable.getWriter();
    reader = port.readable.getReader();

    transport = {
      baudrate: port.getInfo ? (port.getInfo().baudRate || Number(document.getElementById('baudrate').value)) : Number(document.getElementById('baudrate').value),
      write: async (data) => {
        if (!writer) throw new Error('Not connected');
        await writer.write(data);
      },
      close: async () => {
        try { if (reader) { await reader.cancel(); reader.releaseLock(); reader = null; } } catch(e){}
        try { if (writer) { writer.releaseLock(); writer = null; } } catch(e){}
        try { if (port) { await port.close(); port = null; } } catch(e){}
      }
    };

    const t = ensureTerminal();
    if (t) t.writeln('\x1b[34mConnected to device\x1b[0m');

    // Start read loop
    (async function readLoop() {
      try {
        while (port && reader) {
          const { value, done } = await reader.read();
          if (done) break;
          if (value && value.length) {
            const text = new TextDecoder().decode(value);
            if (t) t.write(text);
          }
        }
      } catch (e) {
        console.warn('Serial read error', e);
      }
    })();

    connectButton.style.display = 'none';
    disconnectButton.style.display = '';
    clearMessage();
  } catch (err) {
    showMessage('Failed to open serial port: ' + (err.message || err), 'error');
  }
}

async function disconnectSerial() {
  if (transport && transport.close) await transport.close();
  transport = null;
  connectButton.style.display = '';
  disconnectButton.style.display = 'none';
  const t = ensureTerminal();
  if (t) t.writeln('\x1b[33mDisconnected\x1b[0m');
}

async function getEsptoolAPI() {
  // Try common global exports
  if (window.esptool) return window.esptool;
  if (window.esptoolJs) return window.esptoolJs;

  // parcel bundle runtime may expose parcelRequire477f; attempt to introspect known modules
  try {
    const pr = window.parcelRequire477f || window.parcelRequire;
    if (pr) {
      // Try to locate a module that exposes a flash helper. We attempt some likely ids.
      const tryIds = ['3BUdr','iwKFf','bLj8J','6Bwyb'];
      for (const id of tryIds) {
        try {
          const m = pr(id);
          if (m && (m.flash || m.createFlasher || m.default && (m.default.flash || m.default.createFlasher))) {
            return m.default || m;
          }
        } catch (e) {
          // ignore
        }
      }
    }
  } catch (e) {
    // ignore
  }

  // No API found
  return null;
}

function attachInitialRows() {
  createRow();
}

addRowButton.addEventListener('click', () => {
  createRow();
  clearMessage();
});
flashButton.addEventListener('click', handleFlashAction);
connectButton.addEventListener('click', connectSerial);
disconnectButton.addEventListener('click', disconnectSerial);

attachInitialRows();
