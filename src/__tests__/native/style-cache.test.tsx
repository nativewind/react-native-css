import { Button as RNButton, type ButtonProps } from "react-native";

import { render, screen } from "@testing-library/react-native";
import { copyComponentProperties } from "react-native-css/components/copyComponentProperties";
import { View } from "react-native-css/components/View";
import { registerCSS } from "react-native-css/jest";
import { useCssElement } from "react-native-css/native";
import type {
  StyledConfiguration,
  StyledProps,
} from "react-native-css/runtime.types";

import { mappingToConfig } from "../../native/react/useNativeCss";
import { stylesFamily } from "../../native/styles";

const buttonMapping: StyledConfiguration<typeof RNButton> = {
  className: { target: false, nativeStyleMapping: { color: "color" } },
};

const Button = copyComponentProperties(
  RNButton,
  (props: StyledProps<ButtonProps, typeof buttonMapping>) =>
    useCssElement(RNButton, props, buttonMapping),
);

const titleColor = (title: string): unknown =>
  screen.getByText(title).props.style?.[1]?.color;

test("identical elements share one resolved-style cache entry", () => {
  registerCSS(`.probe { color: red; width: 10px; }`);
  stylesFamily.clear();

  render(
    <>
      {Array.from({ length: 50 }, (_unused, index) => (
        <View key={index} className="probe" />
      ))}
    </>,
  );

  expect(stylesFamily.size()).toBe(1);
});

test("elements with different class lists keep distinct entries", () => {
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

test("nothing writes to the config elements share", () => {
  // Compared by value, since a write to a frozen config does not throw here
  registerCSS(`.tinted { color: orange; }`);
  const shared = mappingToConfig(buttonMapping);
  const before = JSON.stringify(shared);

  render(<Button className="tinted" title="Go" onPress={() => undefined} />);

  expect(JSON.stringify(shared)).toBe(before);
  expect(titleColor("Go")).toBe("#ffa500");
});

test("a shared entry is not consumed by the first element that reads it", () => {
  registerCSS(`.tinted { color: orange; }`);
  stylesFamily.clear();
  const titles = ["a", "b", "c"];

  render(
    <>
      {titles.map((title) => (
        <Button
          key={title}
          className="tinted"
          title={title}
          onPress={() => undefined}
        />
      ))}
    </>,
  );

  expect(stylesFamily.size()).toBe(1);
  expect(titles.map(titleColor)).toStrictEqual([
    "#ffa500",
    "#ffa500",
    "#ffa500",
  ]);
});
