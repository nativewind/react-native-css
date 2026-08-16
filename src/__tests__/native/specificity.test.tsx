import { StyleSheet, type ViewProps } from "react-native";

import { fireEvent, render } from "@testing-library/react-native";
import type { StyleRule } from "react-native-css/compiler";
import { compile } from "react-native-css/compiler";
import { Text } from "react-native-css/components/Text";
import { registerCSS, testID } from "react-native-css/jest";
import { styled } from "react-native-css/runtime";
import { specificityCompareFn } from "react-native-css/utilities/specificity";

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

test("a pseudo-element rule still outranks a plain one after the sheet is serialised", () => {
  // The compiler leaves HOLES: a rule that sets `PseudoElements` (slot 4) never
  // writes slots 2 and 3, so they sit empty *inside* the array's length. Metro
  // writes the sheet with `JSON.stringify` (`metro/injection-code.ts`), and JSON
  // has no holes — every one becomes `null`.
  //
  // The comparator branched on the RAW slot while returning a NORMALISED
  // difference, so `undefined !== null` entered the branch and returned
  // `0 - 0 = 0`, settling the comparison at a slot neither rule uses. A zero
  // leaves the runtime sort with nothing to order by, so the `className`
  // attribute's token order decided the cascade — `placeholder:` and
  // `selection:` are the everyday Tailwind triggers.
  //
  // Asserted at the comparator rather than through a render on purpose. The
  // rendered form depends on a non-`color` declaration leaking out of the
  // pseudo-element rule, so it would go inert the moment that leak is fixed;
  // this assertion does not.
  const rules = compile(
    `.inp { color: red; } .inp::placeholder { color: blue; }`,
  ).stylesheet().s?.[0]?.[1];

  if (rules === undefined) {
    throw new Error(
      "compiled no rules for .inp — the fixture or the compiler moved",
    );
  }

  // The shape a device receives, not the shape the compiler holds.
  const [plain, placeholder] = JSON.parse(JSON.stringify(rules)) as StyleRule[];

  if (plain === undefined || placeholder === undefined) {
    throw new Error("expected two rules");
  }

  expect(specificityCompareFn(plain, placeholder)).toBeLessThan(0);
  expect(specificityCompareFn(placeholder, plain)).toBeGreaterThan(0);

  // An inline record carries no `s` at all, so it falls back to
  // `inlineSpecificity` — itself a sparse array. It must still win.
  expect(specificityCompareFn({}, placeholder)).toBeGreaterThan(0);
});
