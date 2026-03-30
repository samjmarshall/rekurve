# Migrate from ESLint & Prettier to Biome

## Overview

Replace ESLint + Prettier with Biome for linting and formatting. Biome is a single, fast tool that handles both concerns. This simplifies the toolchain, reduces dependencies, and significantly speeds up lint/format operations.

## Current State Analysis

**ESLint** (`eslint.config.js`):
- ESLint 9 flat config with `eslint-config-next/core-web-vitals` + `typescript-eslint` (type-checked)
- Custom rule overrides: disabled `array-type`, `consistent-type-definitions`, `require-await`, `no-unsafe-assignment`, `no-unsafe-call`; warns on `consistent-type-imports` and `no-unused-vars`
- Ignores: `.next`, `.yarn`, `.agents`, `next-env.d.ts`, `playwright-report`
- React 19 compiler rules disabled (`set-state-in-effect`, `purity`, `static-components`)

**Prettier** (`prettier.config.js`):
- All defaults, only plugin is `prettier-plugin-tailwindcss` for class sorting

**Tooling**:
- `make check` runs `eslint . && tsc --noEmit`
- Pre-commit hook (`.husky/pre-commit`) runs `make check`
- CI (`.github/workflows/quality-control.yml`) runs `make check`
- Prettier is manual-only (`yarn format:check` / `yarn format:write`), not in CI or pre-commit

**Existing ESLint disable comments** (2 files):
- `e2e/fixtures/test.ts:1` — `/* eslint-disable react-hooks/rules-of-hooks */`
- `src/components/sections/BookingForm.tsx:126` — `// eslint-disable-next-line react-hooks/exhaustive-deps`

## Desired End State

- Single `biome.json` config replaces both `eslint.config.js` and `prettier.config.js`
- `make check` runs `biome check . && tsc --noEmit`
- All formatting and linting handled by Biome
- ESLint, Prettier, and all related dependencies removed
- ESLint disable comments converted to Biome suppression comments
- Codebase formatted consistently with Biome's formatter

### Verification:
- `make check` passes
- `make build` succeeds
- `make test_e2e` passes
- No ESLint/Prettier config files or dependencies remain

## What We're NOT Doing

- **Not keeping ESLint for Next.js rules** — The missing rules (`no-html-link-for-pages`, etc.) are low-risk for an App Router project
- **Not keeping Prettier for Tailwind sorting** — Biome's nursery `useSortedClasses` rule is available but experimental; we'll enable it as nursery and accept its current limitations
- **Not changing formatting style** — Biome defaults match Prettier defaults (double quotes, 2-space indent, semicolons, trailing commas). No style changes expected.

## Implementation Approach

Use Biome's built-in migration tools to generate a `biome.json` from existing configs, then manually refine, update tooling, format the codebase, and remove old dependencies.

---

## Phase 1: Install & Configure Biome

### Overview
Install Biome, run migration tools, and create the final `biome.json`.

### Changes Required:

#### 1. Install Biome
```bash
yarn add --dev @biomejs/biome
```

#### 2. Run migration tools
```bash
yarn biome migrate prettier --write
yarn biome migrate eslint --write --include-inspired
```

This generates an initial `biome.json` from the existing configs.

#### 3. Refine `biome.json`

After migration, manually adjust the config to match our needs. The final config should look approximately like:

**File**: `biome.json` (new)

```json
{
  "$schema": "https://biomejs.dev/schemas/2.4.9/schema.json",
  "vcs": {
    "enabled": true,
    "clientKind": "git",
    "useIgnoreFile": true
  },
  "files": {
    "ignore": [".next", ".yarn", ".agents", "next-env.d.ts", "playwright-report"]
  },
  "formatter": {
    "enabled": true,
    "indentStyle": "tab",
    "indentWidth": 2,
    "lineWidth": 80
  },
  "linter": {
    "enabled": true,
    "rules": {
      "recommended": true,
      "nursery": {
        "useSortedClasses": "warn"
      },
      "style": {
        "useImportType": "warn"
      },
      "correctness": {
        "noUnusedVariables": "warn",
        "noUnusedImports": "warn"
      }
    },
    "domains": {
      "next": "recommended",
      "react": "recommended"
    }
  },
  "javascript": {
    "formatter": {
      "quoteStyle": "double",
      "trailingCommas": "all"
    }
  }
}
```

**Important**: The exact config will depend on what the migration tool outputs. The above is a target — review the migration output and adjust. Key decisions:
- `indentStyle`: Check what the codebase currently uses (likely `tab` based on Prettier defaults being overridden or not — verify by inspecting files). **Update**: Prettier default is spaces with width 2, and no override is set, so use `"indentStyle": "space"` and `"indentWidth": 2`.
- `useSortedClasses`: Enable as `"warn"` in nursery to get Tailwind sorting (with known limitations on screen variants)
- `useImportType`: Equivalent to `@typescript-eslint/consistent-type-imports`
- `noUnusedVariables` / `noUnusedImports`: Equivalent to `@typescript-eslint/no-unused-vars`
- `domains.next` and `domains.react`: Auto-detect from package.json, but explicit is clearer

### Success Criteria:

#### Automated Verification:
- [x]`biome.json` exists and is valid: `yarn biome check --write .` runs without config errors

