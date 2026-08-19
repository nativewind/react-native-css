import { render } from "@testing-library/react-native";
import { View } from "react-native-css/components/View";
import { registerCSS } from "react-native-css/jest";

import { stylesFamily } from "../../native/styles";

/**
 * The end-to-end statement of what the cache is for: it holds one entry per distinct set of
 * resolved inputs, not one per mounted element. Everything else in the resolution path is an
 * implementation detail of reaching that number.
 */

const ELEMENTS = 50;

test("identical elements share one resolved-style cache entry", () => {
  registerCSS(`.probe { color: red; width: 10px; }`);
  stylesFamily.clear();

  render(
    <>
      {Array.from({ length: ELEMENTS }, (_unused, index) => (
        <View key={index} className="probe" />
      ))}
    </>,
  );

  expect(stylesFamily.size()).toBe(1);
});

test("elements with different class lists keep distinct entries", () => {
  // The counter-case: sharing must follow the inputs, not collapse everything onto one entry.
  registerCSS(`.red { color: red; } .blue { color: blue; }`);
  stylesFamily.clear();

  render(
    <>
      <View className="red" />
      <View className="blue" />
    </>,
  );

  expect(stylesFamily.size()).toBe(2);
});
