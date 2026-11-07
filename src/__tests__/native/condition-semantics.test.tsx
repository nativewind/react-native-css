import { Platform } from "react-native";

import { act, fireEvent, render, screen } from "@testing-library/react-native";
import { compile } from "react-native-css/compiler";
import { View } from "react-native-css/components/View";
import { registerCSS } from "react-native-css/jest";
import { StyleCollection } from "react-native-css/native";
import { colorScheme } from "react-native-css/runtime";

import {
  DEFAULT_CONTAINER_NAME,
  testContainerQuery,
} from "../../native/conditions/container-query";
import { testMediaQuery } from "../../native/conditions/media-query";
import { dimensions, vw, type Getter } from "../../native/reactivity";

// Metro hands a device the sheet through JSON.stringify, which writes Infinity, NaN and an array's undefined as null
type Route = "in memory" | "over the wire";

interface BoxSize {
  readonly width: number;
  readonly height: number;
}

function inject(css: string, route: Route): void {
  switch (route) {
    case "in memory":
      registerCSS(css);
      return;
    case "over the wire": {
      const stylesheet = compile(css).stylesheet();
      StyleCollection.inject(
        JSON.parse(JSON.stringify(stylesheet)) as typeof stylesheet,
      );
      return;
    }
    default:
      route satisfies never;
  }
}

function mediaMatches(
  condition: string,
  size: BoxSize = { width: 600, height: 400 },
  route: Route = "in memory",
): boolean {
  inject(
    `
    .child { width: 10px; }
    @media ${condition} { .child { width: 37px; } }
  `,
    route,
  );
  act(() => {
    dimensions.set({ ...dimensions.get(), ...size });
  });
  const { unmount } = render(<View testID="child" className="child" />);
  const matches = childMatches();
  unmount();
  return matches;
}

function containerMatches(
  condition: string,
  size: BoxSize = { width: 400, height: 200 },
  route: Route = "in memory",
): boolean {
  inject(
    `
    .parent { container-type: size; }
    .child { width: 10px; }
    @container ${condition} { .child { width: 37px; } }
  `,
    route,
  );
  act(() => {
    dimensions.set({ ...dimensions.get(), width: 600, height: 400 });
  });
  const { unmount } = render(
    <View testID="parent" className="parent">
      <View testID="child" className="child" />
    </View>,
  );
  fireEvent(screen.getByTestId("parent"), "layout", {
    nativeEvent: { layout: { x: 0, y: 0, ...size } },
  });
  const matches = childMatches();
  unmount();
  return matches;
}

