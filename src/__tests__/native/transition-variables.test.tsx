import { StyleSheet } from "react-native";

import { render, screen } from "@testing-library/react-native";
import { View } from "react-native-css/components/View";
import { registerCSS, testID } from "react-native-css/jest";

// Observe the engine's transition contract before Reanimated consumes it.
jest.mock("../../native/reanimated", () => ({
  animatedComponentFamily: (component: unknown) => component,
}));

// A second definition keeps each variable from being inlined, so it resolves at runtime
const decoy = `.decoy { --transition: opacity 9s; --transition-property: opacity; }`;

const renderStyle = (className: string) => {
  render(<View testID={testID} className={className} />);
  return StyleSheet.flatten(screen.getByTestId(testID).props.style) as
    | Record<string, unknown>
    | undefined;
};

test.each([
  "width 1s ease-in 200ms",
  "width 1s, opacity 2s linear",
  "width, opacity",
  "width 1s cubic-bezier(0.25, 0.5, 0.75, 1)",
  "background-image 1s",
  "all 300ms ease-out 50ms",
  "1s",
])(
  "a transition held in a variable expands like the written one: %s",
  (value) => {
    registerCSS(`
    ${decoy}
    .written { transition: ${value}; }
    .held { --transition: ${value}; transition: var(--transition); }
  `);

    const written = renderStyle("written");

    expect(written).toHaveProperty("transitionDuration");
    expect(renderStyle("held")).toStrictEqual(written);
  },
);

test("a transition names the style key each property is written to", () => {
  registerCSS(
    `.written { transition-property: width, background-image, border-inline-start-color; }`,
  );

  expect(renderStyle("written")).toStrictEqual({
    transitionProperty: [
      "width",
      "experimental_backgroundImage",
      "borderStartColor",
    ],
  });
});

test("a transition-property held in a variable names the keys the written one names", () => {
  registerCSS(`
    ${decoy}
    .written { transition-property: width, background-image, border-inline-start-color; }
    .held { --transition-property: width, background-image, border-inline-start-color; transition-property: var(--transition-property); }
  `);

  expect(renderStyle("held")).toStrictEqual(renderStyle("written"));
});

test.each([
  ["three times", "width 1s 2s 3s"],
  ["two easing functions", "width 1s ease-in linear"],
])(
  "a transition held in a variable with %s is invalid and writes no transition",
  (_case, value) => {
    registerCSS(`
      ${decoy}
      .held { --transition: ${value}; transition: var(--transition); }
    `);

    expect(renderStyle("held")).toStrictEqual({});
  },
);
