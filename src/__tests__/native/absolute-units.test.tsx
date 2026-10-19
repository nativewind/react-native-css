import { render, screen } from "@testing-library/react-native";
import { View } from "react-native-css/components/View";
import { registerCSS, testID } from "react-native-css/jest";

// https://www.w3.org/TR/css-values-4/#absolute-lengths: 1in = 2.54cm = 25.4mm = 101.6Q = 72pt = 6pc = 96px
const UNITS = [
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

test.each(UNITS)("width: %s is %d pixels", (length, pixels) => {
  registerCSS(`.subject { width: ${length}; }`);

  expect(styleFor("subject")).toStrictEqual({ width: pixels });
});

test.each(UNITS)(
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
  ["margin-top: 0pt", { marginTop: 0 }],
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

test.each(["width", "border-radius"])(
  "an infinite absolute %s clamps as an infinite px one does",
  (property) => {
    registerCSS(`
      .inch { ${property}: calc(infinity * 1in); }
      .pixel { ${property}: calc(infinity * 1px); }
    `);

    expect(styleFor("inch")).toStrictEqual(styleFor("pixel"));
  },
);

test("an inlined variable holding an infinite absolute length clamps as px does", () => {
  registerCSS(`
    .inch { --inch-radius: calc(infinity * 1pt); border-radius: var(--inch-radius); }
    .pixel { --pixel-radius: calc(infinity * 1px); border-radius: var(--pixel-radius); }
  `);

  expect(styleFor("inch")).toStrictEqual(styleFor("pixel"));
});
