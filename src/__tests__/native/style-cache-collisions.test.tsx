import { render, screen } from "@testing-library/react-native";
import { View } from "react-native-css/components/View";
import { registerCSS } from "react-native-css/jest";

// Every element matches a distinct pair of rules, so a cache key shared by two of them would render
// one element with the other's styles. All stay mounted, so every entry is live at once.
test("every distinct class combination renders its own styles", () => {
  const sizes = Array.from({ length: 40 }, (_unused, index) => index + 1);
  registerCSS(
    sizes
      .map((i) => `.cw-${i} { width: ${i}px; } .ch-${i} { height: ${i}px; }`)
      .join("\n"),
  );
  const cells = sizes.flatMap((width) =>
    sizes.map((height) => ({ id: `cell-${width}-${height}`, width, height })),
  );

  render(
    <>
      {cells.map(({ id, width, height }) => (
        <View key={id} testID={id} className={`cw-${width} ch-${height}`} />
      ))}
    </>,
  );

  expect(
    cells.map(({ id }) => screen.getByTestId(id).props.style as unknown),
  ).toStrictEqual(cells.map(({ width, height }) => ({ width, height })));
});
