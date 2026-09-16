# API fails to start on macOS ARM

On Apple Silicon (M1/M2/M3/M4) Macs, the API service may fail to start.

## Symptoms

After launching the app:

- Song lists won't load
- API requests time out or fail
- The console shows an "API server failed to start" error

## Why it happens

### 1. Wrong Node.js architecture

A system-wide x64 Node.js can cause compatibility problems on ARM Macs.

### 2. Dependency build problems

Some native Node.js modules must be rebuilt for the ARM architecture.

### 3. Rosetta translation problems

An x64 app running through Rosetta 2 may conflict with system services.

## Fixes

### Option 1: use the native ARM build

Make sure you installed the ARM build of Kraken Player:

1. Open this repo's Releases page
2. Download the file with `arm64` in its name
3. Delete the old version and reinstall

### Option 2: check your Node.js architecture

If you hit this in a dev environment:

```bash
# Check the Node.js architecture
node -p "process.arch"

# It should print arm64
# If it prints x64, reinstall the ARM Node.js
```

**Reinstall the ARM Node.js:**

```bash
# Install the ARM build with nvm
arch -arm64 zsh
nvm install 24

# Check the architecture
node -p "process.arch"  # should print arm64
```

### Option 3: rebuild dependencies

In a dev environment, wipe and reinstall dependencies:

```bash
# Remove existing dependencies
rm -rf node_modules
rm -rf native/*/target

# Reinstall
pnpm install

# Rebuild the native modules
pnpm build:native
```

## Dev environment only

### Check your terminal architecture

Make sure the terminal runs in native ARM mode:

```bash
# Check the current architecture
uname -m  # should print arm64

# If it prints x86_64, you are in Rosetta mode
# Switch to a native ARM terminal
```

### Set up Homebrew

Make sure Homebrew lives in the right place:

- ARM build: `/opt/homebrew/`
- x64 build: `/usr/local/`

```bash
# Check the Homebrew location
which brew
# The ARM build should print /opt/homebrew/bin/brew
```

### Reinstall the dev environment

If the problem persists:

```bash
# 1. Uninstall the x64 dev tools
brew uninstall node

# 2. Make sure you use the ARM Homebrew
/opt/homebrew/bin/brew install node

# 3. Check
node -p "process.arch"  # arm64
```

## Known limits

- Some dependencies may not support ARM yet
- Some features may need the Rosetta 2 translation layer
- Performance may be slightly below a native ARM build

## Reporting the problem

If nothing above helps, open an Issue in this repo and include:

1. macOS version
2. Chip model (M1/M2/M3/M4)
3. Output of `node -p "process.arch"`
4. The full error log
