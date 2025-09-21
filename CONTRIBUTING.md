# Contributing to Bnlang VS Code Extension

Thanks for your interest in contributing! This document covers local development,
build, packaging, testing, and release guidance for maintainers and contributors.

---

## Prerequisites
- **Node.js** (LTS recommended)
- **npm** (or `pnpm`/`yarn` with equivalent scripts)
- **VS Code**
- Optional: **@vscode/vsce** for packaging

## Getting Started
```bash
git clone https://github.com/bnlang/bnl-vscode.git
cd bnl-vscode
npm install
```

## Run the Extension
Launch a development host that reloads on changes:
```bash
npm run watch
```
Then press **F5** in VS Code to start the *Extension Development Host*.

## Build / Compile
```bash
npm run compile
```
Builds TypeScript to `out/` (or your configured outDir).

## Lint & Format (optional if configured)
```bash
npm run lint
npm run format
```

## Package for Distribution
Install the VS Code packaging tool:
```bash
npm install -g @vscode/vsce
```
Create a `.vsix`:
```bash
vsce package
```
This outputs something like `bnl-vscode-1.0.0.vsix`.

### Install Locally
```bash
code --install-extension bnl-vscode-1.0.0.vsix
```

## Publishing (Maintainers)
1. Bump version in `package.json`.
2. Update `CHANGELOG.md` (if present).
3. Ensure `README.md` is user-focused (Marketplace safe).
4. Run:
   ```bash
   vsce publish
   ```

### Marketplace README Policy
The Marketplace renders the **README.md inside the .vsix**. Keep user docs in `README.md` and put developer docs here in **CONTRIBUTING.md**. If you need to hide extra files from the package, use **.vscodeignore** (see below).

## Releasing Checklist
- [ ] All CI checks green
- [ ] Version bumped
- [ ] CHANGELOG updated
- [ ] README (user-facing) reviewed
- [ ] Package via `vsce package` and smoke test install
- [ ] `vsce publish`

## Filing Issues / PRs
- Use clear titles and reproduction steps.
- For grammar/highlighting issues, include a minimal code sample.
- For crashes, include VS Code version and extension version.
- Follow conventional commit style if possible.

Thanks again for contributing! ❤️
