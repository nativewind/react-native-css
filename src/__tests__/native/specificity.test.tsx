import { StyleSheet, type ViewProps } from "react-native";

import { fireEvent, render } from "@testing-library/react-native";
import type { StyleRule } from "react-native-css/compiler";
import { compile } from "react-native-css/compiler";
import { Text } from "react-native-css/components/Text";
import { registerCSS, testID } from "react-native-css/jest";
import { styled } from "react-native-css/runtime";
import {
  Specificity,
  specificityCompareFn,
} from "react-native-css/utilities/specificity";

test("inline styles", () => {
  registerCSS(`.red { background-color: red; }`);

  const component = render(
    <Text
      testID={testID}
      className="red"
      style={{ backgroundColor: "blue" }}
    />,
  ).getByTestId(testID);

  expect(component.props.style).toStrictEqual({ backgroundColor: "blue" });
});

test("specificity order", () => {
  registerCSS(`.red { color: red; } .blue { color: blue; }`);

  const component = render(
    <Text testID={testID} className="blue red" />,
  ).getByTestId(testID);

  expect(component.props.style).toStrictEqual({ color: "#00f" });
});

test("specificity modifiers", () => {
  registerCSS(
    `.redOrGreen:hover { color: green; } .redOrGreen { color: red; } .blue { color: blue; }`,
  );

  const component = render(
    <Text testID={testID} className="blue redOrGreen " />,
  ).getByTestId(testID);

  expect(component.props.style).toStrictEqual(
    { color: "#00f" }, // .blue
  );

  fireEvent(component, "hoverIn");

  expect(component.props.style).toStrictEqual({ color: "#008000" }); // Green
});

test("important - requires sorting", () => {
  registerCSS(`
    .red { color: red; }
    .blue { color: blue !important; }
  `);

  const component = render(
    <Text testID={testID} className="blue red" />,
  ).getByTestId(testID);

  expect(component.props.style).toStrictEqual({ color: "#00f" });
});

test("important - inline", () => {
  registerCSS(`
    .blue { background-color: blue !important; }
  `);

  const component = render(
    <Text
      testID={testID}
      className="blue"
      style={{ backgroundColor: "red" }}
    />,
  ).getByTestId(testID);

  expect(component.props.style).toStrictEqual({ backgroundColor: "#00f" });
});

test("important - modifiers", () => {
  registerCSS(`
    .red { color: red; }
    .red:hover { color: green; }
    .blue { color: blue !important; }
  `);

  const component = render(
    <Text testID={testID} className="blue red" />,
  ).getByTestId(testID);

  expect(component.props.style).toStrictEqual({ color: "#00f" });

  fireEvent(component, "hoverIn");

  expect(component.props.style).toStrictEqual({ color: "#00f" });
});

test("passThrough - inline", () => {
  registerCSS(`
    .red { color: red; }
  `);

  const MyText = styled(
    ({ style, ...props }: ViewProps) => {
      return <Text {...props} style={[{ color: "black" }, style]} />;
    },
    { className: "style" },
    { passThrough: true },
  );

  const component = render(
    <MyText testID={testID} className="red" />,
  ).getByTestId(testID);

  // Black wins because it is inline
  expect(StyleSheet.flatten(component.props.style)).toStrictEqual({
    color: "black",
  });
});

test("passThrough - inline reversed", () => {
  registerCSS(`
    .red { color: red; }
  `);

  const MyText = styled(
    ({ style, ...props }: ViewProps) => {
      return <Text {...props} style={[style, { color: "black" }]} />;
    },
    { className: "style" },
    { passThrough: true },
  );

  const component = render(
    <MyText testID={testID} className="red" />,
  ).getByTestId(testID);

  // Black wins because it is inline
  expect(StyleSheet.flatten(component.props.style)).toStrictEqual({
    color: "black",
  });
});

test("passThrough - inline important", () => {
  registerCSS(`
    .red { color: red !important; }
  `);

  const MyText = styled(
    ({ style, ...props }: ViewProps) => {
      return <Text {...props} style={[style, { color: "black" }]} />;
    },
    { className: "style" },
    { passThrough: true },
  );

  const component = render(
    <MyText testID={testID} className="red" />,
  ).getByTestId(testID);

  // Red wins because it is important and overrides the inline style
  expect(StyleSheet.flatten(component.props.style)).toStrictEqual({
    color: "#f00",
  });
});

