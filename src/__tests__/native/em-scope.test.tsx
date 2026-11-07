import { act, render, screen } from "@testing-library/react-native";
import { VariableContextProvider } from "react-native-css";
import { compile, type CompilerOptions } from "react-native-css/compiler";
import { Text } from "react-native-css/components/Text";
import { View } from "react-native-css/components/View";
import { registerCSS, testID } from "react-native-css/jest";
import { StyleCollection } from "react-native-css/native";

import { dimensions } from "../../native/reactivity";

// Every expected value is what Chromium 153, Firefox 155 and WebKit 26.6 compute for the same CSS with a 14px root

interface Path {
  readonly name: string;
  readonly declare: (property: string, value: string) => string;
  readonly options: CompilerOptions;
}

const PATHS: readonly Path[] = [
  {
    name: "written",
    declare: (property, value) => `${property}: ${value}`,
    options: {},
  },
  {
    name: "through a variable",
    declare: (property, value) =>
      `--value: ${value}; ${property}: var(--value)`,
    options: { inlineVariables: false },
  },
];

const DELIVERIES = {
  "in memory": (css: string, options: CompilerOptions) => {
    registerCSS(css, options);
  },
  "over the wire": (css: string, options: CompilerOptions) => {
    const stylesheet = compile(css, options).stylesheet();
    StyleCollection.inject(
      JSON.parse(JSON.stringify(stylesheet)) as typeof stylesheet,
    );
  },
} as const;

const ROUTES = PATHS.flatMap((path) =>
  Object.entries(DELIVERIES).map(
    ([delivery, deliver]) =>
      [`${path.name}, ${delivery}`, path, deliver] as const,
  ),
);

const styleOf = (id = testID) =>
  screen.getByTestId(id).props.style as Record<string, unknown> | undefined;

test("the variable path keeps its variable for the runtime to resolve", () => {
  for (const path of PATHS) {
    const css = `.child { ${path.declare("font-size", "2em")}; }`;
    const compiled = JSON.stringify(compile(css, path.options).stylesheet());

    expect(compiled.includes('"var"')).toBe(path.name !== "written");
  }
});

