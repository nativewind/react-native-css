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

type TransformComponent = [key: string, value: unknown];

/**
 * Walks the emitted IR and collects every `[{}, <wanted key>, value]` descriptor
 * triple, wherever it is nested. Asserting on the collected components rather
 * than on the exact IR shape pins the property that keeps React Native alive —
 * no scale component is ever a string — instead of the nesting of the day.
 *
 * A descriptor triple leads with the modifier object, which is what separates it
 * from the `[descriptor, propName, specificity]` entries the IR wraps it in;
 * without that check a deferred `[…, "scale", 1]` entry reads as a component
 * whose value is its specificity.
 */
function collectComponents(
  wanted: ReadonlySet<string>,
  node: unknown,
  found: TransformComponent[] = [],
): TransformComponent[] {
  if (typeof node !== "object" || node === null) {
    return found;
  }

  if (Array.isArray(node)) {
    const [modifier, key, value] = node;

    if (
      node.length === 3 &&
      typeof modifier === "object" &&
      !Array.isArray(modifier) &&
      typeof key === "string" &&
      wanted.has(key) &&
      !Array.isArray(value)
    ) {
      found.push([key, value]);
    }
  }

  for (const child of Object.values(node)) {
    collectComponents(wanted, child, found);
  }

  return found;
}

/** The compiled declaration blocks of one class, in specificity order. */
function ruleFor(
  css: string,
  className = "my-class",
): { v?: unknown; d?: unknown }[] {
  const rule = compileWithAutoDebug(css)
    .stylesheet()
    .s?.find(([name]) => name === className)?.[1];

  if (!rule) {
    throw new Error(`No rule compiled for .${className} in: ${css}`);
  }

  return rule;
}

function scaleComponentsFor(declarations: string): TransformComponent[] {
  return collectComponents(scaleKeys, ruleFor(`.my-class { ${declarations} }`));
}

/**
 * The input census. Every row is a CSS spelling that reaches a scale emitter,
 * paired with the components the compiler must emit for it.
 *
 * `transform: scale3d(...)` is deliberately absent from this table — the
 * compiler drops 3d transforms entirely, so it emits no scale component at all.
 * The `emits no scale component` rows below pin that instead.
 *
 * TWO THINGS A ROW HERE CAN FAIL TO OBSERVE, both measured rather than assumed:
 *
 * 1. `round()`. lightningcss stores a percentage as an f32, so a value that is
 *    not representable in 32 bits arrives already wrong — `2%` reaches the
 *    compiler as `0.019999999552965164` — and `round()` is what repairs it.
 *    Most percentages here ARE f32-exact (`75%`, `50%`, `12.5%`, every power of
 *    two over a hundred), so dropping `round()` leaves them untouched and only
 *    the inexact rows go red. `2%` and `110%` are the two that can see it, and
 *    `110%` is the value issue #216 was reported with.
 *
 * 2. `case "scale"` in `parseTransform`. lightningcss pre-normalises a LITERAL
 *    `scale(75%)` / `scale(75%, 50%)` between the compiler's two passes, so
 *    those two rows emit byte-identical IR with the fix reverted and cannot
 *    discriminate on their own. `--s: 75%; transform: scale(var(--s));` is the
 *    row that reaches the case, because the variable defeats the pre-pass. The
 *    literal rows stay because they are the spellings a human writes, and
 *    because a change to the pre-pass should surface here rather than silently.
 */
