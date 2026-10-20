import {
  Animated,
  Pressable as RNPressable,
  View as RNView,
} from "react-native";

import { render } from "@testing-library/react-native";
import { copyComponentProperties } from "react-native-css/components/copyComponentProperties";
import { FlatList } from "react-native-css/components/FlatList";
import { Pressable } from "react-native-css/components/Pressable";
import { ScrollView } from "react-native-css/components/ScrollView";
import { Text } from "react-native-css/components/Text";
import { View } from "react-native-css/components/View";
import { registerCSS, testID } from "react-native-css/jest";
import {
  useCssElement,
  type StyledConfiguration,
  type StyledProps,
} from "react-native-css/native";

test("className with inline style props should coexist when different properties", () => {
  registerCSS(`.text-red { color: red; }`);

  const component = render(
    <Text testID={testID} className="text-red" style={{ fontSize: 16 }} />,
  ).getByTestId(testID);

  // Both className and style props should be applied as array
  expect(component.props.style).toStrictEqual([
    { color: "#f00" },
    { fontSize: 16 },
  ]);
});

test("className with inline style props should favor inline when same property", () => {
  registerCSS(`.text-red { color: red; }`);

  const component = render(
    <Text testID={testID} className="text-red" style={{ color: "blue" }} />,
  ).getByTestId(testID);

  // When same property exists, inline style should win
  expect(component.props.style).toStrictEqual({ color: "blue" });
});

test("only className should not create array", () => {
  registerCSS(`.text-red { color: red; }`);

  const component = render(
    <Text testID={testID} className="text-red" />,
  ).getByTestId(testID);

  // Only className should be a flat object
  expect(component.props.style).toStrictEqual({ color: "#f00" });
});

test("only inline style should not create array", () => {
  const component = render(
    <Text testID={testID} style={{ color: "blue" }} />,
  ).getByTestId(testID);

  // Only inline style should be a flat object
  expect(component.props.style).toStrictEqual({ color: "blue" });
});

test("important should overwrite the inline style", () => {
  registerCSS(`.text-red\\! { color: red !important; }`);

  const component = render(
    <Text testID={testID} className="text-red!" style={{ color: "blue" }} />,
  ).getByTestId(testID);

  expect(component.props.style).toStrictEqual({ color: "#f00" });
});

describe("a callback style prop stays a callback", () => {
  test("Pressable: className with a callback style", () => {
    registerCSS(`.text-red { color: red; }`);

    const component = render(
      <Pressable
        testID={testID}
        className="text-red"
        style={({ pressed }) => ({ opacity: pressed ? 0.5 : 1 })}
      />,
    ).getByTestId(testID);

    expect(component.props.style).toStrictEqual([
      { color: "#f00" },
      { opacity: 1 },
    ]);
  });

  test("Pressable: important className with a callback style", () => {
    registerCSS(`.bg-red\\! { background-color: red !important; }`);

    const component = render(
      <Pressable
        testID={testID}
        className="bg-red!"
        style={() => ({ backgroundColor: "blue" })}
      />,
    ).getByTestId(testID);

    expect(component.props.style).toStrictEqual([
      { backgroundColor: "blue" },
      { backgroundColor: "#f00" },
    ]);
  });

  test("Pressable: a callback style with no className is untouched", () => {
    const component = render(
      <Pressable
        testID={testID}
        style={({ pressed }) => ({ opacity: pressed ? 0.5 : 1 })}
      />,
    ).getByTestId(testID);

    expect(component.props.style).toStrictEqual({ opacity: 1 });
  });

  // A string target takes a separate branch of the merge from the array target above
  test("styled() with a string target: a callback stays a callback", () => {
    registerCSS(`.text-red { color: red; }`);

    const mapping: StyledConfiguration<typeof RNPressable> = {
      className: { target: "style" },
    };
    const StyledPressable = copyComponentProperties(
      RNPressable,
      (
        props: StyledProps<
          React.ComponentProps<typeof RNPressable>,
          typeof mapping
        >,
      ) => {
        return useCssElement(RNPressable, props, mapping);
      },
    );

    const component = render(
      <StyledPressable
        testID={testID}
        className="text-red"
        style={({ pressed }) => ({ opacity: pressed ? 0.5 : 1 })}
      />,
    ).getByTestId(testID);

    expect(component.props.style).toStrictEqual([
      { color: "#f00" },
      { opacity: 1 },
    ]);
  });
});

