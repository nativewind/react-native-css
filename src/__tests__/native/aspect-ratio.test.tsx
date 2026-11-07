import { act, fireEvent, render, screen } from "@testing-library/react-native";
import { compile } from "react-native-css/compiler";
import { View } from "react-native-css/components/View";
import { registerCSS } from "react-native-css/jest";

import { dimensions } from "../../native/reactivity";
import {
  containerMatches,
  mediaMatches,
  type BoxSize,
  type Route,
} from "./_conditions";

const BOX: BoxSize = { width: 400, height: 200 };

// Each condition against a 400x200 box, whose aspect ratio is 2
const cases = [
  ["(aspect-ratio: 2/1)", true],
  ["not (aspect-ratio: 2/1)", false],
  ["(aspect-ratio: 3/1)", false],
  ["(min-aspect-ratio: 2/1)", true],
  ["(min-aspect-ratio: 201/100)", false],
  ["(max-aspect-ratio: 2/1)", true],
  ["(max-aspect-ratio: 199/100)", false],
  ["(aspect-ratio > 1)", true],
  ["(max-aspect-ratio: 1/0)", true],
  ["(min-aspect-ratio: 1/0)", false],
  ["(min-aspect-ratio: 0/0)", false],
  ["(1 < aspect-ratio < 3)", true],
  ["(2 < aspect-ratio < 3)", false],
  ["(2 <= aspect-ratio < 3)", true],
  ["(3/2 < aspect-ratio <= 2/1)", true],
] as const;

describe.each(["in memory", "over the wire"] as const)("%s", (route) => {
  test.each(cases)(
    "%s matches a 400x200 screen and container: %s",
    (condition, expected) => {
      expect({
        media: mediaMatches(condition, BOX, route),
        container: containerMatches(condition, BOX, route),
      }).toStrictEqual({ media: expected, container: expected });
    },
  );

  // A ratio takes -0, which is zero, and is true in a boolean context unless it is zero
  test.each([
    ["(min-aspect-ratio: -0/1)", true],
    ["(max-aspect-ratio: 1/-0)", true],
    ["(aspect-ratio > -0)", true],
    ["(aspect-ratio)", true],
    ["not (aspect-ratio)", false],
  ])("%s matches a 400x200 screen and container: %s", (condition, expected) => {
    expect({
      media: mediaMatches(condition, BOX, route),
      container: containerMatches(condition, BOX, route),
    }).toStrictEqual({ media: expected, container: expected });
  });

  // lightningcss prints a NaN calculation as 5.10424e38, past the largest float, so a ratio's NaN number arrives as infinity and makes the ratio its limit, where Chromium, Firefox and WebKit read it as 0 (css-values-4 §10.9.1) and answer each row the other way
  test.each([
    ["(max-aspect-ratio: calc(NaN) / 1)", true],
    ["(min-aspect-ratio: calc(NaN) / 1)", false],
    ["(max-aspect-ratio: 1 / calc(NaN))", false],
    ["(min-aspect-ratio: 1 / calc(NaN))", true],
  ])("%s matches a 400x200 screen and container: %s", (condition, expected) => {
    expect({
      media: mediaMatches(condition, BOX, route),
      container: containerMatches(condition, BOX, route),
    }).toStrictEqual({ media: expected, container: expected });
  });

  // The runtime measures the window and not the screen, so a device-aspect-ratio term is unknown and neither it nor its negation applies, where Chromium, Firefox and WebKit measure the screen; it is no container feature, and Chromium and WebKit select no container for a query holding one
  test.each([
    ["(device-aspect-ratio: 2/1)", false],
    ["not (device-aspect-ratio: 2/1)", false],
    ["(min-device-aspect-ratio: 1/1)", false],
    ["(device-aspect-ratio > 0) or (width > 0px)", true],
  ])(
    "%s matches a 400x200 screen: %s, and no 400x200 container",
    (condition, expected) => {
      expect({
        media: mediaMatches(condition, BOX, route),
        container: containerMatches(condition, BOX, route),
      }).toStrictEqual({ media: expected, container: false });
    },
  );

  // lightningcss hands a ratio's numbers over as float32, so 1.6 arrives as 1.600000023841858; WebKit compares the decimals as written, Firefox compares the float32s and misses (min-aspect-ratio: 1.6) and (aspect-ratio: 0.7), and Chromium compares within a tolerance and matches (max-aspect-ratio: 1.77777), (max-aspect-ratio: 0.00001/0.00002) and (min-aspect-ratio: 1.1)
  test.each([
    ["(min-aspect-ratio: 1.6)", 1280, 800, true],
    ["(aspect-ratio: 1.6)", 1280, 800, true],
    ["(max-aspect-ratio: 1.77777)", 640, 360, false],
    ["(min-aspect-ratio: 1.77777)", 640, 360, true],
    ["(max-aspect-ratio: 0.00001/0.00002)", 400, 200, false],
    ["(aspect-ratio: 0.00004/0.00002)", 400, 200, true],
    ["(max-aspect-ratio: 2e16/1e16)", 400, 200, true],
    ["(min-aspect-ratio: 1.1)", 440, 400, false],
    ["(aspect-ratio: 0.7)", 700, 1000, true],
  ])(
    "%s matches a %ix%i screen and container: %s",
    (condition, width, height, expected) => {
      const size = { width, height };

      expect({
        media: mediaMatches(condition, size, route),
        container: containerMatches(condition, size, route),
      }).toStrictEqual({ media: expected, container: expected });
    },
  );

  // Chromium and Firefox compare a ratio by cross-multiplying, so a box of no height equals 1/0 and a box of no size equals every ratio, a screen as a container; WebKit answers 1/0 and 0/0 unequal to a box of no height or no size, and Chromium answers (aspect-ratio) true, and its negation false, for a box of no width, as MQ5 §2.4.2 reads a box of no size, which every ratio equals
  test.each([
    ["(max-aspect-ratio: 1/0)", true, true, true],
    ["(min-aspect-ratio: 1/0)", true, true, false],
    ["(aspect-ratio: 1/0)", true, true, false],
    ["(max-aspect-ratio: 0/0)", true, true, true],
    ["(aspect-ratio: 0/0)", true, true, false],
    ["(aspect-ratio)", true, false, false],
    ["not (aspect-ratio)", false, true, true],
    ["(aspect-ratio > 1)", true, false, false],
    ["not (aspect-ratio > 1)", false, true, true],
    ["(aspect-ratio: 1/1)", false, true, false],
    ["not (aspect-ratio: 1/1)", true, false, true],
    ["(min-aspect-ratio: 0/1)", true, true, true],
    ["(aspect-ratio: 0/1)", false, true, true],
    ["(aspect-ratio: 2/1)", false, true, false],
    ["(min-aspect-ratio: 2/1)", true, true, false],
    ["(max-aspect-ratio: 2/1)", false, true, true],
    ["(max-aspect-ratio: 1/2)", false, true, true],
  ])(
    "%s matches a 400x0 box: %s, a 0x0 box: %s, a 0x200 box: %s, as a screen and as a container",
    (condition, noHeight, noSize, noWidth) => {
      expect({
        media: degenerateBoxAnswers(mediaMatches, condition, route),
        container: degenerateBoxAnswers(containerMatches, condition, route),
      }).toStrictEqual({
        media: { noHeight, noSize, noWidth },
        container: { noHeight, noSize, noWidth },
      });
    },
  );
});

