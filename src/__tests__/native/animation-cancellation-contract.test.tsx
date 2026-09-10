import { StyleSheet } from "react-native";

import { render, screen } from "@testing-library/react-native";
import { View } from "react-native-css/components/View";
import { registerCSS } from "react-native-css/jest";

// Inspect the style contract before Reanimated consumes its CSS fields.
// Actual cancellation is verified separately in the native consumer.
jest.mock("../../native/reanimated", () => ({
  animatedComponentFamily: (component: unknown) => component,
}));

const animationName = (): unknown =>
  (
    StyleSheet.flatten(screen.getByTestId("subject").props.style) as
      | { animationName?: unknown }
      | undefined
  )?.animationName;

describe.each([undefined, false] as const)(
  "animation cancellation with inlineVariables=%s",
  (inlineVariables) => {
    test.each([
      ["literal shorthand", "animation: none"],
      ["literal name", "animation-name: none"],
      ["variable shorthand", "--motion: none; animation: var(--motion)"],
      ["variable name", "--motion: none; animation-name: var(--motion)"],
    ])("preserves the cancellation keyword for %s", (_name, cancellation) => {
      registerCSS(
        `@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
         .spin { animation: spin 1s linear infinite; }
         .stop { ${cancellation}; }`,
        { inlineVariables },
      );
      render(<View testID="subject" className="spin" />);
      const running = animationName();
      expect(running).toEqual([
        {
          from: { transform: [{ rotate: "0deg" }] },
          to: { transform: [{ rotate: "360deg" }] },
        },
      ]);
      screen.rerender(<View testID="subject" className="stop" />);
      const stopped = animationName();
      expect(Array.isArray(stopped) ? stopped : [stopped]).toEqual(["none"]);
      screen.rerender(<View testID="subject" className="spin" />);
      expect(animationName()).toEqual(running);
    });
  },
);
