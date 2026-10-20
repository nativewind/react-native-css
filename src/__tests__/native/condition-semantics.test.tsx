import { act, fireEvent, render, screen } from "@testing-library/react-native";
import { View } from "react-native-css/components/View";
import { registerCSS } from "react-native-css/jest";
import { colorScheme } from "react-native-css/runtime";

import { testMediaQuery } from "../../native/conditions/media-query";
import { dimensions, vw, type Getter } from "../../native/reactivity";

const initialColorScheme = colorScheme.get();

afterEach(() => {
  act(() => {
    colorScheme.set(initialColorScheme);
  });
});

function mediaMatches(
  condition: string,
  size = { width: 600, height: 400 },
): boolean {
  registerCSS(`
    .child { width: 10px; }
    @media ${condition} { .child { width: 37px; } }
  `);
  act(() => {
    dimensions.set({ ...dimensions.get(), ...size });
  });
  const { unmount } = render(<View testID="child" className="child" />);
  const { width } = screen.getByTestId("child").props.style;
  unmount();
  return width === 37;
}

function containerMatches(
  condition: string,
  size = { width: 400, height: 200 },
): boolean {
  registerCSS(`
    .parent { container-type: size; }
    .child { width: 10px; }
    @container ${condition} { .child { width: 37px; } }
  `);
  const { unmount } = render(
    <View testID="parent" className="parent">
      <View testID="child" className="child" />
    </View>,
  );
  fireEvent(screen.getByTestId("parent"), "layout", {
    nativeEvent: { layout: { x: 0, y: 0, ...size } },
  });
  const { width } = screen.getByTestId("child").props.style;
  unmount();
  return width === 37;
}

describe("@media on a 600x400 screen", () => {
  test.each([
    ["(400px < width < 800px)", true],
    ["(400px < width < 500px)", false],
    ["(600px < width < 800px)", false],
    ["(600px <= width < 800px)", true],
    ["(800px > width > 400px)", true],
    ["(300px < height < 500px)", true],
  ])("a range pair %s matches: %s", (condition, expected) => {
    expect(mediaMatches(condition)).toBe(expected);
  });

  // MQ5 §3.1: a term the runtime cannot decide is unknown, and a rule applies only when its query is true
  test.each([
    ["(width > env(safe-area-inset-top))", false],
    ["not (width > env(safe-area-inset-top))", false],
    ["(width: env(safe-area-inset-top)) or (width > 400px)", true],
    ["not ((width: env(safe-area-inset-top)) and (width > 9999px))", true],
    ["not all and (width > 10em)", false],
    ["not (fictional-feature: 3)", false],
    ["(fictional-thing) or (width > 400px)", true],
    ["(width > 400px) and (fictional-thing)", false],
    ["not (pointer: fine)", false],
    ["(orientation: bogus)", false],
    ["not (orientation: bogus)", false],
    ["not (hover: bogus)", false],
    ["not (prefers-color-scheme: bogus)", false],
    ["not (scripting: bogus)", false],
    ["not (update: bogus)", false],
  ])("an undecidable term in %s matches: %s", (condition, expected) => {
    expect(mediaMatches(condition)).toBe(expected);
  });

  // MQ5 §2.4.2: a feature in a boolean context is false only for zero, none and no-preference
  test.each([
    ["(width)", true],
    ["(orientation)", true],
    ["(resolution)", true],
    ["(hover)", true],
    ["(color)", true],
    ["(prefers-color-scheme)", true],
    ["(scripting)", true],
    ["(monochrome)", false],
    ["(grid)", false],
    ["not (monochrome)", true],
    ["(color-index)", false],
    ["(display-mode)", true],
    ["(dir)", false],
  ])("the boolean context %s matches: %s", (condition, expected) => {
    expect(mediaMatches(condition)).toBe(expected);
  });

  // css-values-4 §4.1: a keyword matches in any case
  test.each([
    ["(orientation: LANDSCAPE)", true],
    ["not (orientation: LANDSCAPE)", false],
    ["(orientation: PORTRAIT)", false],
    ["not (orientation: PORTRAIT)", true],
  ])("the keyword in %s matches: %s", (condition, expected) => {
    expect(mediaMatches(condition)).toBe(expected);
  });

  test.each([
    ["(hover: hover)", true],
    ["(hover: none)", false],
    ["(min-color: 8)", true],
    ["(min-color: 9)", false],
    ["(monochrome: 0)", true],
    ["(grid: 1)", false],
    ["(scripting: enabled)", true],
    ["(update: fast)", true],
  ])(
    "a feature every screen answers alike %s matches: %s",
    (condition, expected) => {
      expect(mediaMatches(condition)).toBe(expected);
    },
  );

  test.each([
    [null, "(prefers-color-scheme: light)", true],
    [null, "(prefers-color-scheme: dark)", false],
    ["dark", "(prefers-color-scheme: dark)", true],
    ["dark", "(prefers-color-scheme: light)", false],
    ["dark", "(prefers-color-scheme: DARK)", true],
    ["dark", "(prefers-color-scheme: Light)", false],
  ] as const)(
    "with a %p preference, %s matches: %s",
    (scheme, condition, expected) => {
      act(() => {
        colorScheme.set(scheme);
      });
      expect(mediaMatches(condition)).toBe(expected);
    },
  );
});

