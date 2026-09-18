# <img src="public/icons/logo-icon.png" width="110" valign="middle" alt="Kraken Player logo"> Kraken Player

![License](https://img.shields.io/badge/license-AGPL--3.0-green)
![Platform](https://img.shields.io/badge/platform-Windows%20%7C%20macOS%20%7C%20Linux-blue)
![Version](https://img.shields.io/github/v/release/zodd95x/kraken-player)

**Free and open-source music player — your music, without limits.**

Available in **French, English and Chinese**.

## Features

- 🎵 Online playback and **local music** (with covers and metadata)
- 📻 Podcasts, radio and personal servers (**Subsonic, Jellyfin, Emby**)
- 📝 Advanced lyrics: LRC, TTML, QRC, desktop lyrics and taskbar widget (Windows)
- ⬇️ Downloads with lyrics and cover embedded in the file
- 🎛️ Equalizer, crossfade, Automix mode (beta), volume fade
- 🌙 Light/dark themes, dynamic color from the cover
- 📡 **Last.fm** scrobbling, Anti-AI and Anti-DJ modes
- 🌍 Available in French, English and Chinese

## Download

| Platform | Link |
| -------- | ---- |
| Windows (installer, recommended) | [Download](https://github.com/zodd95x/kraken-player/releases/latest/download/Kraken.Player-3.1.2-x64-setup.exe) |
| Windows (portable, no install) | [Download](https://github.com/zodd95x/kraken-player/releases/latest/download/Kraken.Player-3.1.2-x64-portable.exe) |
| macOS (Apple Silicon) | [Download](https://github.com/zodd95x/kraken-player/releases/download/v3.1.1/Kraken.Player-3.1.1-arm64.dmg) |
| macOS (Intel) | [Download](https://github.com/zodd95x/kraken-player/releases/download/v3.1.1/Kraken.Player-3.1.1-x64.dmg) |
| Linux (AppImage) | [Download](https://github.com/zodd95x/kraken-player/releases/download/v3.1.1/kraken-player-3.1.1-x86_64.AppImage) |
| Linux (Ubuntu/Debian) | [Download](https://github.com/zodd95x/kraken-player/releases/download/v3.1.1/kraken-player-3.1.1-amd64.deb) |

Other versions: see the **[Releases](https://github.com/zodd95x/kraken-player/releases)** page.

> **Windows**: on first launch, SmartScreen may show a warning (unsigned app) — click “More info”, then “Run anyway”.
> **macOS**: the app is not notarized — right-click it and choose “Open” on first launch.
> Automatic updates are not configured yet: just download the new version from the Releases page.

## Development (for developers)

Requirements: Node.js 20+, **pnpm** 10+ (and Rust to rebuild the native modules). The app is built with Electron, Vue 3 and TypeScript.

```bash
pnpm install
pnpm dev
```

## Build

```bash
pnpm build:win    # Windows
pnpm build:mac    # macOS (from a Mac only)
pnpm build:linux  # Linux
```

Quality checks before every contribution:

```bash
pnpm lint
pnpm typecheck
```

## License and attribution

Kraken Player is distributed under the [AGPL-3.0](LICENSE) license. It originates from the open-source [SPlayer](https://github.com/SPlayer-Dev/SPlayer) project; license notices and author attributions are preserved.
