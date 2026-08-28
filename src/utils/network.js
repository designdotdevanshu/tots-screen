const os = require("os");
const { exec } = require("child_process");

/**
 * Get all available non-internal IPv4 LAN network interfaces
 * @returns {Array<{ interface: string, address: string }>}
 */
function getLocalIpAddresses() {
  const interfaces = os.networkInterfaces();
  const addresses = [];

  for (const name of Object.keys(interfaces)) {
    for (const net of interfaces[name]) {
      const familyV4 = typeof net.family === "string" ? net.family === "IPv4" : net.family === 4;
      if (familyV4 && !net.internal) {
        addresses.push({ interface: name, address: net.address });
      }
    }
  }

  // Sort physical LAN/Wi-Fi interfaces before virtual/docker interfaces
  addresses.sort((a, b) => {
    const isVirtualA = isVirtualInterface(a.interface);
    const isVirtualB = isVirtualInterface(b.interface);
    if (isVirtualA && !isVirtualB) return 1;
    if (!isVirtualA && isVirtualB) return -1;
    return 0;
  });

  return addresses;
}

/**
 * Check if network interface name belongs to a virtual / container network
 * @param {string} ifaceName
 * @returns {boolean}
 */
function isVirtualInterface(ifaceName) {
  const lower = ifaceName.toLowerCase();
  return (
    lower.startsWith("docker") ||
    lower.startsWith("br-") ||
    lower.startsWith("veth") ||
    lower.startsWith("vboxnet") ||
    lower.startsWith("virbr") ||
    lower.startsWith("tun") ||
    lower.startsWith("tap") ||
    lower.startsWith("tailscale") ||
    lower.startsWith("utun")
  );
}

/**
 * Determine the most suitable primary LAN IP address
 * @returns {string}
 */
function getPrimaryLanIp() {
  const addresses = getLocalIpAddresses();
  if (addresses.length === 0) return "127.0.0.1";
  return addresses[0].address;
}

/**
 * Open a URL in the user's default web browser cross-platform
 * @param {string} url
 */
function openBrowser(url) {
  const platform = process.platform;
  let command = "";

  if (platform === "darwin") {
    command = `open "${url}"`;
  } else if (platform === "win32") {
    command = `start "" "${url}"`;
  } else {
    // Linux / BSD / other POSIX
    command = `xdg-open "${url}" > /dev/null 2>&1 || sensible-browser "${url}" > /dev/null 2>&1 || x-www-browser "${url}" > /dev/null 2>&1`;
  }

  exec(command, (err) => {
    if (err) {
      // Non-fatal if browser cannot be launched in headless / terminal-only environments
    }
  });
}

module.exports = {
  getLocalIpAddresses,
  getPrimaryLanIp,
  isVirtualInterface,
  openBrowser
};
