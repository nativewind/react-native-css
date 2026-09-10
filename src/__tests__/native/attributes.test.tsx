import { render, screen } from "@testing-library/react-native";
import type { AttrSelectorOperator } from "react-native-css/compiler";
import { compile } from "react-native-css/compiler";
import { Text } from "react-native-css/components/Text";
import { View } from "react-native-css/components/View";
import { registerCSS, testID } from "react-native-css/jest";

import { testAttributes } from "../../native/conditions/attributes";

test(":disabled", () => {
  registerCSS(`.test:disabled { width: 10px; }`);

  // Test when disabled is false
  render(<View testID={testID} className="test" {...{ disabled: false }} />);
  let component = screen.getByTestId(testID);

  expect(component.type).toBe("View");
  expect(component.props).toStrictEqual({
    children: undefined,
    disabled: false,
    testID,
  });

  // Re-render with disabled true
  render(<View testID={testID} className="test" {...{ disabled: true }} />);
  component = screen.getByTestId(testID);

  expect(component.type).toBe("View");
  expect(component.props).toStrictEqual({
    children: undefined,
    disabled: true,
    style: { width: 10 },
    testID,
  });
});

test(":empty", () => {
  registerCSS(`.test:empty { width: 10px; }`);

  // Test when children is not empty
  render(<Text testID={testID} className="test" children="Hello World" />);
  let component = screen.getByTestId(testID);

  expect(component.type).toBe("Text");
  expect(component.props).toStrictEqual({
    children: "Hello World",
    testID,
  });

  // Re-render with empty children
  render(<Text testID={testID} className="test" />);
  component = screen.getByTestId(testID);

  expect(component.type).toBe("Text");
  expect(component.props).toStrictEqual({
    children: undefined,
    style: { width: 10 },
    testID,
  });
});

describe("dataSet attribute selector", () => {
  test("truthy", () => {
    registerCSS(`.test[data-test] { width: 10px; }`);

    // Test without dataSet
    render(<Text testID={testID} className="test" />);
    let component = screen.getByTestId(testID);

    expect(component.type).toBe("Text");
    expect(component.props).toStrictEqual({
      children: undefined,
      testID,
    });

    // Re-render with dataSet
    render(
      <Text
        testID={testID}
        className="test"
        {...{ dataSet: { test: true } }}
      />,
    );
    component = screen.getByTestId(testID);

    expect(component.type).toBe("Text");
    expect(component.props).toStrictEqual({
      children: undefined,
      dataSet: { test: true },
      style: {
        width: 10,
      },
      testID,
    });
  });

  test("equals", () => {
    registerCSS(`.test[data-test='1'] { width: 10px; }`);

    // Test without dataSet
    render(<Text testID={testID} className="test" />);
    let component = screen.getByTestId(testID);

    expect(component.type).toBe("Text");
    expect(component.props).toStrictEqual({
      children: undefined,
      testID,
    });

    // Test with wrong value
    render(
      <Text testID={testID} className="test" {...{ dataSet: { test: 2 } }} />,
    );
    component = screen.getByTestId(testID);

    expect(component.type).toBe("Text");
    expect(component.props).toStrictEqual({
      children: undefined,
      dataSet: { test: 2 },
      testID,
    });

    // Test with correct value
    render(
      <Text testID={testID} className="test" {...{ dataSet: { test: 1 } }} />,
    );
    component = screen.getByTestId(testID);

    expect(component.type).toBe("Text");
    expect(component.props).toStrictEqual({
      children: undefined,
      dataSet: { test: 1 },
      style: {
        width: 10,
      },
      testID,
    });
  });
});

/**
 * A `dataSet` value and the DOM attribute react-native-web projects it onto must
 * answer an attribute selector the same way, because one class string is written
 * for both platforms.
 *
 * The matrix is asserted through a helper rather than the whole-props shape the
 * tests above use: every case here differs only in whether the rule applied, and
 * a rendered `style` says that exactly.
 */