test("View with multiple className properties where inline style takes precedence", () => {
  registerCSS(`
    .px-4 { padding-left: 16px; padding-right: 16px; }
    .pt-4 { padding-top: 16px; }
    .mb-4 { margin-bottom: 16px; }
  `);

  const component = render(
    <View
      testID={testID}
      className="px-4 pt-4 mb-4"
      style={{ width: 300, paddingRight: 0 }}
    />,
  ).getByTestId(testID);

  // Inline style should override paddingRight from px-4 class
  // Other className styles should be preserved in array
  expect(component.props.style).toStrictEqual([
    {
      paddingLeft: 16,
      paddingRight: 16,
      paddingTop: 16,
      marginBottom: 16,
    },
    {
      width: 300,
      paddingRight: 0,
    },
  ]);
});

test("FlatList: className should map to style", () => {
  registerCSS(`.bg-red { background-color: red; }`);

  const component = render(
    <FlatList
      testID={testID}
      data={[]}
      renderItem={() => null}
      className="bg-red"
    />,
  ).getByTestId(testID);

  expect(component.props.style).toStrictEqual({ backgroundColor: "#f00" });
});

/**
 * Tests for style={undefined} not destroying computed className styles.
 *
 * Object.assign({}, left, right) copies all enumerable own properties from right,
 * including those with value undefined. When a component passes style={undefined}
 * (common when forwarding optional style props), the computed NativeWind styles
 * from className are overwritten.
 *
 * PR #224 fixed the default ["style"] target path. These tests cover the remaining
 * paths: non-"style" array targets (e.g. ["contentContainerStyle"]) and string targets.
 */
describe("style={undefined} should not destroy computed className styles", () => {
  // Path A: config.target = ["style"] (fixed in PR #224)
  test("View: className with style={undefined}", () => {
    registerCSS(`.text-red { color: red; }`);

    const component = render(
      <Text testID={testID} className="text-red" style={undefined} />,
    ).getByTestId(testID);

    expect(component.props.style).toStrictEqual({ color: "#f00" });
  });

  test("View: className with style={null}", () => {
    registerCSS(`.text-red { color: red; }`);

    const component = render(
      <Text testID={testID} className="text-red" style={null} />,
    ).getByTestId(testID);

    expect(component.props.style).toStrictEqual({ color: "#f00" });
  });

  // Path B: config.target = ["contentContainerStyle"] (non-"style" array target)
  test("ScrollView: contentContainerClassName with contentContainerStyle={undefined}", () => {
    registerCSS(`.bg-green { background-color: green; }`);

    const component = render(
      <ScrollView
        testID={testID}
        contentContainerClassName="bg-green"
        contentContainerStyle={undefined}
      />,
    ).getByTestId(testID);

    expect(component.props.contentContainerStyle).toStrictEqual({
      backgroundColor: "#008000",
    });
  });

  test("ScrollView: contentContainerClassName preserves styles with valid contentContainerStyle", () => {
    registerCSS(`.bg-green { background-color: green; }`);

    const component = render(
      <ScrollView
        testID={testID}
        contentContainerClassName="bg-green"
        contentContainerStyle={{ padding: 10 }}
      />,
    ).getByTestId(testID);

    // Both className and inline contentContainerStyle should coexist as array
    expect(component.props.contentContainerStyle).toStrictEqual([
      { backgroundColor: "#008000" },
      { padding: 10 },
    ]);
  });

  test("ScrollView: contentContainerClassName without contentContainerStyle", () => {
    registerCSS(`.bg-green { background-color: green; }`);

    const component = render(
      <ScrollView testID={testID} contentContainerClassName="bg-green" />,
    ).getByTestId(testID);

    expect(component.props.contentContainerStyle).toStrictEqual({
      backgroundColor: "#008000",
    });
  });

  // Path B: FlatList with contentContainerClassName (another non-"style" array target)
  test("FlatList: contentContainerClassName with contentContainerStyle={undefined}", () => {
    registerCSS(`.p-4 { padding: 16px; }`);

    const component = render(
      <FlatList
        testID={testID}
        data={[]}
        renderItem={() => null}
        contentContainerClassName="p-4"
        contentContainerStyle={undefined}
      />,
    ).getByTestId(testID);

    expect(component.props.contentContainerStyle).toStrictEqual({
      padding: 16,
    });
  });

  // Path B: custom styled() with string target (e.g. { className: { target: "style" } })
  test("custom styled() with string target: style={undefined} preserves styles", () => {
    registerCSS(`.bg-purple { background-color: purple; }`);

    const mapping: StyledConfiguration<typeof RNView> = {
      className: {
        target: "style",
      },
    };

    const StyledView = copyComponentProperties(
      RNView,
      (
        props: StyledProps<React.ComponentProps<typeof RNView>, typeof mapping>,
      ) => {
        return useCssElement(RNView, props, mapping);
      },
    );

    const component = render(
      <StyledView testID={testID} className="bg-purple" style={undefined} />,
    ).getByTestId(testID);

    expect(component.props.style).toStrictEqual({ backgroundColor: "#800080" });
  });

  // Real-world: optional style prop forwarding
  test("optional style prop forwarding preserves className styles", () => {
    registerCSS(`
      .p-4 { padding: 16px; }
      .bg-white { background-color: white; }
    `);

    // Simulates a reusable component that forwards optional contentContainerStyle
    function MyScrollView({
      contentContainerStyle,
    }: {
      contentContainerStyle?: React.ComponentProps<
        typeof ScrollView
      >["contentContainerStyle"];
    }) {
      return (
        <ScrollView
          testID={testID}
          contentContainerClassName="p-4 bg-white"
          contentContainerStyle={contentContainerStyle}
        />
      );
    }

    // Called without contentContainerStyle — implicitly undefined
    const component = render(<MyScrollView />).getByTestId(testID);

    expect(component.props.contentContainerStyle).toStrictEqual({
      padding: 16,
      backgroundColor: "#fff",
    });
  });
});

