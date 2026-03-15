---
name: add-test
description: Scaffold a test for a react-native-css feature following the project's testing conventions.
argument-hint: [feature-or-css-property]
allowed-tools: Read, Grep, Glob, Edit, Write
---

## Context

react-native-css has three test domains in `src/__tests__/`:

- `babel/` — Babel plugin tests using `babel-plugin-tester`
- `compiler/` — CSS compilation tests verifying JSON output
- `native/` — Runtime tests for style application

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

## Steps

1. **Identify the feature**: What needs testing? Use `$ARGUMENTS` as the starting point.

2. **Determine the domain**: Is this a babel transform, compiler output, or runtime behavior?

3. **Find existing tests**: Search the appropriate `src/__tests__/` subdirectory for similar tests.

4. **Write the test**: Follow the conventions of the domain.

5. **Run the test**: Execute `yarn test`. Note: ignore `ExperimentalWarning: VM Modules` warnings — they're expected.
