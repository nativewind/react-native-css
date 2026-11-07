import { render } from "@testing-library/react-native";
import { View } from "react-native-css/components/View";
import { registerCSS, testID } from "react-native-css/jest";

describe("translate", () => {
  test("parsed", () => {
    registerCSS(`.my-class { translate: 10%; }`);
    const component = render(
      <View testID={testID} className="my-class" />,
    ).getByTestId(testID);

    expect(component.props.style).toStrictEqual({
      transform: [{ translateX: "10%" }, { translateY: 0 }],
    });
  });

  test("unparsed", () => {
    registerCSS(`
      :root {
        --translate-x: 2;
        --translate-y: 3;
      }
      .my-class { translate: var(--translate-x) var(--translate-y); }`);
    const component = render(
      <View testID={testID} className="my-class" />,
    ).getByTestId(testID);

    expect(component.props.style).toStrictEqual({
      transform: [{ translateX: 2 }, { translateY: 3 }],
    });
  });
});

describe("scale", () => {
  test("parsed", () => {
    registerCSS(`.my-class { scale: 2 3; }`);
    const component = render(
      <View testID={testID} className="my-class" />,
    ).getByTestId(testID);

    expect(component.props.style).toStrictEqual({
      transform: [{ scaleX: 2 }, { scaleY: 3 }],
    });
  });

  test("unparsed", () => {
    registerCSS(`
      .my-class { 
        --scale-x: 2%;
        --scale-y: 2%;
        scale: var(--scale-x) var(--scale-y); 
      }
    `);
    const component = render(
      <View testID={testID} className="my-class" />,
    ).getByTestId(testID);

    expect(component.props.style).toStrictEqual({
      transform: [{ scaleX: 0.02 }, { scaleY: 0.02 }],
    });
  });

  test("unparsed - different values", () => {
    registerCSS(`
      :root {
        --scale-x: 2;
        --scale-y: 3;
      }
      .my-class { scale: var(--scale-x) var(--scale-y); }`);
    const component = render(
      <View testID={testID} className="my-class" />,
    ).getByTestId(testID);

    expect(component.props.style).toStrictEqual({
      transform: [{ scaleX: 2 }, { scaleY: 3 }],
    });
  });
});

describe("transform", () => {
  test("translateX percentage", () => {
    registerCSS(`.my-class { transform: translateX(10%); }`);
    const component = render(
      <View testID={testID} className="my-class" />,
    ).getByTestId(testID);

    expect(component.props.style).toStrictEqual({
      transform: [{ translateX: "10%" }],
    });
  });

  test("translateY percentage", () => {
    registerCSS(`.my-class { transform: translateY(10%); }`);

    const component = render(
      <View testID={testID} className="my-class" />,
    ).getByTestId(testID);

    expect(component.props.style).toStrictEqual({
      transform: [{ translateY: "10%" }],
    });
  });

  test("rotate-180", () => {
    registerCSS(`.my-class { transform: rotate(180deg); }`);

    const component = render(
      <View testID={testID} className="my-class" />,
    ).getByTestId(testID);

    expect(component.props.style).toStrictEqual({
      transform: [{ rotate: "180deg" }],
    });
  });

  // Chromium 153, Firefox 155 and WebKit 26.6: Tailwind's empty fallbacks let an undefined variable substitute nothing
  test("rotate-x-45", () => {
    registerCSS(`
.rotate-45 {
  --tw-rotate-x: rotateX(45deg);
  transform: var(--tw-rotate-x,) var(--tw-rotate-y,) var(--tw-rotate-z,) var(--tw-skew-x,) var(--tw-skew-y,);
}`);

    const component = render(
      <View testID={testID} className="rotate-45" />,
    ).getByTestId(testID);

    expect(component.props.style).toStrictEqual({
      transform: [{ rotateX: "45deg" }],
    });
  });

  test("unparsed translateX percentage", () => {
    registerCSS(
      `.my-class { transform: var(--test); --test: translateX(20%) }`,
    );
    const component = render(
      <View testID={testID} className="my-class" />,
    ).getByTestId(testID);

    expect(component.props.style).toStrictEqual({
      transform: [{ translateX: "20%" }],
    });
  });

  test("multiple", () => {
    registerCSS(`.my-class { transform: translateX(10%) scaleX(2); }`);

    const component = render(
      <View testID={testID} className="my-class" />,
    ).getByTestId(testID);

    expect(component.props.style).toStrictEqual({
      transform: [{ translateX: "10%" }, { scaleX: 2 }],
    });
  });
});

describe("a transform's target survives a later nested declaration", () => {
  test("translate before a box-shadow lands in transform", () => {
    registerCSS(
      `.my-class { translate: 10px 20px; box-shadow: 1px 1px blue; }`,
    );

    const component = render(
      <View testID={testID} className="my-class" />,
    ).getByTestId(testID);

    expect(component.props.style).toStrictEqual({
      transform: [{ translateX: 10 }, { translateY: 20 }],
      boxShadow: [
        {
          offsetX: 1,
          offsetY: 1,
          blurRadius: 0,
          spreadDistance: 0,
          color: "#00f",
        },
      ],
    });
  });

  test("declaration order does not matter", () => {
    registerCSS(
      `.my-class { box-shadow: 1px 1px blue; translate: 10px 20px; }`,
    );

    const component = render(
      <View testID={testID} className="my-class" />,
    ).getByTestId(testID);

    expect(component.props.style).toStrictEqual({
      transform: [{ translateX: 10 }, { translateY: 20 }],
      boxShadow: [
        {
          offsetX: 1,
          offsetY: 1,
          blurRadius: 0,
          spreadDistance: 0,
          color: "#00f",
        },
      ],
    });
  });
});

// Chromium 153, Firefox 155 and WebKit 26.6 leave no transform for each
test.each([
  ["transform: var(--t)", "none"],
  ["transform: translateX(10px) var(--t)", "none"],
])("%s with --t: %s leaves no transform", (declaration, keyword) => {
  registerCSS(
    `.my-class { --t: rotate(1deg); ${declaration}; } .keyword { --t: ${keyword}; }`,
  );

  const component = render(
    <View testID={testID} className="my-class keyword" />,
  ).getByTestId(testID);

  expect(component.props.style).toStrictEqual({});
});

// Chromium 153, Firefox 155 and WebKit 26.6 substitute each transform a variable holds, in place
test("a var() holding several transforms substitutes each of them", () => {
  registerCSS(
    `.my-class { --several: rotate(45deg) scale(2); transform: translateX(1px) var(--several); } .other { --several: none; }`,
  );

  const component = render(
    <View testID={testID} className="my-class" />,
  ).getByTestId(testID);

  expect(component.props.style).toStrictEqual({
    transform: [{ translateX: 1 }, { rotate: "45deg" }, { scale: 2 }],
  });
});