test("passThrough - inline important existing", () => {
  registerCSS(`
    .red { color: red !important; }
    .blue { color: blue !important; }
  `);

  const MyText = styled(
    ({ style, ...props }: ViewProps) => {
      return (
        <Text {...props} className="blue" style={[style, { color: "black" }]} />
      );
    },
    { className: "style" },
    { passThrough: true },
  );

  const component = render(
    <MyText testID={testID} className="red" />,
  ).getByTestId(testID);

  // Blue wins, because 'red' and 'blue' are both important, but 'blue' has a higher 'order'
  expect(StyleSheet.flatten(component.props.style)).toStrictEqual({
    color: "#00f",
  });
});

test("the runtime sort reproduces the compile-time order after the sheet's JSON transport", () => {
  const compiled = compile(
    `.inp { color: red; } .inp::placeholder { color: blue; }`,
  ).stylesheet().s?.[0]?.[1];

  if (compiled === undefined) {
    throw new Error(
      "compiled no rules for .inp — the fixture or the compiler moved",
    );
  }

  const pseudoElementCounts = (rules: StyleRule[]) =>
    rules.map((rule) => rule.s[Specificity.PseudoElements] ?? 0);

  expect(pseudoElementCounts(compiled)).toEqual([0, 1]);

  // Metro injects the sheet as JSON, which writes each specificity hole as `null`.
  const transported = JSON.parse(JSON.stringify(compiled)) as StyleRule[];

  expect(transported.flatMap((rule) => rule.s)).toContain(null);

  for (const order of [transported, [...transported].reverse()]) {
    expect(pseudoElementCounts([...order].sort(specificityCompareFn))).toEqual([
      0, 1,
    ]);
  }
});

describe("specificityCompareFn", () => {
  const slotsByPrecedence = [
    ["Important", Specificity.Important],
    ["Inline", Specificity.Inline],
    ["PseudoElements", Specificity.PseudoElements],
    ["ClassName", Specificity.ClassName],
    ["Order", Specificity.Order],
  ] as const;

  const ruleWith = (entries: [slot: number, value: number | null][]) => {
    const s: StyleRule["s"] = [];
    for (const [slot, value] of entries) {
      s[slot] = value;
    }
    return { s };
  };

  test.each(slotsByPrecedence)("%s decides when it alone is set", (_, slot) => {
    expect(
      specificityCompareFn(ruleWith([[slot, 1]]), ruleWith([])),
    ).toBeGreaterThan(0);
    expect(
      specificityCompareFn(ruleWith([]), ruleWith([[slot, 1]])),
    ).toBeLessThan(0);
  });

  test.each(slotsByPrecedence.slice(0, -1))(
    "%s outranks every slot beneath it",
    (name, slot) => {
      const beneath = slotsByPrecedence
        .slice(slotsByPrecedence.findIndex(([entry]) => entry === name) + 1)
        .map(([, lower]): [number, number] => [lower, 9]);

      expect(
        specificityCompareFn(ruleWith([[slot, 1]]), ruleWith(beneath)),
      ).toBeGreaterThan(0);
    },
  );

  const withUnsetSlot = (
    slot: number,
    spelling: "hole" | "null" | "zero",
    order: number,
  ) =>
    ruleWith([
      ...(spelling === "hole"
        ? []
        : [[slot, spelling === "null" ? null : 0] as [number, number | null]]),
      [Specificity.Order, order],
    ]);

  test.each(slotsByPrecedence.slice(0, -1))(
    "an unset %s defers to the slots beneath it however each side spells it",
    (_, slot) => {
      for (const [left, right] of [
        ["hole", "null"],
        ["null", "zero"],
        ["zero", "hole"],
      ] as const) {
        expect(
          specificityCompareFn(
            withUnsetSlot(slot, left, 2),
            withUnsetSlot(slot, right, 1),
          ),
        ).toBeGreaterThan(0);
        expect(
          specificityCompareFn(
            withUnsetSlot(slot, right, 2),
            withUnsetSlot(slot, left, 1),
          ),
        ).toBeGreaterThan(0);
      }
    },
  );

  test.each(slotsByPrecedence)(
    "%s ranks a hole, a null and a zero alike",
    (_, slot) => {
      const hole = ruleWith([]);
      const transported = ruleWith([[slot, null]]);
      const zero = ruleWith([[slot, 0]]);

      expect(specificityCompareFn(hole, transported)).toBe(0);
      expect(specificityCompareFn(transported, zero)).toBe(0);
      expect(specificityCompareFn(zero, hole)).toBe(0);
    },
  );

  test("an inline record ranks beneath an important rule and above any selector", () => {
    expect(
      specificityCompareFn({}, ruleWith([[Specificity.Important, 1]])),
    ).toBeLessThan(0);
    expect(
      specificityCompareFn({}, ruleWith([[Specificity.ClassName, 9]])),
    ).toBeGreaterThan(0);
  });
});
