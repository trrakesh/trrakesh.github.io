# Web Serial Reader


Professional Web Serial Reader

This is a polished demo that uses the browser Web Serial API to connect to serial devices, stream incoming text, and transmit data back to the device.

Features
- Connect / Disconnect with device info when available
- Persistent settings (baud rate, auto-reconnect) via `localStorage`
- Send line-ending options (None / LF / CRLF)
- Log controls: Clear, Copy, Download
- Auto-scroll toggle and timestamped logs

Prerequisites
- Serve over HTTPS or use `localhost` during development.
- Use a Chromium-based browser that supports the Web Serial API (Chrome, Edge).

Run locally

```bash
cd serial-port-web
python3 -m http.server 8000
# open http://localhost:8000 in Chrome or Edge
```

Usage
- Click `Connect` to choose a serial port. The browser will request permission.
- Set a `Baud` rate and enable `Auto-reconnect` if desired.
- Use the input area to type and `Send` to transmit. Choose a line ending if required by the device.
- Use toolbar buttons to clear, copy, or download the log.

Security & Notes
- The Web Serial API requires a user gesture and origin-specific permission.
- Only installable on supported browsers; behavior can vary across platforms.

Next steps (optional)
- Add device filters to `requestPort()` for specific VID/PID
- Support binary protocols and hex view
- Add a small packaged dev server (npm) and linting

