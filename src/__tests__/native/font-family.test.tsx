import { render, screen } from "@testing-library/react-native";
import { View } from "react-native-css/components/View";
import { registerCSS, testID } from "react-native-css/jest";
import { VariableContextProvider } from "react-native-css/native";

const styleOf = (className: string, css: string): unknown => {
  registerCSS(css);
  render(<View testID={testID} className={className} />);
  return screen.getByTestId(testID).props.style;
};

// Every expected value is what Chromium 153, Firefox 155 and WebKit 26.6 compute: a stack with an entry that names no family is invalid
describe("a stack the compiler could read", () => {
  test("a static stack with an empty entry is ignored", () => {
    expect(
      styleOf("a", `.a { font-family: Inter, Helvetica,; }`),
    ).toBeUndefined();
  });

  test("a static stack with nothing usable produces no style at all", () => {
    // The compiler drops the declaration, and it was the rule's only one.
    expect(styleOf("a", `.a { font-family: ,; }`)).toBeUndefined();
  });
});

describe("a stack behind a var()", () => {
  test("a var() holding a stack arrives as one family", () => {
    expect(
      styleOf(
        "a",
        `:root { --stack: Inter, Helvetica; }
         .other { --stack: Georgia, serif; }
         .a { font-family: var(--stack); }`,
      ),
    ).toStrictEqual({ fontFamily: "Inter" });
  });

  test("a var() holding something that cannot name a family sets no family", () => {
    expect(
      styleOf(
        "a",
        `:root { --n: 12; } .other { --n: 13; } .a { font-family: var(--n); }`,
      ),
    ).toStrictEqual({});
  });

  test("an entry in the resolved stack that names no family sets no family", () => {
    expect(
      styleOf(
        "a",
        `:root { --f: 12, Arial; } .other { --f: Georgia; } .a { font-family: var(--f); }`,
      ),
    ).toStrictEqual({});
  });

  test("a var() behind a family still waits, and a value that names no family invalidates the stack", () => {
    expect(
      styleOf(
        "a",
        `:root { --f: Georgia; } .other { --f: Verdana; } .a { font-family: Inter, var(--f); }`,
      ),
    ).toStrictEqual({ fontFamily: "Inter" });
    expect(
      styleOf(
        "a",
        `:root { --f: 12; } .other { --f: Verdana; } .a { font-family: Inter, var(--f); }`,
      ),
    ).toStrictEqual({});
  });

  test("a function in a stack invalidates it", () => {
    expect(
      styleOf("a", `.a { font-family: calc(1px), Inter; }`),
    ).toBeUndefined();
  });

  test("an empty fallback substitutes nothing inside an entry", () => {
    expect(
      styleOf("a", `.a { font-family: var(--missing,) Helvetica; }`),
    ).toStrictEqual({ fontFamily: "Helvetica" });
  });
});

describe("a var() fallback", () => {
  // A var() fallback is chosen while resolving, so these compile to the same deferred descriptor

  test("an undefined var falls back to the literal in its own parentheses", () => {
    // CONTROL — passes on `main`: one family resolves to a string.
    expect(
      styleOf("a", `.a { font-family: var(--missing, Helvetica); }`),
    ).toStrictEqual({ fontFamily: "Helvetica" });
  });

  test("a fallback that is itself a stack narrows to its first family", () => {
    expect(
      styleOf("a", `.a { font-family: var(--missing, Inter, Helvetica); }`),
    ).toStrictEqual({ fontFamily: "Inter" });
  });

  test("a nested fallback resolves to the innermost literal", () => {
    // CONTROL — passes on `main` for the same reason.
    expect(
      styleOf(
        "a",
        `.a { font-family: var(--missing-a, var(--missing-b, serif)); }`,
      ),
    ).toStrictEqual({ fontFamily: "serif" });
  });

  test("a nested fallback stops at the first var() that has a value", () => {
    // CONTROL — passes on `main` for the same reason.
    expect(
      styleOf(
        "a",
        `:root { --b: Georgia; }
         .other { --b: Verdana; }
         .a { font-family: var(--missing-a, var(--b, serif)); }`,
      ),
    ).toStrictEqual({ fontFamily: "Georgia" });
  });

  test("a fallback in the head still lets a later family be reached", () => {
    expect(
      styleOf(
        "a",
        `:root { --f: Inter; }
         .other { --f: Georgia; }
         .a { font-family: var(--missing, Arial), var(--f); }`,
      ),
    ).toStrictEqual({ fontFamily: "Arial" });
  });
});

describe("a family name that is not a bare ident", () => {
  test("a quoted name containing spaces survives the reduction", () => {
    expect(
      styleOf(
        "a",
        `:root { --f: "Helvetica Neue", Arial; }
         .other { --f: Georgia; }
         .a { font-family: var(--f); }`,
      ),
    ).toStrictEqual({ fontFamily: "Helvetica Neue" });
  });

  test("a quoted name containing a comma is one family, not two", () => {
    expect(
      styleOf(
        "a",
        `:root { --f: "Foo, Bar", Arial; }
         .other { --f: Georgia; }
         .a { font-family: var(--f); }`,
      ),
    ).toStrictEqual({ fontFamily: "Foo, Bar" });
  });

  test("KNOWN LIMIT: an UNQUOTED multi-word name behind a var() loses its tail", () => {
    // The compiler stores an ident group and a comma stack as the same array, so an unquoted multi-word name reads as a stack
    expect(
      styleOf(
        "a",
        `:root { --f: Helvetica Neue; }
         .other { --f: Georgia; }
         .a { font-family: var(--f); }`,
      ),
    ).toStrictEqual({ fontFamily: "Helvetica" });

    expect(
      styleOf(
        "a",
        `:root { --f: "Helvetica Neue"; }
         .other { --f: Georgia; }
         .a { font-family: var(--f); }`,
      ),
    ).toStrictEqual({ fontFamily: "Helvetica Neue" });
  });
});

describe("a stack supplied at render", () => {
  test("it arrives as one family, and stays current", () => {
    registerCSS(`.a { font-family: var(--stack); }`);

    render(
      <VariableContextProvider value={{ "--stack": ["Inter", "Helvetica"] }}>
        <View testID={testID} className="a" />
      </VariableContextProvider>,
    );
    const element = screen.getByTestId(testID);
    expect(element.props.style).toStrictEqual({ fontFamily: "Inter" });

    screen.rerender(
      <VariableContextProvider value={{ "--stack": ["Georgia", "serif"] }}>
        <View testID={testID} className="a" />
      </VariableContextProvider>,
    );
    expect(element.props.style).toStrictEqual({ fontFamily: "Georgia" });
  });

  test("an empty group in front of a family invalidates the stack, as an empty entry does", () => {
    registerCSS(`.a { font-family: var(--stack); }`);

    render(
      <VariableContextProvider value={{ "--stack": [[], "Arial"] }}>
        <View testID={testID} className="a" />
      </VariableContextProvider>,
    );

    expect(screen.getByTestId(testID).props.style).toStrictEqual({});
  });

  test("MEASURED: a null head never reaches the reduction on this plane", () => {
    registerCSS(`.a { font-family: var(--stack); }`);

    render(
      <VariableContextProvider value={{ "--stack": [undefined, "Arial"] }}>
        <View testID={testID} className="a" />
      </VariableContextProvider>,
    );

    expect(screen.getByTestId(testID).props.style).toStrictEqual({
      fontFamily: "Arial",
    });
  });
});
