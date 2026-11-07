// A keyword a var() leaves in a list-valued property is `none` alone or invalid at computed-value time, and either way the property is `none` (css-variables-1 §3.1)
export function resetsToNone(value: unknown): boolean {
  return value === null || value === "none" || value === "initial";
}
