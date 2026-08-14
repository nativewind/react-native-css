import { render } from "@testing-library/react-native";
import { View } from "react-native-css/components/View";
import { registerCSS, testID } from "react-native-css/jest";

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
   * The compiler collapses every percentage it can see at build time, and
   * `src/__tests__/compiler/transform-scale.test.ts` pins that plane. These
   * tests pin the other one: what a percentage becomes after the RUNTIME has
   * resolved it, which is the only plane that can observe the crash above.
   */
  describe("runtime resolver", () => {
    const scaleKeys = new Set(["scale", "scaleX", "scaleY"]);

    type ScaleComponent = [key: string, value: unknown];

    /**
     * Every scale component in the rendered `transform` array, in order.
     * Collecting them rather than asserting the whole style lets one census
     * cover both shapes the runtime produces — `{ scale }` when both axes
     * agree, `{ scaleX } { scaleY }` when they do not.
     */
    const renderScaleComponents = (
      css: string,
      className: string,
    ): ScaleComponent[] => {
      registerCSS(css);

      const style: unknown = render(
        <View testID={testID} className={className} />,
      ).getByTestId(testID).props.style;

      const { transform } = (style ?? {}) as { transform?: unknown };

      if (!Array.isArray(transform)) {
        throw new Error(`No transform rendered for .${className}`);
      }

      return transform.flatMap((entry: unknown) =>
        Object.entries(entry as Record<string, unknown>).filter(([key]) =>
          scaleKeys.has(key),
        ),
      );
    };

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
      ["--sx: 75%; scale: var(--sx);",                        [["scale", 0.75]]],
      // Differing axes stay split across both keys.
      ["--sx: 75%; --sy: 50%; scale: var(--sx) var(--sy);",   [["scaleX", 0.75], ["scaleY", 0.5]]],
      // Mixed: the number is untouched, the percentage becomes its fraction.
      ["--sx: 2; --sy: 50%; scale: var(--sx) var(--sy);",     [["scaleX", 2], ["scaleY", 0.5]]],
      // A unitless number through the same resolver is unchanged.
      ["--sx: 2; --sy: 2; scale: var(--sx) var(--sy);",       [["scale", 2]]],

      // `transform` shorthand — a different runtime branch to the one above,
      // because scaleX/scaleY are not resolver functions but transform keys.
      ["--sx: 75%; transform: scaleX(var(--sx));",            [["scaleX", 0.75]]],
      ["--sx: 75%; transform: scaleY(var(--sx));",            [["scaleY", 0.75]]],
      ["--sx: 75%; transform: scale(var(--sx));",             [["scale", 0.75]]],
      ["--sx: 75%; --sy: 50%; transform: scaleX(var(--sx)) scaleY(var(--sy));",
                                                              [["scaleX", 0.75], ["scaleY", 0.5]]],
      ["--sx: 2; transform: scaleX(var(--sx));",              [["scaleX", 2]]],
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

    test("a percentage translate is left alone — only scale is coerced", () => {
      // The counterpart to every row above. React Native accepts a percentage
      // for translate, so coercing one would be a regression rather than a fix;
      // this is what keeps the runtime coercion scoped to the scale keys.
      registerCSS(
        `.competing-definition { --sx: 999%; }
         .my-class { --sx: 75%; transform: translateX(var(--sx)); }`,
      );

      const style: unknown = render(
        <View testID={testID} className="my-class" />,
      ).getByTestId(testID).props.style;

      expect(style).toStrictEqual({ transform: [{ translateX: "75%" }] });
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
});
