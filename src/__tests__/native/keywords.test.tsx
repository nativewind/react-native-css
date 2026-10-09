import { render, screen } from "@testing-library/react-native";
import { View } from "react-native-css/components/View";
import { registerCSS } from "react-native-css/jest";

const resettingKeywords = ["initial", "unset", "revert", "revert-layer"];

const clearedProperties: readonly (readonly [
  property: string,
  earlier: string,
  cleared: Record<string, undefined>,
])[] = [
  ["background-color", "red", { backgroundColor: undefined }],
  ["opacity", "0.5", { opacity: undefined }],
  ["box-shadow", "1px 1px red", { boxShadow: undefined }],
  ["filter", "blur(2px)", { filter: undefined }],
  ["transform", "translateX(10px)", {}],
  ["line-height", "30px", {}],
  [
    "text-shadow",
    "1px 1px red",
    {
      textShadowColor: undefined,
      textShadowOffset: undefined,
      textShadowRadius: undefined,
    },
  ],
  [
    "border",
    "2px solid red",
    { borderWidth: undefined, borderStyle: undefined, borderColor: undefined },
  ],
];

function renderStyle(css: string): unknown {
  registerCSS(css);

  render(<View testID="child" className="earlier child" />);

  return screen.getByTestId("child").props.style;
}

// Chromium 153, Firefox 155 and WebKit 26.6 reset each of these to its initial value, which React Native's default matches
test.each(
  clearedProperties.flatMap(([property, earlier, cleared]) =>
    resettingKeywords.map(
      (keyword) => [property, keyword, earlier, cleared] as const,
    ),
  ),
)(
  "%s: %s clears an earlier rule's value",
  (property, keyword, earlier, cleared) => {
    expect(
      renderStyle(
        `.earlier { ${property}: ${earlier}; } .child { ${property}: ${keyword}; }`,
      ),
    ).toStrictEqual(cleared);
  },
);

test.each(resettingKeywords)(
  "border-block-width: %s resets to React Native's default width",
  (keyword) => {
    expect(
      renderStyle(
        `.earlier { border-block-width: 3px; } .child { border-block-width: ${keyword}; }`,
      ),
    ).toStrictEqual({
      borderTopWidth: undefined,
      borderBottomWidth: undefined,
    });
  },
);

// Chromium 153, Firefox 155 and WebKit 26.6 read the ancestor's value for each, as a custom property inherits (css-variables-1 §2)
test.each(["inherit", "unset", "revert", "revert-layer"])(
  "--brand: %s reads the ancestor's --brand",
  (keyword) => {
    registerCSS(`
      .parent { --brand: green; }
      .child { --brand: ${keyword}; color: var(--brand); }
      .other { --brand: ${keyword}; }
    `);

    render(
      <View className="parent">
        <View testID="child" className="child" />
      </View>,
    );

    expect(screen.getByTestId("child").props.style).toStrictEqual({
      color: "green",
    });
  },
);

const earlierShadow = {
  boxShadow: [
    {
      offsetX: 1,
      offsetY: 1,
      blurRadius: 0,
      spreadDistance: 0,
      color: "#f00",
    },
  ],
};

// Chromium 153, Firefox 155 and WebKit 26.6 ignore each invalid declaration and keep the earlier value
test.each([
  ["filter", "foo(1)", "blur(2px)", { filter: [{ blur: 2 }] }],
  ["box-shadow", "foo(1)", "1px 1px red", earlierShadow],
  ["box-shadow", "1px 1px inherit", "1px 1px red", earlierShadow],
  [
    "transform",
    "foo(1)",
    "translateX(10px)",
    { transform: [{ translateX: 10 }] },
  ],
] as const)(
  "%s: %s leaves an earlier rule's value",
  (property, invalid, earlier, kept) => {
    expect(
      renderStyle(
        `.earlier { ${property}: ${earlier}; } .child { ${property}: ${invalid}; }`,
      ),
    ).toStrictEqual(kept);
  },
);

test.each([
  [
    "object-position",
    "left inherit",
    "right top",
    { contentPosition: "right top" },
  ],
  [
    "font-variant",
    "all-small-caps inherit",
    "small-caps",
    { style: { fontVariant: "small-caps" } },
  ],
  [
    "corner-shape",
    "round inherit",
    "squircle",
    { style: { borderCurve: "continuous" } },
  ],
] as const)(
  "%s: %s leaves an earlier rule's value",
  (property, invalid, earlier, kept) => {
    registerCSS(
      `.earlier { ${property}: ${earlier}; } .child { ${property}: ${invalid}; }`,
    );

    render(<View testID="child" className="earlier child" />);

    expect(screen.getByTestId("child").props).toMatchObject(kept);
  },
);
