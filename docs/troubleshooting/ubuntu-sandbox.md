# Ubuntu sandbox startup failure

On Ubuntu and other Linux distros, Electron apps may fail to start because of sandbox restrictions.

## Symptoms

Launching the app shows:

```
[xxxx:xxxx:xxxx] FATAL:setuid_sandbox_host.cc(163)]
The SUID sandbox helper binary was found, but is not configured correctly.
```

or

```
Running as root without --no-sandbox is not supported.
```

## Why it happens

Electron uses Chromium's sandbox for extra security. It can break on some Linux setups:

1. **User namespaces disabled**: the kernel has user namespaces turned off
2. **Permission problem**: the sandbox helper binary has wrong permissions
3. **Container/WSL environment**: sandboxes are restricted in containers and WSL

## Fixes

### Option 1: enable user namespaces (recommended)

The safest fix:

```bash
# Check the current state
cat /proc/sys/kernel/unprivileged_userns_clone

# If it prints 0, enable it
echo 1 | sudo tee /proc/sys/kernel/unprivileged_userns_clone

# Enable permanently (takes effect after reboot)
echo 'kernel.unprivileged_userns_clone=1' | sudo tee /etc/sysctl.d/00-local-userns.conf
sudo sysctl --system
```

### Option 2: fix the sandbox permissions

Set the right permissions on chrome-sandbox:

```bash
# Find the chrome-sandbox file
find /opt -name "chrome-sandbox" 2>/dev/null
# or
find /usr -name "chrome-sandbox" 2>/dev/null

# Fix owner and permissions
sudo chown root:root /path/to/chrome-sandbox
sudo chmod 4755 /path/to/chrome-sandbox
```

For the AppImage format:

```bash
# Extract the AppImage
./KrakenPlayer.AppImage --appimage-extract

# Fix permissions
sudo chown root:root squashfs-root/chrome-sandbox
sudo chmod 4755 squashfs-root/chrome-sandbox

# Run the extracted version
./squashfs-root/kraken-player
```

### Option 3: disable the sandbox (not recommended)

::: danger Security warning
Disabling the sandbox lowers app security — only use this if nothing else works.
:::

**Method 1: command-line flag**

```bash
./KrakenPlayer.AppImage --no-sandbox
```

**Method 2: environment variable**

```bash
export ELECTRON_DISABLE_SANDBOX=1
./KrakenPlayer.AppImage
```

**Method 3: edit the .desktop file**

```bash
# Edit the desktop shortcut
sudo nano /usr/share/applications/com.krakenplayer.app.desktop

# Edit the Exec line to add --no-sandbox
Exec=/path/to/KrakenPlayer.AppImage --no-sandbox %U
```

## Per-distro fixes

### Ubuntu 22.04+

```bash
# Install required libraries
sudo apt update
sudo apt install libnss3 libatk1.0-0 libatk-bridge2.0-0 libcups2 libdrm2 libxkbcommon0 libxcomposite1 libxdamage1 libxfixes3 libxrandr2 libgbm1 libasound2

# Enable user namespaces
echo 'kernel.unprivileged_userns_clone=1' | sudo tee /etc/sysctl.d/00-local-userns.conf
sudo sysctl --system
```

### Debian

```bash
# Install dependencies
sudo apt install libnotify4 libsecret-1-0

# Enable user namespaces
sudo sysctl -w kernel.unprivileged_userns_clone=1
```

### Arch Linux

```bash
# Install dependencies
sudo pacman -S nss libxss alsa-lib libpulse

# Arch usually has user namespaces enabled already
```

### Fedora

```bash
# Install dependencies
sudo dnf install libXScrnSaver alsa-lib

# Fedora usually needs no extra sandbox setup
```

## WSL environment

Running Electron apps in Windows Subsystem for Linux needs special setup:

1. **Use WSL2**: WSL1 cannot run GUI apps
2. **Install WSLg**: Windows 11 or Windows 10 21H2+
3. **Disable the sandbox**: sandboxes usually cannot work in WSL

```bash
# Run in WSL
export DISPLAY=:0
./KrakenPlayer.AppImage --no-sandbox
```

## Docker containers

Running in Docker needs extra security setup:

```dockerfile
# Dockerfile example
FROM node:24

# Install dependencies
RUN apt-get update && apt-get install -y \
    libnss3 libatk1.0-0 libatk-bridge2.0-0 \
    libcups2 libdrm2 libxkbcommon0 \
    libxcomposite1 libxdamage1 libxfixes3 \
    libxrandr2 libgbm1 libasound2

# Must run with the --no-sandbox flag
```

When running the container:

```bash
docker run --cap-add SYS_ADMIN kraken-player-container
```

## Checking the fix

After fixing, check that the app starts:

```bash
# Check the process
ps aux | grep -i kraken-player

# Watch the logs
./KrakenPlayer.AppImage 2>&1 | head -50
```

## Still stuck?

If nothing above helps, open an Issue with:

1. Linux distro and version
2. The full error message
3. Output of `uname -a`
4. Output of `cat /proc/sys/kernel/unprivileged_userns_clone`
