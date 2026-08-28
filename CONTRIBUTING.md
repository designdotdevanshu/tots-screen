# Contributing to TOTS Screen

Thank you for your interest in contributing to **TOTS Screen**! This project is part of **The TOTS Project** — dedicated to building straightforward, high-performance, and privacy-respecting tools for everyone.

Please review this guide to understand our branching model, commit conventions, architectural guardrails, and submission checklist.

---

## Code of Conduct

All contributors and participants agree to abide by our [Code of Conduct](CODE_OF_CONDUCT.md). Please report any unacceptable behavior to [design.devanshu@gmail.com](mailto:design.devanshu@gmail.com).

---

## Branching Strategy

We follow a clean, trunk-based feature-branching workflow

| Branch Type       | Format            | Purpose                                     | Example                           |
| :---------------- | :---------------- | :------------------------------------------ | :-------------------------------- |
| **Feature**       | `feat/<name>`     | New capabilities or enhancements            | `feat/webrtc-audio-worklet`       |
| **Bug Fix**       | `fix/<name>`      | Defect and error corrections                | `fix/safari-touch-zoom-glitch`    |
| **Refactor**      | `refactor/<name>` | Code cleanup without functional change      | `refactor/modularize-signaling`   |
| **Performance**   | `perf/<name>`     | Memory, frame rate, or latency optimization | `perf/qr-svg-cache`               |
| **Documentation** | `docs/<name>`     | README, guides, and doc improvements        | `docs/add-troubleshooting-matrix` |
| **Chore**         | `chore/<name>`    | Tooling, dependencies, or metadata          | `chore/update-bun-dependencies`   |

---

## Commit Message Guidelines

We enforce **Conventional Commits**. Every commit must have a single logical purpose and follow the structure

```text
<type>(<scope>): <short description>
```

### Allowed Types

- `feat`: A new feature for users or clients
- `fix`: A bug fix
- `refactor`: Code restructuring without changing behavior
- `perf`: Performance improvement
- `docs`: Documentation changes only
- `chore`: Tooling, configs, dependency bumps
- `test`: Adding or correcting tests

### Examples

```text
feat(viewer): add double-tap zoom reset gesture
fix(signaling): prevent hanging WebSockets on sudden client disconnect
perf(server): cache dynamic QR SVG generation responses
docs(readme): add Linux Wayland screen capture notes
chore(deps): bump ws package to 8.18.0
```

---

## Architectural & Code Guardrails

When contributing code, adhere to these core design invariants

### 1. Zero-Cloud / 100% Local-First Invariant

All signaling and media streams MUST remain strictly local peer-to-peer. Never introduce external telemetry, analytics, third-party tracking scripts, or cloud-hosted relay dependencies.

### 2. Network Interface Filtering

When modifying `src/utils/network.js`, always filter out virtual interfaces (`docker`, `veth`, `tun`, `tap`, `br-`) to guarantee that only reachable primary LAN IP addresses are broadcast to clients and QR codes.

### 3. Graceful PWA & WebRTC Reconnection

Client scripts in `public/sender.html` and `public/receiver.html` must handle abrupt WebSocket disconnections with exponential backoff and silent reconnection attempts without freezing the UI thread.

### 4. Zero External Build Step for Client Pages

The client UI (`public/index.html`, `public/sender.html`, `public/receiver.html`) uses vanilla HTML5, CSS custom properties, and native ES modules. Do not introduce mandatory client bundlers (e.g. Webpack) that prevent the server from running zero-build.

---

## Development Workflow

### 1. Clone the Repository

```bash
git clone https://github.com/designdotdevanshu/tots-screen.git
cd tots-screen
```

### 2. Install Dependencies

```bash
# Using Bun (Recommended)
bun install

# Or using Node / NPM
npm install
```

### 3. Start Development Server

```bash
# Start server with auto-browser launch
bun dev

# Or with custom port
bun bin/screenshare.js -p 3000 --open
```

---

## Pre-Submission Quality Checklist

Before submitting a Pull Request, ensure

- [ ] The CLI starts cleanly: `bun run start -- -h`
- [ ] Both Sender (`/sender`) and Viewer (`/view`) load without console errors
- [ ] Light and Dark theme toggles function properly across all pages
- [ ] No temporary files, `.env` secrets, or editor caches are staged
- [ ] Commits follow Conventional Commits format
- [ ] Changes are tested on at least one desktop browser and one mobile device

---

## Submitting a Pull Request

1. Push your branch to your GitHub fork

   ```bash
   git push origin feat/your-feature-name
   ```

2. Open a Pull Request against the `main` branch.
3. Fill out the provided [Pull Request Template](.github/PULL_REQUEST_TEMPLATE.md).
4. Maintainers will review and merge your changes!
