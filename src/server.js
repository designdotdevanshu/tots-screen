/**
 * Multi-Stream WebRTC Signaling Server & PWA Relay
 */

const http = require("http");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { WebSocketServer } = require("ws");
const QRCode = require("qrcode");
const { getLocalIpAddresses, getPrimaryLanIp, openBrowser } = require("./utils/network");

// Static file mapping and content types
const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".ico": "image/x-icon"
};

/**
 * Creates and starts the Screen Share Relay Server
 * @param {object} options
 * @param {number} [options.port=8080]
 * @param {string} [options.host="0.0.0.0"]
 * @param {boolean} [options.showQr=true]
 * @param {boolean} [options.open=false]
 * @param {string} [options.publicDir]
 * @returns {Promise<{ server: http.Server, wss: WebSocketServer, port: number, host: string, close: Function }>}
 */
function startServer(options = {}) {
  const PORT = options.port !== undefined ? parseInt(options.port, 10) : (process.env.PORT ? parseInt(process.env.PORT, 10) : 8080);
  const HOST = options.host || process.env.HOST || "0.0.0.0";
  const SHOW_QR = options.showQr !== false;
  const OPEN_BROWSER = options.open === true;
  const PUBLIC_DIR = options.publicDir || path.resolve(__dirname, "../public");

  const lanAddresses = getLocalIpAddresses();
  const defaultLanIp = getPrimaryLanIp();

  const server = http.createServer((req, res) => {
    const urlObj = new URL(req.url, `http://${req.headers.host || "localhost"}`);
    let pathname = urlObj.pathname.replace(/\/$/, "") || "/";

    // API endpoint to get server connection details
    if (pathname === "/api/info") {
      res.writeHead(200, {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*"
      });
      res.end(JSON.stringify({
        port: PORT,
        lanIps: lanAddresses.map(a => a.address),
        defaultIp: defaultLanIp,
        defaultViewerUrl: `http://${defaultLanIp}:${PORT}/view`
      }));
      return;
    }

    // API endpoint to generate standard SVG QR codes
    if (pathname === "/api/qr") {
      const text = urlObj.searchParams.get("text") || `http://${defaultLanIp}:${PORT}/view`;
      QRCode.toString(text, { type: "svg", margin: 2, color: { dark: "#0f172a", light: "#f8fafc" } }, (err, svg) => {
        if (err) {
          res.writeHead(500, { "Content-Type": "text/plain" });
          res.end("Error generating QR code");
          return;
        }
        res.writeHead(200, {
          "Content-Type": "image/svg+xml",
          "Cache-Control": "public, max-age=3600"
        });
        res.end(svg);
      });
      return;
    }

    // Route mapping to static assets in PUBLIC_DIR
    let filePath = null;
    if (pathname === "/" || pathname === "/home") {
      filePath = path.join(PUBLIC_DIR, "index.html");
    } else if (pathname === "/sender") {
      filePath = path.join(PUBLIC_DIR, "sender.html");
    } else if (pathname === "/view" || pathname.startsWith("/view/")) {
      filePath = path.join(PUBLIC_DIR, "receiver.html");
    } else if (pathname === "/manifest.json") {
      filePath = path.join(PUBLIC_DIR, "manifest.json");
    } else if (pathname === "/icon.svg" || pathname === "/favicon.ico") {
      filePath = path.join(PUBLIC_DIR, "icon.svg");
    } else {
      // General static file lookup in PUBLIC_DIR
      const safePath = path.normalize(path.join(PUBLIC_DIR, pathname));
      if (safePath.startsWith(PUBLIC_DIR) && fs.existsSync(safePath) && fs.statSync(safePath).isFile()) {
        filePath = safePath;
      }
    }

    if (!filePath || !fs.existsSync(filePath)) {
      res.writeHead(404, { "Content-Type": "text/plain" });
      res.end("404 Not Found");
      return;
    }

    const ext = path.extname(filePath);
    const contentType = MIME_TYPES[ext] || "text/plain";

    fs.readFile(filePath, (err, data) => {
      if (err) {
        res.writeHead(500, { "Content-Type": "text/plain" });
        res.end("Internal Server Error");
        return;
      }
      res.writeHead(200, { "Content-Type": contentType });
      res.end(data);
    });
  });

  // WebSocket Signaling Hub
  const wss = new WebSocketServer({ server, path: "/ws" });

  // State tracking
  const clients = new Map(); // clientId -> { id, ws, role, channels: Set }
  const activeStreams = new Map(); // channelId -> { channelId, label, senderClientId, createdAt }

  function broadcastStreamList() {
    const list = Array.from(activeStreams.values()).map(s => ({
      channelId: s.channelId,
      label: s.label,
      createdAt: s.createdAt
    }));
    const payload = JSON.stringify({ type: "stream-list", streams: list });

    for (const client of clients.values()) {
      if (client.ws.readyState === client.ws.OPEN) {
        client.ws.send(payload);
      }
    }
  }

  wss.on("connection", (ws) => {
    const clientId = "client_" + crypto.randomBytes(4).toString("hex");
    const clientInfo = {
      id: clientId,
      ws,
      role: "viewer",
      channels: new Set()
    };
    clients.set(clientId, clientInfo);

    // Send client their assigned ID and current stream list
    ws.send(JSON.stringify({
      type: "welcome",
      clientId,
      streams: Array.from(activeStreams.values()).map(s => ({
        channelId: s.channelId,
        label: s.label,
        createdAt: s.createdAt
      }))
    }));

    ws.on("message", (raw) => {
      let msg;
      try {
        msg = JSON.parse(raw.toString());
      } catch (e) {
        console.error("Invalid JSON message:", e);
        return;
      }

      switch (msg.type) {
        // 1. Sender registers a new stream channel
        case "register-stream": {
          const { channelId, label } = msg;
          clientInfo.role = "sender";
          clientInfo.channels.add(channelId);
          activeStreams.set(channelId, {
            channelId,
            label: label || `Stream ${channelId}`,
            senderClientId: clientId,
            createdAt: Date.now()
          });
          console.log(`[Stream Registered] Channel: "${channelId}" ("${label}") by ${clientId}`);
          broadcastStreamList();
          break;
        }

        // 2. Sender unregisters a stream channel
        case "unregister-stream": {
          const { channelId } = msg;
          if (activeStreams.has(channelId)) {
            console.log(`[Stream Unregistered] Channel: "${channelId}"`);
            activeStreams.delete(channelId);
            clientInfo.channels.delete(channelId);

            // Notify all viewers on this channel
            for (const c of clients.values()) {
              if (c.channels.has(channelId) && c.ws.readyState === c.ws.OPEN) {
                c.ws.send(JSON.stringify({ type: "stream-ended", channelId }));
              }
            }
            broadcastStreamList();
          }
          break;
        }

        // 3. Viewer requests active stream list
        case "list-streams": {
          ws.send(JSON.stringify({
            type: "stream-list",
            streams: Array.from(activeStreams.values()).map(s => ({
              channelId: s.channelId,
              label: s.label,
              createdAt: s.createdAt
            }))
          }));
          break;
        }

        // 4. Viewer joins a stream channel
        case "join-channel": {
          const { channelId } = msg;
          clientInfo.channels.add(channelId);
          const stream = activeStreams.get(channelId);

          if (stream) {
            const sender = clients.get(stream.senderClientId);
            if (sender && sender.ws.readyState === sender.ws.OPEN) {
              sender.ws.send(JSON.stringify({
                type: "viewer-joined",
                channelId,
                viewerId: clientId
              }));
            }
          }
          break;
        }

        // 5. Viewer leaves a stream channel
        case "leave-channel": {
          const { channelId } = msg;
          clientInfo.channels.delete(channelId);
          const stream = activeStreams.get(channelId);
          if (stream) {
            const sender = clients.get(stream.senderClientId);
            if (sender && sender.ws.readyState === sender.ws.OPEN) {
              sender.ws.send(JSON.stringify({
                type: "viewer-left",
                channelId,
                viewerId: clientId
              }));
            }
          }
          break;
        }

        // 6. WebRTC Offer (Sender -> Specific Viewer)
        case "offer": {
          const { targetClientId, channelId, sdp } = msg;
          const target = clients.get(targetClientId);
          if (target && target.ws.readyState === target.ws.OPEN) {
            target.ws.send(JSON.stringify({
              type: "offer",
              channelId,
              fromClientId: clientId,
              sdp
            }));
          }
          break;
        }

        // 7. WebRTC Answer (Viewer -> Specific Sender)
        case "answer": {
          const { targetClientId, channelId, sdp } = msg;
          const target = clients.get(targetClientId);
          if (target && target.ws.readyState === target.ws.OPEN) {
            target.ws.send(JSON.stringify({
              type: "answer",
              channelId,
              fromClientId: clientId,
              sdp
            }));
          }
          break;
        }

        // 8. WebRTC ICE Candidate (Bi-directional)
        case "candidate": {
          const { targetClientId, channelId, candidate } = msg;
          const target = clients.get(targetClientId);
          if (target && target.ws.readyState === target.ws.OPEN) {
            target.ws.send(JSON.stringify({
              type: "candidate",
              channelId,
              fromClientId: clientId,
              candidate
            }));
          }
          break;
        }
      }
    });

    ws.on("close", () => {
      // If client was a sender of any streams, close them
      for (const [channelId, stream] of activeStreams.entries()) {
        if (stream.senderClientId === clientId) {
          activeStreams.delete(channelId);
          for (const c of clients.values()) {
            if (c.channels.has(channelId) && c.ws.readyState === c.ws.OPEN) {
              c.ws.send(JSON.stringify({ type: "stream-ended", channelId }));
            }
          }
        }
      }

      // If client was a viewer, notify senders
      for (const channelId of clientInfo.channels) {
        const stream = activeStreams.get(channelId);
        if (stream) {
          const sender = clients.get(stream.senderClientId);
          if (sender && sender.ws.readyState === sender.ws.OPEN) {
            sender.ws.send(JSON.stringify({
              type: "viewer-left",
              channelId,
              viewerId: clientId
            }));
          }
        }
      }

      clients.delete(clientId);
      broadcastStreamList();
    });
  });

  return new Promise((resolve, reject) => {
    server.listen(PORT, HOST, (err) => {
      if (err) {
        return reject(err);
      }

      const displayHost = HOST === "0.0.0.0" ? "localhost" : HOST;
      const senderUrl = `http://${displayHost}:${PORT}/`;
      const viewerUrl = `http://${defaultLanIp}:${PORT}/view`;

      // ASCII only: legacy Windows consoles mangle box-drawing characters and emoji.
      const BOLD = "\x1b[1m";
      const DIM = "\x1b[2m";
      const CYAN = "\x1b[36m";
      const GREEN = "\x1b[32m";
      const RESET = "\x1b[0m";
      const label = (text) => `${DIM}${text.padEnd(15)}${RESET}`;

      console.log(`\n  ${BOLD}TOTS Screen${RESET}   ${GREEN}relay online${RESET}`);
      console.log(`  ${DIM}${"-".repeat(53)}${RESET}`);
      console.log(`  ${label("Landing / Hub")}${CYAN}${senderUrl}${RESET}`);
      console.log(`  ${label("Sender Studio")}${CYAN}${senderUrl}sender${RESET}`);
      console.log(`  ${label("Viewer (LAN)")}${GREEN}${viewerUrl}${RESET}`);

      if (lanAddresses.length > 1) {
        console.log(`\n  ${DIM}Also reachable on${RESET}`);
        lanAddresses.slice(1).forEach(a => {
          console.log(`    http://${a.address}:${PORT}/view  ${DIM}(${a.interface})${RESET}`);
        });
      }

      if (SHOW_QR) {
        console.log(`\n  ${DIM}Scan with a phone camera on the same Wi-Fi:${RESET}`);
        QRCode.toString(viewerUrl, { type: "terminal", small: true }, (qrErr, asciiQr) => {
          if (!qrErr && asciiQr) {
            console.log(asciiQr);
          }
          console.log(`  ${DIM}Ctrl+C to stop${RESET}\n`);
        });
      } else {
        console.log(`\n  ${DIM}Ctrl+C to stop${RESET}\n`);
      }

      if (OPEN_BROWSER) {
        openBrowser(senderUrl);
      }

      resolve({
        server,
        wss,
        port: PORT,
        host: HOST,
        senderUrl,
        viewerUrl,
        close: () => {
          return new Promise((res) => {
            wss.close(() => {
              server.close(() => res());
            });
          });
        }
      });
    });
  });
}

module.exports = {
  startServer
};
