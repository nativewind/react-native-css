import type { ViewStyle } from "react-native";

import { act, fireEvent, render, screen } from "@testing-library/react-native";
import { View } from "react-native-css/components/View";
import { registerCSS, testID } from "react-native-css/jest";
import { colorScheme } from "react-native-css/runtime";

import { dimensions } from "../../native/reactivity";

const children = undefined;

/**
 * Every border style key React Native declares.
 *
 * The membership is written by hand; what is not is the CONSTRAINT on it.
 * `satisfies readonly (keyof ViewStyle)[]` makes React Native's own type
 * decide which names may appear, so a name it does not declare cannot be added
 * here to let a dead key through, and a name it drops in a later release turns
 * the type-check red. Note which logical names are absent — there is no
 * `borderInline*` of any kind, no `borderBlockWidth`, and no per-edge
 * `border*Style`. Those are the keys this file exists to keep out of a
 * rendered component.
 */
const REACT_NATIVE_BORDER_KEYS = [
  "borderBlockColor",
  "borderBlockEndColor",
  "borderBlockStartColor",
  "borderBottomColor",
  "borderBottomWidth",
  "borderColor",
  "borderEndColor",
  "borderEndWidth",
  "borderLeftColor",
  "borderLeftWidth",
  "borderRightColor",
  "borderRightWidth",
  "borderStartColor",
  "borderStartWidth",
  "borderStyle",
  "borderTopColor",
  "borderTopWidth",
  "borderWidth",
] as const satisfies readonly (keyof ViewStyle)[];

/**
 * Whether React Native understands a style key.
 *
 * A key it does not declare never reaches a shadow node — React Native's view
 * config is a whitelist, so an unknown key is dropped with no error, no
 * warning and no paint. That silence is why the assertion has to be made here,
 * against the props a component actually received.
 */
const isRealStyleKey = (key: string): boolean =>
  (REACT_NATIVE_BORDER_KEYS as readonly string[]).includes(key);

/**
 * The style keys a rendered component actually received, sorted.
 *
 * `props` is untyped, and every assertion below that counts keys rather than
 * comparing whole objects needs a real `string[]` to work from.
 */
const styleKeys = (id: string): string[] => {
  const { style } = screen.getByTestId(id).props as { style?: object };
  return style === undefined ? [] : Object.keys(style).sort();
};

/**
 * The distinct values a rendered component's style holds, sorted.
 *
 * A key-set assertion cannot see a scheme whose colour never applied — the
 * keys are identical either way — so any test that switches scheme asserts
 * over this as well.
 */
const styleValues = (id: string): unknown[] => {
  const { style } = screen.getByTestId(id).props as { style?: object };
  return style === undefined
    ? []
    : [...new Set(Object.values(style))].sort((first, second) =>
        String(first).localeCompare(String(second)),
      );
};

/**
 * React Native has no `borderInline*` style attribute of any kind, so a key
 * shaped like one is inert whatever value it carries.
 */
const isInlineKey = (key: string): boolean => key.startsWith("borderInline");

/**
 * A variable with a single definition is inlined by the compiler, so the
 * declaration never reaches the unparsed path these tests exercise. Every
 * variable below is defined twice to keep it unresolved at compile time.
 */
const twiceDefined = `
  :root { --width: 1px; --other-width: 2px; --color: red; --other-color: blue; }
  .redefine { --width: 9px; --other-width: 9px; --color: black; --other-color: black; }
`;

afterEach(() => {
  act(() => {
    colorScheme.set("light");
  });
});

describe("border-inline-color / -width via var()", () => {
  test("a single var() reaches both edges of a rendered View", () => {
    registerCSS(
      `.my-class { border-inline-color: var(--color); } ${twiceDefined}`,
    );

    render(<View testID={testID} className="my-class" />);
    const component = screen.getByTestId(testID);

    expect(component.type).toBe("View");
    expect(component.props).toStrictEqual({
      children,
      testID,
      style: { borderStartColor: "red", borderEndColor: "red" },
    });
  });

  test("var() with a fallback", () => {
    registerCSS(`
      .colour { border-inline-color: var(--missing, red); }
      .width { border-inline-width: var(--missing, 3px); }
      .redefine-a { --missing: 1px; }
      .redefine-b { --missing: 2px; }
    `);

    render(
      <View testID="colour" className="colour">
        <View testID="width" className="width" />
      </View>,
    );

    expect(screen.getByTestId("colour").props.style).toStrictEqual({
      borderStartColor: "red",
      borderEndColor: "red",
    });
    expect(screen.getByTestId("width").props.style).toStrictEqual({
      borderStartWidth: 3,
      borderEndWidth: 3,
    });
  });

  test("calc() over a var()", () => {
    registerCSS(
      `.my-class { border-inline-width: calc(var(--width) * 2); } ${twiceDefined}`,
    );

    render(<View testID={testID} className="my-class" />);
    expect(screen.getByTestId(testID).props.style).toStrictEqual({
      borderStartWidth: 2,
      borderEndWidth: 2,
    });
  });

  test("a var() that resolves to nothing paints nothing", () => {
    registerCSS(`
      .my-class { border-inline-color: var(--undefined-everywhere); }
      .redefine-a { --undefined-everywhere: red; }
      .redefine-b { --undefined-everywhere: blue; }
    `);

    render(<View testID={testID} className="my-class" />);
    expect(screen.getByTestId(testID).props.style).toStrictEqual({});
  });
});

