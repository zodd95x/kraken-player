# macOS FAQ

Common problems and fixes when using Kraken Player on macOS.

## App signature problems

### Cannot open the app

**Symptom**: double-clicking shows "cannot be opened because the developer cannot be verified"

**Fix**:

1. Open **System Settings** → **Privacy & Security**
2. Click **Open Anyway**
3. Or run this in Terminal:
   ```bash
   xattr -cr "/Applications/Kraken Player.app"
   ```

### Gatekeeper keeps blocking

If the system keeps blocking the app:

```bash
# Remove the quarantine flag
sudo xattr -r -d com.apple.quarantine "/Applications/Kraken Player.app"

# Check the flag is gone
xattr -l "/Applications/Kraken Player.app"
```

## Permission problems

### Microphone/audio permission

**Symptom**: some audio features don't work

**Fix**:

1. Open **System Settings** → **Privacy & Security** → **Privacy**
2. Select **Microphone** on the left
3. Make sure Kraken Player is checked

### Network permission

**Symptom**: network access prompt on first launch

**Fix**:

Click **Allow** to grant network access. If you clicked Deny by mistake:

1. Open **System Settings** → **Network** → **Firewall**
2. Click **Options**
3. Find Kraken Player and set it to **Allow incoming connections**

## System integration

### Media keys don't work

**Symptom**: the play/pause/previous/next keys do nothing

**Possible causes**:

1. Another app grabbed the media keys
2. System settings assigned the media keys elsewhere

**Fix**:

1. Close other apps that may hold the media keys (e.g. iTunes, Spotify)
2. Check **System Settings** → **Keyboard** → **Keyboard Shortcuts** for media key settings

### Not showing in Control Center

**Symptom**: the "Now Playing" section of macOS Control Center doesn't show Kraken Player

**Note**:

Kraken Player on macOS does not support system-level media integration (Now Playing) yet. This feature currently works on Windows through SMTC.

## Performance problems

### Slow startup

**Possible causes**:

1. First launch loads a lot of resources
2. Low system resources

**Fix**:

1. Close unneeded background apps
2. Check memory and CPU usage in **Activity Monitor**
3. Restart and try again

### High memory usage

**Fix**:

1. Clear the app cache regularly
2. Keep fewer playlists open at once
3. Turn off unneeded visual effects

## Updates

Kraken Player has no auto-update yet. Install new versions from this repo's Releases page, or build them yourself.
