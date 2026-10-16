import { StyleSheet, View } from "react-native";

import { render, screen } from "@testing-library/react-native";
import { VariableContextProvider } from "react-native-css";
import { compile } from "react-native-css/compiler";
import { Text } from "react-native-css/components/Text";
import { registerCSS, testID } from "react-native-css/jest";
import { StyleCollection } from "react-native-css/native";

// Every expected value is what Chromium, Firefox and WebKit compute for the spelling held in a variable.
const currentColor = { semantic: ["label", "labelColor"] };
const navy = "#123456";

interface ShadowCase {
  readonly spelling: string;
  readonly variables?: string;
  readonly expected: unknown;
}

const offsetVariable = "--offset: 2px 2px;";
const layersVariable = "--layers: 1px 1px #123456, 2px 2px #654321;";

const expectedBoxShadow = (
  [offsetX, offsetY, blurRadius, spreadDistance]: readonly [
    number,
    number,
    number,
    number,
  ],
  color: unknown,
  inset = false,
) => ({
  offsetX,
  offsetY,
  blurRadius,
  spreadDistance,
  color,
  ...(inset ? { inset } : {}),
});

const expectedTextShadow = (
  [width, height, textShadowRadius]: readonly [number, number, number],
  textShadowColor: unknown,
) => ({
  textShadowOffset: { width, height },
  textShadowRadius,
  textShadowColor,
});

const expectedDropShadow = (
  [offsetX, offsetY, standardDeviation]: readonly [number, number, number],
  color: unknown,
) => [{ dropShadow: { offsetX, offsetY, standardDeviation, color } }];

const boxShadowCases: readonly ShadowCase[] = [
  {
    spelling: "2px 2px",
    expected: [expectedBoxShadow([2, 2, 0, 0], currentColor)],
  },
  {
    spelling: "2px 2px 4px",
    expected: [expectedBoxShadow([2, 2, 4, 0], currentColor)],
  },
  {
    spelling: "2px 2px 4px 1px",
    expected: [expectedBoxShadow([2, 2, 4, 1], currentColor)],
  },
  {
    spelling: "2px 2px #123456",
    expected: [expectedBoxShadow([2, 2, 0, 0], navy)],
  },
  {
    spelling: "#123456 2px 2px",
    expected: [expectedBoxShadow([2, 2, 0, 0], navy)],
  },
  {
    spelling: "#123456 2px 2px 4px",
    expected: [expectedBoxShadow([2, 2, 4, 0], navy)],
  },
  {
    spelling: "2px 2px 4px #123456",
    expected: [expectedBoxShadow([2, 2, 4, 0], navy)],
  },
  {
    spelling: "#123456 2px 2px 4px 1px",
    expected: [expectedBoxShadow([2, 2, 4, 1], navy)],
  },
  {
    spelling: "2px 2px 4px 1px #123456",
    expected: [expectedBoxShadow([2, 2, 4, 1], navy)],
  },
  {
    spelling: "inset 2px 2px",
    expected: [expectedBoxShadow([2, 2, 0, 0], currentColor, true)],
  },
  {
    spelling: "2px 2px inset",
    expected: [expectedBoxShadow([2, 2, 0, 0], currentColor, true)],
  },
  {
    spelling: "inset 2px 2px #123456",
    expected: [expectedBoxShadow([2, 2, 0, 0], navy, true)],
  },
  {
    spelling: "2px 2px #123456 inset",
    expected: [expectedBoxShadow([2, 2, 0, 0], navy, true)],
  },
  {
    spelling: "#123456 inset 2px 2px",
    expected: [expectedBoxShadow([2, 2, 0, 0], navy, true)],
  },
  {
    spelling: "inset #123456 2px 2px",
    expected: [expectedBoxShadow([2, 2, 0, 0], navy, true)],
  },
  {
    spelling: "2px 2px inset #123456",
    expected: [expectedBoxShadow([2, 2, 0, 0], navy, true)],
  },
  {
    spelling: "#123456 2px 2px inset",
    expected: [expectedBoxShadow([2, 2, 0, 0], navy, true)],
  },
  {
    spelling: "2px 2px 4px 1px inset",
    expected: [expectedBoxShadow([2, 2, 4, 1], currentColor, true)],
  },
  {
    spelling: "INSET 2px 2px #123456",
    expected: [expectedBoxShadow([2, 2, 0, 0], navy, true)],
  },
  {
    spelling: "-2px -2px 4px -1px #123456",
    expected: [expectedBoxShadow([-2, -2, 4, -1], navy)],
  },
  {
    spelling: "0 0",
    expected: [expectedBoxShadow([0, 0, 0, 0], currentColor)],
  },
  {
    spelling: "2px 2px currentcolor",
    expected: [expectedBoxShadow([2, 2, 0, 0], currentColor)],
  },
  {
    spelling: "2px 2px #123456, 4px 4px",
    expected: [
      expectedBoxShadow([2, 2, 0, 0], navy),
      expectedBoxShadow([4, 4, 0, 0], currentColor),
    ],
  },
  {
    spelling: "2px 2px #123456, inset 1px 1px",
    expected: [
      expectedBoxShadow([2, 2, 0, 0], navy),
      expectedBoxShadow([1, 1, 0, 0], currentColor, true),
    ],
  },
  {
    spelling: "var(--offset) #123456",
    variables: offsetVariable,
    expected: [expectedBoxShadow([2, 2, 0, 0], navy)],
  },
  {
    spelling: "var(--layers), 4px 4px",
    variables: layersVariable,
    expected: [
      expectedBoxShadow([1, 1, 0, 0], navy),
      expectedBoxShadow([2, 2, 0, 0], "#654321"),
      expectedBoxShadow([4, 4, 0, 0], currentColor),
    ],
  },
  { spelling: "2px", expected: [] },
  { spelling: "2px 2px 4px 1px 3px", expected: [] },
  { spelling: "2px #123456 2px", expected: [] },
  { spelling: "2px 2px #123456 #654321", expected: [] },
  { spelling: "inset inset 2px 2px", expected: [] },
  { spelling: "2px inset 2px", expected: [] },
  { spelling: "2px 2px #123456, 3px", expected: [] },
];

