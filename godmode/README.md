# GodMode setup fix

Fix for building [smol-ai/GodMode](https://github.com/smol-ai/GodMode) (at commit
`8ac3ffde96ab72d992b5d5cf1743673e610cb07b`) with a current Node/npm toolchain.

## Problem

`npm install` fails immediately on npm ≥ 10.5:

```
npm error Invalid property "devEngines.node"
```

GodMode's `package.json` uses the legacy free-form `devEngines` field
(`{"node": ">=18.x", "npm": ">=7.x"}`). npm now validates `devEngines`
against a structured schema (`{"runtime": {"name": "node", ...}}`), so the
old shape is rejected before any packages install.

## Fix

Remove the `devEngines` block — it was advisory only and duplicates what the
toolchain already enforces. Two equivalent ways to apply:

- `remove-devengines.patch` — apply to a fresh clone with
  `git apply remove-devengines.patch`
- `package.json` — the full fixed file, drop-in replacement

## Verified

With the fix applied (Node 22.22.2 / npm 10.9.7, Linux x64):

- `npm install` completes, including the Electron postinstall + dev DLL build
- `npm start` boots the dev app (webpack-dev-server on port 1212 + Electron)
- `npm run package-lin` produces working x64 and arm64 AppImages

Note: the repo has no `dev` script — the dev entrypoint is `npm start`.
The mac/win legs of `npm run package` (code signing + notarization) require
macOS with Apple Developer credentials and Wine respectively.