describe("border-inline-color / -width two-value expansion", () => {
  /**
   * The grammar is `<value>{1,2}`: the second component is the END edge, not a
   * second value for both edges. The parsed path already does this, so the
   * unparsed path is asserted against it as well as against the literal props.
   */
  test("width: the unparsed pair matches the parsed pair", () => {
    registerCSS(`
      .unparsed { border-inline-width: var(--width) var(--other-width); }
      .parsed { border-inline-width: 1px 2px; }
      ${twiceDefined}
    `);

    render(
      <View testID="unparsed" className="unparsed">
        <View testID="parsed" className="parsed" />
      </View>,
    );

    const unparsed = screen.getByTestId("unparsed").props.style;
    const parsed = screen.getByTestId("parsed").props.style;

    expect(unparsed).toStrictEqual({
      borderStartWidth: 1,
      borderEndWidth: 2,
    });
    expect(unparsed).toStrictEqual(parsed);
  });

  test("colour: the unparsed pair matches the parsed pair", () => {
    registerCSS(`
      .unparsed { border-inline-color: var(--color) var(--other-color); }
      .parsed { border-inline-color: red blue; }
      ${twiceDefined}
    `);

    render(
      <View testID="unparsed" className="unparsed">
        <View testID="parsed" className="parsed" />
      </View>,
    );

    expect(screen.getByTestId("unparsed").props.style).toStrictEqual({
      borderStartColor: "red",
      borderEndColor: "blue",
    });
    expect(screen.getByTestId("parsed").props.style).toStrictEqual({
      borderStartColor: "#f00",
      borderEndColor: "#00f",
    });
  });

  test("a literal start and a var() end", () => {
    registerCSS(
      `.my-class { border-inline-width: 1px var(--other-width); } ${twiceDefined}`,
    );

    render(<View testID={testID} className="my-class" />);
    expect(screen.getByTestId(testID).props.style).toStrictEqual({
      borderStartWidth: 1,
      borderEndWidth: 2,
    });
  });

  test("a literal start colour and a var() end colour", () => {
    registerCSS(
      `.my-class { border-inline-color: red var(--other-color); } ${twiceDefined}`,
    );

    render(<View testID={testID} className="my-class" />);
    expect(screen.getByTestId(testID).props.style).toStrictEqual({
      borderStartColor: "red",
      borderEndColor: "blue",
    });
  });
});

describe("border-inline-color via light-dark()", () => {
  test("the dark value reaches both edges and no other property", () => {
    registerCSS(`
      .my-class {
        width: var(--width);
        border-inline-color: light-dark(var(--color), var(--other-color));
      }
      ${twiceDefined}
    `);

    render(<View testID={testID} className="my-class" />);
    const component = screen.getByTestId(testID);

    expect(component.props.style).toStrictEqual({
      width: 1,
      borderStartColor: "red",
      borderEndColor: "red",
    });

    act(() => {
      colorScheme.set("dark");
    });

    expect(component.props.style).toStrictEqual({
      width: 1,
      borderStartColor: "blue",
      borderEndColor: "blue",
    });
  });

  test("a preceding colour declaration is left alone", () => {
    registerCSS(`
      .my-class {
        color: black;
        border-inline-color: light-dark(var(--color), var(--other-color));
      }
      ${twiceDefined}
    `);

    render(<View testID={testID} className="my-class" />);
    const component = screen.getByTestId(testID);

    act(() => {
      colorScheme.set("dark");
    });

    expect(component.props.style).toStrictEqual({
      color: "#000",
      borderStartColor: "blue",
      borderEndColor: "blue",
    });
  });
});

