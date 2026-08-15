/**
 * React Native's transform API is unitless for scale, and enforces it by
 * crashing the screen rather than ignoring the value:
 *
 *   Invariant Violation: Transform with key of "scale" must be a number: {"scale":"75%"}
 *
 * The compiler collapses every scale value it can see (`parseScaleComponent`
 * and `parseScaleValue` in `src/compiler/declarations.ts`), but it cannot see
 * through a `var()` it is unable to inline. Tailwind v4 emits `--tw-scale-x` /
 * `--tw-scale-y` from every `scale-*` utility, so a real stylesheet holds many
 * competing definitions and none of them are inlinable — the value stays a
 * string until the runtime resolves it, which is the boundary these two exports
 * guard.
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
 * The scale that does not scale. `scale: none` is the CSS spelling of the
 * identity transform, so the number it collapses to is 1 — the same value
 * `parseScaleValue` emits for it when the compiler can see it.
 */
const IDENTITY_SCALE = 1;

/**
 * Turns a resolved scale component into the unitless number React Native
 * requires: `"N%"` becomes its fraction and `"none"` becomes the identity.
 * Anything else — a number, an unparseable string — is returned untouched, so
 * this is safe to apply to any resolved scale value.
 */
export function normalizeScaleValue(value: unknown): unknown {
  if (typeof value !== "string") {
    return value;
  }

  if (value === "none") {
    return IDENTITY_SCALE;
  }

  if (!value.endsWith("%")) {
    return value;
  }

  const percentage = Number.parseFloat(value);

  return Number.isNaN(percentage) ? value : percentage / 100;
}