// A declaration that is not a text shadow sets nothing, so the earlier rule's shadow stays.
const earlierTextShadow = expectedTextShadow([9, 9, 0], "#010203");

const textShadowCases: readonly ShadowCase[] = [
  {
    spelling: "2px 2px",
    expected: expectedTextShadow([2, 2, 0], currentColor),
  },
  {
    spelling: "2px 2px 4px",
    expected: expectedTextShadow([2, 2, 4], currentColor),
  },
  {
    spelling: "2px 2px #123456",
    expected: expectedTextShadow([2, 2, 0], navy),
  },
  {
    spelling: "#123456 2px 2px",
    expected: expectedTextShadow([2, 2, 0], navy),
  },
  {
    spelling: "#123456 2px 2px 4px",
    expected: expectedTextShadow([2, 2, 4], navy),
  },
  {
    spelling: "2px 2px 4px #123456",
    expected: expectedTextShadow([2, 2, 4], navy),
  },
  {
    spelling: "-2px -2px 4px #123456",
    expected: expectedTextShadow([-2, -2, 4], navy),
  },
  {
    spelling: "2px 2px currentcolor",
    expected: expectedTextShadow([2, 2, 0], currentColor),
  },
  // React Native draws one text shadow, so the compiler keeps the first.
  {
    spelling: "2px 2px #123456, 4px 4px",
    expected: expectedTextShadow([2, 2, 0], navy),
  },
  {
    spelling: "var(--layers), 4px 4px",
    variables: layersVariable,
    expected: expectedTextShadow([1, 1, 0], navy),
  },
  {
    spelling: "var(--offset) #123456",
    variables: offsetVariable,
    expected: expectedTextShadow([2, 2, 0], navy),
  },
  ...[
    "2px",
    "#123456",
    "2px #123456 2px",
    "inset 2px 2px",
    "2px 2px #123456 #654321",
    "2px 2px #123456, 3px",
  ].map((spelling) => ({ spelling, expected: earlierTextShadow })),
];

const dropShadowCases: readonly ShadowCase[] = [
  {
    spelling: "2px 2px",
    expected: expectedDropShadow([2, 2, 0], currentColor),
  },
  {
    spelling: "2px 2px 4px",
    expected: expectedDropShadow([2, 2, 4], currentColor),
  },
  {
    spelling: "2px 2px #123456",
    expected: expectedDropShadow([2, 2, 0], navy),
  },
  {
    spelling: "#123456 2px 2px",
    expected: expectedDropShadow([2, 2, 0], navy),
  },
  {
    spelling: "#123456 2px 2px 4px",
    expected: expectedDropShadow([2, 2, 4], navy),
  },
  {
    spelling: "2px 2px 4px #123456",
    expected: expectedDropShadow([2, 2, 4], navy),
  },
  {
    spelling: "-2px -2px 4px #123456",
    expected: expectedDropShadow([-2, -2, 4], navy),
  },
  {
    spelling: "2px 2px currentcolor",
    expected: expectedDropShadow([2, 2, 0], currentColor),
  },
  {
    spelling: "var(--offset) #123456",
    variables: offsetVariable,
    expected: expectedDropShadow([2, 2, 0], navy),
  },
  { spelling: "2px", expected: [] },
  { spelling: "2px 2px 4px 1px", expected: [] },
  { spelling: "2px #123456 2px", expected: [] },
  { spelling: "inset 2px 2px", expected: [] },
  { spelling: "2px 2px #123456, 4px 4px", expected: [] },
  {
    spelling: "var(--layers), 4px 4px",
    variables: layersVariable,
    expected: [],
  },
];

