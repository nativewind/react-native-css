import { StyleSheet } from "react-native";

import { render, screen } from "@testing-library/react-native";
import { View } from "react-native-css/components/View";
import { registerCSS } from "react-native-css/jest";

const firstShadow = {
  dropShadow: { offsetX: 0, offsetY: 1, standardDeviation: 2, color: "#000" },
};
const secondShadow = {
  dropShadow: {
    offsetX: 0,
    offsetY: 2,
    standardDeviation: 3,
    color: "#123456",
  },
};
const filter = (): unknown =>
  StyleSheet.flatten(screen.getByTestId("subject").props.style)?.filter;

describe.each([undefined, false] as const)(
  "filter lists with inlineVariables=%s",
  (inlineVariables) => {
    test("flattens a variable containing two filters and preserves order", () => {
      registerCSS(
        `.subject { --shadows: drop-shadow(0 1px 2px #000) drop-shadow(0 2px 3px #123456); filter: brightness(0.5) var(--shadows) contrast(2); }`,
        { inlineVariables },
      );
      render(<View testID="subject" className="subject" />);
      expect(filter()).toEqual([
        { brightness: 0.5 },
        firstShadow,
        secondShadow,
        { contrast: 2 },
      ]);
    });

    test("keeps a single function inside a native filter array", () => {
      registerCSS(
        `.subject { --effect: drop-shadow(0 1px 2px #000); filter: var(--effect); }`,
        { inlineVariables },
      );
      render(<View testID="subject" className="subject" />);
      expect(filter()).toEqual([firstShadow]);
    });

    test("updates and removes a variable filter list", () => {
      registerCSS(
        `.subject { --effect: drop-shadow(0 1px 2px #000) drop-shadow(0 2px 3px #123456); filter: var(--effect); } .changed { --effect: blur(3px); } .clear { filter: none; }`,
        { inlineVariables },
      );
      render(<View testID="subject" className="subject" />);
      expect(filter()).toEqual([firstShadow, secondShadow]);
      screen.rerender(<View testID="subject" className="subject changed" />);
      expect(filter()).toEqual([{ blur: 3 }]);
      screen.rerender(<View testID="subject" className="subject clear" />);
      expect(filter()).toBeUndefined();
      screen.rerender(<View testID="subject" className="subject" />);
      expect(filter()).toEqual([firstShadow, secondShadow]);
    });
  },
);

test("literal filter functions retain React Native property names and order", () => {
  registerCSS(
    `.subject { filter: brightness(0.5) hue-rotate(90deg) blur(2px); }`,
  );
  render(<View testID="subject" className="subject" />);
  expect(filter()).toEqual([
    { brightness: 0.5 },
    { hueRotate: "90deg" },
    { blur: 2 },
  ]);
});
