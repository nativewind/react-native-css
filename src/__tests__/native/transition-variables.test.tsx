import { StyleSheet } from "react-native";

import { render, screen } from "@testing-library/react-native";
import { VariableContextProvider } from "react-native-css";
import { View } from "react-native-css/components/View";
import { registerCSS, testID } from "react-native-css/jest";

import {
  declarationRoutes,
  renderOnRoute,
  routes,
  runtimeRoutes,
  variableRoutes,
} from "./_reanimated-routes";

// Observe the engine's transition contract before Reanimated consumes it.
jest.mock("../../native/reanimated", () => ({
  animatedComponentFamily: jest.fn((component: unknown) => component),
}));

const { cubicBezier, steps } = jest.requireActual<
  typeof import("react-native-reanimated")
>("react-native-reanimated");
const easeQuarter = cubicBezier(0.25, 0.5, 0.75, 1);

describe.each([
  [
    "transition",
    "width 1s ease-in 200ms",
    {
      transitionProperty: ["width"],
      transitionDuration: [1000],
      transitionDelay: [200],
      transitionTimingFunction: "ease-in",
    },
  ],
  [
    "transition",
    "width 1s, opacity 2s linear",
    {
      transitionProperty: ["width", "opacity"],
      transitionDuration: [1000, 2000],
      transitionDelay: [0, 0],
      transitionTimingFunction: ["ease", "linear"],
    },
  ],
  [
    "transition",
    "width, opacity",
    {
      transitionProperty: ["width", "opacity"],
      transitionDuration: [0, 0],
      transitionDelay: [0, 0],
      transitionTimingFunction: ["ease", "ease"],
    },
  ],
  [
    "transition",
    "width 1s, opacity",
    {
      transitionProperty: ["width", "opacity"],
      transitionDuration: [1000, 0],
      transitionDelay: [0, 0],
      transitionTimingFunction: ["ease", "ease"],
    },
  ],
  [
    "transition",
    "width 1s cubic-bezier(0.25, 0.5, 0.75, 1)",
    {
      transitionProperty: ["width"],
      transitionDuration: [1000],
      transitionDelay: [0],
      transitionTimingFunction: easeQuarter,
    },
  ],
  [
    "transition",
    "background-image 1s",
    {
      transitionProperty: ["experimental_backgroundImage"],
      transitionDuration: [1000],
      transitionDelay: [0],
      transitionTimingFunction: "ease",
    },
  ],
  [
    "transition",
    "all 300ms ease-out 50ms",
    {
      transitionProperty: ["all"],
      transitionDuration: [300],
      transitionDelay: [50],
      transitionTimingFunction: "ease-out",
    },
  ],
  [
    "transition",
    "1s",
    {
      transitionProperty: ["all"],
      transitionDuration: [1000],
      transitionDelay: [0],
      transitionTimingFunction: "ease",
    },
  ],
  [
    "transition",
    "none",
    {
      transitionProperty: ["none"],
      transitionDuration: [0],
      transitionDelay: [0],
      transitionTimingFunction: "ease",
    },
  ],
  [
    "transition",
    "WIDTH 1s EASE-IN",
    {
      transitionProperty: ["width"],
      transitionDuration: [1000],
      transitionDelay: [0],
      transitionTimingFunction: "ease-in",
    },
  ],
  [
    "transition",
    "visibility 2s, width 1s",
    {
      transitionProperty: ["visibility", "width"],
      transitionDuration: [2000, 1000],
      transitionDelay: [0, 0],
      transitionTimingFunction: ["ease", "ease"],
    },
  ],
  [
    "transition",
    "foo 2s, width 1s",
    {
      transitionProperty: ["foo", "width"],
      transitionDuration: [2000, 1000],
      transitionDelay: [0, 0],
      transitionTimingFunction: ["ease", "ease"],
    },
  ],
  [
    "transition",
    "display 1s allow-discrete",
    {
      transitionBehavior: ["allow-discrete"],
      transitionProperty: ["display"],
      transitionDuration: [1000],
      transitionDelay: [0],
      transitionTimingFunction: "ease",
    },
  ],
  [
    "transition",
    "display 1s allow-discrete, width 2s",
    {
      transitionBehavior: ["allow-discrete", "normal"],
      transitionProperty: ["display", "width"],
      transitionDuration: [1000, 2000],
      transitionDelay: [0, 0],
      transitionTimingFunction: ["ease", "ease"],
    },
  ],
  [
    "transition",
    "1s, width 2s",
    {
      transitionProperty: ["all", "width"],
      transitionDuration: [1000, 2000],
      transitionDelay: [0, 0],
      transitionTimingFunction: ["ease", "ease"],
    },
  ],
  [
    "transition",
    "width 1s, 2s",
    {
      transitionProperty: ["width", "all"],
      transitionDuration: [1000, 2000],
      transitionDelay: [0, 0],
      transitionTimingFunction: ["ease", "ease"],
    },
  ],
  [
    "transition-behavior",
    "allow-discrete",
    { transitionBehavior: ["allow-discrete"] },
  ],
  [
    "transition-behavior",
    "normal, ALLOW-DISCRETE",
    { transitionBehavior: ["normal", "allow-discrete"] },
  ],
  ["transition-property", "width", { transitionProperty: ["width"] }],
  [
    "transition-property",
    "width, background-image, border-inline-start-color",
    {
      transitionProperty: [
        "width",
        "experimental_backgroundImage",
        "borderStartColor",
      ],
    },
  ],
  ["transition-property", "none", { transitionProperty: ["none"] }],
  [
    "transition-property",
    "Width, Opacity",
    { transitionProperty: ["width", "opacity"] },
  ],
  ["transition-property", "ALL", { transitionProperty: ["all"] }],
  ["transition-property", "NONE", { transitionProperty: ["none"] }],
  [
    "transition-property",
    "-webkit-transform",
    { transitionProperty: ["transform"] },
  ],
  [
    "transition-property",
    "visibility, width",
    { transitionProperty: ["visibility", "width"] },
  ],
  [
    "transition-property",
    "foo, width",
    { transitionProperty: ["foo", "width"] },
  ],
  ["transition-duration", "3s", { transitionDuration: [3000] }],
  ["transition-duration", "1s, 2s", { transitionDuration: [1000, 2000] }],
  ["transition-delay", "200ms", { transitionDelay: [200] }],
  ["transition-delay", "-1s", { transitionDelay: [-1000] }],
  [
    "transition-timing-function",
    "ease-in",
    { transitionTimingFunction: "ease-in" },
  ],
  [
    "transition-timing-function",
    "EASE-IN",
    { transitionTimingFunction: "ease-in" },
  ],
  [
    "transition-timing-function",
    "ease-in, linear",
    { transitionTimingFunction: ["ease-in", "linear"] },
  ],
  [
    "transition-timing-function",
    "cubic-bezier(0.25, 0.5, 0.75, 1)",
    { transitionTimingFunction: easeQuarter },
  ],
  [
    "transition-timing-function",
    "steps(4, end)",
    { transitionTimingFunction: steps(4, "end") },
  ],
])("%s: %s", (property, value, style) => {
  test.each(routes)(
    "%s reaches Reanimated with the written transition",
    (route) => {
      expect(renderOnRoute(route, property, value)).toStrictEqual({
        animated: true,
        style,
      });
    },
  );
});

