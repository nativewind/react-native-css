import { render, screen } from "@testing-library/react-native";
import { View } from "react-native-css/components/View";
import { registerCSS, testID } from "react-native-css/jest";
import { VariableContextProvider } from "react-native-css/native";

/**
 * The end-to-end half of `font-family-stack.test.ts`: a stack written in CSS
 * has to reach the props as one family name whichever route it takes through
 * the compiler, and a `var()` is the route that only resolves at render.
 *
 * This is the plane that decides the question. A compiler assertion says which
 * descriptor was emitted; only a render says which family React Native is
 * handed, and for every `var()` spelling below the compiler emits the same
 * deferred descriptor whatever the variable holds.
 *
 * A variable is declared twice in each `var()` case on purpose — a variable
 * with a single definition is inlined by the compiler, which narrows it there
 * and never exercises the runtime.
 */

const styleOf = (className: string, css: string): unknown => {
  registerCSS(css);
  render(<View testID={testID} className={className} />);
  return screen.getByTestId(testID).props.style;
};

describe("a stack the compiler could read", () => {
  test("a static stack it could not type arrives as one family", () => {
    // The trailing comma is what pushes this declaration onto the unparsed
    // path. It never reaches `applyValue` — `applyDeclarations` copies a static
    // style straight onto the target — so the runtime reduction cannot save it
    // and the compiler has to.
    expect(
      styleOf("a", `.a { font-family: Inter, Helvetica,; }`),
    ).toStrictEqual({ fontFamily: "Inter" });
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

  test("an unusable entry inside the resolved stack is skipped", () => {
    // The reduction runs on what the variable resolved to, so a head the
    // stylesheet put there is skipped at render the same way a compile-time one
    // is. `unset` resolves to the null literal, `12` to a number.
    expect(
      styleOf(
        "a",
        `:root { --f: 12, Arial; } .other { --f: Georgia; } .a { font-family: var(--f); }`,
      ),
    ).toStrictEqual({ fontFamily: "Arial" });
    expect(
      styleOf(
        "a",
        `:root { --f: unset, Arial; } .other { --f: Georgia; } .a { font-family: var(--f); }`,
      ),
    ).toStrictEqual({ fontFamily: "Arial" });
  });

  test("a var() that resolves to nothing falls through to the next family", () => {
    expect(
      styleOf("a", `.a { font-family: var(--missing), Helvetica; }`),
    ).toStrictEqual({ fontFamily: "Helvetica" });
  });

  test("a function that resolves to something unusable falls through too", () => {
    // Not every deferred head is a `var()`. `calc()` resolves to a number,
    // which is skipped at render for the same reason `12` is skipped at compile
    // time.
    expect(styleOf("a", `.a { font-family: calc(1px), Inter; }`)).toStrictEqual(
      {
        fontFamily: "Inter",
      },
    );
  });
});

describe("a var() fallback", () => {
  // A fallback lives INSIDE the `var()`, so none of these can be answered on
  // the compiler plane: every one compiles to the same deferred descriptor
  // shape and the family is chosen while resolving it.
  //
  // The split inside this block is the useful part. A fallback that resolves to
  // a single family arrives as a string, which `main` already handled — those
  // three are CONTROLS. A fallback that resolves to a stack, or one standing in
  // front of another family, arrives as an array and is where `main` hands
  // React Native a value it refuses.

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
    // The quotes are what keep the comma out of the stack. Splitting here would
    // invent a family called `Bar`.
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
    // Measured, and the cause is upstream of every reduction: the compiler
    // stores a space-separated ident group and a comma-separated stack in the
    // SAME array. `--f: Helvetica Neue` and `--f: Inter, Helvetica` both
    // compile to `["f", [<string>, <string>]]`, which
    // `src/__tests__/compiler/font-family.test.ts` pins. Nothing downstream can
    // tell them apart, so the reduction reads both as a stack.
    //
    // Quoting the name is the fix, and it is CSS's own answer for a family name
    // that is not a single ident.
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
    // A variable set at render rather than in the stylesheet takes the same
    // route, and it is the one a stack can be written into directly.
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

  test("an empty group in front of a family does not swallow it", () => {
    // `[[], "Arial"]` is the shape that reads as a style-function call unless
    // an array head is excluded first, and this is the one route that puts it
    // in front of the reduction end to end.
    registerCSS(`.a { font-family: var(--stack); }`);

    render(
      <VariableContextProvider value={{ "--stack": [[], "Arial"] }}>
        <View testID={testID} className="a" />
      </VariableContextProvider>,
    );

    expect(screen.getByTestId(testID).props.style).toStrictEqual({
      fontFamily: "Arial",
    });
  });

  test("MEASURED: a null head never reaches the reduction on this plane", () => {
    // `applyValue` handles `[null, "Arial"]` and `font-family-stack.test.ts`
    // pins it, but no render can deliver that value, for two independent
    // reasons measured rather than assumed:
    //
    // 1. `StyleDescriptor` has no null member, so `value={{ "--stack": [null,
    //    "Arial"] }}` does not compile. Writing it here fails `yarn typecheck`
    //    with TS2322 rather than failing this test.
    // 2. Even reached past the types, `resolveValue`'s own `isDescriptorArray`
    //    reads a null head as a style-function call (`typeof null ===
    //    "object"`) and resolves the whole stack to `undefined` before
    //    `applyValue` sees it.
    //
    // The second is a separate defect on a shared path, out of this change's
    // reach. What this plane does carry is the head the type system allows,
    // and it takes the reduction's skip branch:
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
