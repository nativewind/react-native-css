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

    // Scale is unitless in RN — a percentage var resolves to the fraction
    // (2% → 0.02), never the string "2%" (which crashes the transform validator).
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

  // nativewind/react-native-css#216 — CSS `scale` is unitless in React Native
  // (75% → 0.75), never the "75%" string that crashes the transform validator.
  // Both code paths are covered: direct percentages (compile-time
  // parseScaleValue) and var()-resolved percentages (runtime scale() resolver,
  // the shape Tailwind v4's `scale-*` utilities actually emit).
  const scaleStyle = (css: string): unknown => {
    registerCSS(`.my-class { ${css} }`);
    return render(<View testID={testID} className="my-class" />).getByTestId(
      testID,
    ).props.style;
  };

  test("percentage — single value applies to both axes", () => {
    expect(scaleStyle("scale: 75%;")).toStrictEqual({
      transform: [{ scaleX: 0.75 }, { scaleY: 0.75 }],
    });
  });

  test("percentage — identity (100% → 1)", () => {
    expect(scaleStyle("scale: 100%;")).toStrictEqual({
      transform: [{ scaleX: 1 }, { scaleY: 1 }],
    });
  });

  test("percentage — zero (0% → 0)", () => {
    expect(scaleStyle("scale: 0%;")).toStrictEqual({
      transform: [{ scaleX: 0 }, { scaleY: 0 }],
    });
  });

  test("percentage — negative flips (-50% → -0.5)", () => {
    expect(scaleStyle("scale: -50%;")).toStrictEqual({
      transform: [{ scaleX: -0.5 }, { scaleY: -0.5 }],
    });
  });

  test("percentage — greater than 100% (150% → 1.5)", () => {
    expect(scaleStyle("scale: 150%;")).toStrictEqual({
      transform: [{ scaleX: 1.5 }, { scaleY: 1.5 }],
    });
  });

  test("percentage — fractional (12.5% → 0.125)", () => {
    expect(scaleStyle("scale: 12.5%;")).toStrictEqual({
      transform: [{ scaleX: 0.125 }, { scaleY: 0.125 }],
    });
  });

  test("percentage — different per-axis values (75% 50%)", () => {
    expect(scaleStyle("scale: 75% 50%;")).toStrictEqual({
      transform: [{ scaleX: 0.75 }, { scaleY: 0.5 }],
    });
  });

  test("percentage via var() — the Tailwind v4 scale-* shape", () => {
    expect(
      scaleStyle(
        "--tw-scale-x: 75%; --tw-scale-y: 75%; scale: var(--tw-scale-x) var(--tw-scale-y);",
      ),
    ).toStrictEqual({ transform: [{ scaleX: 0.75 }, { scaleY: 0.75 }] });
  });

  test("percentage via var() — different per-axis values", () => {
    expect(
      scaleStyle(
        "--tw-scale-x: 50%; --tw-scale-y: 75%; scale: var(--tw-scale-x) var(--tw-scale-y);",
      ),
    ).toStrictEqual({ transform: [{ scaleX: 0.5 }, { scaleY: 0.75 }] });
  });

  test("unitless number is unchanged — no regression (2 → 2)", () => {
    expect(scaleStyle("scale: 2;")).toStrictEqual({
      transform: [{ scaleX: 2 }, { scaleY: 2 }],
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

  test("rotate-x-45", () => {
    registerCSS(`
.rotate-45 {
  --tw-rotate-x: rotateX(45deg);
  transform: var(--tw-rotate-x) var(--tw-rotate-y) var(--tw-rotate-z) var(--tw-skew-x) var(--tw-skew-y);
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
