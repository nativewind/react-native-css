import { act, render, screen } from "@testing-library/react-native";
import { View } from "react-native-css/components/View";
import { registerCSS } from "react-native-css/jest";
import { colorScheme } from "react-native-css/runtime";

function styleOf(className: string) {
  return screen.getByTestId(className).props.style as unknown;
}

describe("a stylesheet holding a rule lightningcss cannot parse", () => {
  test.each([
    ["a media query with a <general-enclosed> condition", "@media (foo bar)"],
    [
      "a container query with a <general-enclosed> condition",
      "@container (foo bar)",
    ],
    [
      "a media query with a value its feature does not take",
      "@media (prefers-color-scheme: 0)",
    ],
  ])("%s styles nothing and the rules beside it apply", (_, prelude) => {
    registerCSS(
      `.a { color: red } ${prelude} { .b { color: blue } } .c { color: green }`,
    );

    render(
      <>
        <View testID="a" className="a" />
        <View testID="b" className="b" />
        <View testID="c" className="c" />
      </>,
    );

    for (const scheme of ["light", "dark"] as const) {
      act(() => {
        colorScheme.set(scheme);
      });

      expect(styleOf("a")).toStrictEqual({ color: "#f00" });
      expect(styleOf("b")).toBeUndefined();
      expect(styleOf("c")).toStrictEqual({ color: "#008000" });
    }
  });

  test("a declaration that fails to parse drops alone", () => {
    registerCSS(`.a { color: var(); width: 10px } .c { color: green }`);

    render(
      <>
        <View testID="a" className="a" />
        <View testID="c" className="c" />
      </>,
    );

    expect(styleOf("a")).toStrictEqual({ width: 10 });
    expect(styleOf("c")).toStrictEqual({ color: "#008000" });
  });
});