/**
 * Tests for style={{}} (empty object) not destroying computed className styles.
 *
 * An empty style object has no properties to apply, so it should not overwrite
 * computed className styles. The ["style"] target path (Path A) handles this via
 * filterCssVariables({}) returning undefined. These tests cover Path B (non-"style"
 * array targets) which previously used mergeDefinedProps that copied empty objects.
 *
 * Related: https://github.com/nativewind/react-native-css/issues/239
 */
describe("style={{}} should not destroy computed className styles", () => {
  // Path A: config.target = ["style"] — already handled by filterCssVariables
  test("View: className with style={{}}", () => {
    registerCSS(`.text-red { color: red; }`);

    const component = render(
      <Text testID={testID} className="text-red" style={{}} />,
    ).getByTestId(testID);

    expect(component.props.style).toStrictEqual({ color: "#f00" });
  });

  // Path B: config.target = ["contentContainerStyle"] — fixed by isEmptyPlainObject check
  test("ScrollView: contentContainerClassName with contentContainerStyle={{}}", () => {
    registerCSS(`.bg-green { background-color: green; }`);

    const component = render(
      <ScrollView
        testID={testID}
        contentContainerClassName="bg-green"
        contentContainerStyle={{}}
      />,
    ).getByTestId(testID);

    expect(component.props.contentContainerStyle).toStrictEqual({
      backgroundColor: "#008000",
    });
  });

  // Path B: FlatList with contentContainerClassName (another non-"style" array target)
  test("FlatList: contentContainerClassName with contentContainerStyle={{}}", () => {
    registerCSS(`.p-4 { padding: 16px; }`);

    const component = render(
      <FlatList
        testID={testID}
        data={[]}
        renderItem={() => null}
        contentContainerClassName="p-4"
        contentContainerStyle={{}}
      />,
    ).getByTestId(testID);

    expect(component.props.contentContainerStyle).toStrictEqual({
      padding: 16,
    });
  });

  // Path B: custom styled() with string target
  test("custom styled() with string target: style={{}} preserves styles", () => {
    registerCSS(`.bg-purple { background-color: purple; }`);

    const mapping: StyledConfiguration<typeof RNView> = {
      className: {
        target: "style",
      },
    };

    const StyledView = copyComponentProperties(
      RNView,
      (
        props: StyledProps<React.ComponentProps<typeof RNView>, typeof mapping>,
      ) => {
        return useCssElement(RNView, props, mapping);
      },
    );

    const component = render(
      <StyledView testID={testID} className="bg-purple" style={{}} />,
    ).getByTestId(testID);

    expect(component.props.style).toStrictEqual({ backgroundColor: "#800080" });
  });

  // Non-empty contentContainerStyle override is covered by
  // "ScrollView: contentContainerClassName preserves styles with valid contentContainerStyle"
  // in the style={undefined} describe block above.

  // Real-world: component with default empty object
  test("optional prop with empty object default preserves className styles", () => {
    registerCSS(`
      .p-4 { padding: 16px; }
      .bg-white { background-color: white; }
    `);

    function MyScrollView({
      contentContainerStyle = {},
    }: {
      contentContainerStyle?: React.ComponentProps<
        typeof ScrollView
      >["contentContainerStyle"];
    }) {
      return (
        <ScrollView
          testID={testID}
          contentContainerClassName="p-4 bg-white"
          contentContainerStyle={contentContainerStyle}
        />
      );
    }

    // Called without prop — default {} used
    const component = render(<MyScrollView />).getByTestId(testID);

    expect(component.props.contentContainerStyle).toStrictEqual({
      padding: 16,
      backgroundColor: "#fff",
    });
  });
});