const properties = [
  {
    property: "box-shadow",
    earlier: "box-shadow: 9px 9px 0 0 #010203",
    declare: "box-shadow: var(--shadow)",
    read: (style: Record<string, unknown>): unknown => style.boxShadow,
    cases: boxShadowCases,
  },
  {
    property: "text-shadow",
    earlier: "text-shadow: 9px 9px 0 #010203",
    declare: "text-shadow: var(--shadow)",
    read: ({
      textShadowOffset,
      textShadowRadius,
      textShadowColor,
    }: Record<string, unknown>): unknown => ({
      textShadowOffset,
      textShadowRadius,
      textShadowColor,
    }),
    cases: textShadowCases,
  },
  {
    property: "drop-shadow()",
    earlier: "filter: drop-shadow(9px 9px 0 #010203)",
    declare: "filter: drop-shadow(var(--shadow))",
    read: (style: Record<string, unknown>): unknown => style.filter,
    cases: dropShadowCases,
  },
] as const;

const routes = [
  { variables: "inlined", options: {}, sheet: "as compiled" },
  {
    variables: "resolved at runtime",
    options: { inlineVariables: false } as const,
    sheet: "as compiled",
  },
  {
    variables: "inlined",
    options: {},
    sheet: "as the JSON a device receives",
  },
  {
    variables: "resolved at runtime",
    options: { inlineVariables: false } as const,
    sheet: "as the JSON a device receives",
  },
] as const;

function renderSubject(
  css: string,
  { options, sheet }: (typeof routes)[number],
): Record<string, unknown> {
  const stylesheet = compile(css, options).stylesheet();
  StyleCollection.inject(
    sheet === "as compiled"
      ? stylesheet
      : (JSON.parse(JSON.stringify(stylesheet)) as typeof stylesheet),
  );

  render(
    <View>
      <Text className="parent">
        <Text testID={testID} className="first second" />
      </Text>
    </View>,
  );

  return StyleSheet.flatten(screen.getByTestId(testID).props.style) as Record<
    string,
    unknown
  >;
}

describe.each(routes)(
  "variables $variables, the sheet injected $sheet",
  (route) => {
    describe.each(properties)(
      "$property",
      ({ earlier, declare, read, cases }) => {
        test.each(cases)("$spelling", ({ spelling, variables, expected }) => {
          const style = renderSubject(
            `.first { ${earlier}; } .second { ${variables ?? ""} --shadow: ${spelling}; ${declare}; }`,
            route,
          );

          expect(read(style)).toStrictEqual(expected);
        });
      },
    );

    test("an omitted box shadow colour is the inherited colour", () => {
      const style = renderSubject(
        `.parent { color: #0000ff; } .second { --shadow: 2px 2px 4px; box-shadow: var(--shadow); }`,
        route,
      );

      expect(style.boxShadow).toStrictEqual([
        expectedBoxShadow([2, 2, 4, 0], "#00f"),
      ]);
    });

    test("an omitted text shadow colour is the inherited colour", () => {
      const style = renderSubject(
        `.parent { color: #0000ff; } .second { --shadow: 2px 2px 4px; text-shadow: var(--shadow); }`,
        route,
      );

      expect(style).toMatchObject(expectedTextShadow([2, 2, 4], "#00f"));
    });
  },
);

test("a box shadow string set from JavaScript reaches React Native, which reads it", () => {
  registerCSS(`.subject { box-shadow: var(--shadow); }`);

  render(
    <VariableContextProvider value={{ "--shadow": "2px 2px #123456" }}>
      <Text testID={testID} className="subject" />
    </VariableContextProvider>,
  );

  expect(screen.getByTestId(testID).props.style.boxShadow).toBe(
    "2px 2px #123456",
  );
});