describe("border-inline-color via var() under a condition", () => {
  test("inside @media", () => {
    registerCSS(`
      .my-class { border-inline-color: red; }
      @media (min-width: 500px) {
        .my-class { border-inline-color: var(--other-color); }
      }
      ${twiceDefined}
    `);

    act(() => {
      dimensions.set({ ...dimensions.get(), width: 100 });
    });

    render(<View testID={testID} className="my-class" />);
    const component = screen.getByTestId(testID);

    expect(component.props.style).toStrictEqual({
      borderStartColor: "#f00",
      borderEndColor: "#f00",
    });

    act(() => {
      dimensions.set({ ...dimensions.get(), width: 500 });
    });

    expect(component.props.style).toStrictEqual({
      borderStartColor: "blue",
      borderEndColor: "blue",
    });
  });

  test("on :hover", () => {
    registerCSS(`
      .my-class { border-inline-color: red; }
      .my-class:hover { border-inline-color: var(--other-color); }
      ${twiceDefined}
    `);

    render(<View testID={testID} className="my-class" />);
    const component = screen.getByTestId(testID);

    expect(component.props.style).toStrictEqual({
      borderStartColor: "#f00",
      borderEndColor: "#f00",
    });

    act(() => {
      fireEvent(component, "hoverIn");
    });

    expect(component.props.style).toStrictEqual({
      borderStartColor: "blue",
      borderEndColor: "blue",
    });
  });

  test("!important beats a later longhand", () => {
    registerCSS(`
      .my-class { border-inline-color: var(--color) !important; }
      .my-class { border-inline-end-color: black; }
      ${twiceDefined}
    `);

    render(<View testID={testID} className="my-class" />);
    expect(screen.getByTestId(testID).props.style).toStrictEqual({
      borderStartColor: "red",
      borderEndColor: "red",
    });
  });

  test("a later longhand beats the shorthand", () => {
    registerCSS(`
      .my-class { border-inline-color: var(--color); border-inline-end-color: black; }
      ${twiceDefined}
    `);

    render(<View testID={testID} className="my-class" />);
    expect(screen.getByTestId(testID).props.style).toStrictEqual({
      borderStartColor: "red",
      borderEndColor: "#000",
    });
  });
});

describe("border-inline style longhands via var()", () => {
  /**
   * React Native has no per-side border style attribute, so an inline border
   * style paints nothing whatever its value resolves to. The width beside it
   * still reaches its edge — that pair is what every Tailwind v4
   * `border-{x,s,e}-*` utility emits.
   */
  test.each([
    "border-inline-style",
    "border-inline-start-style",
    "border-inline-end-style",
  ])("%s paints nothing", (property) => {
    registerCSS(`
      .my-class { ${property}: var(--style); }
      :root { --style: solid; }
      .redefine { --style: dashed; }
    `);

    render(<View testID={testID} className="my-class" />);
    expect(screen.getByTestId(testID).props).toStrictEqual({
      children,
      testID,
    });
  });

  test("the width beside a var() style still reaches its edge", () => {
    registerCSS(`
      .my-class {
        border-inline-start-style: var(--style);
        border-inline-start-width: var(--width);
      }
      :root { --style: solid; }
      .redefine { --style: dashed; }
      ${twiceDefined}
    `);

    render(<View testID={testID} className="my-class" />);
    expect(screen.getByTestId(testID).props.style).toStrictEqual({
      borderStartWidth: 1,
    });
  });
});

/**
 * React Native has no per-edge border STYLE attribute, at any layer:
 * `BaseViewConfig.{android,ios}.js` lists `borderStyle` and nothing per-edge,
 * `ViewStyle` declares only `borderStyle`, and Android's `BorderDrawable`
 * holds one `borderStyle` for the whole path. So the style component of an
 * inline-axis shorthand is dropped rather than widened to `borderStyle`, which
 * would paint the block edges the declaration never mentioned.
 *
 * The width and colour components have RTL-aware per-edge props
 * (`borderStartWidth` / `borderEndWidth` / `borderStartColor` /
 * `borderEndColor`) and do reach the component.
 */
const shorthandDefinitions = `
  :root { --shorthand: 1px solid red; }
  .redefine { --shorthand: 2px dashed blue; }
`;

