#!/usr/bin/env node

/**
 * Screen Share CLI Entry Point
 */

const path = require("path");
const packageJson = require("../package.json");
const { startServer } = require("../src/server");

function printHelp() {
  console.log(`
\x1b[1m\x1b[36mTOTS Screen\x1b[0m v${packageJson.version}
\x1b[90mZero-config, ultra-low latency screen sharing for human beings.\x1b[0m

\x1b[1mUSAGE:\x1b[0m
  $ tots [options]
  $ npx tots-screen [options]

\x1b[1mOPTIONS:\x1b[0m
  \x1b[33m-p, --port <port>\x1b[0m     Port to listen on (default: 8080, or $PORT)
  \x1b[33m-H, --host <host>\x1b[0m     Host to bind on (default: 0.0.0.0, or $HOST)
  \x1b[33m-o, --open\x1b[0m            Automatically open the Sender Hub in your browser
  \x1b[33m--no-qr\x1b[0m               Disable terminal ASCII QR code
  \x1b[33m-v, --version\x1b[0m         Display version number
  \x1b[33m-h, --help\x1b[0m            Show this help message

\x1b[1mEXAMPLES:\x1b[0m
  $ tots
  $ tots --open
  $ tots -p 3000 --open
  $ npx tots-screen --open
`);
}

function parseArgs(argv) {
  const options = {
    port: process.env.PORT ? parseInt(process.env.PORT, 10) : 8080,
    host: process.env.HOST || "0.0.0.0",
    showQr: true,
    open: false
  };

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];

    if (arg === "-h" || arg === "--help") {
      printHelp();
      process.exit(0);
    } else if (arg === "-v" || arg === "--version") {
      console.log(`tots-screen v${packageJson.version}`);
      process.exit(0);
    } else if (arg === "-p" || arg === "--port") {
      const val = argv[++i];
      if (!val || isNaN(val)) {
        console.error("\x1b[31mError:\x1b[0m Missing or invalid port number.");
        process.exit(1);
      }
      options.port = parseInt(val, 10);
    } else if (arg === "-H" || arg === "--host") {
      const val = argv[++i];
      if (!val) {
        console.error("\x1b[31mError:\x1b[0m Missing host value.");
        process.exit(1);
      }
      options.host = val;
    } else if (arg === "-o" || arg === "--open") {
      options.open = true;
    } else if (arg === "--no-qr") {
      options.showQr = false;
    }
  }

  return options;
}

const args = process.argv.slice(2);
const options = parseArgs(args);

startServer(options).catch((err) => {
  console.error("\x1b[31mFailed to start screen share server:\x1b[0m", err.message || err);
  process.exit(1);
});
