/**
 * This is a hack around Expo's handling of CSS files.
 * When a component is inside a lazy() barrier, it is inside a different JS bundle.
 * So when it updates, it only updates its local bundle, not the global one which contains the CSS files.
 *
 * To fix this, we force our code to always import the CSS files.
 * Now the CSS files are in every bundle.
 *
 * We achieve this by collecting all CSS files and injecting them into a special file
 * which is included inside react-native-css's runtime.
 *
 * This is why both of these function add imports for the CSS files.
 */

export function getWebInjectionCode(filePaths: string[]) {
  const importStatements = filePaths
    .map((filePath) => `import "${filePath}";`)
    .join("\n");

  return Buffer.from(importStatements);
}

export function getNativeInjectionCode(
  cssFilePaths: string[],
  values: unknown[],
) {
  const importStatements = cssFilePaths
    .map((filePath) => `import "${filePath}";`)
    .join("\n");
  const importPath = `import { StyleCollection } from "./api";`;
  const contents = values
    .map((value) => `StyleCollection.inject(${JSON.stringify(value)});`)
    .join("\n");

  return Buffer.from(`${importStatements}\n${importPath}\n${contents}`);
}
