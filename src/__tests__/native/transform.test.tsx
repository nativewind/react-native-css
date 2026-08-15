import { render } from "@testing-library/react-native";
import { View } from "react-native-css/components/View";
import { registerCSS, testID } from "react-native-css/jest";

const renderStyle = (css: string, className: string): unknown => {
  registerCSS(css);

  return render(<View testID={testID} className={className} />).getByTestId(
    testID,
  ).props.style;
};

/**
 * The rendered `transform` array, checked against the shape React Native
 * requires before anything is read out of it.
 *
 * `_validateTransforms` counts the keys of every entry and crashes the screen
 * when the count is not exactly one:
 *
 *   You must specify exactly one property per transform object
 *
 * The check lives here rather than in one test because a census that reads
 * THROUGH a nested entry cannot see that crash: a group `[{ scaleX }, { scaleY }]`
 * yields two correct-looking numeric components and reports green on a style
 * React Native refuses to render. Both failing counts are covered — a group has
 * two or more keys, and the empty entry an unsupported transform leaves behind
 * has none.
 */
const renderTransform = (css: string, className: string): unknown[] => {
  const { transform } = (renderStyle(css, className) ?? {}) as {
    transform?: unknown;
  };

  if (!Array.isArray(transform)) {
    throw new Error(`No transform rendered for .${className}`);
  }

  expect(
    transform.map((entry) => Object.keys(entry as object).length),
  ).toStrictEqual(transform.map(() => 1));

  return transform;
};

describe("translate", () => {
  test("parsed", () => {
    registerCSS(`.my-class { translate: 10%; }`);
    const component = render(
      <View testID={testID} className="my-class" />,
    ).getByTestId(testID);

    expect(component.props.style).toStrictEqual({
      transform: [{ translateX: "10%" }, { translateY: 0 }],
    });
  });

  test("unparsed", () => {
    registerCSS(`
      :root {
        --translate-x: 2;
        --translate-y: 3;
      }
      .my-class { translate: var(--translate-x) var(--translate-y); }`);
    const component = render(
      <View testID={testID} className="my-class" />,
    ).getByTestId(testID);

    expect(component.props.style).toStrictEqual({
      transform: [{ translateX: 2 }, { translateY: 3 }],
    });
  });
});