/**
 * Tests for multi-config components (e.g. ScrollView with both className and
 * contentContainerClassName) where inline style on one target should not
 * destroy computed className styles on a different target.
 *
 * Bug: getStyledProps loops over configs, and each iteration calls deepMergeConfig
 * which produces a full props object via Object.assign({}, left, right). When a
 * later config iteration runs, it overwrites the correctly-merged target props
 * from earlier iterations.
 *
 * Example: ScrollView with className="bg-red" and style={{ paddingTop: 10 }}.
 * The first config (className→style) correctly merges both. The second config
 * (contentContainerClassName→contentContainerStyle) does Object.assign which
 * copies the inline style={{ paddingTop: 10 }} over the merged style, destroying
 * the backgroundColor from className.
 */
describe("multi-config: inline style should not destroy className styles on other targets", () => {
  test("ScrollView: className with style should preserve className styles", () => {
    registerCSS(`.bg-red { background-color: red; }`);

    const component = render(
      <ScrollView
        testID={testID}
        className="bg-red"
        style={{ paddingTop: 10 }}
      />,
    ).getByTestId(testID);

    // className backgroundColor should coexist with inline paddingTop
    expect(component.props.style).toStrictEqual([
      { backgroundColor: "#f00" },
      { paddingTop: 10 },
    ]);
  });

  test("ScrollView: className + contentContainerClassName + style preserves all", () => {
    registerCSS(`
      .bg-red { background-color: red; }
      .p-4 { padding: 16px; }
    `);

    const component = render(
      <ScrollView
        testID={testID}
        className="bg-red"
        contentContainerClassName="p-4"
        style={{ paddingTop: 10 }}
      />,
    ).getByTestId(testID);

    // className-derived style merged with inline style
    expect(component.props.style).toStrictEqual([
      { backgroundColor: "#f00" },
      { paddingTop: 10 },
    ]);

    // contentContainerClassName should be independently preserved
    expect(component.props.contentContainerStyle).toStrictEqual({
      padding: 16,
    });
  });

  test("ScrollView: className + contentContainerClassName + both inline styles", () => {
    registerCSS(`
      .bg-red { background-color: red; }
      .p-4 { padding: 16px; }
    `);

    const component = render(
      <ScrollView
        testID={testID}
        className="bg-red"
        contentContainerClassName="p-4"
        style={{ paddingTop: 10 }}
        contentContainerStyle={{ marginTop: 5 }}
      />,
    ).getByTestId(testID);

    // Both targets should have merged className + inline styles
    expect(component.props.style).toStrictEqual([
      { backgroundColor: "#f00" },
      { paddingTop: 10 },
    ]);

    expect(component.props.contentContainerStyle).toStrictEqual([
      { padding: 16 },
      { marginTop: 5 },
    ]);
  });

  test("ScrollView: className without style still works (single-config path)", () => {
    registerCSS(`.bg-red { background-color: red; }`);

    const component = render(
      <ScrollView testID={testID} className="bg-red" />,
    ).getByTestId(testID);

    expect(component.props.style).toStrictEqual({ backgroundColor: "#f00" });
  });

  test("ScrollView: consumed className sources should be removed from props", () => {
    registerCSS(`.bg-red { background-color: red; }`);

    const component = render(
      <ScrollView
        testID={testID}
        className="bg-red"
        contentContainerClassName="bg-red"
        style={{ paddingTop: 10 }}
      />,
    ).getByTestId(testID);

    // className and contentContainerClassName should be consumed, not passed through
    expect(component.props.className).toBeUndefined();
    expect(component.props.contentContainerClassName).toBeUndefined();
  });

  test("FlatList: contentContainerClassName with contentContainerStyle preserves both", () => {
    registerCSS(`.bg-blue { background-color: blue; }`);

    const component = render(
      <FlatList
        testID={testID}
        data={[]}
        renderItem={() => null}
        contentContainerClassName="bg-blue"
        contentContainerStyle={{ height: 200 }}
      />,
    ).getByTestId(testID);

    expect(component.props.contentContainerStyle).toStrictEqual([
      { backgroundColor: "#00f" },
      { height: 200 },
    ]);
  });
});