describe("border-inline / -start / -end shorthands via var()", () => {
  test.each([
    [
      "border-inline",
      {
        borderStartWidth: 1,
        borderEndWidth: 1,
        borderStartColor: "red",
        borderEndColor: "red",
      },
    ],
    ["border-inline-start", { borderStartWidth: 1, borderStartColor: "red" }],
    ["border-inline-end", { borderEndWidth: 1, borderEndColor: "red" }],
  ])("%s expands onto its edges", (property, expected) => {
    registerCSS(
      `.my-class { ${property}: var(--shorthand); } ${shorthandDefinitions}`,
    );

    render(<View testID={testID} className="my-class" />);
    expect(screen.getByTestId(testID).props.style).toStrictEqual(expected);
  });

  test("the unparsed expansion matches the parsed expansion", () => {
    registerCSS(`
      .unparsed { border-inline: var(--shorthand); }
      .parsed { border-inline: 1px solid red; }
      ${shorthandDefinitions}
    `);

    render(
      <View testID="unparsed" className="unparsed">
        <View testID="parsed" className="parsed" />
      </View>,
    );

    expect(screen.getByTestId("unparsed").props.style).toStrictEqual({
      borderStartWidth: 1,
      borderEndWidth: 1,
      borderStartColor: "red",
      borderEndColor: "red",
    });
    // The parsed path resolves `red` to #f00 at compile time; every other key
    // must agree, which is what makes the two paths one behaviour.
    expect(styleKeys("unparsed")).toStrictEqual(styleKeys("parsed"));
  });

  test.each(["border-inline", "border-inline-start", "border-inline-end"])(
    "%s never widens its style component to borderStyle",
    (property) => {
      registerCSS(`
        .my-class { ${property}: var(--dashed); }
        :root { --dashed: 1px dashed red; }
        .redefine { --dashed: 2px dotted blue; }
      `);

      render(<View testID={testID} className="my-class" />);
      expect(screen.getByTestId(testID).props.style).not.toHaveProperty(
        "borderStyle",
      );
    },
  );

  /**
   * An empty style object, not an absent one: the declaration compiled to a
   * runtime call, so the descriptor exists and resolves to nothing. The style
   * LONGHANDS above have no descriptor at all, which is why they assert the
   * stricter shape. What both share is that no `borderInline*` key survives.
   */
  test("a var() that resolves to nothing paints nothing", () => {
    registerCSS(`
      .my-class { border-inline: var(--undefined-everywhere); }
      .redefine-a { --undefined-everywhere: 1px solid red; }
      .redefine-b { --undefined-everywhere: 2px solid blue; }
    `);

    render(<View testID={testID} className="my-class" />);
    expect(screen.getByTestId(testID).props.style).toStrictEqual({});
  });

  /**
   * The runtime route has its own way to leak the dead key the parsed path was
   * fixed for: an unmatched or partly-matched value could fall back to writing
   * the descriptor under its own `borderInline*` name. Assert against the
   * component for every arity the grammar accepts, plus one it does not.
   */
  test.each([
    "1px solid red",
    "solid red",
    "1px solid",
    "solid",
    "1px solid red blue extra",
  ])("no borderInline* key reaches the component for `%s`", (value) => {
    registerCSS(`
      .my-class { border-inline: var(--shorthand); }
      :root { --shorthand: ${value}; }
      .redefine { --shorthand: 2px dotted blue; }
    `);

    render(<View testID={testID} className="my-class" />);
    expect(styleKeys(testID).filter(isInlineKey)).toStrictEqual([]);
  });

  /**
   * A var()-valued shorthand resolves after the cascade has already been
   * flattened, so it overwrites a longhand written after it. That is how EVERY
   * runtime shorthand in the library behaves — `border` has done this since it
   * joined the runtime-parsed set — and it is not specific to the inline axis:
   * the literal `border-inline` and the parsed `border-inline-color` pair both
   * let the later longhand win, because those are split at compile time.
   *
   * Asserted as PARITY WITH `border` rather than as a pinned value, so that
   * whoever fixes the shared ordering sees both move together instead of
   * finding a test that hard-codes the wrong answer.
   */
  test("a var() shorthand overrides a later longhand, exactly as `border` does", () => {
    registerCSS(`
      .inline { border-inline: var(--shorthand); border-inline-end-color: black; }
      .uniform { border: var(--shorthand); border-color: black; }
      .literal { border-inline: 1px solid red; border-inline-end-color: black; }
      ${shorthandDefinitions}
    `);

    render(
      <View testID="inline" className="inline">
        <View testID="uniform" className="uniform" />
        <View testID="literal" className="literal" />
      </View>,
    );

    const inline = screen.getByTestId("inline").props.style;
    const uniform = screen.getByTestId("uniform").props.style;

    // Both runtime shorthands lose the later longhand, in the same direction.
    expect(inline.borderEndColor).toBe("red");
    expect(uniform.borderColor).toBe("red");

    // The compile-time split does respect it, which is what makes the above a
    // property of the runtime route rather than of `border-inline` itself.
    expect(screen.getByTestId("literal").props.style.borderEndColor).toBe(
      "#000",
    );
  });

  /**
   * A var() is ONE component value however many values it holds, so a variable
   * carrying a pair is assigned whole rather than split across the two edges.
   *
   * This belongs to the unparsed path rather than to the logical axes, and the
   * comparison routes prove it: the longhand each axis property renames to
   * does the same thing with the same variable, and so does the physical
   * `border-width` shorthand that predates the logical axes entirely. Both
   * predate this change. So the shape is pinned once, on the longhand route
   * that no commit here touches, and the axis routes are asserted as PARITY
   * with it — whoever teaches the unparsed path to split a resolved list then
   * sees every route move together, instead of finding a value hard-coded
   * against three of them.
   *
   * Which half of the residual bites is worth knowing, and it is not the one
   * the colour tests above would suggest. In
   * `Libraries/Components/View/ReactNativeStyleAttributes.js` the width keys
   * are declared `true` — no processor — so the list is handed to the shadow
   * node as it stands, on the longhand route and the axis route alike, while
   * the colour keys carry `colorAttributes` and its `processColor` drops a
   * list on the way. The keys this file drives a width onto are the same ones
   * `border-top-width` and `border-width` have always reached, so the exposure
   * is the unparsed path's rather than the logical axes'.
   */
  test("a two-value var() is one component on the axis route and on every route beside it", () => {
    registerCSS(`
      .axis { border-inline-width: var(--pair); }
      .longhand { border-inline-start-width: var(--pair); }
      .physical { border-width: var(--pair); }
      :root { --pair: 1px 2px; }
      .redefine { --pair: 9px 9px; }
    `);

    render(
      <View testID="axis" className="axis">
        <View testID="longhand" className="longhand" />
        <View testID="physical" className="physical" />
      </View>,
    );

    const axis = screen.getByTestId("axis").props.style;
    const longhand = screen.getByTestId("longhand").props.style;
    const physical = screen.getByTestId("physical").props.style;

    expect(longhand.borderStartWidth).toStrictEqual([1, 2]);

    expect(axis.borderStartWidth).toStrictEqual(longhand.borderStartWidth);
    expect(axis.borderEndWidth).toStrictEqual(longhand.borderStartWidth);
    expect(physical.borderWidth).toStrictEqual(longhand.borderStartWidth);
  });
});

