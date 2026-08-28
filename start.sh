#!/usr/bin/env bash

# ==============================================================================
# TOTS Screen — 1-Click Launcher (macOS & Linux)
# Zero-config screen sharing
# ==============================================================================

set -e

# Change directory to project root (where this script resides)
cd "$(dirname "$0")"

# Colors for terminal output
BOLD='\033[1m'
CYAN='\033[0;36m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
DIM='\033[2m'
NC='\033[0m' # No Color

echo -e "${BOLD}TOTS Screen${NC} - 1-Click Launcher"
echo -e "${DIM}-------------------------------------------------------${NC}"

# Detect available JavaScript runtime
RUNTIME=""
RUN_CMD=""

if command -v bun &> /dev/null; then
  RUNTIME="bun"
  RUN_CMD="bun"
elif command -v node &> /dev/null; then
  RUNTIME="node"
  RUN_CMD="node"
fi

if [ -z "$RUNTIME" ]; then
  echo -e "${RED}[ERROR]${NC} Neither Node.js nor Bun was found on your system."
  echo -e "To run Screen Share Hub, please install one of the following:"
  echo -e "  - Bun (Recommended, fast & zero config): ${CYAN}curl -fsSL https://bun.sh/install | bash${NC}"
  echo -e "  - Node.js: Download from ${CYAN}https://nodejs.org${NC}"
  echo ""
  read -p "Press Enter to exit..."
  exit 1
fi

echo -e "${GREEN}[OK]${NC} Detected runtime: $RUNTIME"

# Check if node_modules exists, install if missing
if [ ! -d "node_modules" ]; then
  echo -e "${YELLOW}[INFO]${NC} First time launch: installing dependencies..."
  if [ "$RUNTIME" = "bun" ]; then
    bun install
  else
    npm install
  fi
  echo -e "${GREEN}[OK]${NC} Dependencies installed."
fi

echo -e "${DIM}Starting Screen Share Hub and opening your browser...${NC}"
echo ""

# Launch server with --open flag
$RUN_CMD bin/screenshare.js --open "$@"
