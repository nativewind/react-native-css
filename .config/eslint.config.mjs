import { resolve } from "node:path";

import eslint from "@eslint/js";
import prettier from "eslint-plugin-prettier/recommended";
import { globalIgnores } from "eslint/config";
import tseslint from "typescript-eslint";

export default tseslint.config(
  eslint.configs.recommended,
  tseslint.configs.strictTypeChecked,
  tseslint.configs.stylisticTypeChecked,
  prettier,
  {
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: resolve("../"),
      },
    },
  },
  globalIgnores([
    "**/dist/*",
    ".yarn/*",
    "**/eslint.config.[cm]js",
    "**/prettier.config.[cm]js",
    "**/babel.config.js",
    "**/metro.config.js",
  ]),
  {
    rules: {
      "prefer-const": [
        "error",
        {
          destructuring: "all",
        },
      ],
      "no-unused-vars": "off",
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          args: "after-used",
          ignoreRestSiblings: true,
          argsIgnorePattern: "^_",
        },
      ],
      "@typescript-eslint/restrict-template-expressions": [
        "error",
        {
          allow: [{ name: ["Error", "URL", "URLSearchParams"], from: "lib" }],
          allowAny: true,
          allowBoolean: true,
          allowNullish: true,
          allowNumber: true,
          allowRegExp: true,
        },
      ],
    },
  },
  // Test file specific rules
  // These rules are causing false positives with @react-native/testing-library
  {
    files: ["**/__tests__/**/*", "**/*.test.*", "**/*.spec.*"],
    rules: {
      "@typescript-eslint/no-unsafe-assignment": "off",
      "@typescript-eslint/no-unsafe-member-access": "off",
    },
  },
  // Enforce new members automatically via linting rather than tests
  // An optional prop this package adds to a React Native interface takes `| undefined`, as React Native's own do, so it accepts an explicit undefined under exactOptionalPropertyTypes
  {
    files: ["types.d.ts"],
    rules: {
      "no-restricted-syntax": [
        "error",
        {
          selector:
            "TSModuleDeclaration TSInterfaceBody > TSPropertySignature[optional=true] > TSTypeAnnotation > :not(TSUnionType:has(> TSUndefinedKeyword))",
          message:
            "Write `?: T | undefined`: under exactOptionalPropertyTypes a bare `?: T` rejects the explicit undefined React Native's own props accept.",
        },
      ],
    },
  },
);
