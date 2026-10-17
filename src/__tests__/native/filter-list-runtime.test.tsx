import { StyleSheet } from "react-native";

import { render, screen } from "@testing-library/react-native";
import { View } from "react-native-css/components/View";
import { registerCSS } from "react-native-css/jest";
import { VariableContextProvider } from "react-native-css/native";

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

    // Chromium 153, Firefox 155 and WebKit 26.6 leave no filter for each
    test.each([
      ["filter: var(--effect)", "none", [{ blur: 3 }]],
      [
        "filter: brightness(0.5) var(--effect)",
        "none",
        [{ brightness: 0.5 }, { blur: 3 }],
      ],
    ])(
      "%s with --effect: %s removes the filter",
      (declaration, keyword, before) => {
        registerCSS(
          `.subject { --effect: blur(3px); ${declaration}; } .keyword { --effect: ${keyword}; }`,
          { inlineVariables },
        );
        render(<View testID="subject" className="subject" />);
        expect(filter()).toEqual(before);
        screen.rerender(<View testID="subject" className="subject keyword" />);
        expect(filter()).toBeUndefined();
      },
    );

    // Chromium 153, Firefox 155 and WebKit 26.6: an empty fallback substitutes nothing, while an undefined variable with none invalidates the list
    test("an empty fallback contributes no filter", () => {
      registerCSS(`.subject { filter: var(--missing,) blur(2px); }`, {
        inlineVariables,
      });
      render(<View testID="subject" className="subject" />);
      expect(filter()).toEqual([{ blur: 2 }]);
    });

    test("an undefined variable with no fallback leaves no filter", () => {
      registerCSS(
        `.earlier { filter: blur(4px); } .subject { filter: var(--missing) blur(2px); }`,
        { inlineVariables },
      );
      render(<View testID="subject" className="earlier subject" />);
      expect(filter()).toBeUndefined();
    });

    test("an undefined variable that is the whole value leaves no filter", () => {
      registerCSS(
        `.earlier { filter: blur(4px); } .subject { filter: var(--missing); }`,
        { inlineVariables },
      );
      render(<View testID="subject" className="earlier subject" />);
      expect(filter()).toBeUndefined();
    });

    // Chromium 153, Firefox 155 and WebKit 26.6 ignore a written filter with an entry the property cannot take, so the earlier filter stands
    test.each([
      "blur(2px) drop-shadow(2px)",
      "drop-shadow(2px)",
      "blur(foo) brightness(2)",
      "brightness(-1)",
      "blur(-1px)",
      "hue-rotate(90)",
      "blur(2px 3px)",
      "none blur(2px)",
      "blur(2px) none",
      "drop-shadow(1px 2px 3px 4px red)",
    ])("filter: %s as written is ignored", (written) => {
      registerCSS(
        `.earlier { filter: blur(4px); } .written { filter: ${written}; }`,
        { inlineVariables },
      );
      render(<View testID="subject" className="earlier written" />);
      expect(filter()).toEqual([{ blur: 4 }]);
    });

    // Chromium 153, Firefox 155 and WebKit 26.6 leave no filter where a variable holds one, as the declaration is invalid at computed-value time
    test.each([
      "blur(foo)",
      "blur(2px) drop-shadow(2px)",
      "brightness(-1)",
      "blur(2px 3px)",
      "drop-shadow(1px 2px 3px 4px red)",
    ])("filter: var(--effect) with --effect: %s leaves no filter", (held) => {
      registerCSS(
        `.other { --effect: blur(1px); } .earlier { filter: blur(4px); } .subject { --effect: ${held}; filter: var(--effect); }`,
        { inlineVariables },
      );
      render(<View testID="subject" className="earlier subject" />);
      expect(filter()).toBeUndefined();
    });

    test("a rejected written filter hands back to the variable filter it followed", () => {
      registerCSS(
        `.other { --effect: blur(1px); } .earlier { filter: blur(4px); } .middle { --effect: brightness(2); filter: var(--effect); } .written { filter: blur(foo); }`,
        { inlineVariables },
      );
      render(<View testID="subject" className="earlier middle written" />);
      expect(filter()).toEqual([{ brightness: 2 }]);
    });

    // Chromium 153, Firefox 155 and WebKit 26.6 compute hue-rotate(360deg) and hue-rotate(90deg), and React Native takes degrees or radians alone
    test.each([
      ["1turn", "360deg"],
      ["100grad", "90deg"],
      ["-90DEG", "-90deg"],
    ])(
      "hue-rotate(%s) supplied at render reaches React Native as %s",
      (angle, degrees) => {
        registerCSS(`.subject { filter: hue-rotate(var(--angle)); }`, {
          inlineVariables,
        });
        render(
          <VariableContextProvider value={{ "--angle": angle }}>
            <View testID="subject" className="subject" />
          </VariableContextProvider>,
        );
        expect(filter()).toEqual([{ hueRotate: degrees }]);
      },
    );

    test.each([
      ["1turn", "360deg"],
      ["100grad", "90deg"],
    ])(
      "hue-rotate(%s) a stylesheet variable holds reaches React Native as %s",
      (angle, degrees) => {
        registerCSS(
          `.other { --effect: blur(1px); } .subject { --effect: hue-rotate(${angle}); filter: var(--effect); }`,
          { inlineVariables },
        );
        render(<View testID="subject" className="subject" />);
        expect(filter()).toEqual([{ hueRotate: degrees }]);
      },
    );

    test("CONTROL: a variable holding filters the property takes keeps them all", () => {
      registerCSS(
        `.other { --effect: blur(1px); } .subject { --effect: blur(2px) brightness(150%); filter: var(--effect); }`,
        { inlineVariables },
      );
      render(<View testID="subject" className="subject" />);
      expect(filter()).toEqual([{ blur: 2 }, { brightness: "150%" }]);
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