describe.each(ROUTES)("%s", (_route, path, deliver) => {
  test.each([
    ["2em", { fontSize: 20, width: 40 }],
    ["0.5em", { fontSize: 5, width: 10 }],
    ["150%", { fontSize: 15, width: 30 }],
    ["50%", { fontSize: 5, width: 10 }],
    ["20px", { fontSize: 20, width: 40 }],
    ["1rem", { fontSize: 14, width: 28 }],
  ])(
    "font-size: %s measures against the parent's font size and the element's em against its own",
    (size, style) => {
      deliver(
        `.parent { font-size: 10px; } .child { ${path.declare("font-size", size)}; width: 2em; }`,
        path.options,
      );

      render(
        <View className="parent">
          <View testID={testID} className="child" />
        </View>,
      );

      expect(styleOf()).toStrictEqual(style);
    },
  );

  test.each([
    ["2em", 20],
    ["150%", 15],
  ])(
    "a descendant inherits the font size %s computes, not the size",
    (size, width) => {
      deliver(
        `.parent { font-size: 10px; } .middle { ${path.declare("font-size", size)}; } .child { width: 1em; }`,
        path.options,
      );

      render(
        <View className="parent">
          <View className="middle">
            <View testID={testID} className="child" />
          </View>
        </View>,
      );

      expect(styleOf()).toStrictEqual({ width });
    },
  );

  test("relative font sizes compound down the tree", () => {
    deliver(
      `.a { font-size: 10px; } .b { ${path.declare("font-size", "2em")}; } .c { ${path.declare("font-size", "150%")}; } .d { width: 1em; }`,
      path.options,
    );

    render(
      <View className="a">
        <View className="b">
          <View className="c">
            <View testID={testID} className="d" />
          </View>
        </View>
      </View>,
    );

    expect(styleOf()).toStrictEqual({ width: 30 });
  });

  test("a unitless line height measures against the font size the element inherits", () => {
    deliver(
      `.parent { font-size: 10px; } .child { ${path.declare("line-height", "2")}; }`,
      path.options,
    );

    render(
      <View className="parent">
        <Text testID={testID} className="child" />
      </View>,
    );

    expect(styleOf()).toStrictEqual({ lineHeight: 20 });
  });

  test("a unitless line height measures against the element's own font size", () => {
    deliver(
      `.parent { font-size: 10px; } .child { font-size: 2em; ${path.declare("line-height", "2")}; }`,
      path.options,
    );

    render(
      <View className="parent">
        <Text testID={testID} className="child" />
      </View>,
    );

    expect(styleOf()).toStrictEqual({ fontSize: 20, lineHeight: 40 });
  });

  test("the root font size is the em of an element no ancestor sizes", () => {
    deliver(
      `:root { ${path.declare("font-size", "20px")}; } .child { width: 2em; }`,
      path.options,
    );

    render(<View testID={testID} className="child" />);

    expect(styleOf()).toStrictEqual({ width: 40 });
  });

  test("a relative font size under no sized ancestor measures against the root's", () => {
    deliver(
      `:root { font-size: 20px; } .middle { ${path.declare("font-size", "2em")}; } .child { width: 1em; }`,
      path.options,
    );

    render(
      <View className="middle">
        <View testID={testID} className="child" />
      </View>,
    );

    expect(styleOf()).toStrictEqual({ width: 40 });
  });

  test("a universal font size is the em of an element no ancestor sizes", () => {
    deliver(
      `* { ${path.declare("font-size", "10px")}; } .child { width: 2em; }`,
      path.options,
    );

    render(<View testID={testID} className="child" />);

    expect(styleOf()).toStrictEqual({ width: 20 });
  });

  test.each([":root", "*"])(
    "a %s font size relative to its parent leaves an element's other styles",
    (selector) => {
      deliver(
        `${selector} { ${path.declare("font-size", "2em")}; } .child { height: 10px; width: 2em; }`,
        path.options,
      );

      render(<View testID={testID} className="child" />);

      expect(styleOf()).toMatchObject({ height: 10 });
    },
  );
});

describe.each(Object.entries(DELIVERIES))("%s", (_delivery, deliver) => {
  test("a font size that resolves to nothing leaves the element its parent's", () => {
    deliver(
      `.parent { font-size: 10px; } .middle { font-size: var(--missing); width: 2em; } .child { width: 1em; }`,
      {},
    );

    render(
      <View className="parent">
        <View testID="middle" className="middle">
          <View testID={testID} className="child" />
        </View>
      </View>,
    );

    expect(styleOf("middle")).toStrictEqual({ width: 20 });
    expect(styleOf()).toStrictEqual({ width: 10 });
  });

  test("a font size that resolves to nothing is not re-read where a descendant defines its variable", () => {
    deliver(
      `.middle { font-size: var(--size); } .child { --size: 30px; width: 1em; }`,
      { inlineVariables: false },
    );

    render(
      <View className="middle">
        <View testID={testID} className="child" />
      </View>,
    );

    expect(styleOf()).toStrictEqual({ width: 14 });
  });

  test("a variable holding em measures against the element that reads it", () => {
    deliver(
      `.parent { font-size: 10px; } .child { --size: 2em; font-size: var(--size); width: var(--size); }`,
      { inlineVariables: false },
    );

    render(
      <View className="parent">
        <View testID={testID} className="child" />
      </View>,
    );

    expect(styleOf()).toStrictEqual({ fontSize: 20, width: 40 });
  });

  test("a font size a provider's variable holds is the em of the element and its descendants", () => {
    deliver(
      `.middle { font-size: var(--size); width: 2em; } .child { width: 1em; }`,
      {},
    );

    render(
      <VariableContextProvider value={{ "--size": 20 }}>
        <View testID="middle" className="middle">
          <View testID={testID} className="child" />
        </View>
      </VariableContextProvider>,
    );

    expect(styleOf("middle")).toStrictEqual({ fontSize: 20, width: 40 });
    expect(styleOf()).toStrictEqual({ width: 20 });
  });

  test.each(["a b", "b a"])(
    "descendants inherit the declaration the cascade picks, for className '%s'",
    (className) => {
      deliver(
        `.b { font-size: 10px; --gap: 1px; } .a { font-size: 20px; --gap: 2px; } .child { width: 1em; height: var(--gap); }`,
        {},
      );

      render(
        <View testID="parent" className={className}>
          <View testID={testID} className="child" />
        </View>,
      );

      expect(styleOf("parent")).toStrictEqual({ fontSize: 20 });
      expect(styleOf()).toStrictEqual({ width: 20, height: 2 });
    },
  );
});