describe("the literal border-inline shorthand reaching the component", () => {
  /**
   * The compiler IR cannot see this defect: a `borderInlineStyle` entry in the
   * emitted declarations looks exactly like a real one. Only the rendered
   * component shows that React Native has no such style attribute, so the key
   * is inert. Assert on the props React Native actually receives.
   */
  test.each(["solid", "dashed", "dotted"])(
    "border-inline: 6px %s #2266ee reaches the edges and carries no dead key",
    (style) => {
      registerCSS(`.my-class { border-inline: 6px ${style} #2266ee; }`);

      render(<View testID={testID} className="my-class" />);

      expect(screen.getByTestId(testID).props.style).toStrictEqual({
        borderStartColor: "#26e",
        borderEndColor: "#26e",
        borderStartWidth: 6,
        borderEndWidth: 6,
      });
      // Named separately from the exact match above, so a regression reports
      // the dead key rather than a whole-object diff.
      expect(styleKeys(testID).filter(isInlineKey)).toStrictEqual([]);
    },
  );

  test.each(["border-inline-start", "border-inline-end"])(
    "%s carries no dead key either",
    (property) => {
      registerCSS(`.my-class { ${property}: 6px dashed #2266ee; }`);

      render(<View testID={testID} className="my-class" />);
      expect(styleKeys(testID).filter(isInlineKey)).toStrictEqual([]);
    },
  );
});

