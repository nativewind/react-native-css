import { render, screen } from "@testing-library/react-native";
import { View } from "react-native-css/components";
import { registerCSS } from "react-native-css/jest";

// Exercise the native prop processor, which the component mock does not run.
const processBackgroundImage =
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require("react-native/Libraries/StyleSheet/processBackgroundImage")
    .default as (value: unknown) => unknown;

test.each([
  "none",
  "linear-gradient(to right, red 0%, blue 100%)",
  "linear-gradient(45deg, red 10px, blue 40px)",
  "linear-gradient(to right, red, blue), linear-gradient(to bottom, black, white)",
])("native background image input: %s", (css) => {
  registerCSS(`.subject { background-image: ${css}; }`);
  render(<View testID="subject" className="subject" />);
  const value =
    screen.getByTestId("subject").props.style.experimental_backgroundImage;
  expect(() => processBackgroundImage(value)).not.toThrow();
  expect(processBackgroundImage(value)).toEqual(processBackgroundImage(css));
});

test("removing a gradient produces the native empty image value", () => {
  registerCSS(
    `.on { background-image: linear-gradient(red, blue); } .off { background-image: none; }`,
  );
  render(<View testID="subject" className="on" />);
  expect(
    processBackgroundImage(
      screen.getByTestId("subject").props.style.experimental_backgroundImage,
    ),
  ).toHaveLength(1);
  screen.rerender(<View testID="subject" className="off" />);
  expect(
    processBackgroundImage(
      screen.getByTestId("subject").props.style.experimental_backgroundImage,
    ),
  ).toEqual([]);
});
