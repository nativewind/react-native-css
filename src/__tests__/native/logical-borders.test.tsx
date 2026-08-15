import { act, fireEvent, render, screen } from "@testing-library/react-native";
import { View } from "react-native-css/components/View";
import { registerCSS, testID } from "react-native-css/jest";
import { colorScheme } from "react-native-css/runtime";

import { dimensions } from "../../native/reactivity";

const children = undefined;

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

describe("border-inline / -start / -end shorthands via var()", () => {
  /**
   * Each packs width, style and colour into one runtime value, and no style
   * resolver can fan one slot out to a per-edge pair. They are dropped rather
   * than emitted as a `borderInline*` prop React Native has no attribute for.
   */
  test.each(["border-inline", "border-inline-start", "border-inline-end"])(
    "%s paints nothing",
    (property) => {
      registerCSS(`
        .my-class { ${property}: var(--shorthand); }
        :root { --shorthand: 1px solid red; }
        .redefine { --shorthand: 2px solid blue; }
      `);

      render(<View testID={testID} className="my-class" />);
      expect(screen.getByTestId(testID).props).toStrictEqual({
        children,
        testID,
      });
    },
  );
});
