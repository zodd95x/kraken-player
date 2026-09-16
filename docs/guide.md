# User Guide

This guide explains how to install and use Kraken Player, and how to set up a local dev environment.

## 📦 Installation

### Desktop download

Get the installer for your system from the **[Releases](https://github.com/zodd95x/kraken-player/releases)** page:

| System  | Package format                          |
| ------- | --------------------------------------- |
| Windows | `.exe` (installer) / `-portable.exe`    |
| macOS   | `.dmg`                                  |
| Linux   | `.AppImage` / `.deb` / `.rpm` / ...     |

### Docker deployment (web version only)

#### Build locally

> Building from the latest code locally is recommended — online images may be outdated.

```bash
# Build the image
docker build -t kraken-player .

# Run the container
docker run -d --name kraken-player -p 25884:25884 kraken-player

# Or with Docker Compose
docker-compose up -d
```

Once started, open `http://localhost:25884`

### Vercel deployment

1. First deploy [NeteaseCloudMusicApi](https://github.com/neteasecloudmusicapienhanced/api-enhanced) and get its API address
2. Fork this repo to your GitHub account
3. Copy `/.env.example` to `/.env` and configure it:
   ```
   VITE_API_URL = "https://your-api-url.com"
   ```
4. Import the project in Vercel
5. Set `Output Directory` to `out/renderer`
6. Click Deploy

## 🛠 Local dev environment

### System requirements

- **Node.js**: v22.0.0 or newer (v24 LTS recommended)
- **pnpm**: v8.0.0 or newer
- **Git**: latest version
- **OS**: Windows 10+, macOS 10.15+, or Linux

### Installing software

#### 1. Install Node.js

Download the LTS version from the [Node.js website](https://nodejs.org/), or use a version manager:

```bash
# Windows (with winget)
winget install OpenJS.NodeJS.LTS

# macOS (with Homebrew)
brew install node@24

# Linux (with nvm)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
nvm install 24
```

Check the install:

```bash
node --version   # should show v22.x.x or newer
npm --version
```

#### 2. Install pnpm

```bash
npm install -g pnpm

# Check the install
pnpm --version
```

#### 3. Install Git

- Windows: download [Git for Windows](https://git-scm.com/download/win)
- macOS: `brew install git`
- Linux: `sudo apt install git`

#### 4. Install Rust (optional, only for native module development)

Install the toolchain from [rustup.rs](https://rustup.rs/):

```bash
# Windows: download and run rustup-init.exe
# macOS/Linux:
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# Check the install
rustc --version
cargo --version
```

#### 5. Install C++ build tools (Windows native module development)

Download [Visual Studio Build Tools](https://visualstudio.microsoft.com/visual-cpp-build-tools/) and select:

- **Desktop development with C++**
- MSVC v14x C++ x64/x86 build tools
- Windows 10/11 SDK

### Project setup

```bash
# 1. Clone the repo
git clone https://github.com/zodd95x/kraken-player.git
cd kraken-player

# 2. Install dependencies
pnpm install

# 3. Configure environment variables
cp .env.example .env
# Edit the .env file and set your API address

# 4. Build the native modules
pnpm build:native

# 5. Start the dev server
pnpm dev
```

### Common dev commands

| Command             | Description                          |
| ------------------- | ------------------------------------ |
| `pnpm dev`          | Start the dev server (Electron + Vite HMR) |
| `pnpm build`        | Build the production package         |
| `pnpm build:win`    | Build the Windows client             |
| `pnpm build:mac`    | Build the macOS client               |
| `pnpm build:linux`  | Build the Linux client               |
| `pnpm build:native` | Build the native plugins             |
| `pnpm lint`         | Run the code checks                  |
| `pnpm format`       | Format the code                      |

### Building the client

```bash
# Build for the current system
pnpm build:win

# Build for a specific architecture
pnpm build:win -- --x64 --arm64

# Build output goes to the dist/ folder
```

### Recommended IDE setup

#### VS Code extensions

- **Vue - Official**: Vue 3 language support
- **ESLint**: code checks
- **Prettier**: code formatting
- **rust-analyzer**: Rust support (for native module development)

## ⚠️ Important notes

::: warning License

### Please read carefully

- This project is licensed under the [GNU Affero General Public License (AGPL-3.0)](https://www.gnu.org/licenses/agpl-3.0.html) — please comply with it
- Any modification, adaptation, distribution or derivative work must also use **AGPL-3.0**, **and include this project's license and copyright information where appropriate**
- If you sell it or use it commercially, **you must provide this project's source code and a link to the original project**. Note that this project involves third parties, so **selling it may expose you to legal action**. Violations will be pursued
- Do not remove the program's original copyright notices in derivative projects (you may add your own author info)
- Thank you for your respect and understanding

:::

## 📢 Disclaimer

Some features of this project use NetEase Cloud Music third-party API services, **for personal study and research only — commercial and illegal use is prohibited**.

The developers of this project **strictly comply with applicable laws and the NetEase Cloud Music API terms, and will not use this project for any illegal activity.** Any dispute or liability arising from using this project is yours alone. **The developers accept no direct or indirect liability from using this project, and reserve the right to pursue illegal use.**

Please comply with applicable laws when using this project. **Do not use it for any commercial or illegal purpose — violators bear full responsibility.** You accept the risks of using this project. The developers give no warranty for the services and content provided.

Thank you for your understanding.

## 📜 Open-source license

- **This project is for personal study and research only — commercial and illegal use is prohibited**
- This project is open-sourced under the [GNU Affero General Public License (AGPL-3.0)](https://www.gnu.org/licenses/agpl-3.0.html)
  1. **Modify and distribute:** any modification or distribution must stay under AGPL-3.0, with source code provided
  2. **Derivative works:** must also use AGPL-3.0 and credit the original project's license where appropriate
  3. **Credit the authors:** clearly credit the original authors and their contributions in any modification, derivative or distribution
  4. **No warranty:** under AGPL-3.0 this project comes with no express or implied warranty. Read the [GNU Affero General Public License (AGPL-3.0)](https://www.gnu.org/licenses/agpl-3.0.html) for the full disclaimer
  5. **Community:** community involvement is welcome — developers are encouraged to improve and maintain this project together
  6. **License link:** read the [GNU Affero General Public License (AGPL-3.0)](https://www.gnu.org/licenses/agpl-3.0.html) for details

## 😘 Credits

Special thanks to the projects that support and inspire this one:

- [NeteaseCloudMusicApi](https://github.com/Binaryify/NeteaseCloudMusicApi)
- [YesPlayMusic](https://github.com/qier222/YesPlayMusic)
- [UnblockNeteaseMusic](https://github.com/UnblockNeteaseMusic/server)
- [applemusic-like-lyrics](https://github.com/Steve-xmh/applemusic-like-lyrics)
- [Vue-mmPlayer](https://github.com/maomao1996/Vue-mmPlayer)
- [refined-now-playing-netease](https://github.com/solstice23/refined-now-playing-netease)
- [material-color-utilities](https://github.com/material-foundation/material-color-utilities)
