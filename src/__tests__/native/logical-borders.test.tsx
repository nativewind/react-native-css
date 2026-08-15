import { act, fireEvent, render, screen } from "@testing-library/react-native";
import { View } from "react-native-css/components/View";
import { registerCSS, testID } from "react-native-css/jest";
import { colorScheme } from "react-native-css/runtime";

import { dimensions } from "../../native/reactivity";

const children = undefined;

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
