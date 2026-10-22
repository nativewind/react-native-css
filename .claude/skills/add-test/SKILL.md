---
name: add-test
description: Scaffold a test for a react-native-css feature following the project's testing conventions.
argument-hint: [feature-or-css-property]
allowed-tools: Read, Grep, Glob, Edit, Write
---

## Context

react-native-css has these test domains in `src/__tests__/`:

- `babel/` — Babel plugin tests using `babel-plugin-tester`
- `compiler/` — CSS compilation tests verifying JSON output
- `e2e/` — Maestro flows for the example app
- `native/` — Runtime tests for style application
- `types/` — Type tests that build a TypeScript program over the package's declarations
- `vendor/` — Tests of third-party CSS, such as Tailwind's output
- `web/` — Runtime tests for the web

The Node tooling tests, such as the Metro cache version and the TypeScript setup, are in `node/__tests__/*.mjs` and run against the build.

## Conventions by domain

### Babel tests (`src/__tests__/babel/`)

Use `babel-plugin-tester`:

```typescript
import { pluginTester } from "babel-plugin-tester";

pluginTester({
  plugin,
  tests: {
    "test name": {
      code: `import { View } from 'react-native';`,
      output: `import { View } from 'react-native-css/components';`,
    },
  },
});
```

### Compiler tests (`src/__tests__/compiler/`)

Verify CSS → JSON compilation output structure.

### Native tests (`src/__tests__/native/`)

Test runtime style application on native platform.

### Web tests (`src/__tests__/web/`)

Test the web runtime, such as `useCssElement` and `assignStyle`.

### Vendor tests (`src/__tests__/vendor/`)

Compile a third party's CSS, such as Tailwind's through `vendor/tailwind/_tailwind.tsx`'s `render`, and assert the styles it produces.

### End-to-end flows (`src/__tests__/e2e/`)

Maestro flows that drive the example app on a device.

### Type tests (`src/__tests__/types/`)

A case `tsc` alone decides goes in `src/__tests__/native/_styled-types.tsx` or `src/__fixtures__/types/component-mapping.tsx`, which jest skips and `yarn typecheck` checks, with `@ts-expect-error` above a call the types must reject. A case that needs the compiler API, such as an editor's completions or a walk over the declarations, builds a TypeScript program in `src/__tests__/types/`.

## Steps

1. **Identify the feature**: What needs testing? Use `$ARGUMENTS` as the starting point.

2. **Determine the domain**: Is this a babel transform, compiler output, native or web runtime behavior, a third party's CSS, a flow on a device, a type, or Node tooling?

3. **Find existing tests**: Search the appropriate `src/__tests__/` subdirectory for similar tests.

4. **Write the test**: Follow the conventions of the domain.

5. **Run the test**: Execute `yarn test`, and `yarn typecheck` for a case `tsc` alone decides; `yarn build` and then `node --test node/__tests__/*.mjs` for a Node tooling test; `maestro test src/__tests__/e2e` on a device running the example app for a flow. Note: ignore `ExperimentalWarning: VM Modules` warnings — they're expected.
