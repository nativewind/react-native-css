/** @jsxImportSource react-native-css */
import { View } from "react-native";

import {
  registerCSS,
  render,
  setupAllComponents,
  testID,
} from "react-native-css/jest";

setupAllComponents();

test("translate", () => {
  registerCSS(`.my-class { translate: 10%; }`);
  const component = render(
    <View testID={testID} className="my-class" />,
  ).getByTestId(testID);

  expect(component).toHaveStyle({
    transform: [{ translateX: "10%" }, { translateY: 0 }],
  });
});

describe("transform", () => {
  test("translateX percentage", () => {
    registerCSS(`.my-class { transform: translateX(10%); }`);
    const component = render(
      <View testID={testID} className="my-class" />,
    ).getByTestId(testID);

    expect(component).toHaveStyle({
      transform: [{ translateX: "10%" }],
    });
  });

  test("translateY percentage", () => {
    registerCSS(`.my-class { transform: translateY(10%); }`);

    const component = render(
      <View testID={testID} className="my-class" />,
    ).getByTestId(testID);

    expect(component).toHaveStyle({
      transform: [{ translateY: "10%" }],
    });
  });

  test("rotate-180", () => {
    registerCSS(`.my-class { transform: rotate(180deg); }`);

    const component = render(
      <View testID={testID} className="my-class" />,
    ).getByTestId(testID);

    expect(component).toHaveStyle({
      transform: [{ rotate: "180deg" }],
    });
  });

  test("rotate-45", () => {
    registerCSS(`
* {
  --tw-translate-x: 0;
  --tw-translate-y: 0;
  --tw-rotate: 0deg;
  --tw-skew-x: 0deg;
  --tw-skew-y: 0deg;
  --tw-scale-x: 1;
  --tw-scale-y: 1;
  --tw-pan-x:  ;
  --tw-pan-y:  ;
}

.rotate-45 {
  --tw-rotate: 45deg;
  transform: translate(var(--tw-translate-x), var(--tw-translate-y)) rotate(var(--tw-rotate)) skewX(var(--tw-skew-x)) skewY(var(--tw-skew-y)) scaleX(var(--tw-scale-x)) scaleY(var(--tw-scale-y))
}`);

    const component = render(
      <View testID={testID} className="rotate-45" />,
    ).getByTestId(testID);

    expect(component).toHaveStyle({
      transform: [
        { translateX: 0 },
        { translateY: 0 },
        { rotate: "45deg" },
        { skewX: "0deg" },
        { skewY: "0deg" },
        { scaleX: 1 },
        { scaleY: 1 },
      ],
    });
  });

  test("unparsed translateX percentage", () => {
    registerCSS(
      `.my-class { transform: var(--test); --test: translateX(20%) }`,
    );
    const component = render(
      <View testID={testID} className="my-class" />,
    ).getByTestId(testID);

    expect(component).toHaveStyle({
      transform: [{ translateX: "20%" }],
    });
  });
});
