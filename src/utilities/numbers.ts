/** A number at the compiler's precision, four decimal places. */
export function round(number: number): number {
  return Math.round((number + Number.EPSILON) * 10000) / 10000;
}
