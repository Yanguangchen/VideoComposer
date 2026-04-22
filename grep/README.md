# Grep directory — quick code lookup

Pre-built, grep-friendly indexes of the VideoComposer codebase. Every line ends with `file:line` so you can paste it straight into an editor's go-to-line.

## Files

| File | What it indexes |
|------|-----------------|
| `exports.txt` | Every top-level `export` in `src/` (functions, consts, types, interfaces, default exports) |
| `types.txt` | Every `type` and `interface` declaration (exported and local `Props`) |
| `components.txt` | Every React component with its file and prop type location |
| `api-routes.txt` | HTTP handler entry points in `src/app/api/` |
| `hooks.txt` | Files using React hooks (`useState`, `useEffect`, `useRef`, `useMemo`, `useCallback`, `useContext`) |
| `client-boundaries.txt` | Files marked `"use client"` (client-only React tree) |
| `fetch-calls.txt` | All `fetch(...)` call sites (client → server API map) |
| `remotion-imports.txt` | Every import from `remotion` or `@remotion/*` (bundler/renderer/player seams) |
| `file-tree.txt` | Annotated `src/` tree with one-line role per file |
| `symbol-map.txt` | Flat symbol → file:line lookup, sorted alphabetically |
| `cheatsheet.md` | Common `grep`/`rg` recipes for this repo |

## Usage

```bash
# Where is something exported?
grep -i 'renderMedia' grep/exports.txt

# Which component owns that prop type?
grep 'LogoPositionProps\|LogoPosition' grep/symbol-map.txt

# Every place that calls an API route
grep '/api/' grep/fetch-calls.txt
```

All files are regenerable from source — see `cheatsheet.md` for the exact commands.