// The child's own rule gives it 10 and the condition's 37, so any other width is a failure of the test rather than an answer
function childMatches(): boolean {
  const { width } = screen.getByTestId("child").props.style;

  if (width !== 10 && width !== 37) {
    throw new Error(
      `.child is ${String(width)} wide, neither its rule's 10 nor its condition's 37`,
    );
  }

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
    ["not (400px < width < 800px)", false],
  ])("a range pair %s matches: %s", (condition, expected) => {
    expect(mediaMatches(condition)).toBe(expected);
  });

  // MQ5 §3.1: a term the runtime cannot decide is unknown, and a rule applies only when its query is true
  test.each([
    ["(width > env(safe-area-inset-top))", false],
    ["not (width > env(safe-area-inset-top))", false],
    ["not (width: env(safe-area-inset-top))", false],
    ["(width: env(safe-area-inset-top)) or (width > 400px)", true],
    ["not ((width: env(safe-area-inset-top)) and (width > 9999px))", true],
    ["(width > env(safe-area-inset-top)), (width > 400px)", true],
    ["not all and (width > 10vw)", false],
    ["not (fictional-feature: 3)", false],
    ["(constructor: x)", false],
    ["(fictional-thing) or (width > 400px)", true],
    ["(width > 400px) and (fictional-thing)", false],
    ["(orientation: bogus)", false],
    ["not (orientation: bogus)", false],
    ["not ((width > 100px) or (orientation: bogus))", false],
    ["not (hover: bogus)", false],
    ["not (prefers-color-scheme: bogus)", false],
    ["not (scripting: bogus)", false],
    ["not (update: bogus)", false],
    ["not (overflow-block: bogus)", false],
    ["not (overflow-inline: bogus)", false],
    ["not (scan: bogus)", false],
    ["not (color-gamut: bogus)", false],
    ["not (dynamic-range: bogus)", false],
    ["not (forced-colors: bogus)", false],
    ["not (inverted-colors: bogus)", false],
    ["not (prefers-contrast: bogus)", false],
    ["not (prefers-reduced-transparency: bogus)", false],
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

  // MQ4 §3: a media type matches in any case; ios is this library's platform type, which Chromium, Firefox and WebKit read as a type no device has, so they apply not IOS rather than IOS
  test.each([
    ["IOS", true],
    ["not IOS", false],
  ])("the media type in %s matches on iOS: %s", (condition, expected) => {
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
    ["(grid: 0)", true],
    ["(grid: 1)", false],
    ["(scripting: enabled)", true],
    ["(update: fast)", true],
    ["(overflow-block)", true],
    ["(overflow-block: scroll)", true],
    ["not (overflow-block: paged)", true],
    ["(overflow-inline)", true],
    ["(overflow-inline: scroll)", true],
    ["not (overflow-inline: none)", true],
  ])(
    "a feature every screen answers alike %s matches: %s",
    (condition, expected) => {
      expect(mediaMatches(condition)).toBe(expected);
    },
  );

  // MQ5 §5.2: scan applies to no React Native screen, so neither value matches and the boolean context is false, as in Chromium, Firefox and WebKit
  test.each([
    ["(scan)", false],
    ["not (scan)", true],
    ["(scan: progressive)", false],
    ["not (scan: progressive)", true],
    ["not (scan: interlace)", true],
  ])("%s matches: %s", (condition, expected) => {
    expect(mediaMatches(condition)).toBe(expected);
  });

  // MQ5 §6.4, §6.5: every screen shows the sRGB gamut at a standard dynamic range, and its video the same (MQ5 §8); React Native does not report whether either shows a wider gamut or a higher range, which Chromium, Firefox and WebKit read from the display, so p3, rec2020 and high are unknown. Firefox answers each boolean context false, and Chromium and WebKit those of color-gamut and dynamic-range true, as MQ5 §2.4.2 does; Firefox alone answers video-dynamic-range, and no engine video-color-gamut
  test.each([
    ["(color-gamut)", true],
    ["(color-gamut: srgb)", true],
    ["not (color-gamut: srgb)", false],
    ["(color-gamut: p3)", false],
    ["not (color-gamut: p3)", false],
    ["not (color-gamut: rec2020)", false],
    ["(dynamic-range)", true],
    ["(dynamic-range: standard)", true],
    ["(dynamic-range: high)", false],
    ["not (dynamic-range: high)", false],
    ["(video-color-gamut)", true],
    ["(video-color-gamut: srgb)", true],
    ["not (video-color-gamut: p3)", false],
    ["(video-dynamic-range)", true],
    ["(video-dynamic-range: standard)", true],
    ["not (video-dynamic-range: high)", false],
  ])("%s matches: %s", (condition, expected) => {
    expect(mediaMatches(condition)).toBe(expected);
  });

  // The Compatibility Standard's -webkit-device-pixel-ratio is resolution in dppx, and PixelRatio.get() is 2 under Jest
  test.each([
    ["(min-resolution: 2dppx)", true],
    ["(-webkit-min-device-pixel-ratio: 2)", true],
    ["(-webkit-device-pixel-ratio: 2)", true],
    ["(-webkit-min-device-pixel-ratio: 3)", false],
    ["not (-webkit-min-device-pixel-ratio: 3)", true],
  ])("at a pixel ratio of 2, %s matches: %s", (condition, expected) => {
    expect(mediaMatches(condition)).toBe(expected);
  });

  // css-values-4 §7.4 excludes a negative resolution, which leaves its feature unknown (MQ5 §3.2), while -webkit-device-pixel-ratio takes any number
  test.each([
    ["(min-resolution: -1dpi)", false],
    ["(max-resolution: -1dpi)", false],
    ["not (max-resolution: -1dpi)", false],
    ["(min-resolution: -1dpcm)", false],
    ["(resolution: -1dppx)", false],
    ["not (resolution: -1dppx)", false],
    ["(resolution > -1dppx)", false],
    ["not (resolution < -1x)", false],
    ["not (-1dppx < resolution < 1dppx)", false],
    ["(min-resolution: -1dppx) or (width > 400px)", true],
    ["(min-resolution: 0dpi)", true],
    ["(max-resolution: 0dpi)", false],
    ["(min-resolution: -0dppx)", true],
    ["(-webkit-min-device-pixel-ratio: -1)", true],
    ["not (-webkit-max-device-pixel-ratio: -1)", true],
  ])("at a pixel ratio of 2, %s matches: %s", (condition, expected) => {
    expect(mediaMatches(condition)).toBe(expected);
  });

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

// css-values-4 §6.1.2: a viewport length is relative to the window, as Chromium, Firefox and WebKit read it in a media query
test.each([
  ["not (width: 10vw)", true],
  ["(width: 10vw) or (width > 0px)", true],
  ["(width: 100vw)", true],
  ["not (width: 100vw)", false],
  ["(width > 50vw)", true],
  ["(width < 50vw)", false],
  ["(height > 50vw)", true],
  ["(height < 50vw)", false],
  ["(min-height: 100vh)", true],
  ["(max-height: 99vh)", false],
  ["(50vw < width < 150vw)", true],
  ["not (50vw < width < 150vw)", false],
  ["(150vw < width < 200vw)", false],
])("@media %s on a 600x400 screen matches: %s", (condition, expected) => {
  expect(mediaMatches(condition)).toBe(expected);
});

// The engines resolve an em in a media query against the initial font size (MQ5 §1.3), so `not (width: 10em)` matches there; until #494 resolves it here, an em bound and a calc() holding one are unknown
test.each([
  ["not (width: 10em)", false],
  ["not (min-width: calc(10em + 1vw))", false],
  ["(min-width: calc(10em + 1vw)) or (width > 0px)", true],
])(
  "@media %s, whose length the runtime does not resolve, matches: %s",
  (condition, expected) => {
    expect(mediaMatches(condition)).toBe(expected);
  },
);

// No browser takes env() as a feature's value, so a range pair with an env() bound is unknown whatever its other bound answers (MQ5 §3.2)
test.each([
  ["not (env(safe-area-inset-top) < width < 800px)", 900],
  ["not (400px < width < env(safe-area-inset-bottom))", 300],
  ["not (env(safe-area-inset-top) < width < env(safe-area-inset-bottom))", 600],
  ["not ((env(safe-area-inset-top) < width < 800px) or (width < 0px))", 900],
])("@media %s on a %ipx-wide screen matches: false", (condition, width) => {
  expect(mediaMatches(condition, { width, height: 400 })).toBe(false);
});

// MQ5 §3.1: a bound the compiler cannot resolve leaves its comparison unknown, so the other bound alone can make a range pair false
test.each([
  [900, true],
  [600, false],
])(
  "@media not (1ch < width < 800px) on a %ipx-wide screen matches: %s",
  (width, expected) => {
    expect(
      mediaMatches("not (1ch < width < 800px)", { width, height: 400 }),
    ).toBe(expected);
  },
);

// A device reads what the compiler emits after a JSON round trip: an operand it could not resolve is null, and one past the largest number is clamped, so each case answers alike on both routes
describe.each(["in memory", "over the wire"] as const)("%s", (route) => {
  // lightningcss prints a NaN calculation as 5.10424e38, past the largest float, so it arrives as infinity, where Chromium, Firefox and WebKit read it as 0 (css-values-4 §10.9.1)
  test.each([
    ["not (1ch < width < 800px)", 900, true],
    ["not (1ch < width < 800px)", 600, false],
    ["(width > env(safe-area-inset-top)) or (width > 400px)", 600, true],
    ["(min-width: 1e40px)", 600, false],
    ["not (min-width: 1e40px)", 600, true],
    ["(-webkit-max-device-pixel-ratio: calc(NaN))", 600, true],
    ["(-webkit-min-device-pixel-ratio: calc(NaN))", 600, false],
    ["(width < calc(NaN * 1vw))", 600, true],
  ])(
    "@media %s on a %ipx-wide screen matches: %s",
    (condition, width, expected) => {
      expect(mediaMatches(condition, { width, height: 400 }, route)).toBe(
        expected,
      );
    },
  );

  test.each([
    ["(width > 10ch) or (width > 100px)", true],
    ["not (width > 10ch)", false],
  ])("@container %s matches: %s", (condition, expected) => {
    expect(containerMatches(condition, undefined, route)).toBe(expected);
  });

  // css-values-4 §5.7 excludes a negative ratio component, which leaves its feature unknown (MQ5 §3.2), and -0 is zero
  test.each([
    ["(aspect-ratio: -2/-1)", false],
    ["(min-aspect-ratio: -1/2)", false],
    ["(max-aspect-ratio: 2/-1)", false],
    ["not (max-aspect-ratio: -1/2)", false],
    ["(aspect-ratio > -1)", false],
    ["not (-1 < aspect-ratio < 3)", false],
    ["(min-aspect-ratio: -1/2) or (min-width: 1px)", true],
    ["(max-aspect-ratio: 2/-1) or (min-width: 1px)", true],
    ["(min-aspect-ratio: -0/1) or (min-width: 1px)", true],
    ["(aspect-ratio > -1) or (width > 0px)", true],
    ["(width > 0px) or (aspect-ratio < 2/-1)", true],
    ["(aspect-ratio > -0) or (width > 0px)", true],
    ["not (aspect-ratio < -1)", false],
  ])("@media %s on a 400x200 screen matches: %s", (condition, expected) => {
    expect(mediaMatches(condition, { width: 400, height: 200 }, route)).toBe(
      expected,
    );
  });

  // CSS Conditional 5 §5.4: Chromium and WebKit select no container for a query holding a negative ratio component, where Firefox evaluates the known half of an or (Mozilla bug 1874687)
  test.each([
    ["(aspect-ratio: -2/-1)", false],
    ["(aspect-ratio > -1)", false],
    ["not (aspect-ratio < -1)", false],
    ["(aspect-ratio > -1) or (width > 0px)", false],
    ["(width > 0px) or (aspect-ratio < 2/-1)", false],
    ["(aspect-ratio > -0) or (width > 0px)", true],
    ["(min-aspect-ratio: -1/2)", false],
    ["(max-aspect-ratio: 2/-1)", false],
    ["not (max-aspect-ratio: -1/2)", false],
    ["not (-1 < aspect-ratio < 3)", false],
    ["(min-aspect-ratio: -1/2) or (min-width: 1px)", false],
    ["(max-aspect-ratio: 2/-1) or (min-width: 1px)", false],
    ["(min-aspect-ratio: -0/1) or (min-width: 1px)", true],
  ])("@container %s matches: %s", (condition, expected) => {
    expect(containerMatches(condition, undefined, route)).toBe(expected);
  });
});

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
      ["(any-hover: hover)", hover === "hover"],
      ["(any-hover: none)", hover === "none"],
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

// MQ5 §7.1: a TV's remote is no pointing device, and Mac Catalyst points with a mouse
describe.each([
  ["a TV", "none", "none", { isTV: true, isMacCatalyst: false }],
  ["Mac Catalyst", "hover", "fine", { isTV: false, isMacCatalyst: true }],
] as const)(
  "on %s the primary input answers hover as %s and pointer as %s",
  (_, hover, pointer, flags) => {
    beforeEach(() => {
      jest.spyOn(Platform, "isTV", "get").mockReturnValue(flags.isTV);
      if (Platform.OS !== "ios") {
        throw new Error("the suite runs on the iOS preset");
      }
      jest
        .spyOn(Platform, "isMacCatalyst", "get")
        .mockReturnValue(flags.isMacCatalyst);
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    test.each([
      ["(hover: hover)", hover === "hover"],
      ["(hover: none)", hover === "none"],
      ["(any-hover: none)", hover === "none"],
      ["(pointer: fine)", pointer === "fine"],
      ["(pointer: coarse)", false],
      ["(pointer: none)", pointer === "none"],
      ["(pointer)", pointer !== "none"],
      ["(any-pointer: none)", pointer === "none"],
      ["(any-pointer: fine)", pointer === "fine"],
      ["(any-pointer)", pointer !== "none"],
    ])("%s matches: %s", (condition, expected) => {
      expect(mediaMatches(condition)).toBe(expected);
    });
  },
);

// React Native's hover flag sends a hover for a finger too, and a hover does not change the primary input
describe("on iOS, a hover event", () => {
  test.each([
    ["(hover: hover)", false, false],
    ["(hover: none)", true, true],
    ["(any-hover: hover)", false, false],
    ["(pointer: fine)", false, false],
    ["(pointer: coarse)", true, true],
    ["(any-pointer: fine)", false, false],
  ])(
    "leaves %s matching %s before and %s after",
    (condition, before, after) => {
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
      const matchesBefore = childMatches();

      fireEvent(screen.getByTestId("target"), "hoverIn");

      expect({ before: matchesBefore, after: childMatches() }).toStrictEqual({
        before,
        after,
      });
    },
  );
});

// MQ5 §12.4: only Windows' high contrast mode forces colors, which react-native-windows reports through its own AppTheme rather than React Native's APIs, so forced-colors is unknown there, where Chromium, Firefox and WebKit answer none outside that mode
describe.each([
  ["ios", true],
  ["android", true],
  ["macos", true],
  ["windows", false],
] as const)("on %s, whose forced-colors is none: %s", (os, none) => {
  let platform: jest.ReplaceProperty<typeof Platform.OS>;

  beforeEach(() => {
    platform = jest.replaceProperty(Platform, "OS", os);
  });

  afterEach(() => {
    platform.restore();
  });

  test.each([
    ["(forced-colors: none)", none],
    ["not (forced-colors: active)", none],
    ["(forced-colors: active)", false],
    ["(forced-colors)", false],
    ["not (forced-colors)", none],
  ])("%s matches: %s", (condition, expected) => {
    expect(mediaMatches(condition)).toBe(expected);
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

  // CSS Conditional 5 §5.4: an unknown size feature, a keyword its feature does not take or env() selects no container, as in Chromium and WebKit; Firefox resolves env() and evaluates the known half of an or (Mozilla bug 1874687)
  test.each([
    "(fictional-feature > 10px)",
    "not (fictional-feature > 10px)",
    "(fictional-feature > 10px) or (width > 0px)",
    "(fictional-feature > 10px) or (width > 400px)",
    "(width > env(safe-area-inset-top))",
    "not (width > env(safe-area-inset-top))",
    "(width > env(safe-area-inset-top)) or (width > 400px)",
    "(env(safe-area-inset-top) < width < 500px)",
    "not (env(safe-area-inset-top) < width < 500px)",
    "(orientation: bogus)",
    "not (orientation: bogus)",
  ])("%s selects no container", (condition) => {
    expect(containerMatches(condition)).toBe(false);
  });

  // An em in a container query is the container's font size, 160px for 10em in Chromium, Firefox and WebKit, which match (width > 10em) in a 400px container; the runtime does not read the container's font size, so the bound is unknown here
  test.each([
    ["(width > 10em)", false],
    ["not (width > 10em)", false],
    ["(width > 10em) or (width > 0px)", true],
  ])("%s matches: %s", (condition, expected) => {
    expect(containerMatches(condition)).toBe(expected);
  });

  // Chromium, Firefox and WebKit answer style(--foo: bar) false where --foo is unset, so they apply its negation; the runtime does not read the custom property, so style() is unknown here
  test.each([
    ["style(--foo: bar)", false],
    ["not style(--foo: bar)", false],
    ["style(--foo: bar) and (width > 400px)", false],
    ["style(--foo: bar) or (width > 400px)", false],
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

  // css-values-4 §6.1.2: a viewport length in a container query is relative to the window, here 600x400
  test.each([
    ["(width > 50vw)", true],
    ["(width < 50vw)", false],
    ["not (width > 50vw)", false],
    ["(height > 50vh)", false],
    ["(height >= 50vh)", true],
    ["(50vw < width < 100vw)", true],
  ])("%s matches: %s", (condition, expected) => {
    expect(containerMatches(condition)).toBe(expected);
  });

  // A length the runtime cannot resolve, such as one that needs a font's metrics, leaves its term unknown, and an `or` keeps its other terms
  test.each([
    ["(width > 10ch) or (width > 100px)", true],
    ["not (width > 10ch)", false],
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