describe("the block axis reaching the component", () => {
  /**
   * The block axis is the inline axis's twin and React Native supports it
   * differently, which is why it needs its own expectations rather than a
   * mirrored copy of the ones above. The per-EDGE block colours are real props
   * — `borderBlockStartColor` and `borderBlockEndColor` are in
   * `ReactNativeStyleAttributes`, in both `BaseViewConfig`s and in `ViewStyle`,
   * and each outranks every other name for its edge on both platforms — so
   * they are kept. The block WIDTHS are in `BaseViewConfig.ios.js` only, and
   * the axis-wide `borderBlockColor` is read in the opposite order by the two
   * platforms, so both map to the physical edges every platform agrees on.
   * `direction` never flips the block axis, so block-start is the top edge and
   * block-end the bottom one on every platform.
   */
  test.each([
    [
      "border-block",
      {
        borderTopColor: "#26e",
        borderBottomColor: "#26e",
        borderTopWidth: 6,
        borderBottomWidth: 6,
      },
    ],
    [
      "border-block-start",
      { borderBlockStartColor: "#26e", borderTopWidth: 6 },
    ],
    ["border-block-end", { borderBlockEndColor: "#26e", borderBottomWidth: 6 }],
  ])("%s: 6px dashed #2266ee reaches real props", (property, expected) => {
    registerCSS(`.my-class { ${property}: 6px dashed #2266ee; }`);

    render(<View testID={testID} className="my-class" />);
    expect(screen.getByTestId(testID).props.style).toStrictEqual(expected);
  });

  test.each([
    ["border-block-width", { borderTopWidth: 6, borderBottomWidth: 6 }],
    ["border-block-start-width", { borderTopWidth: 6 }],
    ["border-block-end-width", { borderBottomWidth: 6 }],
  ])("%s: 6px reaches a width React Native reads", (property, expected) => {
    registerCSS(`.my-class { ${property}: 6px; }`);

    render(<View testID={testID} className="my-class" />);
    expect(screen.getByTestId(testID).props.style).toStrictEqual(expected);
  });

  test("border-block-width takes its second value as the bottom edge", () => {
    registerCSS(`.my-class { border-block-width: 1px 2px; }`);

    render(<View testID={testID} className="my-class" />);
    expect(screen.getByTestId(testID).props.style).toStrictEqual({
      borderTopWidth: 1,
      borderBottomWidth: 2,
    });
  });

  test.each([
    "border-block-style",
    "border-block-start-style",
    "border-block-end-style",
  ])("%s paints nothing", (property) => {
    registerCSS(`.my-class { ${property}: dashed; }`);

    render(<View testID={testID} className="my-class" />);
    expect(screen.getByTestId(testID).props).toStrictEqual({
      children,
      testID,
    });
  });

  test.each([
    [
      "border-block",
      {
        borderTopWidth: 1,
        borderBottomWidth: 1,
        borderTopColor: "red",
        borderBottomColor: "red",
      },
    ],
    ["border-block-start", { borderTopWidth: 1, borderBlockStartColor: "red" }],
    ["border-block-end", { borderBottomWidth: 1, borderBlockEndColor: "red" }],
  ])("%s via var() expands onto the same props", (property, expected) => {
    registerCSS(
      `.my-class { ${property}: var(--shorthand); } ${shorthandDefinitions}`,
    );

    render(<View testID={testID} className="my-class" />);
    expect(screen.getByTestId(testID).props.style).toStrictEqual(expected);
  });

  test("the unparsed block expansion matches the parsed one", () => {
    registerCSS(`
      .unparsed { border-block: var(--shorthand); }
      .parsed { border-block: 1px solid red; }
      ${shorthandDefinitions}
    `);

    render(
      <View testID="unparsed" className="unparsed">
        <View testID="parsed" className="parsed" />
      </View>,
    );

    // The parsed path resolves `red` to #f00 at compile time; every key must
    // agree, which is what makes the two routes one behaviour.
    expect(styleKeys("unparsed")).toStrictEqual(styleKeys("parsed"));
  });

  test.each(["border-block", "border-block-start", "border-block-end"])(
    "%s never widens its style component to borderStyle",
    (property) => {
      registerCSS(`
        .my-class { ${property}: var(--dashed); }
        :root { --dashed: 1px dashed red; }
        .redefine { --dashed: 2px dotted blue; }
      `);

      render(<View testID={testID} className="my-class" />);
      expect(screen.getByTestId(testID).props.style).not.toHaveProperty(
        "borderStyle",
      );
    },
  );

  test("border-block-width via a two-value var() pair splits the edges", () => {
    registerCSS(`
      .my-class { border-block-width: var(--width) var(--other-width); }
      ${twiceDefined}
    `);

    render(<View testID={testID} className="my-class" />);
    expect(screen.getByTestId(testID).props.style).toStrictEqual({
      borderTopWidth: 1,
      borderBottomWidth: 2,
    });
  });

  /**
   * The longhands, at both arities the grammar accepts.
   *
   * The shorthand parity test above is not enough on its own: `border-block`
   * takes no two-value form, so it cannot see a route that agrees with the
   * parsed path at one arity and departs from it at the other. The block
   * colours are exactly that shape — React Native gives the axis a property of
   * its own only for colour, and the parsed path collapses onto it only when
   * both edges agree — so each arity is asserted separately.
   */
  test.each([
    ["border-block-color", "var(--color)", "red"],
    ["border-block-color", "var(--color) var(--other-color)", "red blue"],
    ["border-block-width", "var(--width)", "1px"],
    ["border-block-width", "var(--width) var(--other-width)", "1px 2px"],
  ])(
    "%s: %s reaches the same keys as %s",
    (property, unparsedValue, parsedValue) => {
      registerCSS(`
        .unparsed { ${property}: ${unparsedValue}; }
        .parsed { ${property}: ${parsedValue}; }
        ${twiceDefined}
      `);

      render(
        <View testID="unparsed" className="unparsed">
          <View testID="parsed" className="parsed" />
        </View>,
      );

      expect(styleKeys("unparsed")).toStrictEqual(styleKeys("parsed"));
    },
  );

  /**
   * Why the parity above is a correctness requirement and not a tidiness one.
   *
   * Two declarations of the same property have to resolve as one — later wins.
   * They only can if they land on the same keys: React Native's style object
   * is flat, so two DISJOINT key sets both survive, and the platforms then
   * disagree about which of them paints. A route that emitted
   * `borderBlockStartColor` / `borderBlockEndColor` here would leave the var()
   * painting both edges while the `green` written after it sat unused.
   *
   * The matrix is the full cross product of the two arities and not its
   * diagonal. Two routes that agree at each arity separately still disagree
   * across arities, and only an off-diagonal cell can see it.
   */
  test.each([
    [
      "var(--color)",
      "green",
      { borderTopColor: "#008000", borderBottomColor: "#008000" },
    ],
    [
      "var(--color) var(--other-color)",
      "green",
      { borderTopColor: "#008000", borderBottomColor: "#008000" },
    ],
    [
      "var(--color)",
      "green lime",
      { borderTopColor: "#008000", borderBottomColor: "#0f0" },
    ],
    [
      "var(--color) var(--other-color)",
      "green lime",
      { borderTopColor: "#008000", borderBottomColor: "#0f0" },
    ],
  ])(
    "border-block-color: %s is overridden by a later %s",
    (unparsedValue, override, expected) => {
      registerCSS(`
        .base { border-block-color: ${unparsedValue}; }
        .override { border-block-color: ${override}; }
        ${twiceDefined}
      `);

      render(<View testID={testID} className="base override" />);
      expect(screen.getByTestId(testID).props.style).toStrictEqual(expected);
    },
  );

  /**
   * The same requirement stated over the whole property rather than over one
   * pair of declarations, because arity is not the only thing that moved the
   * target.
   *
   * `parseBorderColor` chose between the axis property and the edge pair by
   * comparing the two parsed components with `===`, which is a REFERENCE
   * comparison: `red red` collapses because both components parse to the same
   * interned string, while `currentcolor` splits because `parseColor` builds a
   * fresh `[{}, "var", "__rn-css-color"]` array per call. Two declarations
   * whose CSS says the same thing about both edges therefore landed on
   * disjoint keys depending on how their value happened to be represented,
   * which no author could predict and no cascade could reconcile.
   */
  test.each([
    ["red", "parsed, one component"],
    ["red blue", "parsed, two components"],
    ["red red", "parsed, two equal components"],
    ["currentcolor", "parsed, one non-primitive component"],
    ["var(--color)", "unparsed, one component"],
    ["var(--color) var(--other-color)", "unparsed, two components"],
    ["var(--color) var(--color)", "unparsed, two equal components"],
  ])("border-block-color: %s (%s) reaches the block edge pair", (value) => {
    registerCSS(`
      .my-class { color: black; border-block-color: ${value}; }
      ${twiceDefined}
    `);

    render(<View testID={testID} className="my-class" />);
    expect(styleKeys(testID)).toStrictEqual([
      "borderBottomColor",
      "borderTopColor",
      "color",
    ]);
  });
});