describe.each([
  [
    "transition",
    "200ms ease-out",
    "transform var(--v)",
    {
      transitionProperty: ["transform"],
      transitionDuration: [200],
      transitionDelay: [0],
      transitionTimingFunction: "ease-out",
    },
  ],
  [
    "transition",
    "width, height",
    "var(--v) 1s",
    {
      transitionProperty: ["width", "height"],
      transitionDuration: [0, 1000],
      transitionDelay: [0, 0],
      transitionTimingFunction: ["ease", "ease"],
    },
  ],
  [
    "transition",
    "200ms ease-out",
    "width 1s, var(--v)",
    {
      transitionProperty: ["width", "all"],
      transitionDuration: [1000, 200],
      transitionDelay: [0, 0],
      transitionTimingFunction: ["ease", "ease-out"],
    },
  ],
  [
    "transition",
    "width 1s, height 2s",
    "var(--v), opacity 3s",
    {
      transitionProperty: ["width", "height", "opacity"],
      transitionDuration: [1000, 2000, 3000],
      transitionDelay: [0, 0, 0],
      transitionTimingFunction: ["ease", "ease", "ease"],
    },
  ],
  [
    "transition",
    "width, height",
    "var(--v), opacity 1s",
    {
      transitionProperty: ["width", "height", "opacity"],
      transitionDuration: [0, 0, 1000],
      transitionDelay: [0, 0, 0],
      transitionTimingFunction: ["ease", "ease", "ease"],
    },
  ],
  [
    "transition-property",
    "width, opacity",
    "var(--v), height",
    { transitionProperty: ["width", "opacity", "height"] },
  ],
  [
    "transition-duration",
    "1s, 3s",
    "var(--v), 2s",
    { transitionDuration: [1000, 3000, 2000] },
  ],
  [
    "transition-timing-function",
    "EASE-IN, linear",
    "var(--v), ease-out",
    { transitionTimingFunction: ["ease-in", "linear", "ease-out"] },
  ],
])("%s: %s held in %s", (property, value, reference, style) => {
  test.each(variableRoutes)("%s reads as one list", (route) => {
    expect(renderOnRoute(route, property, value, reference)).toStrictEqual({
      animated: true,
      style,
    });
  });
});