describe("scale", () => {
  test("parsed", () => {
    registerCSS(`.my-class { scale: 2 3; }`);
    const component = render(
      <View testID={testID} className="my-class" />,
    ).getByTestId(testID);

    expect(component.props.style).toStrictEqual({
      transform: [{ scaleX: 2 }, { scaleY: 3 }],
    });
  });

  test("unparsed", () => {
    registerCSS(`
      .my-class { 
        --scale-x: 2%;
        --scale-y: 2%;
        scale: var(--scale-x) var(--scale-y); 
      }
    `);
    const component = render(
      <View testID={testID} className="my-class" />,
    ).getByTestId(testID);

    // Scale is unitless in RN — a percentage var resolves to the fraction
    // (2% → 0.02), never the string "2%" (which crashes the transform validator).
    expect(component.props.style).toStrictEqual({
      transform: [{ scaleX: 0.02 }, { scaleY: 0.02 }],
    });
  });

  test("unparsed - different values", () => {
    registerCSS(`
      :root {
        --scale-x: 2;
        --scale-y: 3;
      }
      .my-class { scale: var(--scale-x) var(--scale-y); }`);
    const component = render(
      <View testID={testID} className="my-class" />,
    ).getByTestId(testID);

    expect(component.props.style).toStrictEqual({
      transform: [{ scaleX: 2 }, { scaleY: 3 }],
    });
  });

  /**
   * nativewind/react-native-css#216 — React Native's transform validator
   * rejects a non-numeric scale component, and does it by crashing the screen:
   *
   *   Invariant Violation: Transform with key of "scale" must be a number: {"scale":"75%"}
   *
   * A percentage reaches a scale component down two independent paths, and each
   * needs its own guard: the COMPILER collapses every one it can see at build
   * time, and the RUNTIME collapses the ones hidden behind a `var()` it could
   * not inline. `src/__tests__/compiler/transform-scale.test.ts` pins what the
   * first emits into the stylesheet; the two censuses below pin what React
   * Native is actually handed, which is the only plane the crash lives on.
   */
  const scaleKeys = new Set(["scale", "scaleX", "scaleY"]);

  type ScaleComponent = [key: string, value: unknown];

  /**
   * Every scale component in the rendered `transform` array, in order.
   * Collecting them rather than asserting the whole style lets one census cover
   * both shapes the two planes produce — `{ scale }` when the axes agree and
   * `{ scaleX } { scaleY }` when they do not — without a row per shape.
   *
   * It reads one level only, on purpose. `renderTransform` has already refused
   * anything but a single-key entry, so there is no nesting left to walk, and
   * walking it would be the very thing that hid the crash.
   */
  const renderScaleComponents = (
    css: string,
    className: string,
  ): ScaleComponent[] =>
    renderTransform(css, className).flatMap((entry: unknown) =>
      Object.entries(entry as Record<string, unknown>).filter(([key]) =>
        scaleKeys.has(key),
      ),
    );

  /**
   * Every row here is a value the compiler CAN see, so the stylesheet already
   * holds the number — but the assertion is read off the rendered component,
   * which is the only place the crash lives. The compiler test file asserts
   * the same census one plane earlier, against the IR.
   *
   * The two guards are LAYERED on this path, not alternatives: `resolve.ts`
   * normalises a `scaleX` descriptor whether its value came from a `var()` or
   * from a literal, so it repairs a compiler-emitted `"75%"` as well. That is
   * why these rows pin the composite rather than the compiler half — with both
   * guards reverted, `scale: 75%` renders `{ scaleX: "75%", scaleY: "75%" }`
   * and every row below goes red. The one row the compiler half owns alone is
   * `scale: none`: a wrong `0` is a number the runtime has no reason to touch.
   */
  describe("inlined by the compiler", () => {
    const inlinedScaleComponents = (declarations: string): ScaleComponent[] =>
      renderScaleComponents(`.my-class { ${declarations} }`, "my-class");

    // prettier-ignore
    const census: [declarations: string, components: ScaleComponent[]][] = [
      // `scale` longhand.
      ["scale: 75%;",       [["scaleX", 0.75],  ["scaleY", 0.75]]],
      ["scale: 100%;",      [["scaleX", 1],     ["scaleY", 1]]],
      ["scale: 0%;",        [["scaleX", 0],     ["scaleY", 0]]],
      ["scale: -50%;",      [["scaleX", -0.5],  ["scaleY", -0.5]]],
      ["scale: 150%;",      [["scaleX", 1.5],   ["scaleY", 1.5]]],
      ["scale: 12.5%;",     [["scaleX", 0.125], ["scaleY", 0.125]]],
      // Issue #216's own value, and one of the two rows here that can observe
      // a lost `round()` — see the compiler census for why most cannot.
      ["scale: 110%;",      [["scaleX", 1.1],   ["scaleY", 1.1]]],
      ["scale: 2%;",        [["scaleX", 0.02],  ["scaleY", 0.02]]],
      ["scale: 75% 50%;",   [["scaleX", 0.75],  ["scaleY", 0.5]]],
      ["scale: 2 50%;",     [["scaleX", 2],     ["scaleY", 0.5]]],
      ["scale: 75% 50% 2;", [["scaleX", 0.75],  ["scaleY", 0.5]]],
      // The negative controls: a unitless scale was always correct, and has to
      // stay that way — the fix must coerce percentages, not every value.
      ["scale: 0.75;",      [["scaleX", 0.75],  ["scaleY", 0.75]]],
      ["scale: 2;",         [["scaleX", 2],     ["scaleY", 2]]],
      // `scale: none` is the identity transform. Zero would render nothing.
      ["scale: none;",      [["scaleX", 1],     ["scaleY", 1]]],

      // `transform` shorthand — a separate compile-time emitter per function.
      ["transform: scale(75%);",      [["scaleX", 0.75], ["scaleY", 0.75]]],
      ["transform: scale(75%, 50%);", [["scaleX", 0.75], ["scaleY", 0.5]]],
      ["transform: scaleX(75%);",     [["scaleX", 0.75]]],
      ["transform: scaleY(75%);",     [["scaleY", 0.75]]],
      ["transform: scaleX(-50%);",    [["scaleX", -0.5]]],
      ["transform: scaleY(0%);",      [["scaleY", 0]]],
      ["transform: scaleX(100%);",    [["scaleX", 1]]],
      ["transform: scaleX(75%) scaleY(2);", [["scaleX", 0.75], ["scaleY", 2]]],
      ["transform: scale(0.75);",     [["scaleX", 0.75], ["scaleY", 0.75]]],
      ["transform: scaleX(0.75);",    [["scaleX", 0.75]]],
      ["transform: scaleY(0.75);",    [["scaleY", 0.75]]],

      // A `var()` with one visible definition is inlined, so these are compiled
      // rather than resolved. The same spellings behind a competing definition
      // are the runtime census below.
      ["--s: 75%; scale: var(--s);",                        [["scaleX", 0.75], ["scaleY", 0.75]]],
      ["--sx: 75%; --sy: 50%; scale: var(--sx) var(--sy);", [["scaleX", 0.75], ["scaleY", 0.5]]],
      ["--s: 75%; transform: scale(var(--s));",             [["scaleX", 0.75], ["scaleY", 0.75]]],
      ["--s: 75%; transform: scaleX(var(--s));",            [["scaleX", 0.75]]],
    ];

    test("the census covers both compile-time emitters", () => {
      // A census that empties makes every row below vanish while staying green.
      expect(census.length).toBeGreaterThan(0);
      expect(census.some(([css]) => css.startsWith("scale:"))).toBe(true);
      expect(census.some(([css]) => css.startsWith("transform:"))).toBe(true);
    });

    test.each(census)("renders %s", (declarations, components) => {
      expect(inlinedScaleComponents(declarations)).toStrictEqual(components);
    });

    test.each(census)(
      "every scale component rendered from %s is a number",
      (declarations, components) => {
        const rendered = inlinedScaleComponents(declarations);

        // Pin the count first: an emitter that stops emitting would make the
        // type comparison below hold over two empty lists.
        expect(rendered).toHaveLength(components.length);

        expect(
          rendered.map(([key, value]) => [key, typeof value]),
        ).toStrictEqual(components.map(([key]) => [key, "number"]));
      },
    );

    test("`scale: 75%` hands React Native the whole style, unitless", () => {
      // The census asserts components; this asserts the entire prop, because
      // the object below is literally what React Native's transform validator
      // is handed — the shape that crashed a handset with
      //   Invariant Violation: Transform with key of "scale" must be a number
      expect(
        renderStyle(`.my-class { scale: 75%; }`, "my-class"),
      ).toStrictEqual({ transform: [{ scaleX: 0.75 }, { scaleY: 0.75 }] });
    });

    test("`scale: none` is the identity transform, not a collapsed element", () => {
      // Zero here is not a crash — it is worse to find, because the element
      // renders at zero size and nothing reports an error.
      expect(
        renderStyle(`.my-class { scale: none; }`, "my-class"),
      ).toStrictEqual({ transform: [{ scaleX: 1 }, { scaleY: 1 }] });
    });
  });

  describe("runtime resolver", () => {
    /**
     * Reaches the runtime resolver, which is harder than it looks: the compiler
     * INLINES a `var()` it can resolve to a single value, so a fixture with one
     * definition never leaves the compiler and silently tests the other plane.
     *
     * Tailwind v4 emits `--tw-scale-x` / `--tw-scale-y` in every `scale-*`
     * utility, so a real stylesheet holds many competing definitions and none
     * of them can be inlined — the percentage survives as a string until the
     * runtime resolves it. `.competing-definition` reproduces that.
     */
    const runtimeScaleComponents = (declarations: string): ScaleComponent[] =>
      renderScaleComponents(
        `.competing-definition { --sx: 999%; --sy: 999%; }
         .my-class { ${declarations} }`,
        "my-class",
      );

    // prettier-ignore
    const census: [declarations: string, components: ScaleComponent[]][] = [
      // `scale` longhand through the runtime scale() resolver. Equal axes
      // collapse onto the single `scale` key — the key in the crash above.
      ["--sx: 75%; --sy: 75%; scale: var(--sx) var(--sy);",   [["scale", 0.75]]],
      ["--sx: 100%; --sy: 100%; scale: var(--sx) var(--sy);", [["scale", 1]]],
      ["--sx: 0%; --sy: 0%; scale: var(--sx) var(--sy);",     [["scale", 0]]],
      ["--sx: -50%; --sy: -50%; scale: var(--sx) var(--sy);", [["scale", -0.5]]],
      ["--sx: 12.5%; --sy: 12.5%; scale: var(--sx) var(--sy);", [["scale", 0.125]]],
      ["--sx: 110%; --sy: 110%; scale: var(--sx) var(--sy);", [["scale", 1.1]]],
      ["--sx: 75%; scale: var(--sx);",                        [["scale", 0.75]]],
      // Differing axes stay split across both keys.
      ["--sx: 75%; --sy: 50%; scale: var(--sx) var(--sy);",   [["scaleX", 0.75], ["scaleY", 0.5]]],
      // Mixed: the number is untouched, the percentage becomes its fraction.
      ["--sx: 2; --sy: 50%; scale: var(--sx) var(--sy);",     [["scaleX", 2], ["scaleY", 0.5]]],
      // A unitless number through the same resolver is unchanged.
      ["--sx: 2; --sy: 2; scale: var(--sx) var(--sy);",       [["scale", 2]]],
      // `none` is the other keyword that reaches a scale component, and the
      // runtime has to agree with the compiler that it means identity — a
      // `{ scale: "none" }` is the same crash as a `{ scale: "75%" }`.
      ["--sx: none; scale: var(--sx);",                       [["scale", 1]]],
      ["--sx: none; --sy: 2; scale: var(--sx) var(--sy);",    [["scaleX", 1], ["scaleY", 2]]],

      // `transform` shorthand — a different runtime branch to the one above,
      // because scaleX/scaleY are not resolver functions but transform keys.
      ["--sx: 75%; transform: scaleX(var(--sx));",            [["scaleX", 0.75]]],
      ["--sx: 75%; transform: scaleY(var(--sx));",            [["scaleY", 0.75]]],
      ["--sx: 75%; transform: scale(var(--sx));",             [["scale", 0.75]]],
      ["--sx: 75%; --sy: 50%; transform: scaleX(var(--sx)) scaleY(var(--sy));",
                                                              [["scaleX", 0.75], ["scaleY", 0.5]]],
      ["--sx: 2; transform: scaleX(var(--sx));",              [["scaleX", 2]]],
      ["--sx: none; transform: scaleX(var(--sx));",           [["scaleX", 1]]],
      ["--sx: none; transform: scale(var(--sx));",            [["scale", 1]]],
      // The two-operand shorthand: one resolver call, two components.
      ["--sx: 75%; --sy: 50%; transform: scale(var(--sx), var(--sy));",
                                                              [["scaleX", 0.75], ["scaleY", 0.5]]],
      ["--sx: 75%; --sy: 75%; transform: scale(var(--sx), var(--sy));",
                                                              [["scale", 0.75]]],
      ["--sx: 2; --sy: 3; transform: scale(var(--sx), var(--sy));",
                                                              [["scaleX", 2], ["scaleY", 3]]],
    ];

    test("the census reaches both runtime branches", () => {
      // A census that empties makes every `test.each` row below vanish while
      // the suite stays green.
      expect(census.length).toBeGreaterThan(0);
      expect(census.some(([css]) => css.includes("scale: var("))).toBe(true);
      expect(census.some(([css]) => css.includes("transform:"))).toBe(true);
    });

    test.each(census)("resolves %s", (declarations, components) => {
      expect(runtimeScaleComponents(declarations)).toStrictEqual(components);
    });

    test.each(census)(
      "every scale component resolved from %s is a number",
      (declarations, components) => {
        const resolved = runtimeScaleComponents(declarations);

        // Pin the count first: a resolver that stops emitting would make the
        // type comparison below hold over two empty lists.
        expect(resolved).toHaveLength(components.length);

        expect(
          resolved.map(([key, value]) => [key, typeof value]),
        ).toStrictEqual(components.map(([key]) => [key, "number"]));
      },
    );

    /**
     * The counterpart to every row above, and the guard that decides how wide
     * `scaleTransformKeys` may be. React Native validates each key against its
     * OWN expectation, so a coercion applied to the wrong one does not tidy
     * anything up — it swaps this crash for another:
     *
     *   translateX / translateY  number or a percentage string
     *   skewX / skewY            must be a STRING, in deg or rad
     *
     * The skew rows are the sharp ones. `{ skewX: "75%" }` is already invalid,
     * so a reader can talk themselves into "coercing it cannot make things
     * worse" — but `{ skewX: 0.375 }` fails `must be a string`, a different
     * invariant on the same fatal pass, and the percentage handling skew
     * actually needs is a separate fix. Widening the set to reach them turns
     * these two rows red, which is the point of listing them.
     */
    test.each([
      [
        "transform: translateX(var(--sx));",
        { transform: [{ translateX: "75%" }] },
      ],
      [
        "transform: translateY(var(--sx));",
        { transform: [{ translateY: "75%" }] },
      ],
      [
        "translate: var(--sx) var(--sy);",
        { transform: [{ translateX: "75%" }, { translateY: "50%" }] },
      ],
      ["transform: skewX(var(--sx));", { transform: [{ skewX: "75%" }] }],
      ["transform: skewY(var(--sx));", { transform: [{ skewY: "75%" }] }],
    ])("%s keeps its percentage", (declarations, expected) => {
      expect(
        renderStyle(
          `.competing-definition { --sx: 999%; --sy: 999%; }
           .my-class { --sx: 75%; --sy: 50%; ${declarations} }`,
          "my-class",
        ),
      ).toStrictEqual(expected);
    });

    test("Tailwind v4 `scale-75` resolves to a number, beside a numeric decoy", () => {
      // The exact shape measured crashing on an Android handset:
      //   Invariant Violation: Transform with key of "scale" must be a number: {"scale":"75%"}
      //
      // `.decoy` matches the same element and supplies a NUMBER, so a build
      // that skips the percentage path entirely — dropping the declaration
      // rather than coercing it — still renders a transform whose every value
      // is numeric. Asserting the full component list is what separates
      // "coerced" from "silently discarded"; a bare type check cannot.
      const components = renderScaleComponents(
        `.decoy { scale: 3; }
         .scale-50 { --tw-scale-x: 50%; --tw-scale-y: 50%; scale: var(--tw-scale-x) var(--tw-scale-y); }
         .scale-75 { --tw-scale-x: 75%; --tw-scale-y: 75%; scale: var(--tw-scale-x) var(--tw-scale-y); }`,
        "decoy scale-75",
      );

      expect(components).toStrictEqual([
        ["scaleX", 3],
        ["scaleY", 3],
        ["scale", 0.75],
      ]);

      // Stated separately because it is the invariant the device cares about,
      // and it must hold for the decoy's components too.
      expect(components.map(([, value]) => typeof value)).toStrictEqual([
        "number",
        "number",
        "number",
      ]);
    });

    /**
     * The two planes do not agree to the last digit, and the disagreement is
     * inherent rather than incidental — so it is pinned here rather than left
     * for someone to discover as a diff between two builds of one stylesheet.
     *
     * lightningcss holds a percentage as an f32, which makes `2%` arrive at the
     * compiler as `0.019999999552965164`; `round()` is what repairs that, and
     * it repairs it to four decimal places. The runtime never sees an f32 — it
     * has the source string — so it divides exactly and keeps every digit.
     *
     * The same declaration therefore lands on `0.3333` when the compiler can
     * inline the variable and `0.333333` when it cannot. Four decimal places of
     * scale is well under a device pixel, so neither is wrong; making them
     * agree means either rounding the exact value or unrounding the repaired
     * one, and `round()` is shared with every other compiled number.
     */
    test("compile and runtime resolve one declaration to different precision", () => {
      const declarations = `scale: var(--s);`;

      expect(
        renderScaleComponents(
          `.my-class { --s: 33.3333%; ${declarations} }`,
          "my-class",
        ),
      ).toStrictEqual([
        ["scaleX", 0.3333],
        ["scaleY", 0.3333],
      ]);

      expect(
        renderScaleComponents(
          `.decoy { --s: 999%; }
           .my-class { --s: 33.3333%; ${declarations} }`,
          "my-class",
        ),
      ).toStrictEqual([["scale", 0.333333]]);
    });
  });
});