describe("@media on a 400x600 screen", () => {
  const portrait = { width: 400, height: 600 };

  // css-values-4 §4.1: a keyword matches in any case
  test.each([
    ["(orientation: portrait)", true],
    ["(orientation: PORTRAIT)", true],
    ["not (orientation: PORTRAIT)", false],
    ["(orientation: Landscape)", false],
  ])("the keyword in %s matches: %s", (condition, expected) => {
    expect(mediaMatches(condition, portrait)).toBe(expected);
  });
});

describe("@container on a 400x200 container", () => {
  test.each([
    ["(300px < width < 500px)", true],
    ["(400px < width < 500px)", false],
    ["(500px > width > 300px)", true],
    ["(100px < height < 300px)", true],
  ])("a range pair %s matches: %s", (condition, expected) => {
    expect(containerMatches(condition)).toBe(expected);
  });

  // CSS Conditional 5 §5.4: an unknown size feature or an unresolvable value selects no container
  test.each([
    "(fictional-feature > 10px)",
    "not (fictional-feature > 10px)",
    "(fictional-feature > 10px) or (width > 0px)",
    "(width > env(safe-area-inset-top))",
    "not (width > env(safe-area-inset-top))",
    "(env(safe-area-inset-top) < width < 500px)",
    "not (env(safe-area-inset-top) < width < 500px)",
    "(orientation: bogus)",
    "not (orientation: bogus)",
  ])("%s selects no container", (condition) => {
    expect(containerMatches(condition)).toBe(false);
  });

  // em is relative to the container's font size, which the runtime does not read
  test.each([
    ["not (width > 10em)", false],
    ["(width > 10em) or (width > 0px)", true],
  ])("%s matches: %s", (condition, expected) => {
    expect(containerMatches(condition)).toBe(expected);
  });

  test.each([
    ["(width)", true],
    ["(orientation)", true],
    ["(aspect-ratio)", true],
    ["not (width)", false],
  ])("the boolean context %s matches: %s", (condition, expected) => {
    expect(containerMatches(condition)).toBe(expected);
  });

  // css-values-4 §4.1: a keyword matches in any case
  test.each([
    ["(orientation: LANDSCAPE)", true],
    ["not (orientation: LANDSCAPE)", false],
    ["(orientation: Portrait)", false],
  ])("the keyword in %s matches: %s", (condition, expected) => {
    expect(containerMatches(condition)).toBe(expected);
  });

  test("(width) does not match a container of zero width", () => {
    expect(containerMatches("(width)", { width: 0, height: 200 })).toBe(false);
  });
});

test("a decided conjunction reads only the term that decided it", () => {
  const read: unknown[] = [];
  const get: Getter = (observable) => {
    read.push(observable);
    return observable.get();
  };
  act(() => {
    dimensions.set({ ...dimensions.get(), width: 600, height: 400 });
  });

  expect(
    testMediaQuery(
      [
        [
          "&",
          [
            [">=", "width", 9999],
            ["=", "prefers-color-scheme", "dark"],
          ],
        ],
      ],
      get,
    ),
  ).toBe(false);
  expect(read).toStrictEqual([vw]);
});

test("an unknown term applies nowhere, negated or not", () => {
  const get: Getter = (observable) => observable.get();

  expect(testMediaQuery([["?"]], get)).toBe(false);
  expect(testMediaQuery([["!", ["?"]]], get)).toBe(false);
  expect(testMediaQuery([["|", [["?"], [">=", "width", 0]]]], get)).toBe(true);
});
