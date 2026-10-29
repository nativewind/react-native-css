import { processColor, StyleSheet } from "react-native";

import { render, screen } from "@testing-library/react-native";
import type { StyleDescriptor } from "react-native-css/compiler";
import { Text } from "react-native-css/components/Text";
import { View } from "react-native-css/components/View";
import { registerCSS, testID } from "react-native-css/jest";
import { useNativeVariable } from "react-native-css/native";

import type { Getter } from "../../native/reactivity";
import { resolveValue } from "../../native/styles/resolve";

// Observe the transition contract before Reanimated consumes it, as transitions.test.tsx does
jest.mock("../../native/reanimated", () => ({
  animatedComponentFamily: (component: unknown) => component,
}));

const style = () =>
  StyleSheet.flatten(screen.getByTestId(testID).props.style) as
    | Record<string, unknown>
    | undefined;

// The compiler folds a variable declared once into the declaration that reads it, unless told to keep it
describe.each([
  ["folded", {}],
  ["kept", { inlineVariables: false }],
] as const)(
  "a list read through a variable the compiler has %s",
  (_, options) => {
    // css-variables-1 §3 substitutes a var() by its tokens, commas among them
    test.each([
      [
        "box-shadow: var(--o) var(--b)",
        "--o: 1px 2px; --b: 3px 4px #123;",
        {
          boxShadow: [
            {
              offsetX: 1,
              offsetY: 2,
              blurRadius: 3,
              spreadDistance: 4,
              color: "#123",
            },
          ],
        },
      ],
      [
        "box-shadow: var(--o), var(--b)",
        "--o: 1px 2px 0 0 #123; --b: 3px 4px 0 0 #456;",
        {
          boxShadow: [
            {
              offsetX: 1,
              offsetY: 2,
              blurRadius: 0,
              spreadDistance: 0,
              color: "#123",
            },
            {
              offsetX: 3,
              offsetY: 4,
              blurRadius: 0,
              spreadDistance: 0,
              color: "#456",
            },
          ],
        },
      ],
      [
        "box-shadow: var(--a)",
        "--b: 1px 2px; --a: var(--b) 3px 4px #123;",
        {
          boxShadow: [
            {
              offsetX: 1,
              offsetY: 2,
              blurRadius: 3,
              spreadDistance: 4,
              color: "#123",
            },
          ],
        },
      ],
      [
        "filter: var(--f)",
        "--f: blur(2px) brightness(1.5);",
        { filter: [{ blur: 2 }, { brightness: 1.5 }] },
      ],
      [
        "transform: var(--t)",
        "--t: rotate(45deg) translateX(10px);",
        { transform: [{ rotate: "45deg" }, { translateX: 10 }] },
      ],
      [
        "filter: var(--a) var(--b)",
        "--a: blur(2px); --b: brightness(1.5);",
        { filter: [{ blur: 2 }, { brightness: 1.5 }] },
      ],
      [
        "box-shadow: var(--s), var(--s)",
        "--s: 1px 1px 0 0 #123, 2px 2px 0 0 #456;",
        {
          boxShadow: [
            {
              offsetX: 1,
              offsetY: 1,
              blurRadius: 0,
              spreadDistance: 0,
              color: "#123",
            },
            {
              offsetX: 2,
              offsetY: 2,
              blurRadius: 0,
              spreadDistance: 0,
              color: "#456",
            },
            {
              offsetX: 1,
              offsetY: 1,
              blurRadius: 0,
              spreadDistance: 0,
              color: "#123",
            },
            {
              offsetX: 2,
              offsetY: 2,
              blurRadius: 0,
              spreadDistance: 0,
              color: "#456",
            },
          ],
        },
      ],
      [
        "box-shadow: var(--s) #456",
        "--s: 1px 1px 0 0 #123, 2px 2px 0 0;",
        {
          boxShadow: [
            {
              offsetX: 1,
              offsetY: 1,
              blurRadius: 0,
              spreadDistance: 0,
              color: "#123",
            },
            {
              offsetX: 2,
              offsetY: 2,
              blurRadius: 0,
              spreadDistance: 0,
              color: "#456",
            },
          ],
        },
      ],
      [
        "transform: translate(var(--x), 20px)",
        "--x: 10px;",
        { transform: [{ translateX: 10 }, { translateY: 20 }] },
      ],
      [
        "transform: scale(var(--s), 2)",
        "--s: 3;",
        { transform: [{ scaleX: 3 }, { scaleY: 2 }] },
      ],
      [
        "transform: translate(var(--t))",
        "--t: 10px, 20px;",
        { transform: [{ translateX: 10 }, { translateY: 20 }] },
      ],
      [
        "transform: scale(var(--s))",
        "--s: 2, 3;",
        { transform: [{ scaleX: 2 }, { scaleY: 3 }] },
      ],
      [
        "transition-property: var(--p), height",
        "--p: width;",
        { transitionProperty: ["width", "height"] },
      ],
    ])("%s over %s", (declaration, variables, expected) => {
      registerCSS(`.a { ${variables} ${declaration}; }`, options);
      render(<View testID={testID} className="a" />);
      expect(style()).toStrictEqual(expected);
    });

    // Reanimated's easing builders return instances of their own classes, so the held value is compared with the written one
    test.each(["steps(4, end)", "cubic-bezier(0.25, 0.5, 0.75, 1)"])(
      "transition-timing-function: var(--e) over --e: %s",
      (easing) => {
        registerCSS(`.a { transition-timing-function: ${easing}; }`, options);
        render(<View testID={testID} className="a" />);
        const written = style();
        screen.unmount();
        registerCSS(
          `.a { --e: ${easing}; transition-timing-function: var(--e); }`,
          options,
        );
        render(<View testID={testID} className="a" />);
        expect(style()).toEqual(written);
      },
    );

    // react-native-css maps translateZ() to nothing, so the list keeps the functions it maps
    test("transform: var(--t) over --t: translateZ(10px) rotate(45deg)", () => {
      registerCSS(
        `.a { --t: translateZ(10px) rotate(45deg); transform: var(--t); }`,
        options,
      );
      render(<View testID={testID} className="a" />);
      expect(style()).toStrictEqual({ transform: [{ rotate: "45deg" }] });
    });

    test("background-image: linear-gradient(to right, var(--c)) over --c: #123, #456", () => {
      registerCSS(
        `.a { --c: #123, #456; background-image: linear-gradient(to right, var(--c)); }`,
        options,
      );
      render(<View testID={testID} className="a" />);
      expect(style()).toStrictEqual({
        experimental_backgroundImage: "linear-gradient(to right, #123, #456)",
      });
    });

    test("background-color: rgb(var(--c) / 0.5) over --c: 255 0 0", () => {
      registerCSS(
        `.a { --c: 255 0 0; background-color: rgb(var(--c) / 0.5); }`,
        options,
      );
      render(<View testID={testID} className="a" />);
      expect(processColor(style()?.backgroundColor as string)).toBe(
        processColor("rgba(255, 0, 0, 0.5)"),
      );
    });

    test("text-shadow: var(--o) var(--c) over --o: 1px 2px, --c: #123", () => {
      registerCSS(
        `.a { --o: 1px 2px; --c: #123; text-shadow: var(--o) var(--c); }`,
        options,
      );
      render(<Text testID={testID} className="a" />);
      expect(style()).toStrictEqual({
        textShadowOffset: { width: 1, height: 2 },
        textShadowRadius: 0,
        textShadowColor: "#123",
      });
    });
  },
);

