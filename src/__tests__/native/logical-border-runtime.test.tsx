/* eslint-disable @typescript-eslint/no-deprecated -- Exercise the existing vars input contract. */
import { StyleSheet } from "react-native";

import { render, screen } from "@testing-library/react-native";
import { View } from "react-native-css/components/View";
import { registerCSS } from "react-native-css/jest";
import { vars } from "react-native-css/native";

describe.each(["ltr", "rtl"] as const)("logical borders in %s", (direction) => {
  test.each([
    ["border-block-width: 2px", { borderTopWidth: 2, borderBottomWidth: 2 }],
    [
      "border-block-width: 2px 3px",
      { borderTopWidth: 2, borderBottomWidth: 3 },
    ],
    ["border-block-start-width: 2px", { borderTopWidth: 2 }],
    ["border-block-end-width: 3px", { borderBottomWidth: 3 }],
  ])("maps %s to native width props", (declarations, expected) => {
    registerCSS(`.subject { ${declarations}; }`);
    render(<View testID="subject" className="subject" style={{ direction }} />);
    expect(
      StyleSheet.flatten(screen.getByTestId("subject").props.style),
    ).toEqual({ ...expected, direction });
  });

  test.each([
    ["block", "borderTopWidth", "borderBottomWidth"],
    ["inline", "borderStartWidth", "borderEndWidth"],
  ])("updates dynamic %s widths", (axis, start, end) => {
    registerCSS(`.subject { border-${axis}-width: var(--start) var(--end); }`, {
      inlineVariables: false,
    });
    const subject = (a: number, b: number) => (
      <View style={vars({ start: a, end: b })}>
        <View testID="subject" className="subject" style={{ direction }} />
      </View>
    );
    render(subject(2.5, 3.5));
    expect(
      StyleSheet.flatten(screen.getByTestId("subject").props.style),
    ).toEqual({ [start]: 2.5, [end]: 3.5, direction });
    screen.rerender(subject(4, 1));
    expect(
      StyleSheet.flatten(screen.getByTestId("subject").props.style),
    ).toEqual({ [start]: 4, [end]: 1, direction });
  });

  test("duplicates a single runtime block width onto both sides", () => {
    registerCSS(`.subject { border-block-width: var(--width); }`, {
      inlineVariables: false,
    });
    render(
      <View
        testID="subject"
        className="subject"
        style={vars({ width: 2.5 })}
      />,
    );
    expect(
      StyleSheet.flatten(screen.getByTestId("subject").props.style),
    ).toEqual({ borderTopWidth: 2.5, borderBottomWidth: 2.5 });
  });
});