describe("dataSet attribute values compare as strings", () => {
  const matchedWidth = (value: unknown): number | undefined => {
    render(
      <Text
        testID={testID}
        className="test"
        {...{ dataSet: { test: value } }}
      />,
    );
    const style = screen.getByTestId(testID).props.style as
      | { width?: number }
      | undefined;
    return style?.width;
  };

  test("a boolean matches the spelling react-native-web renders", () => {
    registerCSS(`.test[data-test='true'] { width: 10px; }`);

    // `true == "true"` is FALSE — both operands coerce to numbers and
    // `Number("true")` is `NaN` — so loose equality rejects the one value the
    // DOM says matches.
    expect(matchedWidth(true)).toBe(10);
    expect(matchedWidth("true")).toBe(10);
    expect(matchedWidth(false)).toBeUndefined();
  });

  test("a false boolean matches 'false' and nothing else", () => {
    registerCSS(`.test[data-test='false'] { width: 10px; }`);

    expect(matchedWidth(false)).toBe(10);
    expect(matchedWidth("false")).toBe(10);
    expect(matchedWidth(true)).toBeUndefined();
  });

  test("a boolean never matches a numeric operand", () => {
    registerCSS(`.test[data-test='1'] { width: 10px; }`);

    // The FALSE POSITIVE direction: `true == "1"` is `true`, so loose equality
    // matched a rule the DOM does not, on an element whose attribute reads
    // `data-test="true"`.
    expect(matchedWidth(true)).toBeUndefined();
    expect(matchedWidth(1)).toBe(10);
    expect(matchedWidth("1")).toBe(10);
  });

  test("an empty operand needs an empty value, not a falsy one", () => {
    registerCSS(`.test[data-test=''] { width: 10px; }`);

    // This direction needs no boolean at all: `0 == ""` is `true`, so a numeric
    // zero matched an empty-string selector.
    expect(matchedWidth(0)).toBeUndefined();
    expect(matchedWidth(false)).toBeUndefined();
    expect(matchedWidth("")).toBe(10);
  });

  test("equality agrees with the substring operators about one element", () => {
    // The internal inconsistency that localises the defect: every other operator
    // already coerces with `.toString()`, so before this change `[data-test='true']`
    // was the one spelling that disagreed with `[data-test*='ru']` about the same
    // element.
    registerCSS(`
      .contains[data-test*='ru'] { width: 10px; }
      .equality[data-test='true'] { width: 10px; }
    `);

    for (const className of ["contains", "equality"]) {
      render(
        <Text
          testID={testID}
          className={className}
          {...{ dataSet: { test: true } }}
        />,
      );
      expect(screen.getByTestId(testID).props.style).toEqual({ width: 10 });
    }
  });
});

describe("dataSet attribute presence follows the DOM", () => {
  test("a false value still renders the attribute, so it is present", () => {
    registerCSS(`.test[data-test] { width: 10px; }`);

    // react-native-web writes `data-test="false"` for `{ test: false }` — it skips
    // only a NULLISH value — so `[data-test]` matches on the web. A plain PROP is
    // the opposite case and keeps its `!== false` rule: there `false` means the
    // boolean attribute is absent, which is what `:disabled` above depends on.
    //
    // `null` is asserted beside `false` and `undefined` because presence is defined
    // as nullish-ness: covering only the other two leaves the `!== null` half of
    // that definition unpinned.
    render(
      <Text
        testID={testID}
        className="test"
        {...{ dataSet: { test: false } }}
      />,
    );
    expect(screen.getByTestId(testID).props.style).toEqual({ width: 10 });

    for (const absent of [undefined, null]) {
      render(
        <Text
          testID={testID}
          className="test"
          {...{ dataSet: { test: absent } }}
        />,
      );
      expect(screen.getByTestId(testID).props.style).toBeUndefined();
    }
  });
});

/**
 * Selectors §6.1's remaining operators, each measured against the spec's own
 * wording rather than the shape the implementation happens to have.
 */
