import { render, screen } from "@testing-library/react-native";
import { View } from "react-native-css/components/View";
import { registerCSS, testID } from "react-native-css/jest";

// The test window is 750 wide, and rem inlines 14 unless a case says otherwise
const BOUNDS = [
  ["10em", "below", {}, undefined],
  ["100em", "above", {}, undefined],
  ["50em with rem inlined as 16", "above", { inlineRem: 16 }, undefined],
  ["40rem with rem not inlined", "below", { inlineRem: false }, undefined],
  ["60em with rem not inlined", "above", { inlineRem: false }, undefined],
  ["60em under a 10px root font size", "below", {}, 10],
  [
    "60em under a 10px root font size with rem not inlined",
    "below",
    { inlineRem: false },
    10,
  ],
  [
    "60rem under a 10px root font size with rem not inlined",
    "below",
    { inlineRem: false },
    10,
  ],
  [
    "50em under a 10px root font size with rem inlined as 16",
    "above",
    { inlineRem: 16 },
    10,
  ],
] as const;

function matchesQuery(
  condition: string,
  options: Parameters<typeof registerCSS>[1],
  rootFontSize?: number,
): boolean {
  const root =
    rootFontSize === undefined ? "" : `:root { font-size: ${rootFontSize}px; }`;
  registerCSS(
    `${root} @media ${condition} { .subject { width: 10px; } }`,
    options,
  );
  render(<View testID={testID} className="subject" />);
  return screen.getByTestId(testID).props.style !== undefined;
}

test.each(BOUNDS)(
  "%s is a bound %s the window",
  (label, side, options, rootFontSize) => {
    const bound = label.split(" ")[0];

    expect([
      matchesQuery(`(min-width: ${bound})`, options, rootFontSize),
      matchesQuery(`(max-width: ${bound})`, options, rootFontSize),
    ]).toStrictEqual(side === "below" ? [true, false] : [false, true]);
  },
);

test("an em range reads both of its bounds", () => {
  expect(matchesQuery("(40em <= width <= 60em)", {})).toBe(true);
});

test("an em term is a length, so its negation decides", () => {
  expect(matchesQuery("not (width: 10em)", {})).toBe(true);
});
