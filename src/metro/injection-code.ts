export function getInjectionCode(filePath: string, values: unknown[]) {
  const importPath = `import { StyleCollection } from "${filePath}";`;
  const contents = values
    .map((value) => `StyleCollection.inject(${JSON.stringify(value)});`)
    .join("\n");

  return Buffer.from(`${importPath}\n${contents}`);
}
