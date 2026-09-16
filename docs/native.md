# Native plugin integration guide

Kraken Player uses native plugins written in Rust for deeper system integration. You can find all native plugins in the `native` folder.

Kraken Player currently ships one native plugin, `external-media-integration`, which integrates with media controls on Windows, Linux and macOS.

## External media integration module (external-media-integration)

> [!NOTE]
> It may appear as EMI for short in the project.

### What it does

This plugin provides system-level media control integration.

1. **System media controls**
   - **Cross-platform**:
     - **Windows**: integrates with System Media Transport Controls (SMTC), with taskbar thumbnail buttons and lock screen controls.
     - **Linux**: uses the high-level `Player` abstraction from `mpris_server`, supporting GNOME/KDE media controls.
     - **macOS**: integrates with Control Center and the lock screen (MPNowPlayingInfoCenter).
   - **Two-way sync**:
     - **Status sync**: pushes play/pause state, song metadata (title, artist, album, cover) and progress to the system in real time.
     - **Control input**: answers system media keys — play, pause, previous, next, seek, shuffle/repeat toggles.

### How it is built

The module is written in Rust and compiled into a Node.js native addon with [`napi-rs`](https://github.com/napi-rs/napi-rs), for both performance and developer experience.

1. **Architecture**
   - **Abstraction layer**: a `SystemMediaControls` trait unifies the platform APIs, so the Electron frontend never deals with platform differences.
   - **Threading**: system media controls run directly on the N-API thread (the Windows implementation handles async internally).

2. **Platform details**
   - **Windows**: uses the `windows` crate and WinRT APIs (`Windows.Media.Playback`, `Windows.Media.Control`). An in-memory `MediaPlayer` instance exposes the `SystemMediaTransportControls` interface to update the timeline and media properties.
   - **Linux**: uses the `mpris-server` crate and its high-level `Player` abstraction to manage the MPRIS interface, handling D-Bus communication and property exposure automatically.
   - **macOS**: uses the `objc2` crate family (bindgen) to call the Objective-C runtime, driving `MPNowPlayingInfoCenter` (display) and `MPRemoteCommandCenter` (events).

3. **Special cases**
   - **Covers**: NetEase cover URLs get special handling (scaling parameters) to fit each platform's display needs.

### Folder layout

```
native/external-media-integration/
├── src
│    ├── lib.rs             # Functions exposed to Node.js
│    ├── logger.rs          # Logging
│    ├── model.rs           # Frontend/backend message structs
│    └── sys_media          # Per-platform media control code
│        ├── linux.rs       # Linux MPRIS integration
│        ├── macos.rs       # macOS MPNowPlayingInfoCenter + MPRemoteCommandCenter
│        ├── mod.rs         # Cross-platform SystemMediaControls interface
│        └── windows.rs     # Windows SMTC integration
├── Cargo.toml              # Rust dependencies
└── index.d.ts              # Generated TypeScript definitions
```

### Build commands

```bash
cd native/external-media-integration
pnpm build           # release build
pnpm build:debug     # debug build
```

### Log path

`%APPDATA%/Kraken Player/logs/external-media-integration/`

## Building everything

Run this in the project root to build all native modules at once:

```bash
pnpm build:native
```

It runs the `scripts/build-native.ts` script, which builds every module and places it where Node.js can load it.

## Requirements

### Rust toolchain

```bash
# Install Rust (from https://rustup.rs/)
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# Check the install
rustc --version
cargo --version
```

### Windows build tools

The SMTC module needs the Windows SDK:

1. Download [Visual Studio Build Tools](https://visualstudio.microsoft.com/visual-cpp-build-tools/)
2. Select **"Desktop development with C++"**
3. Make sure these components are included:
   - MSVC v14x C++ x64/x86 build tools
   - Windows 10/11 SDK

## FAQ

### Module fails to load

```
Error: The specified module could not be found
```

**Fixes:**

- Run `pnpm build:native` to compile the native modules
- Make sure the system architecture (x64/arm64) matches the build target

### Link errors

```
LINK : fatal error LNK1181: cannot open input file
```

**Fixes:**

- Check that Visual Studio Build Tools are installed correctly
- Make sure the Windows SDK is installed

### No media controls on Windows

- Requires Windows 10 1607 or newer
- Open the control center (bottom right) and check for media controls
- Check the logs for errors

### No media controls on Linux

- Use the `playerctl` tool to check whether the app is visible and controllable
- Call the `D-Bus` interface directly to check whether the app shows up
- Check the logs for errors

### No media controls on macOS

- Check whether Control Center (top right) shows media controls
- Check system logs for commands sent to the native plugin: `log stream --predicate 'subsystem == "com.apple.MediaPlayer" OR eventMessage contains "RemoteCommand"' --info`
- Check the logs for errors