describe("both spellings of a style target combine an inline style the same way", () => {
  const MAPPINGS = [
    ["the shorthand", { className: "style" }],
    ["the object form", { className: { target: "style" } }],
  ] as const satisfies readonly (readonly [
    string,
    StyledConfiguration<typeof RNView>,
  ])[];

  test.each(MAPPINGS)(
    "%s: an inline style that sets every property the class sets replaces it",
    (_spelling, mapping) => {
      registerCSS(`.bg-red { background-color: red; }`);
      const StyledView = copyComponentProperties(
        RNView,
        (
          props: StyledProps<
            React.ComponentProps<typeof RNView>,
            typeof mapping
          >,
        ) => useCssElement(RNView, props, mapping),
      );

      const component = render(
        <StyledView
          testID={testID}
          className="bg-red"
          style={{ backgroundColor: "blue" }}
        />,
      ).getByTestId(testID);

      expect(component.props.style).toStrictEqual({ backgroundColor: "blue" });
    },
  );

  test.each(MAPPINGS)(
    "%s: an inline style that sets other properties is layered over the class",
    (_spelling, mapping) => {
      registerCSS(`.bg-red { background-color: red; }`);
      const StyledView = copyComponentProperties(
        RNView,
        (
          props: StyledProps<
            React.ComponentProps<typeof RNView>,
            typeof mapping
          >,
        ) => useCssElement(RNView, props, mapping),
      );

      const component = render(
        <StyledView
          testID={testID}
          className="bg-red"
          style={{ height: 16 }}
        />,
      ).getByTestId(testID);

      expect(component.props.style).toStrictEqual([
        { backgroundColor: "#f00" },
        { height: 16 },
      ]);
    },
  );
});

describe("an inline value holding no CSS variable reaches the component as it came", () => {
  const MAPPINGS = [
    ["style", { className: "style" }, "style"],
    ["{ target: style }", { className: { target: "style" } }, "style"],
    [
      "contentContainerStyle",
      { className: "contentContainerStyle" },
      "contentContainerStyle",
    ],
    [
      "{ target: contentContainerStyle }",
      { className: { target: "contentContainerStyle" } },
      "contentContainerStyle",
    ],
  ] as const;

  function renderReceived(
    mapping: (typeof MAPPINGS)[number][1],
    prop: (typeof MAPPINGS)[number][2],
    value: unknown,
    className = "padded",
  ): unknown {
    registerCSS(`.padded { padding: 4px; }`);
    const received: Readonly<Record<string, unknown>>[] = [];
    const Probe = (props: Readonly<Record<string, unknown>>) => {
      received.push(props);
      return null;
    };
    const Styled = (props: Readonly<Record<string, unknown>>) =>
      useCssElement(Probe, props, mapping);

    render(<Styled className={className} {...{ [prop]: value }} />);
    return received.at(-1)?.[prop];
  }

  test.each(MAPPINGS)(
    "%s: the inline style is layered over the class as the same object",
    (_spelling, mapping, prop) => {
      const inlineStyle = { height: 16 };

      const received = renderReceived(mapping, prop, inlineStyle);

      expect(received).toStrictEqual([{ padding: 4 }, { height: 16 }]);
      expect((received as readonly unknown[])[1]).toBe(inlineStyle);
    },
  );

  test.each(MAPPINGS)(
    "%s: an Animated value in the inline style is the same instance",
    (_spelling, mapping, prop) => {
      const opacity = new Animated.Value(0.5);

      const received = renderReceived(mapping, prop, { opacity });

      expect(received).toStrictEqual([{ padding: 4 }, { opacity }]);
      expect(
        ((received as readonly unknown[])[1] as { readonly opacity: unknown })
          .opacity,
      ).toBe(opacity);
    },
  );

  test.each(MAPPINGS)(
    "%s: with no class style beside it, the inline style is the same object",
    (_spelling, mapping, prop) => {
      const inlineStyle = { height: 16 };

      expect(renderReceived(mapping, prop, inlineStyle, "unstyled")).toBe(
        inlineStyle,
      );
    },
  );
});