describe("dataSet attribute operators follow Selectors §6.1", () => {
  const matchedWidth = (
    className: string,
    value: unknown,
  ): number | undefined => {
    render(
      <Text
        testID={testID}
        className={className}
        {...{ dataSet: { test: value } }}
      />,
    );
    const style = screen.getByTestId(testID).props.style as
      | { width?: number }
      | undefined;
    return style?.width;
  };

  test("[att|=val] matches a value that is exactly val", () => {
    registerCSS(`.test[data-test|='en'] { width: 10px; }`);

    // "an element whose att attribute value is a hyphen-separated list of values
    // beginning with val" — the spec spells that out as exactly `val`, OR `val`
    // followed by "-". Only the second half was implemented, so `[lang|="en"]`
    // did not match `lang="en"` — the language it names.
    expect(matchedWidth("test", "en")).toBe(10);
    expect(matchedWidth("test", "en-GB")).toBe(10);
    expect(matchedWidth("test", "english")).toBeUndefined();
    expect(matchedWidth("test", "fr")).toBeUndefined();
  });

  // §6.1's "whitespace" links to INFRA, whose ASCII whitespace is exactly these
  // five code points. Derived rather than restated: the test iterates the set, so
  // a separator dropped from the runtime fails here by name.
  const ASCII_WHITESPACE = [
    ["TAB", "\u0009"],
    ["LF", "\u000A"],
    ["FF", "\u000C"],
    ["CR", "\u000D"],
    ["SPACE", "\u0020"],
  ] as const;

  // `\s` matches these too. None of them is ASCII whitespace, so none separates
  // a word — a value holding one is a single word that no operand equals.
  const NOT_ASCII_WHITESPACE = [
    ["VT", "\u000B"],
    ["NBSP", "\u00A0"],
    ["OGHAM SPACE MARK", "\u1680"],
    ["EN QUAD", "\u2000"],
    ["HAIR SPACE", "\u200A"],
    ["LINE SEPARATOR", "\u2028"],
    ["PARAGRAPH SEPARATOR", "\u2029"],
    ["NARROW NBSP", "\u202F"],
    ["MEDIUM MATHEMATICAL SPACE", "\u205F"],
    ["IDEOGRAPHIC SPACE", "\u3000"],
    ["BOM", "\uFEFF"],
  ] as const;

  test("the separator censuses are non-empty", () => {
    expect(ASCII_WHITESPACE.length).toBe(5);
    expect(NOT_ASCII_WHITESPACE.length).toBeGreaterThan(0);
  });

  test.each(ASCII_WHITESPACE)(
    "[att~=val] treats %s as a word separator",
    (_name, separator) => {
      registerCSS(`.test[data-test~='b'] { width: 10px; }`);

      expect(matchedWidth("test", `a${separator}b`)).toBe(10);
    },
  );

  test.each(NOT_ASCII_WHITESPACE)(
    "[att~=val] does not treat %s as a word separator",
    (_name, character) => {
      registerCSS(`.test[data-test~='b'] { width: 10px; }`);

      expect(matchedWidth("test", `a${character}b`)).toBeUndefined();
    },
  );

  test("[att~=val] splits on whitespace, not on the space character", () => {
    registerCSS(`.test[data-test~='b'] { width: 10px; }`);

    // "a whitespace-separated list of words, one of which is exactly val".
    // A newline separates words exactly as a space does; splitting on `" "`
    // yields one word and finds nothing.
    expect(matchedWidth("test", "a b c")).toBe(10);
    expect(matchedWidth("test", "a\nb")).toBe(10);
    expect(matchedWidth("test", "a\tb")).toBe(10);
    expect(matchedWidth("test", "ab")).toBeUndefined();
  });

  test("[att~=val] represents nothing when val contains whitespace", () => {
    // "If val contains whitespace, it will never represent anything."
    registerCSS(`.test[data-test~='a b'] { width: 10px; }`);

    expect(matchedWidth("test", "a b")).toBeUndefined();
    expect(matchedWidth("test", "a b c")).toBeUndefined();
  });

  test("a substring operator represents nothing when val is empty", () => {
    // "If val is the empty string then the selector does not represent anything."
    registerCSS(`
      .starts[data-test^=''] { width: 10px; }
      .ends[data-test$=''] { width: 10px; }
      .contains[data-test*=''] { width: 10px; }
      .includes[data-test~=''] { width: 10px; }
    `);

    for (const className of ["starts", "ends", "contains", "includes"]) {
      expect(matchedWidth(className, "anything")).toBeUndefined();
      expect(matchedWidth(className, "")).toBeUndefined();
    }
  });

  test("the substring operators read the same string equality does", () => {
    registerCSS(`
      .starts[data-test^='tr'] { width: 10px; }
      .ends[data-test$='ue'] { width: 10px; }
      .contains[data-test*='ru'] { width: 10px; }
    `);

    for (const className of ["starts", "ends", "contains"]) {
      expect(matchedWidth(className, true)).toBe(10);
      expect(matchedWidth(className, "true")).toBe(10);
      expect(matchedWidth(className, false)).toBeUndefined();
    }
  });
});

