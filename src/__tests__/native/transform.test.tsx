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

function renderStyle(css: string): unknown {
  registerCSS(css);

  return render(
    <View testID={testID} className="earlier my-class" />,
  ).getByTestId(testID).props.style;
}

// A second definition keeps each variable from being inlined, so it resolves at runtime
const decoy = `.decoy { --sx: 9; --sy: 9; --t: 9px; --offset: 1px; --s: 1; }`;

// React Native requires exactly one property per transform object, and its validator throws otherwise
describe("one property per entry", () => {
  // Chromium 153, Firefox 155 and WebKit 26.6 scale each axis by its own operand
  test.each([
    ["75%", "50%", [{ scaleX: 0.75 }, { scaleY: 0.5 }]],
    ["2", "3", [{ scaleX: 2 }, { scaleY: 3 }]],
  ])(
    "transform: scale(var(--sx), var(--sy)) with %s and %s renders an entry per axis",
    (sx, sy, transform) => {
      expect(
        renderStyle(
          `${decoy} .my-class { --sx: ${sx}; --sy: ${sy}; transform: scale(var(--sx), var(--sy)); }`,
        ),
      ).toStrictEqual({ transform });
    },
  );

  test("transform: scale(var(--sx)) scales both axes by its one operand", () => {
    expect(
      renderStyle(
        `${decoy} .my-class { --sx: 75%; transform: scale(var(--sx)); }`,
      ),
    ).toStrictEqual({ transform: [{ scale: 0.75 }] });
  });

  test("scale: var(--sx) scales both axes by its one value", () => {
    expect(
      renderStyle(`${decoy} .my-class { --sx: 75%; scale: var(--sx); }`),
    ).toStrictEqual({ transform: [{ scale: 0.75 }] });
  });

  // Chromium 153, Firefox 155 and WebKit 26.6 translate a one-operand translate() along x only
  test.each([
    "transform: translate(10px);",
    "--t: 10px; transform: translate(var(--t));",
    "--t: 10px; translate: var(--t);",
  ])("%s translates along x only", (declarations) => {
    expect(renderStyle(`${decoy} .my-class { ${declarations} }`)).toStrictEqual(
      { transform: [{ translateX: 10 }, { translateY: 0 }] },
    );
  });

  // Chromium 153, Firefox 155 and WebKit 26.6 read an operand list a var() supplies whole
  test.each([
    [
      "--offset: 10px 20px; translate: var(--offset);",
      [{ translateX: 10 }, { translateY: 20 }],
    ],
    [
      "--offset: 10px, 20px; transform: translate(var(--offset));",
      [{ translateX: 10 }, { translateY: 20 }],
    ],
    ["--s: 2 3; scale: var(--s);", [{ scaleX: 2 }, { scaleY: 3 }]],
  ] as const)("%s reads both operands", (declarations, transform) => {
    expect(renderStyle(`${decoy} .my-class { ${declarations} }`)).toStrictEqual(
      { transform },
    );
  });

  test("a two-operand translate() renders an entry per axis, beside a sibling", () => {
    expect(
      renderStyle(
        `${decoy} .my-class { --t: 10px; transform: translate(var(--t), var(--t)) rotate(45deg); }`,
      ),
    ).toStrictEqual({
      transform: [{ translateX: 10 }, { translateY: 10 }, { rotate: "45deg" }],
    });
  });

  test.each([
    "transform: scale3d(1, 2, 3);",
    "transform: scaleZ(2);",
    "transform: matrix(1, 0, 0, 1, 0, 0);",
  ])(
    "%s, which React Native has no form for, renders no entry",
    (declaration) => {
      expect(renderStyle(`.my-class { ${declaration} }`)).toStrictEqual({
        transform: [],
      });
    },
  );

  test("a translate() pair in a var() fallback renders an entry per axis", () => {
    expect(
      renderStyle(
        `.my-class { transform: var(--missing, translate(10px, 20px)); }`,
      ),
    ).toStrictEqual({ transform: [{ translateX: 10 }, { translateY: 20 }] });
  });

  test("a function React Native has no form for leaves its neighbour", () => {
    expect(
      renderStyle(
        `.my-class { transform: translateX(10px) scale3d(1, 2, 3); }`,
      ),
    ).toStrictEqual({ transform: [{ translateX: 10 }] });
  });
});

// Chromium 153, Firefox 155 and WebKit 26.6: a function left without a valid argument makes the declaration invalid at computed-value time, so the transform is none (css-variables-1 §3.1)
test.each([
  "transform: scaleX(var(--missing));",
  "transform: translateX(10px) scaleX(var(--missing));",
  "transform: translate(10px, var(--missing));",
  "transform: rotate(var(--missing));",
  "transform: scale(2, var(--missing));",
  "--offset: 10px 20px; transform: var(--offset);",
  "--offset: 10px 20px; transform: translateX(5px) var(--offset);",
  "--sx: none; transform: scaleX(var(--sx));",
  "--sx: none; transform: scale(var(--sx));",
])("%s leaves no transform", (declarations) => {
  expect(
    renderStyle(
      `${decoy} .earlier { transform: rotate(10deg); } .my-class { ${declarations} }`,
    ),
  ).toStrictEqual({ transform: [] });
});

// Chromium 153, Firefox 155 and WebKit 26.6: a scale or translate longhand left without a value is none, and the transform property beside it stands
test.each([
  "scale: var(--missing);",
  "scale: var(--missing) var(--missing);",
  "translate: var(--missing) var(--missing);",
  "--sx: none; scale: var(--sx);",
  "--sx: none; --sy: 2; scale: var(--sx) var(--sy);",
  "scale: unset;",
  "scale: initial;",
  "translate: initial;",
])("%s leaves the transform property's entries", (declarations) => {
  expect(
    renderStyle(
      `${decoy} .earlier { transform: rotate(10deg); } .my-class { ${declarations} }`,
    ),
  ).toStrictEqual({ transform: [{ rotate: "10deg" }] });
});