// A list the property's grammar refuses makes the declaration invalid at computed-value time (css-variables-1 §3.1), so it unsets what an earlier rule set
test.each([
  [
    "box-shadow: var(--o) var(--b)",
    "--o: 1px 2px 0 0 #123; --b: 3px 4px 0 0 #456;",
    "box-shadow: 5px 5px green;",
    { boxShadow: [] },
  ],
  [
    "filter: var(--f)",
    "--f: blur(2px), brightness(1.5);",
    "filter: grayscale(1);",
    { filter: undefined },
  ],
  [
    "transform: var(--t)",
    "--t: rotate(45deg), translateX(10px);",
    "transform: rotate(10deg);",
    { transform: undefined },
  ],
  [
    "filter: var(--a), var(--missing)",
    "--a: blur(2px);",
    "filter: grayscale(1);",
    { filter: undefined },
  ],
])(
  "%s over %s replaces an earlier rule's value with none",
  (declaration, variables, earlier, expected) => {
    registerCSS(`.earlier { ${earlier} } .a { ${variables} ${declaration}; }`, {
      inlineVariables: false,
    });
    render(<View testID={testID} className="earlier a" />);
    expect(style()).toStrictEqual(expected);
  },
);

test("linear-gradient(var(--c)) over --c: #123 #456 prints the space it was written with", () => {
  registerCSS(
    `.a { --c: #123 #456; background-image: linear-gradient(var(--c)); }`,
    { inlineVariables: false },
  );
  render(<View testID={testID} className="a" />);
  expect(style()).toStrictEqual({
    experimental_backgroundImage: "linear-gradient(#123 #456)",
  });
});