describe("dataSet attribute case-sensitivity follows Selectors §6.3", () => {
  const matchedWidth = (
    className: string,
    value: unknown,
  ): number | undefined => {
    render(
      <Text
        testID={testID}
        className={className}
        {...{ dataSet: { test: value } }}
      />,
    );
    const style = screen.getByTestId(testID).props.style as
      | { width?: number }
      | undefined;
    return style?.width;
  };

  // Every value-matching operator takes the flag, so the census is the operators
  // rather than a chosen few: an operator that stops honouring it fails by name.
  // Keyed by the operator union and bound with `satisfies`, so a new value-matching
  // operator is a COMPILE error here rather than a census that silently stays at six.
  const CASE_INSENSITIVE_SELECTORS = {
    "=": "[data-test='abc' i]",
    "~=": "[data-test~='abc' i]",
    "|=": "[data-test|='abc' i]",
    "^=": "[data-test^='abc' i]",
    "$=": "[data-test$='abc' i]",
    "*=": "[data-test*='abc' i]",
  } satisfies Record<AttrSelectorOperator, string>;

  test.each(Object.entries(CASE_INSENSITIVE_SELECTORS))(
    "%s honours the i flag",
    (_operator, selector) => {
      registerCSS(`.test${selector} { width: 10px; }`);

      expect(matchedWidth("test", "abc")).toBe(10);
      expect(matchedWidth("test", "ABC")).toBe(10);
      expect(matchedWidth("test", "AbC")).toBe(10);
      expect(matchedWidth("test", "xyz")).toBeUndefined();
    },
  );

  const CASE_SENSITIVE_SELECTORS = {
    "=": "[data-test='abc' s]",
    "~=": "[data-test~='abc' s]",
    "|=": "[data-test|='abc' s]",
    "^=": "[data-test^='abc' s]",
    "$=": "[data-test$='abc' s]",
    "*=": "[data-test*='abc' s]",
  } satisfies Record<AttrSelectorOperator, string>;

  test.each(Object.entries(CASE_SENSITIVE_SELECTORS))(
    "%s honours the s flag",
    (_operator, selector) => {
      registerCSS(`.test${selector} { width: 10px; }`);

      expect(matchedWidth("test", "abc")).toBe(10);
      expect(matchedWidth("test", "ABC")).toBeUndefined();
    },
  );

  test("the s flag and no flag are the same comparison", () => {
    registerCSS(`
      .explicit[data-test='abc' s] { width: 10px; }
      .default[data-test='abc'] { width: 10px; }
    `);

    for (const className of ["explicit", "default"]) {
      expect(matchedWidth(className, "abc")).toBe(10);
      expect(matchedWidth(className, "ABC")).toBeUndefined();
    }
  });

  test("the flag letter is case-insensitive itself", () => {
    // CSS accepts `i`/`I` and `s`/`S`; lightningcss normalises both onto the same
    // `caseSensitivity` value, so the runtime never sees the spelling.
    registerCSS(`
      .upperI[data-test='abc' I] { width: 10px; }
      .upperS[data-test='abc' S] { width: 10px; }
    `);

    expect(matchedWidth("upperI", "ABC")).toBe(10);
    expect(matchedWidth("upperS", "ABC")).toBeUndefined();
    expect(matchedWidth("upperS", "abc")).toBe(10);
  });

  test("a single-compound :is() carries the flag", () => {
    // Measured: lightningcss FLATTENS a single-branch, single-compound `:is()`, so
    // this compiles to a plain `aq` on the rule and never enters
    // `parseIsWhereComponents`. It is here as the shape an author writes, not as
    // coverage of that second builder — an attribute query built inside `:is()` or
    // `:where()` is stored as a container query and never matched against the
    // element at all, with or without a flag.
    registerCSS(`.test:is([data-test='abc' i]) { width: 10px; }`);

    expect(matchedWidth("test", "ABC")).toBe(10);
    expect(matchedWidth("test", "xyz")).toBeUndefined();
  });

  test("the i flag applies to a plain prop, not only to dataSet", () => {
    registerCSS(`.test[aria-label='abc' i] { width: 10px; }`);

    render(<Text testID={testID} className="test" {...{ ariaLabel: "ABC" }} />);
    expect(screen.getByTestId(testID).props.style).toEqual({ width: 10 });
  });

  test("the i flag lowers the operand as well as the value", () => {
    // Both sides are lowered, so an UPPERCASE operand matches a lowercase value.
    registerCSS(`.test[data-test='ABC' i] { width: 10px; }`);

    expect(matchedWidth("test", "abc")).toBe(10);
  });

  test("the i flag does not change which characters separate words", () => {
    // Lowering happens before the split, and it touches no separator.
    registerCSS(`.test[data-test~='ABC' i] { width: 10px; }`);

    expect(matchedWidth("test", "xyz\tabc")).toBe(10);
    expect(matchedWidth("test", "xyz\u00A0abc")).toBeUndefined();
  });

  test("the i flag lowers ASCII only", () => {
    // "any (ASCII-range) case-permutation". `toLowerCase` also maps U+212A KELVIN
    // SIGN onto `k`, which would match a value no browser matches.
    registerCSS(`.test[data-test='k' i] { width: 10px; }`);

    expect(matchedWidth("test", "K")).toBe(10);
    expect(matchedWidth("test", "\u212A")).toBeUndefined();
  });

  // lightningcss reports these — and only these, measured — as
  // `ascii-case-insensitive-if-in-html-element-in-html-document`. A `data-*` name
  // never carries it, so a `data-` selector cannot reach this branch at all.
  const HTML_CONDITIONAL_SELECTORS = [
    ["type", "[type='abc']", { type: "ABC" }],
    ["lang", "[lang|='en']", { lang: "EN-GB" }],
    ["frame", "[frame='hsides']", { frame: "HSIDES" }],
  ] as const;

  test.each(HTML_CONDITIONAL_SELECTORS)(
    "%s is compared case-sensitively off the web",
    (_name, selector, props) => {
      // The condition the value names — an HTML element in an HTML document — is
      // false everywhere this runtime runs, so it resolves to the default. Mapping
      // it to `i` instead turns each of these green, which is what pins the branch.
      registerCSS(`.test${selector} { width: 10px; }`);

      render(<Text testID={testID} className="test" {...props} />);
      expect(screen.getByTestId(testID).props.style).toBeUndefined();
    },
  );
});

