/**
 * React Native's transform API is unitless for scale, and enforces it by
 * crashing the screen rather than ignoring the value:
 *
 *   Invariant Violation: Transform with key of "scale" must be a number: {"scale":"75%"}
 *
 * The compiler collapses every percentage it can see (`parseScaleComponent` in
 * `src/compiler/declarations.ts`), but it cannot see through a `var()` it is
 * unable to inline. Tailwind v4 emits `--tw-scale-x` / `--tw-scale-y` from every
 * `scale-*` utility, so a real stylesheet holds many competing definitions and
 * none of them are inlinable — the percentage stays a string until the runtime
 * resolves it, which is the boundary these two exports guard.
 */

/**
 * The transform components React Native requires to be unitless numbers.
 *
 * Deliberately narrower than `transformKeys`: React Native accepts a percentage
 * string for `translateX` / `translateY` and a `deg` string for rotate and
 * skew, so coercing those would be a regression rather than a fix.
 */
export const scaleTransformKeys = new Set(["scale", "scaleX", "scaleY"]);

/**
 * Turns a resolved `"N%"` into the unitless fraction React Native requires.
 * Anything else — a number, a keyword, an unparseable string — is returned
 * untouched, so this is safe to apply to any resolved transform value.
 */
export function normalizeScaleValue(value: unknown): unknown {
  if (typeof value !== "string" || !value.endsWith("%")) {
    return value;
  }

  const percentage = Number.parseFloat(value);

  return Number.isNaN(percentage) ? value : percentage / 100;
}
