/**
 * This is a hack around Metro's handling of bundles.
 * When a component is inside a lazy() barrier, it is inside a different JS bundle.
 * So when it updates, it only updates its local bundle, not the global one which contains the CSS files.
 *
 * This means that the CSS file will not be re-evaluated when a component in a different bundle updates,
 * breaking tools like Tailwind CSS
 *
 * To fix this, we force our code to always import the CSS files, so now the CSS files are in every bundle.
 */
export function getWebInjectionCode(filePaths: string[]) {
  const importStatements = filePaths
    .map((filePath) => `import "${filePath}";`)
    .join("\n");

  return Buffer.from(importStatements);
}

/**
 * A stylesheet as a native bundle carries it.
 *
 * `getNativeInjectionCode` writes the stylesheet into the bundle as JSON source
 * text, so this is the only shape a device ever injects. `JSON.stringify` cannot
 * carry `undefined`: inside an array it writes `null`, and as an object value it
 * drops the key. Anything the compiler emits has to survive that, which is why
 * an unresolved feature operand compiles to `null` rather than `undefined`.
 *
 * Tests inject through this too, so a test cannot certify a shape production
 * never sees.
 */
export function serializeStyleSheet(stylesheet: unknown): string {
  return JSON.stringify(stylesheet);
}

export function getNativeInjectionCode(
  cssFilePaths: string[],
  values: unknown[],
) {
  const importStatements = cssFilePaths
    .map((filePath) => `import "${filePath}";`)
    .join("\n");

  const contents = values
    .map((value) => `StyleCollection.inject(${serializeStyleSheet(value)});`)
    .join("\n");

  return Buffer.from(
    `import { StyleCollection } from "react-native-css/native-internal";\n${importStatements}\n${contents};export {};`,
  );
}
