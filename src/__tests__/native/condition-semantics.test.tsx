import { Platform } from "react-native";

import { act, fireEvent, render, screen } from "@testing-library/react-native";
import { View } from "react-native-css/components/View";
import { registerCSS } from "react-native-css/jest";
import { colorScheme } from "react-native-css/runtime";

import {
  DEFAULT_CONTAINER_NAME,
  testContainerQuery,
} from "../../native/conditions/container-query";
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
    ["not all and (width > 10vw)", false],
    ["not (fictional-feature: 3)", false],
    ["(fictional-thing) or (width > 400px)", true],
    ["(width > 400px) and (fictional-thing)", false],
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
    ["(hover)", false],
    ["(color)", true],
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
    ["dark", "(prefers-color-scheme)", true],
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

test.each([
  ["not (width: 10em)", false],
  ["not (width: 10vw)", false],
  ["(width: 10vw) or (width > 0px)", true],
  ["not (min-width: calc(10em + 1vw))", false],
  ["(min-width: calc(10em + 1vw)) or (width > 0px)", true],
])(
  "@media %s, whose length the runtime does not resolve, matches: %s",
  (condition, expected) => {
    expect(mediaMatches(condition)).toBe(expected);
  },
);

// No browser takes env() as a feature's value, so a range pair with an env() bound is unknown whatever its other bound answers (MQ5 §3.1)
test.each([
  ["not (env(safe-area-inset-top) < width < 800px)", 900],
  ["not (400px < width < env(safe-area-inset-bottom))", 300],
  ["not ((env(safe-area-inset-top) < width < 800px) or (width < 0px))", 900],
])("@media %s on a %ipx-wide screen matches: false", (condition, width) => {
  expect(mediaMatches(condition, { width, height: 400 })).toBe(false);
});

// MQ5 §3.1: a bound the compiler cannot resolve leaves its comparison unknown, so the other bound alone can make a range pair false
test.each([
  [900, true],
  [600, false],
])(
  "@media not (1in < width < 800px) on a %ipx-wide screen matches: %s",
  (width, expected) => {
    expect(
      mediaMatches("not (1in < width < 800px)", { width, height: 400 }),
    ).toBe(expected);
  },
);

// MQ5 §7.1, §7.2: pointer and hover are the primary input's, and a touchscreen cannot hover and points coarsely
describe.each([
  ["ios", "none", "coarse"],
  ["android", "none", "coarse"],
  ["macos", "hover", "fine"],
  ["windows", "hover", "fine"],
] as const)(
  "on %s the primary input answers hover as %s and pointer as %s",
  (os, hover, pointer) => {
    let platform: jest.ReplaceProperty<typeof Platform.OS>;

    beforeEach(() => {
      platform = jest.replaceProperty(Platform, "OS", os);
    });

    afterEach(() => {
      platform.restore();
    });

    test.each([
      ["(hover: hover)", hover === "hover"],
      ["(hover: none)", hover === "none"],
      ["(hover)", hover === "hover"],
      ["(pointer: fine)", pointer === "fine"],
      ["(pointer: coarse)", pointer === "coarse"],
      ["not (pointer: fine)", pointer === "coarse"],
      ["(pointer)", true],
      ["(any-pointer: fine)", pointer === "fine"],
      ["(any-pointer: coarse)", pointer === "coarse"],
      ["(any-pointer: none)", false],
      ["(any-pointer)", true],
      ["(hover: none) and (pointer: coarse)", hover === "none"],
    ])("%s matches: %s", (condition, expected) => {
      expect(mediaMatches(condition)).toBe(expected);
    });
  },
);

// MQ5 §7.3: any-pointer matches the touchscreen's coarse pointer beside a fine one that hovers
describe("on iOS, once a pointer hovers an element", () => {
  test.each([
    ["(hover: hover)", false, true],
    ["(hover: none)", true, false],
    ["(any-hover: hover)", false, true],
    ["(any-hover: none)", true, false],
    ["(pointer: fine)", false, true],
    ["(pointer: coarse)", true, false],
    ["(any-pointer: fine)", false, true],
    ["(any-pointer: coarse)", true, true],
  ])("%s matches: %s before and %s after", (condition, before, after) => {
    registerCSS(`
      .target:hover { opacity: 0.5; }
      .child { width: 10px; }
      @media ${condition} { .child { width: 37px; } }
    `);
    render(
      <>
        <View testID="target" className="target" />
        <View testID="child" className="child" />
      </>,
    );
    const widthBefore = screen.getByTestId("child").props.style.width;

    fireEvent(screen.getByTestId("target"), "hoverIn");

    expect({
      before: widthBefore === 37,
      after: screen.getByTestId("child").props.style.width === 37,
    }).toStrictEqual({ before, after });
  });
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

  // A length the runtime cannot resolve leaves its term unknown, and an `or` keeps its other terms
  test.each([
    ["(width > 10in) or (width > 100px)", true],
    ["not (width > 10in)", false],
  ])("%s matches: %s", (condition, expected) => {
    expect(containerMatches(condition)).toBe(expected);
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

test("a container feature the runtime does not measure applies nowhere, negated or not", () => {
  const get: Getter = (observable) => observable.get();
  const containers = { [DEFAULT_CONTAINER_NAME]: { key: {}, props: {} } };

  expect(
    testContainerQuery(
      { m: [">", "fictional-feature", 10] },
      containers,
      [],
      get,
    ),
  ).toBe(false);
  expect(
    testContainerQuery(
      { m: ["!", [">", "fictional-feature", 10]] },
      containers,
      [],
      get,
    ),
  ).toBe(false);
});

test("an unknown term applies nowhere, negated or not", () => {
  const get: Getter = (observable) => observable.get();

  expect(testMediaQuery([["?"]], get)).toBe(false);
  expect(testMediaQuery([["!", ["?"]]], get)).toBe(false);
  expect(testMediaQuery([["|", [["?"], [">=", "width", 0]]]], get)).toBe(true);
});