// prettier-ignore
const census: [declarations: string, components: TransformComponent[]][] = [
  // `scale` longhand — a percentage is the fraction, never the "N%" string.
  ["scale: 75%;",        [["scaleX", 0.75],  ["scaleY", 0.75]]],
  ["scale: 0.75;",       [["scaleX", 0.75],  ["scaleY", 0.75]]],
  ["scale: 100%;",       [["scaleX", 1],     ["scaleY", 1]]],
  ["scale: 0%;",         [["scaleX", 0],     ["scaleY", 0]]],
  ["scale: -50%;",       [["scaleX", -0.5],  ["scaleY", -0.5]]],
  ["scale: 150%;",       [["scaleX", 1.5],   ["scaleY", 1.5]]],
  ["scale: 12.5%;",      [["scaleX", 0.125], ["scaleY", 0.125]]],
  // The two f32-inexact rows — see note 1 above. Without `round()` these are
  // `1.100000023841858` and `0.019999999552965164`; every other row is
  // untouched by it.
  ["scale: 110%;",       [["scaleX", 1.1],   ["scaleY", 1.1]]],
  ["scale: 2%;",         [["scaleX", 0.02],  ["scaleY", 0.02]]],
  ["transform: scaleX(110%);", [["scaleX", 1.1]]],
  ["scale: 75% 50%;",    [["scaleX", 0.75],  ["scaleY", 0.5]]],
  // Mixed: the number is untouched, the percentage becomes its fraction.
  ["scale: 2 50%;",      [["scaleX", 2],     ["scaleY", 0.5]]],
  ["scale: 2;",          [["scaleX", 2],     ["scaleY", 2]]],
  // A third operand is the z axis, which React Native has no key for.
  ["scale: 75% 50% 2;",  [["scaleX", 0.75],  ["scaleY", 0.5]]],
  // `scale: none` means "do not scale", which is identity — not zero.
  ["scale: none;",       [["scaleX", 1],     ["scaleY", 1]]],

  // `transform` shorthand — a separate emitter per function, same requirement.
  // These two do NOT discriminate on their own — see note 2 above.
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
  // The row that actually exercises `case "scale"` — see note 2 above.
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
  // React Native has no z axis, so no scale component is emitted for these.
  // Pinned because "emitted nothing" and "emitted a string" are
  // indistinguishable from a green suite that only asserts the rows it lists.
  expect(scaleComponentsFor(declarations)).toStrictEqual([]);
});

/**
 * The compiler is not the last boundary, and this is the proof. A `var()` with
 * one visible definition is INLINED, which is why every variable row in the
 * census above lands on a compile-time emitter — but a real Tailwind v4
 * stylesheet defines `--tw-scale-x` in every `scale-*` utility, so the compiler
 * sees competing definitions and cannot resolve any of them.
 *
 * What it emits then is the percentage STRING plus a `var()` reference, and the
 * number React Native receives is decided entirely by the runtime resolver.
 * `src/__tests__/native/transform.test.tsx` is the plane that can observe that
 * value; this test states why that plane has to exist.
 */
test("a percentage behind a competing var() is deferred to the runtime unresolved", () => {
  const declarations = `--sx: 75%; --sy: 75%; scale: var(--sx) var(--sy);`;

  const deferred = ruleFor(
    `.decoy { --sx: 999%; --sy: 999%; }
     .my-class { ${declarations} }`,
  );

  // The variables survive as the raw percentage strings...
  expect(deferred.map((block) => block.v)).toStrictEqual([
    [
      ["sx", "75%"],
      ["sy", "75%"],
    ],
  ]);

  // ...and nothing in the rule is the fraction, so no compile-time emitter ran.
  expect(collectComponents(scaleKeys, deferred)).toStrictEqual([]);
  expect(JSON.stringify(deferred)).not.toContain("0.75");

  // The same declarations WITHOUT a competing definition are inlined, which is
  // what makes the assertions above a discrimination rather than a tautology:
  // if this contrast ever collapses, one of these two halves fails.
  expect(
    collectComponents(scaleKeys, ruleFor(`.my-class { ${declarations} }`)),
  ).toStrictEqual([
    ["scaleX", 0.75],
    ["scaleY", 0.75],
  ]);
});

/**
 * The counterpart to the whole census: the coercion is scoped to the scale
 * components and must stay there. React Native REQUIRES a unit on these — a
 * percentage translate and a `deg` rotation are correct, and collapsing them to
 * a bare number would be a regression dressed as consistency.
 */
// prettier-ignore
const unitsAreKept: [declarations: string, components: TransformComponent[]][] = [
  ["transform: translateX(75%);", [["translateX", "75%"]]],
  ["transform: translateY(75%);", [["translateY", "75%"]]],
  ["translate: 10%;",             [["translateX", "10%"], ["translateY", 0]]],
  ["transform: rotate(45deg);",   [["rotate", "45deg"]]],
  ["transform: skewX(45deg);",    [["skewX", "45deg"]]],
  ["transform: skewY(45deg);",    [["skewY", "45deg"]]],
];

test.each(unitsAreKept)("%s keeps its unit", (declarations, components) => {
  const keys = new Set(components.map(([key]) => key));

  expect(
    collectComponents(keys, ruleFor(`.my-class { ${declarations} }`)),
  ).toStrictEqual(components);
});
