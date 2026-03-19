---
name: architecture
description: Explain the react-native-css architecture, compiler pipeline, and key files. Use when a contributor wants to understand how the codebase works.
allowed-tools: Read, Grep, Glob
---

You are explaining the architecture of **react-native-css** to a contributor.

Start by reading `DEVELOPMENT.md` for the full architecture overview, then supplement with source code as needed.

## How to explain

1. **Start with the big picture**: react-native-css is a standalone CSS polyfill for React Native. It works independently of Tailwind — any `.css` file can be used. Nativewind v5 depends on this as its core engine.

2. **Show the compiler pipeline**: Walk through how a CSS rule becomes a React Native style:
   - Metro transformer intercepts `.css` files (`src/metro/metro-transformer.ts`)
   - lightningcss parses the CSS AST
   - `compile()` processes rules, media queries, keyframes, variables (`src/compiler/compiler.ts`)
   - Output is a `ReactNativeCssStyleSheet` (JSON)
   - Injection code registers styles with the native runtime (`src/metro/injection-code.ts`)

3. **Explain the babel plugin**: It rewrites React Native imports so components get `className` support:
   - `import { View } from 'react-native'` → `import { View } from 'react-native-css/components'`

4. **Explain the runtime**:
   - Reactive style system (`src/native/reactivity.ts`) — observables for media queries, color scheme
   - StyleCollection singleton (`src/native-internal/`) — isolated to avoid circular deps
   - Platform-aware: different outputs for native (JSON) vs web (browser CSS)

5. **Show relevant code**: Read source files to illustrate. The compiler and runtime are the most complex parts.

6. **Clarify the boundary**: This repo owns compilation, runtime, babel, and Metro integration. Nativewind adds Tailwind-specific theming on top.
