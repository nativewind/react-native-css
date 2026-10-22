import { fireEvent, render, screen } from "@testing-library/react-native";
import { View } from "react-native-css/components/View";
import { registerCSS, testID } from "react-native-css/jest";

import { dimensions } from "../../native/reactivity";

// https://www.w3.org/TR/css-values-4/#absolute-lengths: 1in = 2.54cm = 25.4mm = 101.6Q = 72pt = 6pc = 96px
const absoluteLengths = [
  ["1in", 96],
  ["2.54cm", 96],
  ["10mm", 37.7953],
  ["4Q", 3.7795],
  ["3pt", 4],
  ["1pc", 16],
] as const;

function styleFor(className: string): unknown {
  render(<View testID={testID} className={className} />);
  return screen.getByTestId(testID).props.style;
}

test.each(absoluteLengths)("width: %s is %d pixels", (length, pixels) => {
  registerCSS(`.subject { width: ${length}; }`);

  expect(styleFor("subject")).toStrictEqual({ width: pixels });
});

test.each(absoluteLengths)(
  "a variable holding %s resolves to %d pixels at runtime",
  (length, pixels) => {
    registerCSS(`.subject { --width: ${length}; width: var(--width); }`, {
      inlineVariables: false,
    });

    expect(styleFor("subject")).toStrictEqual({ width: pixels });
  },
);

test.each([
  ["width: 1IN", { width: 96 }],
  ["width: 2.54CM", { width: 96 }],
  ["margin-left: -1pc", { marginLeft: -16 }],
  ["margin-top: -0.75pt", { marginTop: -1 }],
  ["transform: translateX(1in)", { transform: [{ translateX: 96 }] }],
  [
    "box-shadow: 3pt 6pt 1pc -3pt #000",
    {
      boxShadow: [
        {
          offsetX: 4,
          offsetY: 8,
          blurRadius: 16,
          spreadDistance: -4,
          color: "#000",
        },
      ],
    },
  ],
  ["font-size: 12pt", { fontSize: 16 }],
] as const)("%s converts to pixels", (declaration, style) => {
  registerCSS(`.subject { ${declaration}; }`);

  expect(styleFor("subject")).toStrictEqual(style);
});

test("an absolute length converts when rem is not inlined", () => {
  registerCSS(`.subject { width: 1in; }`, { inlineRem: false });

  expect(styleFor("subject")).toStrictEqual({ width: 96 });
});

test("a media query reads an absolute length at 96 pixels an inch", () => {
  dimensions.set({ ...dimensions.get(), width: 750 });
  registerCSS(`
    @media (min-width: 7.8in) { .subject { width: 1pc; } }
    @media (min-width: 7.9in) { .subject { height: 1pc; } }
  `);

  expect(styleFor("subject")).toStrictEqual({ width: 16 });
});

test("a shorthand converts each of its lengths", () => {
  registerCSS(`.subject { margin: 1in 1pc; }`);

  expect(styleFor("subject")).toStrictEqual({
    marginTop: 96,
    marginRight: 16,
    marginBottom: 96,
    marginLeft: 16,
  });
});

test.each([
  ["width", "width"],
  ["border-radius", "borderRadius"],
] as const)(
  "an infinite absolute %s clamps as an infinite px one does",
  (property, styleProperty) => {
    registerCSS(`
      .inch { ${property}: calc(infinity * 1in); }
      .pixel { ${property}: calc(infinity * 1px); }
    `);

    expect(styleFor("inch")).toStrictEqual({
      [styleProperty]: 9007199254740990,
    });
    expect(styleFor("pixel")).toStrictEqual({
      [styleProperty]: 9007199254740990,
    });
  },
);

test("an inlined variable holding an infinite absolute length clamps as px does", () => {
  registerCSS(`
    .inch { --inch-radius: calc(infinity * 1pt); border-radius: var(--inch-radius); }
    .pixel { --pixel-radius: calc(infinity * 1px); border-radius: var(--pixel-radius); }
  `);

  expect(styleFor("inch")).toStrictEqual({ borderRadius: 9007199254740991 });
  expect(styleFor("pixel")).toStrictEqual({ borderRadius: 9007199254740991 });
});

test("a runtime calc() adds an absolute length", () => {
  registerCSS(`.subject { --width: 10px; width: calc(var(--width) + 1in); }`, {
    inlineVariables: false,
  });

  expect(styleFor("subject")).toStrictEqual({ width: 106 });
});

test("an @property initial value converts", () => {
  registerCSS(`
    @property --width { syntax: "<length>"; inherits: false; initial-value: 1in; }
    .subject { width: var(--width); }
  `);

  expect(styleFor("subject")).toStrictEqual({ width: 96 });
});

test.each([
  [390, "styles its child", { width: 16 }],
  [380, "leaves its child unstyled", undefined],
] as const)(
  "a container %d pixels wide against (min-width: 4in) %s",
  (containerWidth, _outcome, style) => {
    registerCSS(`
      .container { container-name: box; container-type: inline-size; }
      @container box (min-width: 4in) { .child { width: 1pc; } }
    `);
    render(
      <View testID="container" className="container">
        <View testID={testID} className="child" />
      </View>,
    );
    fireEvent(screen.getByTestId("container"), "layout", {
      nativeEvent: { layout: { width: containerWidth, height: 100 } },
    });

    expect(screen.getByTestId(testID).props.style).toStrictEqual(style);
  },
);
