# react-native-css Development Guide

## Project Overview

A standalone CSS polyfill for React Native. Part of the Nativewind v5 ecosystem but can function independently of Tailwind CSS. Provides direct `.css` file support in React Native apps.

### Relationship to Nativewind

- **Nativewind** (`github.com/nativewind/nativewind`, main branch) provides the Tailwind CSS integration layer
- **This repo** provides the underlying CSS-to-React-Native engine
- Both are part of the v5 story, but this repo has no Tailwind dependency

## Architecture

```
.css file
    ↓
Metro Transformer (src/metro/metro-transformer.ts)
    ↓ delegates to Expo's CSS transformer
lightningcss parses CSS AST
    ↓
compile() in src/compiler/compiler.ts
    ├→ parseMediaQuery()        — media query conditions
    ├→ parseContainerCondition() — container queries
    ├→ parseDeclaration()       — CSS properties → RN properties
    ├→ extractKeyFrames()       — animation extraction
    └→ inlineVariables()        — CSS variable optimization
    ↓
ReactNativeCssStyleSheet (JSON)
    ↓
getNativeInjectionCode() (src/metro/injection-code.ts)
    ↓
Native runtime consumes via StyleCollection
```

### Babel Plugin

The Babel plugin (`src/babel/react-native.ts`) rewrites React Native imports:
```
import { View } from 'react-native'
    → import { View } from 'react-native-css/components'
```
This enables `className` prop support on all React Native components.

### Key Architectural Patterns

- **Reactive style system** (`src/native/reactivity.ts`) — custom observables for media queries, container queries, color scheme changes
- **StyleCollection singleton** (`src/native-internal/`) — isolated to prevent circular dependencies between native runtime and CSS file imports
- **Platform-aware compilation** — different outputs for native (JSON) vs web (browser CSS)
- **Inline variable optimization** — single-use CSS variables are inlined at compile time; multi-use preserved

## Package Entry Points

| Import | Purpose |
|--------|---------|
| `react-native-css` | Runtime API |
| `react-native-css/compiler` | CSS-to-JSON compiler |
| `react-native-css/babel` | Babel plugin for import transformation |
| `react-native-css/metro` | `withReactNativeCSS()` Metro config |
| `react-native-css/components` | Pre-wrapped RN components with className support |
| `react-native-css/jest` | Jest test utilities |
| `react-native-css/native` | Native runtime API |
| `react-native-css/web` | Web runtime API |

## Key Directories

```
src/
├── babel/                # Babel plugin (rewrites RN imports)
├── compiler/             # CSS compilation engine (lightningcss-based)
│   ├── compiler.ts       # Main entry
│   ├── declarations.ts   # CSS property handling
│   ├── selectors.ts      # Selector parsing
│   ├── media-query.ts    # Media query parsing
│   ├── container-query.ts
│   ├── keyframes.ts      # Animation extraction
│   └── inline-variables.ts
├── metro/                # Metro bundler integration
│   ├── metro-transformer.ts  # Custom JS/CSS transformer
│   ├── resolver.ts       # Module resolution
│   └── typescript.ts     # TypeScript env generation
├── native/               # Native runtime (iOS/Android)
│   ├── api.tsx           # styled(), useCssElement(), hooks
│   ├── reactivity.ts     # Observable/reactive system
│   ├── styles/           # Runtime style resolution
│   ├── conditions/       # Media/container query evaluation
│   └── react/            # React integration hooks
├── native-internal/      # Shared singletons (avoids circular deps)
│   ├── root.ts           # Global style collection root
│   ├── style-collection.ts
│   └── variables.tsx     # CSS variable context
├── web/                  # Web runtime
├── components/           # Pre-wrapped RN components (View, Text, etc.)
└── utilities/            # Type utilities (dot notation)
```

## Commands

```bash
yarn                     # Install dependencies (npm is NOT supported)
yarn build               # Build with react-native-builder-bob
yarn test                # Run tests (Jest with ESM)
yarn typecheck           # TypeScript validation
yarn lint --fix          # ESLint + Prettier
yarn clean               # Install deps, rebuild project and example app
```

### Example App

```bash
yarn example ios         # Build and run on iOS
yarn example android     # Build and run on Android
yarn example start       # Start Metro server
yarn example start:build # Rebuild library + start Metro (clears cache)
yarn example start:debug # Rebuild + start with debug logging
```

## Testing

- **Runner:** Jest with experimental ESM support (`NODE_OPTIONS="--experimental-vm-modules"`)
- **Convention:** Tests in `src/__tests__/` organized by domain (`babel/`, `compiler/`, `native/`)
- **Babel tests** use `babel-plugin-tester`
- **Compiler tests** verify JSON output structure
- **Run specific suites:** `yarn test babel`, `yarn test compiler`
- Ignore `ExperimentalWarning: VM Modules` warnings — expected with ESM support

## Code Conventions

- TypeScript throughout
- **Yarn v4 only** — npm is not supported (enforced via `packageManager` field)
- Conventional commits required: `feat:`, `fix:`, `refactor:`, `docs:`, `test:`, `chore:`
- Pre-commit hooks enforce linting and commit message format
- Publishing via `release-it`

## Common Pitfalls

- **No npm** — this repo uses Yarn workspaces; `npm install` will not work
- **No rebuild watch** — use `yarn example start:build` to rebuild + start in one command
- **Metro transformer / Babel plugin changes require full rebuild** — no fast refresh for these
- **native-internal exists to break circular deps** — don't import directly from `native/` in CSS file outputs; use `native-internal/`
- **Nested node_modules in example/** — can cause Metro issues; ensure dependency versions match root
