import { screen } from "@testing-library/react-native";
import { TextInput } from "react-native-css/components";
import { colorScheme } from "react-native-css/runtime";

import { render } from "./_tailwind";

const utilities: [className: string, prop: (string | number)[]][] = [
  ["text-current", ["style", "color"]],
  ["bg-current", ["style", "backgroundColor"]],
  ["border-2 border-current", ["style", "borderColor"]],
  ["outline-2 outline-current", ["style", "outlineColor"]],
  ["underline decoration-current", ["style", "textDecorationColor"]],
  ["caret-current", ["cursorColor"]],
  ["fill-current", ["fill"]],
  ["stroke-current", ["stroke"]],
  ["ring", ["style", "boxShadow", 0, "color"]],
  ["inset-ring", ["style", "boxShadow", 0, "color"]],
  ["placeholder:text-current", ["placeholderTextColor"]],
];

describe.each([
  ["light", "#000000", "rgba(0, 0, 0, 1)"],
  ["dark", "#FFFFFF", "rgba(255, 255, 255, 1)"],
] as const)("in a %s scheme", (scheme, seed, mixedSeed) => {
  test.each(utilities)(`%s paints ${seed}`, async (className, prop) => {
    colorScheme.set(scheme);
    await render(<TextInput testID="current" className={className} />);

    expect(screen.getByTestId("current").props).toHaveProperty(prop, seed);
  });

  // Tailwind mixes the shadow color with `color-mix()`, which the runtime writes as `rgba()`.
  test(`shadow-current paints ${mixedSeed}`, async () => {
    colorScheme.set(scheme);
    await render(
      <TextInput testID="current" className="shadow-sm shadow-current" />,
    );

    expect(screen.getByTestId("current").props).toHaveProperty(
      ["style", "boxShadow", 0, "color"],
      mixedSeed,
    );
  });
});

test("an explicit ring color wins over the currentcolor default", async () => {
  colorScheme.set("light");
  await render(<TextInput testID="current" className="ring-2 ring-red-500" />);

  expect(screen.getByTestId("current").props).toHaveProperty(
    ["style", "boxShadow", 0, "color"],
    "#fb2c36",
  );
});
