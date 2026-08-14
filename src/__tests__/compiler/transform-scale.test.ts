import { compileWithAutoDebug } from "react-native-css/jest";

/**
 * React Native's transform validator rejects a non-numeric scale component:
 *
 *   Invariant Violation: Transform with key of "scale" must be a number: {"scale":"75%"}
 *
 * CSS allows a percentage everywhere a scale component is accepted, so every
 * emitter that can produce a scale component has to collapse it to the unitless
 * fraction. These tests pin the compiler plane: what lands in the stylesheet IR.
 * `src/__tests__/native/transform.test.tsx` pins the same census after the
 * runtime has resolved it.
 */
const scaleKeys = new Set(["scale", "scaleX", "scaleY"]);

type ScaleComponent = [key: string, value: unknown];

/**
 * Walks the emitted IR and collects every `[{}, <scale key>, value]` descriptor
 * triple, wherever it is nested. Asserting on the collected components rather
 * than on the exact IR shape pins the property that keeps React Native alive —
 * no scale component is ever a string — instead of the nesting of the day.
 */
function collectScaleComponents(
  node: unknown,
  found: ScaleComponent[] = [],
): ScaleComponent[] {
  if (typeof node !== "object" || node === null) {
    return found;
  }

  if (Array.isArray(node)) {
    const [, key, value] = node;

    if (
      node.length === 3 &&
      typeof key === "string" &&
      scaleKeys.has(key) &&
      !Array.isArray(value)
    ) {
      found.push([key, value]);
    }
  }

  for (const child of Object.values(node)) {
    collectScaleComponents(child, found);
  }

  return found;
}

function scaleComponentsFor(declarations: string): ScaleComponent[] {
  const stylesheet = compileWithAutoDebug(
    `.my-class { ${declarations} }`,
  ).stylesheet();

  const rule = stylesheet.s?.find(([name]) => name === "my-class")?.[1];

  if (!rule) {
    throw new Error(`No rule compiled for: ${declarations}`);
  }

  return collectScaleComponents(rule);
}

/**
 * The input census. Every row is a CSS spelling that reaches a scale emitter,
 * paired with the components the compiler must emit for it.
 *
 * `transform: scale3d(...)` is deliberately absent from this table — the
 * compiler drops 3d transforms entirely, so it emits no scale component at all.
 * `dropsEveryScaleComponent` below pins that instead.
 */
// prettier-ignore
const census: [declarations: string, components: ScaleComponent[]][] = [
  // `scale` longhand — a percentage is the fraction, never the "N%" string.
  ["scale: 75%;",        [["scaleX", 0.75],  ["scaleY", 0.75]]],
  ["scale: 0.75;",       [["scaleX", 0.75],  ["scaleY", 0.75]]],
  ["scale: 100%;",       [["scaleX", 1],     ["scaleY", 1]]],
  ["scale: 0%;",         [["scaleX", 0],     ["scaleY", 0]]],
  ["scale: -50%;",       [["scaleX", -0.5],  ["scaleY", -0.5]]],
  ["scale: 150%;",       [["scaleX", 1.5],   ["scaleY", 1.5]]],
  ["scale: 12.5%;",      [["scaleX", 0.125], ["scaleY", 0.125]]],
  ["scale: 75% 50%;",    [["scaleX", 0.75],  ["scaleY", 0.5]]],
  // Mixed: the number is untouched, the percentage becomes its fraction.
  ["scale: 2 50%;",      [["scaleX", 2],     ["scaleY", 0.5]]],
  ["scale: 2;",          [["scaleX", 2],     ["scaleY", 2]]],
  // `scale: none` means "do not scale", which is identity — not zero.
  ["scale: none;",       [["scaleX", 1],     ["scaleY", 1]]],

  // `transform` shorthand — a separate emitter per function, same requirement.
  ["transform: scale(75%);",       [["scaleX", 0.75], ["scaleY", 0.75]]],
  ["transform: scale(75%, 50%);",  [["scaleX", 0.75], ["scaleY", 0.5]]],
  ["transform: scale(0.75);",      [["scaleX", 0.75], ["scaleY", 0.75]]],
  ["transform: scaleX(75%);",      [["scaleX", 0.75]]],
  ["transform: scaleY(75%);",      [["scaleY", 0.75]]],
  ["transform: scaleX(0.75);",     [["scaleX", 0.75]]],
  ["transform: scaleY(0.75);",     [["scaleY", 0.75]]],
  ["transform: scaleX(-50%);",     [["scaleX", -0.5]]],
  ["transform: scaleY(0%);",       [["scaleY", 0]]],
  ["transform: scaleX(100%);",     [["scaleX", 1]]],
  // Coexisting in one shorthand: neither emitter interferes with the other.
  ["transform: scaleX(75%) scaleY(2);", [["scaleX", 0.75], ["scaleY", 2]]],

  // Supplied through a CSS variable. A variable the compiler can resolve to a
  // single value is inlined here, so it lands on the same emitters above rather
  // than reaching the runtime — the runtime half of this census lives in
  // `src/__tests__/native/transform.test.tsx`, behind a variable that cannot be
  // inlined.
  ["--s: 75%; scale: var(--s);",                      [["scaleX", 0.75], ["scaleY", 0.75]]],
  ["--sx: 75%; --sy: 50%; scale: var(--sx) var(--sy);", [["scaleX", 0.75], ["scaleY", 0.5]]],
  ["--s: 75%; transform: scale(var(--s));",           [["scaleX", 0.75], ["scaleY", 0.75]]],
  ["--s: 75%; transform: scaleX(var(--s));",          [["scaleX", 0.75]]],
];

test.each(census)("compiles %s", (declarations, components) => {
  expect(scaleComponentsFor(declarations)).toStrictEqual(components);
});

test("the census covers every declaration that reaches a scale emitter", () => {
  // A census that silently empties makes every `test.each` row vanish while the
  // suite stays green. Pin its magnitude, and pin that it spans both emitters.
  expect(census.length).toBeGreaterThan(0);
  expect(census.some(([css]) => css.startsWith("scale:"))).toBe(true);
  expect(census.some(([css]) => css.startsWith("transform:"))).toBe(true);
});

test.each(census)(
  "every scale component compiled from %s is a number",
  (declarations, components) => {
    // The class-level invariant behind every row above, stated once: a string
    // reaching React Native's transform validator is a hard render crash, so it
    // is the TYPE that must hold, not just the value of the cases listed here.
    const emitted = scaleComponentsFor(declarations);

    // An emitter that stops emitting makes the loop below iterate nothing and
    // pass while asserting nothing. Pin the count first.
    expect(emitted).toHaveLength(components.length);

    expect(emitted.map(([key, value]) => [key, typeof value])).toStrictEqual(
      components.map(([key]) => [key, "number"]),
    );
  },
);

test.each([
  "transform: scale3d(75%, 50%, 1);",
  "transform: scale3d(0.75, 0.5, 1);",
  "transform: scaleZ(75%);",
])("%s emits no scale component at all", (declarations) => {
  // React Native has no 3d scale, so the compiler drops these. Pinned because
  // "dropped" and "emitted as a string" are indistinguishable from a green
  // suite that only ever asserts the rows it happens to list.
  expect(scaleComponentsFor(declarations)).toStrictEqual([]);
});
