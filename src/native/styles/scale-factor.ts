export function scaleFactor(value: unknown) {
  if (typeof value === "string" && value.endsWith("%")) {
    return Number(value.slice(0, -1)) / 100;
  }
  return value;
}