#### Manual Verification:
- [x]Config reviewed to ensure rule parity with current ESLint setup

---

## Phase 2: Update Scripts & Tooling

### Overview
Replace all references to ESLint and Prettier in scripts, Makefile, pre-commit hook, and CI.

### Changes Required:

#### 1. Update `package.json` scripts
**File**: `package.json`

Replace:
```json
"check": "eslint . && tsc --noEmit",
"format:check": "prettier --check \"**/*.{ts,tsx,js,jsx,mdx}\" --cache",
"format:write": "prettier --write \"**/*.{ts,tsx,js,jsx,mdx}\" --cache",
"lint": "eslint .",
"lint:fix": "eslint --fix .",
```

With:
```json
"check": "biome check . && tsc --noEmit",
"format:check": "biome format .",
"format:write": "biome format --write .",
"lint": "biome lint .",
"lint:fix": "biome lint --write .",
```

Note: `biome check` runs both linting and formatting checks, so `make check` now covers formatting too (unlike before where Prettier was manual-only).

#### 2. Makefile
**File**: `Makefile`

No changes needed — `check` target already runs `yarn check`, which will now execute `biome check . && tsc --noEmit`.

#### 3. Pre-commit hook
**File**: `.husky/pre-commit`

No changes needed — already runs `make check`.

#### 4. CI workflow
**File**: `.github/workflows/quality-control.yml`

No changes needed — already runs `make check` via `make install && make check`.

### Success Criteria:

#### Automated Verification:
- [x]`yarn check` invokes Biome (not ESLint): verify by running `yarn check` and seeing Biome output

---

## Phase 3: Format & Fix Codebase

### Overview
Run Biome across the entire codebase to apply consistent formatting and fix lint violations.

### Changes Required:

#### 1. Run Biome format + lint with auto-fix
```bash
yarn biome check --write .
```

This will:
- Reformat all files to Biome's formatter output (should be near-identical to Prettier defaults)
- Auto-fix any safe lint violations

#### 2. Convert ESLint disable comments to Biome suppression comments

**File**: `e2e/fixtures/test.ts`

Replace line 1:
```js
/* eslint-disable react-hooks/rules-of-hooks */
```
With:
```js
// biome-ignore lint/correctness/useHookAtTopLevel: Playwright test fixtures are not React components
```

**File**: `src/components/sections/BookingForm.tsx`

Replace line 126:
```js
// eslint-disable-next-line react-hooks/exhaustive-deps
```
With:
```js
// biome-ignore lint/correctness/useExhaustiveDependencies: intentional subset of dependencies
```

#### 3. Fix any remaining lint errors manually
After the auto-fix, run `yarn biome check .` and address any remaining errors. These are likely to be minimal.

### Success Criteria:

#### Automated Verification:
- [x]`yarn biome check .` passes with no errors
- [x]No `eslint-disable` comments remain: `grep -r "eslint-disable" --include="*.ts" --include="*.tsx" .` returns nothing (excluding `.yarn/`)

---

## Phase 4: Remove ESLint & Prettier

### Overview
Delete old config files and uninstall old dependencies.

### Changes Required:

#### 1. Delete config files
```bash
rm eslint.config.js prettier.config.js
```

#### 2. Remove dependencies from `package.json`
**File**: `package.json`

Remove from `devDependencies`:
- `eslint`
- `eslint-config-next`
- `prettier`
- `prettier-plugin-tailwindcss`
- `typescript-eslint`

#### 3. Reinstall to clean up
```bash
yarn
```

### Success Criteria:

#### Automated Verification:
- [x]`eslint.config.js` does not exist
- [x]`prettier.config.js` does not exist
- [x]`yarn why eslint` returns nothing
- [x]`yarn why prettier` returns nothing

---

## Phase 5: Verify

### Overview
Run the full check, build, and E2E suite to confirm nothing is broken.

### Success Criteria:

#### Automated Verification:
- [x]`make check` passes (Biome lint + format check + tsc)
- [x]`make build` succeeds
- [x]`make test_e2e` passes

#### Manual Verification:
- [x]Dev server starts and renders correctly: `make start`
- [x]No unexpected formatting changes in git diff (review the format commit)

---

## Testing Strategy

### Automated:
- `make check` — Biome lint + format + TypeScript type-check
- `make build` — Next.js production build
- `make test_e2e` — Playwright E2E suite

### Manual:
- Review the formatting diff to ensure no unintended style changes
- Spot-check Tailwind class ordering on a few components
- Verify dev server works

## Migration Notes

- The Biome format commit will touch many files. Consider doing it as a single dedicated commit so `git blame` can use `--ignore-rev` to skip it.
- Add the format commit hash to `.git-blame-ignore-revs` if the file exists (or create it).
- Biome's `useSortedClasses` is nursery — if it causes too much noise, downgrade to `"off"` and revisit when it stabilizes.

## References

- [Biome migration guide](https://biomejs.dev/guides/migrate-eslint-prettier/)
- [Biome Next.js domain](https://biomejs.dev/linter/domains/)
- [Biome useSortedClasses](https://biomejs.dev/linter/rules/use-sorted-classes/)
- [Biome v2 release](https://biomejs.dev/blog/biome-v2/)
