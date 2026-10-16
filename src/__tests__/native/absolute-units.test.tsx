import { render, screen } from "@testing-library/react-native";
import { View } from "react-native-css/components/View";
import { registerCSS, testID } from "react-native-css/jest";

// css-values-4 §6.2: 1in = 2.54cm = 25.4mm = 101.6Q = 72pt = 6pc = 96px
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
    registerCSS(`
      .theme { --width: ${length}; }
      .subject { --width: ${length}; width: var(--width); }
    `);

    expect(styleFor("theme subject")).toStrictEqual({ width: pixels });
  },
);

test("an absolute length converts when rem is not inlined", () => {
  registerCSS(`.subject { width: 1in; }`, { inlineRem: false });

  expect(styleFor("subject")).toStrictEqual({ width: 96 });
});

test("a media query reads an absolute length", () => {
  registerCSS(`
    @media (min-width: 4in) { .subject { width: 1pc; } }
    @media (max-width: 4in) { .subject { height: 1pc; } }
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