test.each(variableRoutes)(
  "a list two variables deep reads as one list %s",
  (route) => {
    expect(
      renderOnRoute(
        route,
        "transition-duration",
        "var(--w), 3s",
        "var(--v), 4s",
        "--w: 1s, 2s;",
      ),
    ).toStrictEqual({
      animated: true,
      style: { transitionDuration: [1000, 2000, 3000, 4000] },
    });
  },
);

test.each(variableRoutes)(
  "a transition list holding a list variable keeps that list's transitions %s",
  (route) => {
    expect(
      renderOnRoute(
        route,
        "transition",
        "var(--m), opacity 1s",
        "var(--v)",
        "--m: 150ms ease-in, 300ms ease-out;",
      ),
    ).toStrictEqual({
      animated: true,
      style: {
        transitionProperty: ["all", "all", "opacity"],
        transitionDuration: [150, 300, 1000],
        transitionDelay: [0, 0, 0],
        transitionTimingFunction: ["ease-in", "ease-out", "ease"],
      },
    });
  },
);

test.each(declarationRoutes)(
  "transition over width height 1s, opacity 2s, a group naming two properties, writes nothing %s",
  (route) => {
    expect(
      renderOnRoute(route, "transition", "width height 1s, opacity 2s").style,
    ).toStrictEqual({});
  },
);

// lightningcss reads a written transition's negative first time as its duration, so these rows run where the runtime reads the value
describe.each([
  [
    "width -1s",
    {
      transitionProperty: ["width"],
      transitionDuration: [0],
      transitionDelay: [-1000],
      transitionTimingFunction: "ease",
    },
  ],
  [
    "width -1s 1s",
    {
      transitionProperty: ["width"],
      transitionDuration: [1000],
      transitionDelay: [-1000],
      transitionTimingFunction: "ease",
    },
  ],
])(
  "transition held in a variable over %s takes a negative time as its delay",
  (value, style) => {
    test.each(runtimeRoutes)("%s", (route) => {
      expect(renderOnRoute(route, "transition", value)).toStrictEqual({
        animated: true,
        style,
      });
    });
  },
);

describe.each([
  ["transition", "width 1s 2s 3s"],
  ["transition", "width 1s ease-in linear"],
  ["transition", "none 1s, width 2s"],
  ["transition", "width -1s -2s"],
  ["transition", "display 1s allow-discrete normal"],
  ["transition-property", "none, width"],
  ["transition-property", "NONE, width"],
  ["transition-property", "width, 5"],
  ["transition-property", "width, unset"],
  ["transition-property", "width, revert"],
  ["transition-property", "width, revert-layer"],
  ["transition-property", "width, default"],
  ["transition-duration", "-1s"],
  ["transition-duration", "ease-in"],
  ["transition-delay", "ease-in"],
  ["transition-timing-function", "1s"],
  ["transition-timing-function", "ease-in, sideways"],
  ["transition-timing-function", "rotate(45deg)"],
  ["transition", "width 1s rotate(45deg)"],
  ["transition-behavior", "sideways"],
])("%s held in a variable over %s is invalid", (property, value) => {
  test.each(runtimeRoutes)("and writes no transition %s", (route) => {
    expect(renderOnRoute(route, property, value).style).toStrictEqual({});
  });
});

describe.each([
  ["transition-property", "width foo, height"],
  ["transition-duration", "1s 2s, 3s"],
  ["transition-timing-function", "ease ease-in, linear"],
  ["transition-behavior", "normal allow-discrete, normal"],
])(
  "%s over %s, a comma group of several tokens, is invalid",
  (property, value) => {
    test.each(declarationRoutes)("and writes no transition %s", (route) => {
      expect(renderOnRoute(route, property, value).style).toStrictEqual({});
    });
  },
);

