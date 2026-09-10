/* eslint-disable @typescript-eslint/no-deprecated -- Verify the supported vars migration input. */
import { StyleSheet } from "react-native";

import { render, screen } from "@testing-library/react-native";
import { VariableContextProvider } from "react-native-css";
import { Text } from "react-native-css/components/Text";
import { View } from "react-native-css/components/View";
import { registerCSS } from "react-native-css/jest";
import { vars } from "react-native-css/native";

test.each([
  ["scale: 150% 50%", [{ scaleX: 1.5 }, { scaleY: 0.5 }]],
  ["scale: none", [{ scaleX: 1 }, { scaleY: 1 }]],
  ["transform: scaleX(150%) scaleY(50%)", [{ scaleX: 1.5 }, { scaleY: 0.5 }]],
  [
    "--x: 150%; --y: 50%; scale: var(--x) var(--y)",
    [{ scaleX: 1.5 }, { scaleY: 0.5 }],
  ],
])("native scale factors: %s", (declarations, expected) => {
  registerCSS(`.subject { ${declarations}; }`);
  render(<View testID="subject" className="subject" />);
  expect(screen.getByTestId("subject").props.style.transform).toEqual(expected);
});

test.each([
  ["line-height: 31px", 31],
  ["font-size: 20px; line-height: 31px", 31],
  ["font-size: 20px; line-height: 1.5", 30],
])("native line height: %s", (declarations, expected) => {
  registerCSS(`.subject { ${declarations}; }`);
  render(
    <Text testID="subject" className="subject">
      Text
    </Text>,
  );
  expect(screen.getByTestId("subject").props.style.lineHeight).toBe(expected);
});

test("public ARIA conditions update and restore", () => {
  registerCSS(
    `.subject { width: 40px; } .subject[aria-selected="true"] { width: 80px; }`,
  );
  const subject = (selected: boolean) => (
    <View testID="subject" className="subject" aria-selected={selected} />
  );
  render(subject(false));
  expect(screen.getByTestId("subject").props.style.width).toBe(40);
  screen.rerender(subject(true));
  expect(screen.getByTestId("subject").props.style.width).toBe(80);
  screen.rerender(subject(false));
  expect(screen.getByTestId("subject").props.style.width).toBe(40);
});

test("vars-only parents provide, update, and remove inherited overrides", () => {
  registerCSS(`.subject { width: var(--width, 30px); }`);
  const subject = (width?: number) => (
    <View style={vars({ width: 40 })}>
      <View style={vars(width === undefined ? {} : { width })}>
        <View testID="subject" className="subject" />
      </View>
      <View testID="sibling" className="subject" />
    </View>
  );
  render(subject(80));
  expect(screen.getByTestId("subject").props.style.width).toBe(80);
  expect(screen.getByTestId("sibling").props.style.width).toBe(40);
  screen.rerender(subject(90));
  expect(screen.getByTestId("subject").props.style.width).toBe(90);
  screen.rerender(subject());
  expect(screen.getByTestId("subject").props.style.width).toBe(40);
});

test.each(["scale: var(--factor)", "transform: scale(var(--factor))"])(
  "runtime scale variables remain numeric and uniform: %s",
  (declaration) => {
    registerCSS(`.subject { ${declaration}; }`, { inlineVariables: false });
    const subject = (factor: string) => (
      <View testID="subject" className="subject" style={vars({ factor })} />
    );
    const factors = () => {
      const transform = screen.getByTestId("subject").props.style
        .transform as Record<string, number>[];
      for (const entry of transform)
        for (const value of Object.values(entry))
          expect(typeof value).toBe("number");
      return ["scaleX", "scaleY"].map((axis) =>
        transform.reduce(
          (value, entry) => value * (entry.scale ?? entry[axis] ?? 1),
          1,
        ),
      );
    };
    render(subject("150%"));
    expect(factors()).toEqual([1.5, 1.5]);
    screen.rerender(subject("50%"));
    expect(factors()).toEqual([0.5, 0.5]);
    screen.rerender(subject("-100%"));
    expect(factors()).toEqual([-1, -1]);
  },
);

test.each(["inline", "class"])(
  "own %s variables override ancestors and restore after removal",
  (mode) => {
    registerCSS(
      `.subject { width: var(--width); } .override { --width: 80px; }`,
      { inlineVariables: false },
    );
    const subject = (override: boolean, parentWidth = 120) => (
      <View style={vars({ width: parentWidth })}>
        <View
          testID="subject"
          className={
            mode === "class" && override ? "subject override" : "subject"
          }
          style={[
            { height: 40 },
            mode === "inline" && override ? vars({ width: 80 }) : {},
          ]}
        >
          <View testID="descendant" className="subject" />
        </View>
        <View testID="sibling" className="subject" />
      </View>
    );
    const width = (id: string): unknown =>
      StyleSheet.flatten(screen.getByTestId(id).props.style).width;
    render(subject(true));
    expect(width("subject")).toBe(80);
    expect(width("descendant")).toBe(80);
    expect(width("sibling")).toBe(120);
    screen.rerender(subject(true, 130));
    expect(width("subject")).toBe(80);
    expect(width("descendant")).toBe(80);
    screen.rerender(subject(false, 130));
    expect(width("subject")).toBe(130);
    expect(width("descendant")).toBe(130);
    screen.rerender(subject(true, 130));
    expect(width("subject")).toBe(80);
    expect(width("descendant")).toBe(80);
    expect(width("sibling")).toBe(130);
  },
);

test.each(["vars", "provider"])(
  "explicit pixel variables preserve fractions through %s updates",
  (mode) => {
    registerCSS(`.subject { width: var(--width); }`, {
      inlineVariables: false,
    });
    const subject = (width: string) => {
      const child = <View testID="subject" className="subject" />;
      return mode === "vars" ? (
        <View style={vars({ width })}>{child}</View>
      ) : (
        <VariableContextProvider value={{ "--width": width }}>
          {child}
        </VariableContextProvider>
      );
    };
    render(subject("80.5px"));
    expect(screen.getByTestId("subject").props.style.width).toBe(80.5);
    screen.rerender(subject("120.25px"));
    expect(screen.getByTestId("subject").props.style.width).toBe(120.25);
    screen.rerender(subject(".5px"));
    expect(screen.getByTestId("subject").props.style.width).toBe(0.5);
  },
);