describe("[dir=val] folds its operand, as HTML's attribute list does", () => {
  // `dir` does not become an attribute query — it compiles to a media condition
  // that compares literally against the app's direction. `dir` is on HTML's
  // ASCII-case-insensitive list, so a browser answers `[dir="RTL"]` for `dir="rtl"`
  // with no flag written; folding at compile time is what makes the two agree, and
  // it is also what stops an explicit `i` flag being silently dropped here.
  const dirConditions = (selector: string): unknown =>
    compile(`.probe${selector} { width: 1px; }`).stylesheet().s?.[0]?.[1]?.[0]
      ?.m;

  test.each([
    ["lowercase", `[dir="rtl"]`],
    ["uppercase", `[dir="RTL"]`],
    ["mixed case", `[dir="RtL"]`],
    ["uppercase with an explicit i flag", `[dir="RTL" i]`],
  ])("%s compiles to the same condition", (_label, selector) => {
    expect(dirConditions(selector)).toStrictEqual([["=", "dir", "rtl"]]);
  });
});

describe("the negation arm never coerces the prop it does not read", () => {
  // `:empty` compiles to `["a", "children", "!"]`, and `children` is whatever was
  // rendered — an array of elements normally, and anything at all in principle.
  // Building the comparison string before the switch runs a conversion this arm
  // never uses: it throws outright on a null-prototype object, and on the ordinary
  // array case it walks and stringifies every child on every render.
  // Driven through `testAttributes` rather than a render: React refuses a plain
  // object as a child, so the only way to put one in front of this arm is to call
  // the matcher the way `useNativeCss` does.
  const negationHolds = (value: unknown): boolean =>
    testAttributes([["a", "children", "!"]], { children: value }, []);

  test.each([
    ["a null-prototype object", Object.create(null) as unknown],
    ["an object whose toString is not callable", { toString: 5 }],
    ["an array of elements", [1, 2, 3]],
  ])(":empty answers for %s", (_label, value) => {
    expect(() => negationHolds(value)).not.toThrow();
    expect(negationHolds(value)).toBe(false);
  });

  test(":empty still answers true for an empty child list", () => {
    expect(negationHolds(undefined)).toBe(true);
    expect(negationHolds("")).toBe(true);
  });
});