const renderedStyle = () =>
  (StyleSheet.flatten(screen.getByTestId(testID).props.style) ??
    {}) as Readonly<Record<string, unknown>>;

function renderWithScriptVariables(
  css: string,
  variables: Readonly<Record<string, string>>,
) {
  registerCSS(css, { inlineVariables: false });
  render(
    <VariableContextProvider value={variables}>
      <View testID={testID} className="a" />
    </VariableContextProvider>,
  );
  return renderedStyle();
}

test.each([
  ["transition-duration", "300ms", { transitionDuration: [300] }],
  ["transition-duration", "0.3s", { transitionDuration: [300] }],
  ["transition-delay", "-150MS", { transitionDelay: [-150] }],
  ["transition-duration", "2.01s", { transitionDuration: [2010] }],
  ["animation-duration", "1s", { animationDuration: [1000] }],
  ["transition-duration", "fast", {}],
  ["transition-duration", "10.", {}],
  ["transition-duration", "1ems", {}],
  ["transition-duration", "3 s", {}],
  ["transition-duration", "300", {}],
])("%s through a variable a script sets to %s", (property, value, style) => {
  expect(
    renderWithScriptVariables(`.a { ${property}: var(--v); }`, {
      "--v": value,
    }),
  ).toStrictEqual(style);
});

test.each([
  [
    "width var(--v)",
    "300ms",
    {
      transitionProperty: ["width"],
      transitionDuration: [300],
      transitionDelay: [0],
      transitionTimingFunction: "ease",
    },
  ],
])(
  "transition: %s through a variable a script sets to %s",
  (reference, value, style) => {
    expect(
      renderWithScriptVariables(`.a { transition: ${reference}; }`, {
        "--v": value,
      }),
    ).toStrictEqual(style);
  },
);

test.each(["transition", "transition-property"])(
  "%s through a variable a script sets to one string, width 300ms, names no property",
  (property) => {
    expect(
      renderWithScriptVariables(`.a { ${property}: var(--v); }`, {
        "--v": "width 300ms",
      }),
    ).toStrictEqual({});
  },
);

test.each([
  [
    "transition-timing-function",
    "ease-out",
    "auto",
    { transitionTimingFunction: "ease-out" },
  ],
  ["animation-delay", "1s", "auto", { animationDelay: [1000] }],
  ["transition-duration", "1s", "1s 2s, 3s", { transitionDuration: [1000] }],
  [
    "transition-behavior",
    "allow-discrete",
    "sideways",
    { transitionBehavior: ["allow-discrete"] },
  ],
  [
    "transition-behavior",
    "allow-discrete",
    "auto",
    { transitionBehavior: ["allow-discrete"] },
  ],
])(
  "a later %s that cannot be read leaves the earlier %s",
  (property, earlier, later, style) => {
    registerCSS(
      `.base { ${property}: ${earlier}; } .x { ${property}: ${later}; }`,
    );
    render(<View testID={testID} className="base x" />);

    expect(renderedStyle()).toStrictEqual(style);
  },
);

test.each([
  ["transition-timing-function", "auto"],
  ["animation-delay", "auto"],
  ["transition-behavior", "auto"],
])(
  "%s: %s, which the compiler cannot read, writes nothing",
  (property, value) => {
    expect(renderOnRoute("written", property, value)).toStrictEqual({
      animated: false,
      style: {},
    });
  },
);

test("a later written transition overrides the timing of an earlier one the runtime reads", () => {
  registerCSS(
    `.a { transition: display 1s allow-discrete; } .b { transition: display 2s; }`,
  );
  render(<View testID={testID} className="a b" />);

  expect(renderedStyle()).toMatchObject({
    transitionProperty: ["display"],
    transitionDuration: [2000],
    transitionDelay: [0],
    transitionTimingFunction: "ease",
  });
});

test.each(["allow-discrete", "var(--b)"])(
  "transition-behavior: %s after a transition in its rule holds",
  (behavior) => {
    registerCSS(
      `.a { --b: allow-discrete; transition: width 1s; transition-behavior: ${behavior}; }`,
      { inlineVariables: false },
    );
    render(<View testID={testID} className="a" />);

    expect(renderedStyle().transitionBehavior).toStrictEqual([
      "allow-discrete",
    ]);
  },
);
