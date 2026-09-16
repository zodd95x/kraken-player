# Contributing Guide

Thank you for your interest in Kraken Player! This guide will help you contribute to the project.

## Prerequisites

You will need the following technologies to work on this project:

### Frontend stack

| Technology   | Description          | Learning resources                               |
| ------------ | -------------------- | ------------------------------------------------ |
| **Vue 3**    | Frontend framework   | [Docs](https://vuejs.org/)                       |
| **TypeScript** | Type-safe JavaScript | [Handbook](https://www.typescriptlang.org/docs/) |
| **Pinia**    | State management     | [Docs](https://pinia.vuejs.org/)                 |
| **Vite**     | Build tool           | [Docs](https://vite.dev/)                        |
| **Naive UI** | UI component library | [Docs](https://www.naiveui.com/en-US/os-theme/)  |

### Desktop stack

| Technology   | Description                | Learning resources                                     |
| ------------ | -------------------------- | ------------------------------------------------------ |
| **Electron** | Desktop app framework      | [Docs](https://www.electronjs.org/docs/latest/)        |
| **N-API**    | Node.js native module API  | [Docs](https://nodejs.org/api/n-api.html)              |

### Native module development (optional)

To develop native plugins, you will also need:

| Technology      | Description                  | Learning resources                                              |
| --------------- | ---------------------------- | --------------------------------------------------------------- |
| **Rust**        | Systems programming language | [The Rust Book](https://doc.rust-lang.org/book/)                |
| **napi-rs**     | Write Node.js addons in Rust | [Docs](https://napi.rs/)                                        |
| **Windows API** | Windows system programming   | [MSDN docs](https://learn.microsoft.com/windows/win32/)         |

## Setting up the dev environment

See the [user guide](/guide.html) and complete the following:

1. Install Node.js (v20+)
2. Install pnpm
3. Install Git
4. Clone the repo and install dependencies
5. Install Rust and C++ build tools (optional for the web version, required for the desktop version)

## Git workflow

### 1. Fork the repo

Open the Kraken Player repo page and click **Fork** (top right) to copy it to your account.

### 2. Clone your fork

```bash
# Clone your fork (replace YOUR_USERNAME)
git clone https://github.com/YOUR_USERNAME/kraken-player.git
cd kraken-player

# Check the remote setup
git remote -v
# It should show your fork URL
```

### 3. Create a feature branch

**Never develop directly on the main branch!**

```bash
# Create and switch to a new branch
git checkout -b feature/your-feature-name

# Branch naming:
# feature/xxx    - new feature
# fix/xxx        - bug fix
# docs/xxx       - docs update
# refactor/xxx   - code refactoring
# style/xxx      - formatting only
```

### 4. Develop and commit

```bash
# Hack away...

# Review your changes
git status
git diff

# Stage changes
git add .

# Commit (follow the Conventional Commits style, in English)
git commit -m "feat: add something"
```

**Commit message types:**

| Type       | Meaning                                  |
| ---------- | ---------------------------------------- |
| `feat`     | New feature                              |
| `fix`      | Bug fix                                  |
| `docs`     | Docs update                              |
| `style`    | Formatting (no logic change)             |
| `refactor` | Refactoring (neither feature nor fix)    |
| `perf`     | Performance improvement                  |
| `test`     | Tests                                    |
| `chore`    | Build/tooling related                    |

Examples:

```bash
git commit -m "feat: add translated lyrics display"
git commit -m "fix: fix playlist scroll position"
git commit -m "docs: update native plugin docs"
```

### 5. Push your branch

```bash
# Push to your fork
git push origin feature/your-feature-name
```

### 6. Open a Pull Request

1. Open your fork's page on GitHub
2. Click **Compare & pull request**
3. Fill in the PR title and description:
   - Clearly describe your changes
   - Link related issues if any: `Closes #123` (see the [GitHub docs](https://docs.github.com/issues/tracking-your-work-with-issues/using-issues/linking-a-pull-request-to-an-issue))
   - Provide test steps or screenshots
4. Click **Create pull request**

### 7. Code review

- AI will do a first pass on your PR (it can be picky — only change what you agree with)
- Maintainers may request changes
- Update your branch from the feedback, or explain why you think you are right
- Once merged, you can delete the feature branch

```bash
# Delete the local branch
git branch -d feature/your-feature-name

# Delete the remote branch
git push origin --delete feature/your-feature-name
```

## Code style

### Formatting

The project uses ESLint and Prettier:

```bash
# Check your code
pnpm lint

# Auto-format
pnpm format
```

Make sure your code passes the checks before submitting.

### Project layout

```
kraken-player/
├── src/                    # Frontend source
│   ├── components/         # Vue components
│   ├── stores/             # Pinia state management
│   ├── views/              # Pages
│   ├── utils/              # Helpers
│   └── types/              # TypeScript type definitions
├── electron/               # Electron main process
│   ├── main/               # Main process code
│   └── preload/            # Preload scripts
├── native/                 # Node.js native plugins
│   ├── external-media-integration/   # Media controls integration
├── docs/                   # Docs
└── scripts/                # Build scripts
```

## FAQ

### Q: How do I resolve merge conflicts?

```bash
# Sync your fork, then rebase your work onto main
git fetch origin
git rebase origin/main

# After resolving conflicts, continue
git add .
git rebase --continue

```

### Q: How do I undo my last commit?

```bash
# Undo the last commit (keep your changes)
git reset --soft HEAD~1

# Undo the last commit (discard your changes)
git reset --hard HEAD~1
```

### Q: How do I edit my last commit message?

```bash
git commit --amend -m "new message"
```

## Getting help

If you run into trouble while contributing:

1. Search the repo's Issues
2. Open a new Issue describing your problem

Thank you for contributing! 🎉
