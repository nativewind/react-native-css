// React Native takes a scale only as a number, and its transform validator throws on anything else
export function scaleFactor(value: unknown): number | null {
  const factor =
    typeof value === "string" && value.endsWith("%")
      ? Number(value.slice(0, -1)) / 100
      : value;

  return typeof factor === "number" ? factor : null;
}
