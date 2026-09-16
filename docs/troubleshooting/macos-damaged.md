# "App is damaged" on macOS

When opening Kraken Player on macOS, you may see an "app is damaged, cannot be opened" message. This is caused by macOS security, not by a broken app.

## Symptoms

Opening the app shows:

> "Kraken Player" is damaged and can't be opened. You should move it to the Trash.

or

> Apple could not verify "Kraken Player" is free of malware.

## Why it happens

This is normal Gatekeeper behavior. Apps downloaded outside the Mac App Store are blocked when they lack Apple signature verification.

Kraken Player is currently not signed with an Apple developer certificate, so it triggers this protection.

## Fixes

### Option 1: remove the quarantine flag (recommended)

Open **Terminal** and run:

```bash
sudo xattr -r -d com.apple.quarantine "/Applications/Kraken Player.app"
```

Enter your admin password, then reopen the app.

### Option 2: temporarily allow apps from anywhere

::: warning Security note
This lowers system security — use it temporarily only, and restore the setting after installing.
:::

**Step 1: allow apps from anywhere**

```bash
sudo spctl --master-disable
```

**Step 2: pick "Anywhere" in settings**

1. Open **System Settings** → **Privacy & Security**
2. Under "Allow applications from", select **Anywhere**

**Step 3: restore security (after installing)**

```bash
sudo spctl --master-enable
```

### Option 3: right-click to open

1. Find Kraken Player.app in Finder
2. Hold `Control` and click the app icon
3. Choose **Open** from the menu
4. Click **Open** in the confirmation dialog

You may need to repeat this 2-3 times.

## Checking file integrity

If you worry the download was altered, verify its SHA256 checksum:

```bash
# Compute the checksum of the downloaded file
shasum -a 256 ~/Downloads/KrakenPlayer-x.x.x-mac.dmg

# Compare it with the checksum on the GitHub Release page
```

## Notes for Apple Silicon (M series) Macs

If you use an M1/M2/M3/M4 Mac:

1. Make sure you downloaded the ARM (arm64) installer
2. First run may need Rosetta 2 translation (if you downloaded the x64 version)

Install Rosetta 2:

```bash
softwareupdate --install-rosetta
```

## Still stuck?

If nothing above helps:

1. Fully remove the app and its files:

   ```bash
   rm -rf "/Applications/Kraken Player.app"
   rm -rf ~/Library/Application\ Support/Kraken\ Player
   rm -rf ~/Library/Caches/Kraken\ Player
   ```

2. Download the latest version again from this repo's Releases page

3. Remove the quarantine flag (option 1) and open it