describe("transform", () => {
  test("translateX percentage", () => {
    registerCSS(`.my-class { transform: translateX(10%); }`);
    const component = render(
      <View testID={testID} className="my-class" />,
    ).getByTestId(testID);

    expect(component.props.style).toStrictEqual({
      transform: [{ translateX: "10%" }],
    });
  });

  test("translateY percentage", () => {
    registerCSS(`.my-class { transform: translateY(10%); }`);

    const component = render(
      <View testID={testID} className="my-class" />,
    ).getByTestId(testID);

    expect(component.props.style).toStrictEqual({
      transform: [{ translateY: "10%" }],
    });
  });

  test("rotate-180", () => {
    registerCSS(`.my-class { transform: rotate(180deg); }`);

    const component = render(
      <View testID={testID} className="my-class" />,
    ).getByTestId(testID);

    expect(component.props.style).toStrictEqual({
      transform: [{ rotate: "180deg" }],
    });
  });

  test("rotate-x-45", () => {
    registerCSS(`
.rotate-45 {
  --tw-rotate-x: rotateX(45deg);
  transform: var(--tw-rotate-x) var(--tw-rotate-y) var(--tw-rotate-z) var(--tw-skew-x) var(--tw-skew-y);
}`);

    const component = render(
      <View testID={testID} className="rotate-45" />,
    ).getByTestId(testID);

    expect(component.props.style).toStrictEqual({
      transform: [{ rotateX: "45deg" }],
    });
  });

  test("unparsed translateX percentage", () => {
    registerCSS(
      `.my-class { transform: var(--test); --test: translateX(20%) }`,
    );
    const component = render(
      <View testID={testID} className="my-class" />,
    ).getByTestId(testID);

    expect(component.props.style).toStrictEqual({
      transform: [{ translateX: "20%" }],
    });
  });

  test("multiple", () => {
    registerCSS(`.my-class { transform: translateX(10%) scaleX(2); }`);

    const component = render(
      <View testID={testID} className="my-class" />,
    ).getByTestId(testID);

    expect(component.props.style).toStrictEqual({
      transform: [{ translateX: "10%" }, { scaleX: 2 }],
    });
  });

  /**
   * A resolver hands back either one component or a GROUP of them, and a group
   * used to reach React Native as a single nested entry. `_validateTransforms`
   * counts the keys of every entry and crashes the screen when the count is not
   * one:
   *
   *   You must specify exactly one property per transform object
   *
   * That is the same `__DEV__` pass that raises the scale invariant, so these
   * are full-screen render failures rather than cosmetic shape defects — each
   * shape below was measured throwing out of React Native's own
   * `processTransform`.
   *
   * The fix is one `.flat()` in the `transform` shorthand resolver, which is
   * why the rows span scale AND rotate: a group is a group whichever resolver
   * built it.
   */
  describe("one property per entry", () => {
    test("a two-operand scale() with differing axes renders two entries", () => {
      // `scale(var, var)` is the shape a two-operand authored shorthand takes
      // when the axes disagree. It reproduces with plain numbers too — nothing
      // about it is percentage-specific.
      expect(
        renderStyle(
          `.decoy { --sx: 999%; --sy: 999%; }
           .my-class { --sx: 75%; --sy: 50%; transform: scale(var(--sx), var(--sy)); }`,
          "my-class",
        ),
      ).toStrictEqual({ transform: [{ scaleX: 0.75 }, { scaleY: 0.5 }] });
    });

    test("a two-operand translate() renders two entries, beside a sibling", () => {
      // A different resolver, so this is the row that says the fix is about
      // groups rather than about scale. The `rotate(45deg)` sibling is here
      // because a group and a plain component share the array — flattening has
      // to leave the plain one exactly where it was.
      //
      // The LONGHANDS (`translate:`, `rotate:`, `scale:`) never nest: they do
      // not route through the `transform` shorthand resolver at all. Measured,
      // because a row that reads as coverage and cannot fail is worse than none.
      expect(
        renderStyle(
          `.decoy { --t: 9px; }
           .my-class { --t: 10px; transform: translate(var(--t), var(--t)) rotate(45deg); }`,
          "my-class",
        ),
      ).toStrictEqual({
        transform: [
          { translateX: 10 },
          { translateY: 10 },
          { rotate: "45deg" },
        ],
      });
    });

    test.each([
      "transform: scale3d(1, 2, 3);",
      "transform: scaleZ(2);",
      "transform: matrix(1, 0, 0, 1, 0, 0);",
    ])("%s renders no entry rather than an empty one", (declarations) => {
      // React Native supports none of these, so the compiler emits an empty
      // group for them. Zero keys fails the same invariant two keys does, which
      // makes an unsupported transform a crash rather than a no-op.
      expect(
        renderTransform(`.my-class { ${declarations} }`, "my-class"),
      ).toStrictEqual([]);
    });

    test("an empty group is dropped without taking its neighbour", () => {
      // The discriminating half of the row above: dropping the whole
      // declaration would also produce a valid style, so a supported transform
      // has to survive beside the unsupported one.
      expect(
        renderTransform(
          `.my-class { transform: translateX(10px) scale3d(1, 2, 3); }`,
          "my-class",
        ),
      ).toStrictEqual([{ translateX: 10 }]);
    });
  });
});
