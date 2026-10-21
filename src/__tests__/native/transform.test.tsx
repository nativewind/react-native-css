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
const decoy = `.decoy { --sx: 9; --sy: 9; --t: 9px; --offset: 1px; --s: 1; --x: 9px; --y: 9px; --r: 9deg; }`;

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
    ).toStrictEqual({ transform: [{ scaleX: 0.75 }, { scaleY: 0.75 }] });
  });

  test("scale: var(--sx) scales both axes by its one value", () => {
    expect(
      renderStyle(`${decoy} .my-class { --sx: 75%; scale: var(--sx); }`),
    ).toStrictEqual({ transform: [{ scaleX: 0.75 }, { scaleY: 0.75 }] });
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

  // React Native refuses a transform entry without a property, so a function the compiler does not convert contributes none
  test.each([
    "transform: scale3d(1, 2, 3);",
    "transform: scaleZ(2);",
    "transform: matrix(1, 0, 0, 1, 0, 0);",
  ])("%s renders no entry", (declaration) => {
    expect(renderStyle(`.my-class { ${declaration} }`)).toStrictEqual({
      transform: [],
    });
  });

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
test.each(
  (
    [
      ["", "scaleX(var(--missing))"],
      ["", "translate(10px, var(--missing))"],
      ["", "rotate(var(--missing))"],
      ["", "scale(2, var(--missing))"],
      ["--offset: 10px 20px; ", "var(--offset)"],
      ["--sx: none; ", "scaleX(var(--sx))"],
      ["--sx: none; ", "scale(var(--sx))"],
      ["--t: 1px, 2px, 3px; ", "translate(var(--t))"],
      ["--s: 1, 2, 3; ", "scale(var(--s))"],
      ["--r: 10deg, 20deg; ", "rotate(var(--r))"],
    ] as const
  ).flatMap(([customProperties, transform]) => [
    `${customProperties}transform: ${transform};`,
    `${customProperties}transform: translateX(5px) ${transform};`,
  ]),
)("%s leaves no transform", (declarations) => {
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

// Chromium 153, Firefox 155 and WebKit 26.6 cascade each transform property on its own, and compose translate, rotate, scale, then the transform list (css-transforms-2 §6)
test.each([
  [
    ".earlier { translate: 10px 20px; } .my-class { --x: 1px; --y: 2px; translate: var(--x) var(--y); }",
    [{ translateX: 1 }, { translateY: 2 }],
  ],
  [
    ".earlier { --x: 1px; --y: 2px; translate: var(--x) var(--y); } .my-class { translate: 10px 20px; }",
    [{ translateX: 10 }, { translateY: 20 }],
  ],
  [
    ".earlier { scale: 2; } .my-class { scale: 3; }",
    [{ scaleX: 3 }, { scaleY: 3 }],
  ],
  [
    ".earlier { transform: rotate(10deg); } .my-class { rotate: 20deg; }",
    [{ rotateZ: "20deg" }, { rotate: "10deg" }],
  ],
  [
    ".earlier { translate: 10px 20px; } .my-class { --t: 5px; transform: translateX(var(--t)); }",
    [{ translateX: 10 }, { translateY: 20 }, { translateX: 5 }],
  ],
  [
    ".earlier { --t: 5px; transform: translateX(var(--t)); } .my-class { translate: 10px 20px; }",
    [{ translateX: 10 }, { translateY: 20 }, { translateX: 5 }],
  ],
  [
    ".my-class { translate: 10px 20px; rotate: 30deg; scale: 2; transform: translateX(5px); }",
    [
      { translateX: 10 },
      { translateY: 20 },
      { rotateZ: "30deg" },
      { scaleX: 2 },
      { scaleY: 2 },
      { translateX: 5 },
    ],
  ],
  [
    ".earlier { translate: 10px 20px !important; } .my-class { translate: 1px 2px; }",
    [{ translateX: 10 }, { translateY: 20 }],
  ],
  [
    ".earlier { transform: rotate(10deg) !important; } .my-class { translate: 1px 2px; }",
    [{ translateX: 1 }, { translateY: 2 }, { rotate: "10deg" }],
  ],
] as const)("%s composes in CSS order", (css, transform) => {
  expect(renderStyle(`${decoy} ${css}`)).toStrictEqual({ transform });
});

// A unit React Native has no equivalent for leaves the declaration invalid there, and an invalid declaration is ignored (CSS 2.2 §4.2)
test.each([
  [
    ".earlier { translate: 5px 6px; } .my-class { translate: 10px 1cap; }",
    [{ translateX: 5 }, { translateY: 6 }],
  ],
  [
    ".earlier { transform: rotate(5deg); } .my-class { translate: 10px 1cap; }",
    [{ rotate: "5deg" }],
  ],
  [
    ".earlier { transform: rotate(5deg); } .my-class { transform: translate(10px, 1cap); }",
    [{ rotate: "5deg" }],
  ],
] as const)(
  "%s ignores the declaration it cannot convert",
  (css, transform) => {
    expect(renderStyle(css)).toStrictEqual({ transform });
  },
);

// Chromium 153, Firefox 155 and WebKit 26.6 resolve an em length against the element's font size, whichever rule sets it (css-values-4 §6.1.1)
test.each([
  [
    ".earlier { translate: 1em 5px; } .my-class { font-size: 20px; }",
    [{ translateX: 20 }, { translateY: 5 }],
  ],
  [
    ".earlier { transform: translateX(1em); } .my-class { font-size: 20px; }",
    [{ translateX: 20 }],
  ],
] as const)(
  "%s resolves em against the element's font size",
  (css, transform) => {
    expect(renderStyle(css)).toStrictEqual({ fontSize: 20, transform });
  },
);

// Chromium 153 and Firefox 155 rotate about the axis a vector names, reversing the angle about a negative axis, and rotate by none about the zero vector; WebKit 26.6 ignores the direction of a z axis
test.each([
  ["rotate: 0 0 -1 45deg;", [{ rotateZ: "-45deg" }]],
  ["--r: 0 0 -1 45deg; rotate: var(--r);", [{ rotateZ: "-45deg" }]],
  ["rotate: -1 0 0 45deg;", [{ rotateX: "-45deg" }]],
  ["--r: -1 0 0 45deg; rotate: var(--r);", [{ rotateX: "-45deg" }]],
  ["rotate: 0 0 2 45deg;", [{ rotateZ: "45deg" }]],
  ["--r: 0 0 2 45deg; rotate: var(--r);", [{ rotateZ: "45deg" }]],
  ["rotate: x 45deg;", [{ rotateX: "45deg" }]],
  ["--r: x 45deg; rotate: var(--r);", [{ rotateX: "45deg" }]],
  ["rotate: 45deg y;", [{ rotateY: "45deg" }]],
  ["--r: 45deg y; rotate: var(--r);", [{ rotateY: "45deg" }]],
  ["--r: 20deg; rotate: var(--r);", [{ rotateZ: "20deg" }]],
  ["--r: x; rotate: var(--r) 45deg;", [{ rotateX: "45deg" }]],
  ["--r: 0 0 -1; rotate: var(--r) 45deg;", [{ rotateZ: "-45deg" }]],
  ["rotate: 0 0 0 45deg;", [{ rotateZ: "0deg" }]],
  ["--r: 0 0 0 45deg; rotate: var(--r);", [{ rotateZ: "0deg" }]],
  ["--r: none; rotate: var(--r);", [{ rotateZ: "0deg" }]],
] as const)("%s rotates about the axis it names", (declarations, transform) => {
  expect(
    renderStyle(
      `${decoy} .earlier { rotate: 10deg; } .my-class { ${declarations} }`,
    ),
  ).toStrictEqual({ transform });
});

// Chromium 153, Firefox 155 and WebKit 26.6 read the third value of translate and scale as its z, which React Native has no axis for
test.each([
  ["translate: 10px 20px 30px;", [{ translateX: 10 }, { translateY: 20 }]],
  [
    "--t: 10px 20px 30px; translate: var(--t);",
    [{ translateX: 10 }, { translateY: 20 }],
  ],
  [
    "--t: 20px 30px; translate: 10px var(--t);",
    [{ translateX: 10 }, { translateY: 20 }],
  ],
  ["--t: none; translate: var(--t);", [{ translateX: 0 }, { translateY: 0 }]],
  ["--t: NONE; translate: var(--t);", [{ translateX: 0 }, { translateY: 0 }]],
  ["scale: 2 3 4;", [{ scaleX: 2 }, { scaleY: 3 }]],
  ["--s: 2 3 4; scale: var(--s);", [{ scaleX: 2 }, { scaleY: 3 }]],
  ["--s: 3 4; scale: 2 var(--s);", [{ scaleX: 2 }, { scaleY: 3 }]],
  ["--s: none; scale: var(--s);", [{ scaleX: 1 }, { scaleY: 1 }]],
] as const)("%s renders its x and y", (declarations, transform) => {
  expect(
    renderStyle(
      `${decoy} .earlier { translate: 1px 2px; scale: 5; } .my-class { translate: none; scale: none; ${declarations} }`,
    ),
  ).toStrictEqual({
    transform: [
      ...(declarations.includes("translate")
        ? transform
        : [{ translateX: 0 }, { translateY: 0 }]),
      ...(declarations.includes("scale")
        ? transform
        : [{ scaleX: 1 }, { scaleY: 1 }]),
    ],
  });
});

// Chromium 153, Firefox 155 and WebKit 26.6: a value the property's grammar does not take is invalid at computed-value time, so the property is none (css-variables-1 §3.1)
test.each([
  "--r: x y 45deg; rotate: var(--r);",
  "--r: 0 45deg 0 1; rotate: var(--r);",
  "--t: 10px 20px 30%; translate: var(--t);",
  "--t: 1px 2px 3px 4px; translate: var(--t);",
  "--s: 2 3 4 5; scale: var(--s);",
  "--s: 2 3 red; scale: var(--s);",
  "--s: none 2; scale: var(--s);",
])("%s leaves the property none", (declarations) => {
  expect(
    renderStyle(
      `${decoy} .earlier { translate: 1px 2px; rotate: 10deg; scale: 5; transform: translateX(5px); } .my-class { ${declarations} }`,
    ),
  ).toStrictEqual({
    transform: [
      ...(declarations.includes("translate:")
        ? []
        : [{ translateX: 1 }, { translateY: 2 }]),
      ...(declarations.includes("rotate:") ? [] : [{ rotateZ: "10deg" }]),
      ...(declarations.includes("scale:")
        ? []
        : [{ scaleX: 5 }, { scaleY: 5 }]),
      { translateX: 5 },
    ],
  });
});

// React Native's rotate keys turn only about an axis, so a rotate about a vector off every axis is ignored when written and none when substituted
test.each([
  ["rotate: 1 1 0 45deg;", [{ rotateZ: "10deg" }]],
  ["--r: 1 1 0 45deg; rotate: var(--r);", []],
] as const)("%s rotates by none", (declarations, transform) => {
  expect(
    renderStyle(
      `${decoy} .earlier { rotate: 10deg; } .my-class { ${declarations} }`,
    ),
  ).toStrictEqual(transform.length === 0 ? {} : { transform });
});

// Chromium 153, Firefox 155 and WebKit 26.6: a later transform without a value replaces an earlier one, and is none (css-variables-1 §3.1)
test("transform: var(--missing) replaces an earlier rule's transform", () => {
  expect(
    renderStyle(
      `${decoy} .earlier { transform: rotate(10deg); } .my-class { transform: var(--missing); }`,
    ),
  ).toStrictEqual({ transform: [] });
});
