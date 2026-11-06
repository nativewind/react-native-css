// lightningcss writes every fully transparent colour as #0000, and a variable can still carry the keyword
export function isTransparentColor(color: unknown): boolean {
  return color === "#0000" || color === "transparent";
}
