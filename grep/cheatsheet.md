# Grep cheatsheet — VideoComposer

Paste-ready recipes for finding code fast. All run from repo root.

## Symbol lookups (use the indexes first — they're pre-sorted)

```bash
# Find any exported symbol by partial name
grep -i 'progress' grep/symbol-map.txt

# What exports does a file have?
grep '^src/app/dashboard-client.tsx' grep/exports.txt

# Where is a type defined?
grep -i 'templateModeId\|brand\b' grep/types.txt
```

## Route / API surface

```bash
# Every HTTP handler in src/app/api/
cat grep/api-routes.txt

# Every client-side fetch() — client ↔ server map
cat grep/fetch-calls.txt
```

## Components

```bash
# All React components by file
cat grep/components.txt

# Which files are client-side ("use client")?
cat grep/client-boundaries.txt

# Which files use React state hooks?
awk -F: '{print $1}' grep/hooks.txt | sort -u
```

## Remotion seams

```bash
# Every import from remotion / @remotion/* (player vs bundler vs runtime)
cat grep/remotion-imports.txt

# Composition registration site
grep -n 'Composition' src/remotion/Root.tsx

# Render entry points
grep -n 'renderMedia\|selectComposition\|bundle(' src/app/api/render/route.ts
```

## Regenerating the indexes (one-shot)

```bash
# Exports
(grep -rn --include='*.ts' --include='*.tsx' -E '^export\s+(async\s+)?(default\s+)?(function|const|class|type|interface|enum)\s+[A-Za-z_]' src/ ; \
 grep -rn --include='*.ts' --include='*.tsx' -E '^export\s+\{' src/) | sort -u > grep/exports.txt

# Types & interfaces
grep -rn --include='*.ts' --include='*.tsx' -E '^(export\s+)?(type|interface)\s+[A-Z][A-Za-z0-9_]*' src/ | sort > grep/types.txt

# Components
grep -rn --include='*.tsx' -E '^export\s+(default\s+)?(function|const)\s+[A-Z][A-Za-z0-9_]*' src/components src/remotion | sort > grep/components.txt

# API routes
grep -rn --include='*.ts' -E '^export\s+async\s+function\s+(GET|POST|PUT|DELETE|PATCH)' src/app/api/ | sort > grep/api-routes.txt

# Client boundaries
grep -rln --include='*.ts' --include='*.tsx' -E '^"use client"' src/ | sort > grep/client-boundaries.txt

# Hook usage
grep -rn --include='*.ts' --include='*.tsx' -E '\b(useState|useEffect|useRef|useMemo|useCallback|useContext|useReducer|useLayoutEffect)\b' src/ | sort > grep/hooks.txt

# Fetch calls
grep -rn --include='*.ts' --include='*.tsx' -E '\bfetch\s*\(' src/ | sort > grep/fetch-calls.txt

# Remotion imports
grep -rn --include='*.ts' --include='*.tsx' -E "from ['\"](remotion|@remotion/[a-z-]+)['\"]" src/ | sort > grep/remotion-imports.txt
```

## Common investigation patterns

```bash
# "Where is textSizeScale used?"
grep -rn --include='*.ts' --include='*.tsx' 'textSizeScale' src/

# "How is a File turned into data for render?"
grep -rn --include='*.ts' --include='*.tsx' -E 'fileToDataUrl|readAsDataURL|getCroppedImageBlob' src/

# "Where does brand id resolve to a logo folder?"
grep -rn 'logoFolder\|brandLogoPublicUrl' src/

# "Which server env blocks export?"
grep -rn 'VERCEL\|NETLIFY\|REMOTION_ALLOW_EXPORT_ON_SERVERLESS' src/

# Every env var reference
grep -rn --include='*.ts' --include='*.tsx' 'process\.env\.' src/
```