test("written and variable percentages round alike", () => {
  const fontSizes = PATHS.map((path) => {
    registerCSS(
      `.parent { font-size: 10px; } .child { ${path.declare("font-size", "33.333%")}; }`,
      path.options,
    );

    render(
      <View className="parent">
        <View testID={testID} className="child" />
      </View>,
    );

    return styleOf()?.fontSize;
  });

  expect(fontSizes).toStrictEqual([3.33, 3.33]);
});

test("the em descendants inherit follows a viewport-relative font size", () => {
  registerCSS(`.parent { font-size: 2vw; } .child { width: 1em; }`);

  act(() => {
    dimensions.set({ ...dimensions.get(), width: 500 });
  });

  render(
    <View className="parent">
      <View testID={testID} className="child" />
    </View>,
  );

  expect(styleOf()).toStrictEqual({ width: 10 });

  act(() => {
    dimensions.set({ ...dimensions.get(), width: 1000 });
  });

  expect(styleOf()).toStrictEqual({ width: 20 });
});

test("the em descendants inherit follows a media query", () => {
  registerCSS(
    `.parent { font-size: 10px; } @media (min-width: 600px) { .parent { font-size: 20px; } } .child { width: 1em; }`,
  );

  act(() => {
    dimensions.set({ ...dimensions.get(), width: 500 });
  });

  render(
    <View className="parent">
      <View testID={testID} className="child" />
    </View>,
  );

  expect(styleOf()).toStrictEqual({ width: 10 });

  act(() => {
    dimensions.set({ ...dimensions.get(), width: 1000 });
  });

  expect(styleOf()).toStrictEqual({ width: 20 });
});

test("rendering again does not compound a relative font size", () => {
  registerCSS(
    `.parent { font-size: 10px; } .middle { font-size: 2em; } .child { width: 2em; }`,
  );

  const tree = (
    <View className="parent">
      <View className="middle">
        <View testID={testID} className="child" />
      </View>
    </View>
  );

  render(tree);

  for (let rerender = 0; rerender < 3; rerender++) {
    screen.rerender(tree);

    expect(styleOf()).toStrictEqual({ width: 40 });
  }
});

test("descendants follow a parent whose font size changes", () => {
  registerCSS(
    `.small { font-size: 10px; } .large { font-size: 20px; } .child { width: 2em; }`,
  );

  const tree = (className: string) => (
    <View className={className}>
      <View testID={testID} className="child" />
    </View>
  );

  render(tree("small"));
  expect(styleOf()).toStrictEqual({ width: 20 });

  screen.rerender(tree("large"));
  expect(styleOf()).toStrictEqual({ width: 40 });

  screen.rerender(tree("small"));
  expect(styleOf()).toStrictEqual({ width: 20 });
});

test.each([
  ["font: 20px Arial", { fontSize: 20, width: 40 }],
  ["font: 150% Arial", { fontSize: 15, width: 30 }],
  ["font: 2em/2 Arial", { fontSize: 20, lineHeight: 40, width: 40 }],
])("%s measures against the parent's font size", (declaration, style) => {
  registerCSS(
    `.parent { font-size: 10px; } .child { ${declaration}; width: 2em; }`,
  );

  render(
    <View className="parent">
      <Text testID={testID} className="child" />
    </View>,
  );

  expect(styleOf()).toMatchObject(style);
});
