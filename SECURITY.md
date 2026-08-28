# Security Policy

## Security Statement

The **TOTS Project** is committed to providing secure, private, and local-first software. **TOTS Screen** is designed to operate entirely within your local area network (LAN) without cloud servers, user accounts, or external telemetry.

---

## Supported Versions

Only the latest release on the `main` branch receives active security updates and vulnerability patches.

| Version                  | Supported | Notes                |
| :----------------------- | :-------- | :------------------- |
| `2.x.x` (current `main`) | Yes       | Actively supported   |
| `< 2.0.0`                | No        | Legacy / unsupported |

---

## Reporting a Vulnerability

If you discover a security vulnerability or potential privacy leak in TOTS Screen, **do not open a public GitHub issue**.

Please report vulnerabilities privately:

- **Contact**: Devanshu ([design.devanshu@gmail.com](mailto:design.devanshu@gmail.com))
- **Subject**: `[SECURITY] TOTS Screen Vulnerability Report`

### What to include in your report

1. **Description**: Clear explanation of the vulnerability and potential impact.
2. **Reproduction Steps**: Step-by-step instructions or proof-of-concept (PoC) code.
3. **Environment**: Operating System, Node/Bun version, Browser, and Network configuration.
4. **Proposed Fix**: (Optional) Suggested patches or mitigations.

### Response SLA

- **Acknowledgment**: Within **24–48 hours**.
- **Assessment & Triage**: Within **5 business days**.
- **Fix & Disclosure**: Coordinated release and credit in release notes.

---

## Local Security Model & Best Practices

1. **Local Network Scope**: TOTS Screen binds to local interfaces (`0.0.0.0`) by default. Do not expose port `8080` to the public internet without proper authentication or VPN tunneling (e.g. Tailscale).
2. **WebRTC Media Encryption**: All audio and video streams use standard WebRTC DTLS/SRTP encryption in transit.
3. **Zero Secrets In Transit**: The server stores no credentials, tokens, passwords, or recorded media files on disk.