/**
 * The whole logical-border family, against React Native's own census of style
 * attributes.
 *
 * This is the guard for the CLASS rather than for the rows fixed today. The
 * defect it catches is invisible in the compiler IR — a `borderBlockWidth`
 * entry in the emitted declarations looks exactly like a real one — and it is
 * invisible to a hand-written expectation too, because a test author has to
 * already know which of React Native's near-identical logical props exist.
 *
 * The census below is written out by hand — it has to be, because no type
 * enumerates "the border keys". What is derived is the CONSTRAINT on it:
 * `satisfies readonly (keyof ViewStyle)[]` makes React Native's own type the
 * authority on which names may appear, so a dead key cannot be added here to
 * make a failing case pass, and a name React Native drops in a later release
 * turns `yarn typecheck` red without anyone editing a list. A name React
 * Native ADDS does not appear on its own; widening the census stays a
 * deliberate edit, which is why the negative control below pins the eleven
 * names this file exists to keep out.
 */
describe("no logical border property reaches a key React Native lacks", () => {
  /** Every `border-{inline,block}[-start|-end][-width|-style|-color]`. */
  const FAMILY: string[] = ["inline", "block"].flatMap((axis) =>
    ["", "-start", "-end"].flatMap((edge) =>
      ["", "-width", "-style", "-color"].map(
        (suffix) => `border-${axis}${edge}${suffix}`,
      ),
    ),
  );

  const literalFor = (property: string): string => {
    if (property.endsWith("-color")) return "#2266ee";
    if (property.endsWith("-width")) return "6px";
    if (property.endsWith("-style")) return "dashed";
    return "6px dashed #2266ee";
  };

  const varFor = (property: string): string => {
    if (property.endsWith("-color")) return "var(--color)";
    if (property.endsWith("-width")) return "var(--width)";
    if (property.endsWith("-style")) return "var(--style)";
    return "var(--shorthand)";
  };

  /**
   * The members that can carry a colour, which is every member that is not a
   * width or a style — the six shorthands and the six `-color` longhands.
   * Derived from the census rather than listed, so a member added to one is
   * added to the other.
   */
  const COLOUR_BEARING = FAMILY.filter(
    (property) => !property.endsWith("-width") && !property.endsWith("-style"),
  );

  /**
   * The two halves as written in CSS, and as the compiler emits them. Both
   * routes emit the compressed form — a custom property's value is compressed
   * where it is defined, so a var() carries the same text a literal does by
   * the time it reaches a style object.
   */
  const LIGHT_SOURCE = "#2266ee";
  const DARK_SOURCE = "#66aaff";
  const LIGHT_COLOUR = "#26e";
  const DARK_COLOUR = "#6af";

  const lightDarkFor = (property: string): string =>
    property.endsWith("-color")
      ? `light-dark(${LIGHT_SOURCE}, ${DARK_SOURCE})`
      : `6px dashed light-dark(${LIGHT_SOURCE}, ${DARK_SOURCE})`;

  /**
   * The same value with the two halves behind variables, which is a different
   * ROUTE rather than a different spelling: a var() keeps the declaration off
   * the parsed path, so the light-dark() is reduced by the unparsed reducer
   * instead of by `parseColor`. Both reducers open the dark rule the same way,
   * so both have to address it the same way.
   *
   * The census is the `-color` members only, and the three-part shorthands are
   * left out deliberately rather than overlooked. A var() inside one of those
   * compiles to a single runtime call carrying width, style and colour
   * together, and the dark rule the reducer opens holds the colour ALONE — so
   * whichever of the two rules lands second wins the whole set, and no choice
   * of target for the dark rule can fix that. Making it correct means giving
   * the reducer a scheme so the shorthand is reduced twice, once per branch,
   * which is machinery every runtime-parsed shorthand shares (`border`,
   * `border-top`, `box-shadow` and `text-shadow` all miss the same way today)
   * and is not this family's to change.
   */
  const LIGHT_DARK_VAR_COVERED = COLOUR_BEARING.filter((property) =>
    property.endsWith("-color"),
  );

  const lightDarkVarFor = (): string => "light-dark(var(--light), var(--dark))";

  const lightDarkDefinitions = `
    :root { --light: ${LIGHT_SOURCE}; --dark: ${DARK_SOURCE}; }
    .redefine { --light: #000; --dark: #000; }
  `;

  /**
   * Generating the census trades a drift failure for a vacuity one: a family
   * that stopped being generated makes every case below pass over nothing.
   *
   * 24 is the closed set CSS defines for this family — two axes, three edges,
   * four value slots — so a different count means the generator changed rather
   * than that CSS did. The two members are spot-checked because a generator
   * producing 24 wrong strings would satisfy the count alone.
   */
  test("the family census is the whole family", () => {
    expect(FAMILY).toHaveLength(24);
    expect(FAMILY).toContain("border-inline-start-width");
    expect(FAMILY).toContain("border-block-end-color");
  });

  /**
   * The negative control for the oracle above. Every case in this describe is
   * an assertion that a set is EMPTY, and such an assertion passes just as
   * happily when the predicate can never say no — so the predicate is pinned
   * against the exact names this whole file exists to keep out.
   */
  test.each([
    "borderInlineWidth",
    "borderInlineStyle",
    "borderInlineColor",
    "borderInlineStartWidth",
    "borderInlineEndColor",
    "borderBlockWidth",
    "borderBlockStartWidth",
    "borderBlockEndWidth",
    "borderBlockStyle",
    "borderBlockStartStyle",
    "borderBlockEndStyle",
  ])("%s is not a key React Native understands", (key) => {
    expect(isRealStyleKey(key)).toBe(false);
  });

  test("the three block COLOURS are keys React Native does understand", () => {
    expect(isRealStyleKey("borderBlockColor")).toBe(true);
    expect(isRealStyleKey("borderBlockStartColor")).toBe(true);
    expect(isRealStyleKey("borderBlockEndColor")).toBe(true);
  });

  test.each(FAMILY)("%s (literal) emits only real style keys", (property) => {
    registerCSS(`.my-class { ${property}: ${literalFor(property)}; }`);

    render(<View testID={testID} className="my-class" />);
    expect(
      styleKeys(testID).filter((key) => !isRealStyleKey(key)),
    ).toStrictEqual([]);
  });

  test.each(FAMILY)("%s (var) emits only real style keys", (property) => {
    registerCSS(`
      .my-class { ${property}: ${varFor(property)}; }
      :root { --style: solid; }
      .redefine { --style: dashed; }
      ${twiceDefined}
      ${shorthandDefinitions}
    `);

    render(<View testID={testID} className="my-class" />);
    expect(
      styleKeys(testID).filter((key) => !isRealStyleKey(key)),
    ).toStrictEqual([]);
  });

  /**
   * The same guard over the scheme the two spellings above cannot reach.
   *
   * `light-dark()` does not return its dark half through the value the parser
   * hands back — it writes it straight to the builder as a second rule carried
   * by `descriptorProperties`. Every expectation in this file that renders
   * only the light scheme is therefore blind to where that second rule landed,
   * and a dark rule addressed to a name React Native drops paints nothing with
   * no error, no warning and no fallback.
   *
   * Both halves are asserted because a dead key is only one of the two ways
   * the dark rule can miss. Landing on a REAL key that the light scheme did not
   * use is the other: the two schemes then disagree about which key holds the
   * colour, so the style object keeps both and the value that paints is
   * whichever one the platform ranks higher, not the one the scheme selected.
   */
  test.each(COLOUR_BEARING)(
    "%s (light-dark) emits only real style keys in both schemes",
    (property) => {
      registerCSS(`.my-class { ${property}: ${lightDarkFor(property)}; }`);

      render(<View testID={testID} className="my-class" />);
      const light = styleKeys(testID);

      expect(light.filter((key) => !isRealStyleKey(key))).toStrictEqual([]);
      expect(styleValues(testID)).toContain(LIGHT_COLOUR);

      act(() => {
        colorScheme.set("dark");
      });

      const dark = styleKeys(testID);

      expect(dark.filter((key) => !isRealStyleKey(key))).toStrictEqual([]);
      expect(dark).toStrictEqual(light);

      // The half a key-set assertion cannot see: a dark rule that landed on a
      // real key can still be the one that never applied.
      expect(styleValues(testID)).toContain(DARK_COLOUR);
      expect(styleValues(testID)).not.toContain(LIGHT_COLOUR);
    },
  );

  test.each(LIGHT_DARK_VAR_COVERED)(
    "%s (light-dark over var) carries its scheme's colour to every key it sets",
    (property) => {
      registerCSS(`
        .my-class { ${property}: ${lightDarkVarFor()}; }
        ${lightDarkDefinitions}
      `);

      render(<View testID={testID} className="my-class" />);
      const light = styleKeys(testID);

      expect(light.filter((key) => !isRealStyleKey(key))).toStrictEqual([]);
      expect(styleValues(testID)).toStrictEqual([LIGHT_COLOUR]);

      act(() => {
        colorScheme.set("dark");
      });

      expect(styleKeys(testID)).toStrictEqual(light);
      expect(styleValues(testID)).toStrictEqual([DARK_COLOUR]);
    },
  );
});