interface DegenerateBoxAnswers {
  readonly noHeight: boolean;
  readonly noSize: boolean;
  readonly noWidth: boolean;
}

function degenerateBoxAnswers(
  matches: (condition: string, size: BoxSize, route: Route) => boolean,
  condition: string,
  route: Route,
): DegenerateBoxAnswers {
  return {
    noHeight: matches(condition, { width: 400, height: 0 }, route),
    noSize: matches(condition, { width: 0, height: 0 }, route),
    noWidth: matches(condition, { width: 0, height: 200 }, route),
  };
}

// A container that has not been laid out has no aspect ratio, so a comparison and its negation are unknown (MQ5 §3.1) until its first layout
test("a container answers no ratio before its first layout", () => {
  registerCSS(`
    .parent { container-type: size; }
    .child { width: 10px; }
    .other { width: 10px; }
    .boolean { width: 10px; }
    @container (aspect-ratio: 2/1) { .child { width: 37px; } }
    @container not (aspect-ratio: 2/1) { .other { width: 37px; } }
    @container not (aspect-ratio) { .boolean { width: 37px; } }
  `);
  render(
    <View testID="parent" className="parent">
      <View testID="child" className="child" />
      <View testID="other" className="other" />
      <View testID="boolean" className="boolean" />
    </View>,
  );
  const before = {
    child: screen.getByTestId("child").props.style.width,
    other: screen.getByTestId("other").props.style.width,
    boolean: screen.getByTestId("boolean").props.style.width,
  };

  fireEvent(screen.getByTestId("parent"), "layout", {
    nativeEvent: { layout: { x: 0, y: 0, width: 400, height: 200 } },
  });

  expect({
    before,
    after: {
      child: screen.getByTestId("child").props.style.width,
      other: screen.getByTestId("other").props.style.width,
      boolean: screen.getByTestId("boolean").props.style.width,
    },
  }).toStrictEqual({
    before: { child: 10, other: 10, boolean: 10 },
    after: { child: 37, other: 10, boolean: 10 },
  });
});

test("the screen's ratio is read again when its height changes", () => {
  registerCSS(`
    .child { width: 10px; }
    @media (min-aspect-ratio: 3/2) { .child { width: 37px; } }
  `);
  act(() => {
    dimensions.set({ ...dimensions.get(), width: 400, height: 200 });
  });
  render(<View testID="child" className="child" />);
  const before = screen.getByTestId("child").props.style.width;

  act(() => {
    dimensions.set({ ...dimensions.get(), width: 400, height: 400 });
  });

  expect({
    before,
    after: screen.getByTestId("child").props.style.width,
  }).toStrictEqual({ before: 37, after: 10 });
});

test("a container's ratio is read again when its layout changes", () => {
  registerCSS(`
    .parent { container-type: size; }
    .child { width: 10px; }
    @container (min-aspect-ratio: 3/2) { .child { width: 37px; } }
  `);
  render(
    <View testID="parent" className="parent">
      <View testID="child" className="child" />
    </View>,
  );
  fireEvent(screen.getByTestId("parent"), "layout", {
    nativeEvent: { layout: { x: 0, y: 0, width: 400, height: 200 } },
  });
  const before = screen.getByTestId("child").props.style.width;

  fireEvent(screen.getByTestId("parent"), "layout", {
    nativeEvent: { layout: { x: 0, y: 0, width: 400, height: 400 } },
  });

  expect({
    before,
    after: screen.getByTestId("child").props.style.width,
  }).toStrictEqual({ before: 37, after: 10 });
});

test.each(["@media", "@container"] as const)(
  "%s (min-aspect-ratio: 1/0) survives the JSON a device receives the stylesheet as",
  (rule) => {
    const stylesheet = compile(
      `${rule} (min-aspect-ratio: 1/0) { .child { color: red; } }`,
    ).stylesheet();

    expect(stylesheet.s).toHaveLength(1);
    expect(JSON.parse(JSON.stringify(stylesheet))).toStrictEqual(stylesheet);
  },
);