test.each([
  [
    "box-shadow: var(--missing, 1px 2px) 3px 4px #123",
    [
      {
        offsetX: 1,
        offsetY: 2,
        blurRadius: 3,
        spreadDistance: 4,
        color: "#123",
      },
    ],
  ],
  [
    "box-shadow: var(--missing, 1px 1px 0 0 #123, 2px 2px 0 0 #456)",
    [
      {
        offsetX: 1,
        offsetY: 1,
        blurRadius: 0,
        spreadDistance: 0,
        color: "#123",
      },
      {
        offsetX: 2,
        offsetY: 2,
        blurRadius: 0,
        spreadDistance: 0,
        color: "#456",
      },
    ],
  ],
])(
  "%s substitutes its fallback's list as a variable's",
  (declaration, boxShadow) => {
    registerCSS(`.a { ${declaration}; }`);
    render(<View testID={testID} className="a" />);
    expect(style()).toStrictEqual({ boxShadow });
  },
);

// The compiler folds a variable read in an unresolved colour's alpha away and drops the alpha, so this case keeps it
test("background-color: rgb(255 0 0 / var(--a)) over --a: 0.5 with the variable kept", () => {
  registerCSS(`.a { --a: 0.5; background-color: rgb(255 0 0 / var(--a)); }`, {
    inlineVariables: false,
  });
  render(<View testID={testID} className="a" />);
  expect(processColor(style()?.backgroundColor as string)).toBe(
    processColor("rgba(255, 0, 0, 0.5)"),
  );
});

// The compiler writes a folded translate() with its second offset, which defaults to 0
test("transform: translate(var(--x)) over --x: 10px with the variable kept", () => {
  registerCSS(`.a { --x: 10px; transform: translate(var(--x)); }`, {
    inlineVariables: false,
  });
  render(<View testID={testID} className="a" />);
  expect(style()).toStrictEqual({ transform: [{ translateX: 10 }] });
});

// React Native's list props and the variable hook's callers take a list of one-token items as a flat array
test("transition-property: var(--p) over --p: width, opacity hands React Native a flat list", () => {
  registerCSS(`.a { --p: width, opacity; transition-property: var(--p); }`, {
    inlineVariables: false,
  });
  render(<View testID={testID} className="a" />);
  expect(style()).toStrictEqual({ transitionProperty: ["width", "opacity"] });
});

test("useNativeVariable reads --p: width, opacity as a flat list", () => {
  registerCSS(`:root { --p: width, opacity; }`, { inlineVariables: false });
  function Sample() {
    return (
      <Text testID={testID}>{JSON.stringify(useNativeVariable("--p"))}</Text>
    );
  }
  render(<Sample />);
  expect(screen.getByTestId(testID).props.children).toBe(
    JSON.stringify(["width", "opacity"]),
  );
});

// A variable read twice in one element resolves the second time from the value the first read keeps
test.each<[string, readonly unknown[]]>([
  ["a space-separated list of tokens", [1, 2, "#123"]],
  [
    "a space-separated list of objects",
    [{ rotate: "45deg" }, { translateX: 10 }],
  ],
  [
    "a comma-separated list",
    [
      [1, 1, 0, 0, "#123"],
      [2, 2, 0, 0, "#456"],
    ],
  ],
  [
    "a comma-separated list whose items start with an object and a string",
    [
      [{ rotate: "45deg" }, "x"],
      [{ rotate: "90deg" }, "y"],
    ],
  ],
])("%s resolves to itself once resolved", (_, list) => {
  const get = (() => undefined) as unknown as Getter;
  expect(resolveValue(list as StyleDescriptor, get, {})).toStrictEqual(list);
});

test.each<[string, readonly unknown[], readonly unknown[]]>([
  [
    "a list whose tokens all resolve to nothing",
    [
      [{}, "var", "a", 1],
      [{}, "var", "b", 1],
    ],
    [],
  ],
  [
    "a token list nested in a space-separated list",
    [1, [2, 3], 4],
    [1, 2, 3, 4],
  ],
  [
    "a comma-separated list with a lone token in an item's place, as React Native's list props take it",
    [[1, 2, "#123"], "#456"],
    [[1, 2, "#123"], ["#456"]],
  ],
])("%s resolves as the list it stands for", (_, list, expected) => {
  const get = (() => undefined) as unknown as Getter;
  expect(resolveValue(list as StyleDescriptor, get, {})).toStrictEqual(
    expected,
  );
});

test.each<[string, StyleDescriptor, unknown]>([
  [
    "rotate() over three comma-separated arguments",
    [{}, "rotate", [["10deg"], ["20deg"], ["30deg"]]],
    [{ rotateX: "10deg" }, { rotateY: "20deg" }, { rotateZ: "30deg" }],
  ],
  ["join() over one value", [{}, "join", "#123"], "#123"],
])("%s reads each argument", (_, descriptor, expected) => {
  const get = (() => undefined) as unknown as Getter;
  expect(resolveValue(descriptor, get, {})).toStrictEqual(expected);
});