describe("§6 edges every operator has to agree on", () => {
  const matchedWidth = (
    className: string,
    value: unknown,
  ): number | undefined => {
    render(
      <Text
        testID={testID}
        className={className}
        {...{ dataSet: { test: value } }}
      />,
    );
    const style = screen.getByTestId(testID).props.style as
      | { width?: number }
      | undefined;
    return style?.width;
  };

  // The census is every operator that compares a value, so a new one cannot be
  // added without deciding what it answers on an absent attribute.
  const VALUE_OPERATORS = {
    "=": "[data-test='abc']",
    "~=": "[data-test~='abc']",
    "|=": "[data-test|='abc']",
    "^=": "[data-test^='abc']",
    "$=": "[data-test$='abc']",
    "*=": "[data-test*='abc']",
  } satisfies Record<AttrSelectorOperator, string>;

  test.each(Object.entries(VALUE_OPERATORS))(
    "%s represents nothing when the attribute is absent",
    (_operator, selector) => {
      registerCSS(`.test${selector} { width: 10px; }`);

      render(<Text testID={testID} className="test" />);
      expect(screen.getByTestId(testID).props.style).toBeUndefined();
    },
  );

  test.each(Object.entries(VALUE_OPERATORS))(
    "%s represents nothing when the value is nullish",
    (_operator, selector) => {
      registerCSS(`.test${selector} { width: 10px; }`);

      // react-native-web writes no `data-*` attribute for a nullish value, so
      // there is nothing on the web for an operator to compare against.
      expect(matchedWidth("test", undefined)).toBeUndefined();
      expect(matchedWidth("test", null)).toBeUndefined();
    },
  );

  // The cases above use an operand no stringified nullish could contain, so they
  // hold even if the coercion started answering "undefined" / "null". These are
  // the operands that WOULD match those spellings — the only ones that pin the
  // nullish branch rather than the operand's own letters.
  const NULLISH_SPELLING_SELECTORS = [
    ["=", "[data-test='undefined']", undefined],
    ["*=", "[data-test*='efi']", undefined],
    ["^=", "[data-test^='und']", undefined],
    ["$=", "[data-test$='ned']", undefined],
    ["~=", "[data-test~='undefined']", undefined],
    ["=", "[data-test='null']", null],
    ["*=", "[data-test*='ul']", null],
    ["^=", "[data-test^='nu']", null],
    ["$=", "[data-test$='ll']", null],
  ] as const;

  test("the nullish-spelling census can generate cases", () => {
    expect(NULLISH_SPELLING_SELECTORS.length).toBeGreaterThan(0);
  });

  test.each(NULLISH_SPELLING_SELECTORS)(
    "%s does not match a nullish value against its own spelling",
    (_operator, selector, value) => {
      registerCSS(`.test${selector} { width: 10px; }`);

      expect(matchedWidth("test", value)).toBeUndefined();
    },
  );

  // Each of these three "begins with / ends with / contains" operators matches a
  // value identical to its operand — a string begins with, ends with and contains
  // itself. `~=` and `|=` do too, by their own clauses.
  test.each(Object.entries(VALUE_OPERATORS))(
    "%s matches a value equal to the operand",
    (_operator, selector) => {
      registerCSS(`.test${selector} { width: 10px; }`);

      expect(matchedWidth("test", "abc")).toBe(10);
    },
  );

  test("an unquoted operand is the same operand", () => {
    // lightningcss reports an identifier operand and a string operand alike.
    registerCSS(`.test[data-test=abc] { width: 10px; }`);

    expect(matchedWidth("test", "abc")).toBe(10);
    expect(matchedWidth("test", "abd")).toBeUndefined();
  });

  test("a CSS-escaped operand is unescaped before it is compared", () => {
    // `\62` is `b`. The runtime compares the unescaped operand, so a selector
    // written with escapes matches the plain value.
    registerCSS(`.test[data-test='a\\62 c'] { width: 10px; }`);

    expect(matchedWidth("test", "abc")).toBe(10);
  });

  test("[att~=val] finds a word beside separators of any kind or number", () => {
    // What this pins is the OUTCOME, not the tokenisation: whether the split
    // collapses a run of separators is unobservable here, because an operand is
    // guaranteed non-empty and no empty token can equal one. The runtime collapses
    // them because INFRA's algorithm does, and the comment there says so.
    registerCSS(`.test[data-test~='abc'] { width: 10px; }`);

    expect(matchedWidth("test", " abc ")).toBe(10);
    expect(matchedWidth("test", "\t\nabc\r ")).toBe(10);
    expect(matchedWidth("test", "x  abc")).toBe(10);
    expect(matchedWidth("test", "   ")).toBeUndefined();
    expect(matchedWidth("test", "")).toBeUndefined();
  });

  test("[att|=val] matches val followed by nothing but the hyphen", () => {
    registerCSS(`.test[data-test|='en'] { width: 10px; }`);

    expect(matchedWidth("test", "en")).toBe(10);
    expect(matchedWidth("test", "en-")).toBe(10);
    expect(matchedWidth("test", "en-GB-oed")).toBe(10);
    expect(matchedWidth("test", "en_GB")).toBeUndefined();
    expect(matchedWidth("test", "eng")).toBeUndefined();
    expect(matchedWidth("test", "fr-en")).toBeUndefined();
  });

  test("an empty operand is excluded by four operators and not by |=", () => {
    // §6.1/§6.2 give `~=`, `^=`, `$=` and `*=` an explicit empty-`val` exclusion.
    // `|=` has NONE — it is "either being exactly val or beginning with val
    // immediately followed by -" — so an empty operand matches the empty value and
    // every value starting with a hyphen. Measured in Chromium.
    registerCSS(`
      .equals[data-test=''] { width: 10px; }
      .starts[data-test^=''] { width: 10px; }
      .ends[data-test$=''] { width: 10px; }
      .contains[data-test*=''] { width: 10px; }
      .includes[data-test~=''] { width: 10px; }
      .dash[data-test|=''] { width: 10px; }
    `);

    expect(matchedWidth("equals", "")).toBe(10);
    for (const className of ["starts", "ends", "contains", "includes"]) {
      expect(matchedWidth(className, "")).toBeUndefined();
      expect(matchedWidth(className, "anything")).toBeUndefined();
    }

    expect(matchedWidth("dash", "")).toBe(10);
    expect(matchedWidth("dash", "-foo")).toBe(10);
    expect(matchedWidth("dash", "-")).toBe(10);
    expect(matchedWidth("dash", "foo")).toBeUndefined();
  });

  test("a numeric value compares as the string the DOM would show", () => {
    registerCSS(`
      .equals[data-test='1.5'] { width: 10px; }
      .contains[data-test*='.'] { width: 10px; }
    `);

    expect(matchedWidth("equals", 1.5)).toBe(10);
    expect(matchedWidth("contains", 1.5)).toBe(10);
  });

  test("a numeric value matches its own spelling, not an equivalent one", () => {
    // The DOM attribute reads `data-test="1.5"`, so `[data-test='1.50']` matches
    // nothing — the comparison is between strings, never between numbers.
    registerCSS(`.test[data-test='1.50'] { width: 10px; }`);

    expect(matchedWidth("test", 1.5)).toBeUndefined();
    expect(matchedWidth("test", "1.50")).toBe(10);
  });
});

