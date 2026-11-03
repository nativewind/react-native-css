import { render, screen } from "@testing-library/react-native";
import { View } from "react-native-css/components/View";
import { registerCSS } from "react-native-css/jest";

/**
 * Elements whose matched rule sets differ must never share resolved styles.
 *
 * Every element that matches the same rule set shares one resolved-style
 * cache entry, which is the point of the cache. That entry is computed from
 * the rules of whichever element created it, so if two DIFFERENT rule sets
 * were ever given one cache key, the second element would silently render
 * the first element's styles.
 *
 * This mounts a grid of elements at once, each combining one width class
 * with one height class, so every element has a unique expected style, and
 * asserts that each element renders exactly its own classes. All elements
 * stay mounted together so every cache entry is live at the same time.
 */
const SIZE = 40;

test("every distinct class combination renders its own styles", () => {
  const css: string[] = [];
  for (let i = 1; i <= SIZE; i++) {
    css.push(`.cw-${i} { width: ${i}px; }`, `.ch-${i} { height: ${i}px; }`);
  }
  registerCSS(css.join("\n"));

  const cells: {
    id: string;
    className: string;
    width: number;
    height: number;
  }[] = [];
  for (let w = 1; w <= SIZE; w++) {
    for (let h = 1; h <= SIZE; h++) {
      cells.push({
        id: `cell-${w}-${h}`,
        className: `cw-${w} ch-${h}`,
        width: w,
        height: h,
      });
    }
  }

  render(
    <>
      {cells.map(({ id, className }) => (
        <View key={id} testID={id} className={className} />
      ))}
    </>,
  );

  // Compare key-order-insensitively: rules apply in specificity/source order.
  const canonical = (value: unknown) =>
    JSON.stringify(value, (_, v: unknown) =>
      v && typeof v === "object" && !Array.isArray(v)
        ? Object.fromEntries(
            Object.entries(v).sort(([a], [b]) => a.localeCompare(b)),
          )
        : v,
    );

  const wrong = cells
    .map(({ id, width, height }) => ({
      id,
      expected: { width, height },
      received: screen.getByTestId(id).props.style as unknown,
    }))
    .filter(
      ({ expected, received }) => canonical(received) !== canonical(expected),
    );

  expect(wrong).toStrictEqual([]);
});
