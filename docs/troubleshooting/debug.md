# Debug mode and troubleshooting

This page explains how to use debug mode to find and fix problems in Kraken Player.

## Enabling debug mode

### Developer tools

In the Electron client, open the developer tools with:

- **Shortcut**: `Ctrl + Shift + I` (Windows/Linux) or `Cmd + Option + I` (macOS)

Useful panels:

| Panel           | Use for                        |
| --------------- | ------------------------------ |
| **Console**     | Log output, error messages     |
| **Network**     | Network requests, API calls    |
| **Application** | Local storage, cached data     |
| **Sources**     | Debugging frontend code        |

### Log files

App logs are stored here:

| System  | Path                                              |
| ------- | ------------------------------------------------- |
| Windows | `%APPDATA%\Kraken Player\logs\`                   |
| macOS   | `~/Library/Application Support/Kraken Player/logs/` |
| Linux   | `$XDG_CONFIG_HOME/Kraken Player/logs/`            |

Dev environment logs: `%APPDATA%\Kraken Player\logs\dev\` (a `dev` subfolder of the log directory)

Native module logs:

- External media integration module: `%APPDATA%\Kraken Player\logs\external-media-integration\`

## Common error types

### Network errors

**Symptoms**: songs, covers or lyrics fail to load

**Steps**:

1. Open dev tools → Network panel
2. Look for failed requests (marked red)
3. Check the response status code and error message

**Common causes**:

- API server unavailable
- Network connection problem
- Wrong proxy settings
- CORS restrictions

### Playback errors

**Symptoms**: song won't play, stutters, or no sound

**Steps**:

1. Check the Console panel for errors
2. Check whether the audio URL is valid (Network panel)
3. Confirm the system audio output device works

**Common causes**:

- Expired audio URL
- Unsupported audio format
- System audio device problem
- Out of memory

### Rendering errors

**Symptoms**: broken UI, white screen, components not loading

**Steps**:

1. Read the error stack in the Console panel
2. Look for Vue component errors
3. Try clearing the cache and restarting

**Fix**:

```bash
# Clear the app cache (Windows)
rd /s /q "%APPDATA%\Kraken Player\Cache"

# Clear the app cache (macOS)
rm -rf ~/Library/Application\ Support/Kraken\ Player/Cache

# Clear the app cache (Linux)
rm -rf "${XDG_CONFIG_HOME:-$HOME/.config}/Kraken Player/Cache"
```

## Collecting debug info

If you need to open an Issue, please collect:

1. **System info**
   - OS version
   - Kraken Player version (plus Commit ID for dev builds)
   - Node.js version (for dev environments)

2. **Error info**
   - Full error log from the Console panel
   - Screenshots of the related network requests

3. **Steps to reproduce**
   - Describe the steps that cause the problem in detail
   - Note whether it reproduces every time

## Resetting the app

If the problem persists, try resetting the app:

::: warning Note
Resetting wipes all user data, including login state, playlists, settings, etc.
:::

```bash
# Windows
rd /s /q "%APPDATA%\Kraken Player"

# macOS
rm -rf ~/Library/Application\ Support/Kraken\ Player

# Linux
rm -rf "${XDG_CONFIG_HOME:-$HOME/.config}/Kraken Player"
```

Restart the app and log in again.