/**
 * The specifications' own worked examples, kept in their original spelling so a
 * reader can check each against the section it comes from.
 *
 * These run against PLAIN PROPS rather than `dataSet`, which is the other query
 * type and the one the rest of this file exercises least.
 */
describe("the examples Selectors and CSS 2.1 give for section 6", () => {
  const matchedWidth = (
    className: string,
    props: Record<string, unknown>,
  ): number | undefined => {
    render(<Text testID={testID} className={className} {...props} />);
    const style = screen.getByTestId(testID).props.style as
      | { width?: number }
      | undefined;
    return style?.width;
  };

  test("h1[title] — presence, whatever the value", () => {
    registerCSS(`.test[title] { width: 10px; }`);

    expect(matchedWidth("test", { title: "anything" })).toBe(10);
    expect(matchedWidth("test", { title: "" })).toBe(10);
    expect(matchedWidth("test", {})).toBeUndefined();
  });

  test("span[hello='Cleveland'][goodbye='Columbus'] — every query must hold", () => {
    // CSS 2.1 §5.8.1's conjunction example. `testAttributes` answers a list with
    // `every`, and this is the only case in the file that has two queries in it.
    registerCSS(
      `.test[hello='Cleveland'][goodbye='Columbus'] { width: 10px; }`,
    );

    expect(
      matchedWidth("test", { hello: "Cleveland", goodbye: "Columbus" }),
    ).toBe(10);
    expect(
      matchedWidth("test", { hello: "Cleveland", goodbye: "Cleveland" }),
    ).toBeUndefined();
    expect(matchedWidth("test", { hello: "Cleveland" })).toBeUndefined();
    expect(matchedWidth("test", { goodbye: "Columbus" })).toBeUndefined();
  });

  test("a[rel~='copyright'] — one word of a whitespace-separated list", () => {
    registerCSS(`.test[rel~='copyright'] { width: 10px; }`);

    expect(matchedWidth("test", { rel: "copyright copyleft copyeditor" })).toBe(
      10,
    );
    expect(matchedWidth("test", { rel: "copyright" })).toBe(10);
    // A word is matched WHOLE — a prefix of one is not a member of the list.
    expect(matchedWidth("test", { rel: "copyrights" })).toBeUndefined();
    expect(
      matchedWidth("test", { rel: "copyleft copyeditor" }),
    ).toBeUndefined();
  });

  test("a[href='http://www.w3.org/'] — exact, punctuation and all", () => {
    registerCSS(`.test[href='http://www.w3.org/'] { width: 10px; }`);

    expect(matchedWidth("test", { href: "http://www.w3.org/" })).toBe(10);
    expect(matchedWidth("test", { href: "http://www.w3.org" })).toBeUndefined();
  });

  test("*[lang|='en'] — en, en-US and en-cockney", () => {
    // CSS 2.1 §5.8.1 names exactly these three.
    registerCSS(`.test[lang|='en'] { width: 10px; }`);

    for (const lang of ["en", "en-US", "en-cockney"]) {
      expect(matchedWidth("test", { lang })).toBe(10);
    }
    expect(matchedWidth("test", { lang: "english" })).toBeUndefined();
    expect(matchedWidth("test", { lang: "fr" })).toBeUndefined();
  });

  test("object[type^='image/'] — Selectors §6.2's prefix example", () => {
    registerCSS(`.test[type^='image/'] { width: 10px; }`);

    expect(matchedWidth("test", { type: "image/png" })).toBe(10);
    expect(matchedWidth("test", { type: "image/" })).toBe(10);
    expect(matchedWidth("test", { type: "text/image/png" })).toBeUndefined();
  });

  test("a[href$='.html'] — Selectors §6.2's suffix example", () => {
    registerCSS(`.test[href$='.html'] { width: 10px; }`);

    expect(matchedWidth("test", { href: "index.html" })).toBe(10);
    expect(matchedWidth("test", { href: ".html" })).toBe(10);
    expect(matchedWidth("test", { href: "index.htm" })).toBeUndefined();
    expect(matchedWidth("test", { href: "a.html.bak" })).toBeUndefined();
  });

  test("p[title*='hello'] — Selectors §6.2's substring example", () => {
    registerCSS(`.test[title*='hello'] { width: 10px; }`);

    expect(matchedWidth("test", { title: "say hello there" })).toBe(10);
    expect(matchedWidth("test", { title: "hello" })).toBe(10);
    expect(matchedWidth("test", { title: "HELLO" })).toBeUndefined();
  });

  test("[frame=hsides i] — Selectors §6.3's flag example", () => {
    registerCSS(`.test[frame='hsides' i] { width: 10px; }`);

    for (const frame of ["hsides", "HSIDES", "hSides"]) {
      expect(matchedWidth("test", { frame })).toBe(10);
    }
    expect(matchedWidth("test", { frame: "vsides" })).toBeUndefined();
  });
});
