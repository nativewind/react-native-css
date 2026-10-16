import { render, screen } from "@testing-library/react-native";
import { View } from "react-native-css/components/View";
import { registerCSS, testID } from "react-native-css/jest";

// The test window is 750 wide, and rem inlines 14 unless a case says otherwise
const BOUNDS = [
  ["10em", {}, "below"],
  ["100em", {}, "above"],
  ["50em with rem inlined as 16", { inlineRem: 16 }, "above"],
  ["40rem with rem not inlined", { inlineRem: false }, "below"],
  ["60em with rem not inlined", { inlineRem: false }, "above"],
] as const;

function matchesQuery(
  condition: string,
  options: Parameters<typeof registerCSS>[1],
): boolean {
  registerCSS(`@media ${condition} { .subject { width: 10px; } }`, options);
  render(<View testID={testID} className="subject" />);
  return screen.getByTestId(testID).props.style !== undefined;
}

test.each(BOUNDS)("%s is a bound %s the window", (label, options, side) => {
  const bound = label.split(" ")[0];

  expect([
    matchesQuery(`(min-width: ${bound})`, options),
    matchesQuery(`(max-width: ${bound})`, options),
  ]).toStrictEqual(side === "below" ? [true, false] : [false, true]);
});

test("an em range reads both of its bounds", () => {
  expect(matchesQuery("(40em <= width <= 60em)", {})).toBe(true);
});
