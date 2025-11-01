/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * In these tests, we intentionally pass invalid style values (objects with VAR_SYMBOL)
 * to test that the runtime filtering works correctly. We use `as any` to bypass
 * TypeScript's type checking since we're specifically testing edge cases where
 * invalid types might be passed at runtime.
 *
 * This is a legitimate use of `any` in test code where we need to verify
 * runtime behavior with intentionally malformed data.
 */

import { render } from "@testing-library/react-native";
import { Text } from "react-native-css/components/Text";
import { View } from "react-native-css/components/View";
import { registerCSS, testID } from "react-native-css/jest";
import { VAR_SYMBOL } from "react-native-css/native/reactivity";

describe("rightIsInline - CSS Variable Stripping", () => {
  test("inline style with CSS variable object should be filtered out", () => {
    registerCSS(`.text-blue { color: blue; }`);

    const inlineStyleWithVar = {
      fontSize: 16,
      color: { [VAR_SYMBOL]: "inline", "--text-color": "red" },
    };

    const component = render(
      <Text
        testID={testID}
        className="text-blue"
        style={inlineStyleWithVar as any}
      />,
    ).getByTestId(testID);

    // The VAR_SYMBOL object should be filtered out from inline styles
    // Only literal values should remain
    expect(component.props.style).toEqual([
      { color: "#00f" }, // from className
      { fontSize: 16 }, // from inline (color with VAR_SYMBOL filtered out)
    ]);

    // Verify that the CSS variable object is NOT in the final output
    const styleArray = Array.isArray(component.props.style)
      ? component.props.style
      : [component.props.style];

    for (const styleObj of styleArray) {
      if (styleObj && typeof styleObj === "object") {
        for (const value of Object.values(
          styleObj as Record<string, unknown>,
        )) {
          // No value should be an object with VAR_SYMBOL
          if (typeof value === "object" && value !== null) {
            expect(VAR_SYMBOL in value).toBe(false);
          }
        }
      }
    }
  });

  test("inline style array with CSS variable objects should be filtered", () => {
    registerCSS(`.container { padding: 10px; }`);

    const inlineStyleArray = [
      { margin: 10 },
      { color: { [VAR_SYMBOL]: "inline", "--color": "red" } },
      { backgroundColor: "white" },
    ];

    const component = render(
      <View
        testID={testID}
        className="container"
        style={inlineStyleArray as any}
      />,
    ).getByTestId(testID);

    // CSS variable objects should be filtered from the array
    expect(component.props.style).toEqual([
      { padding: 10 }, // from className
      [
        { margin: 10 },
        // { color: VAR_SYMBOL object } should be filtered out
        { backgroundColor: "white" },
      ],
    ]);
  });

  test("inline style with only CSS variable object should be filtered to empty", () => {
    registerCSS(`.text-red { color: red; }`);

    const onlyVarStyle = {
      padding: { [VAR_SYMBOL]: "inline", "--padding": "20px" },
    };

    const component = render(
      <Text testID={testID} className="text-red" style={onlyVarStyle as any} />,
    ).getByTestId(testID);

    // When all properties are filtered, inline style contributes nothing
    expect(component.props.style).toEqual({ color: "#f00" });
  });

  test("nested CSS variable object in inline style should be filtered", () => {
    registerCSS(`.box { width: 100px; }`);

    const nestedVarStyle = {
      height: 200,
      borderRadius: { [VAR_SYMBOL]: "inline", "--radius": "8px" },
      margin: 5,
    };

    const component = render(
      <View testID={testID} className="box" style={nestedVarStyle as any} />,
    ).getByTestId(testID);

    // borderRadius with VAR_SYMBOL should be filtered out
    expect(component.props.style).toEqual([
      { width: 100 },
      {
        height: 200,
        margin: 5,
      },
    ]);
  });

  test("inline style with only VAR_SYMBOL properties - complete filtering", () => {
    registerCSS(`.base { padding: 8px; }`);

    const allVarsStyle = {
      color: { [VAR_SYMBOL]: "inline", "--color": "red" },
      fontSize: { [VAR_SYMBOL]: "inline", "--size": "16px" },
    };

    const component = render(
      <View testID={testID} className="base" style={allVarsStyle as any} />,
    ).getByTestId(testID);

    // All inline properties are VAR_SYMBOL, so none should pass through
    expect(component.props.style).toEqual({ padding: 8 });
  });

  test("array style with all items being CSS variable objects", () => {
    registerCSS(`.text { font-weight: bold; }`);

    const allVarsArray = [
      { color: { [VAR_SYMBOL]: "inline", "--color": "red" } },
      { padding: { [VAR_SYMBOL]: "inline", "--padding": "10px" } },
    ];

    const component = render(
      <Text testID={testID} className="text" style={allVarsArray as any} />,
    ).getByTestId(testID);

    // When entire array contains only VAR_SYMBOL objects, nothing passes through
    expect(component.props.style).toEqual({ fontWeight: "bold" });
  });

  test("mixed inline style object with some properties having VAR_SYMBOL values", () => {
    registerCSS(`.container { margin: 5px; }`);

    const mixedStyle = {
      width: 100, // literal
      height: { [VAR_SYMBOL]: "inline", "--height": "200px" }, // var
      padding: 10, // literal
      borderWidth: { [VAR_SYMBOL]: "inline", "--border": "1px" }, // var
      flex: 1, // literal
    };

    const component = render(
      <View testID={testID} className="container" style={mixedStyle as any} />,
    ).getByTestId(testID);

    // Only literal values should pass through
    expect(component.props.style).toEqual([
      { margin: 5 },
      {
        width: 100,
        padding: 10,
        flex: 1,
      },
    ]);
  });

  test("deeply nested array of styles with VAR_SYMBOL objects at different levels", () => {
    registerCSS(`.base { color: blue; }`);

    const deepNestedStyle = [
      { margin: 4 },
      [
        { padding: 8 },
        { fontSize: { [VAR_SYMBOL]: "inline", "--size": "14px" } },
      ],
      { lineHeight: 20 },
    ];

    const component = render(
      <Text testID={testID} className="base" style={deepNestedStyle as any} />,
    ).getByTestId(testID);

    // VAR_SYMBOL should be filtered at all nesting levels
    expect(component.props.style).toEqual([
      { color: "#00f" },
      [{ margin: 4 }, [{ padding: 8 }], { lineHeight: 20 }],
    ]);
  });
});

describe("rightIsInline - Source Property Cleanup", () => {
  test("className prop should be removed when inline style is provided", () => {
    registerCSS(`.text-red { color: red; }`);

    const component = render(
      <Text testID={testID} className="text-red" style={{ fontSize: 16 }} />,
    ).getByTestId(testID);

    // className should not appear in final props (only style)
    expect(component.props.className).toBeUndefined();
    expect(component.props.style).toBeDefined();
  });

  test("className prop should be removed even without inline style", () => {
    registerCSS(`.text-red { color: red; }`);

    const component = render(
      <Text testID={testID} className="text-red" />,
    ).getByTestId(testID);

    // className should be mapped to style and removed
    expect(component.props.className).toBeUndefined();
    expect(component.props.style).toEqual({ color: "#f00" });
  });

  test("source prop should be cleaned when different from target", () => {
    registerCSS(`.container { padding: 20px; }`);

    const component = render(
      <View testID={testID} className="container" style={{ margin: 10 }} />,
    ).getByTestId(testID);

    // Verify className is not in final props
    expect(component.props.className).toBeUndefined();
    // Verify style is properly merged
    expect(component.props.style).toEqual([{ padding: 20 }, { margin: 10 }]);
  });
});

describe("rightIsInline - Mixed Scenarios", () => {
  test("inline style with both literal values and CSS variables", () => {
    registerCSS(`
      .text-style {
        font-size: 14px;
        font-weight: bold;
      }
    `);

    const mixedStyle = {
      color: "green", // literal - should stay
      lineHeight: 20, // literal - should stay
      textShadowColor: {
        [VAR_SYMBOL]: "inline",
        "--shadow": "rgba(0,0,0,0.5)",
      }, // var - should be filtered
    };

    const component = render(
      <Text testID={testID} className="text-style" style={mixedStyle as any} />,
    ).getByTestId(testID);

    // Literal values stay, CSS variable filtered
    expect(component.props.style).toEqual([
      { fontSize: 14, fontWeight: "bold" },
      { color: "green", lineHeight: 20 },
    ]);
  });

  test("important styles should override inline styles with VAR_SYMBOL correctly", () => {
    registerCSS(`.text-important { color: red !important; }`);

    const inlineWithVar = {
      color: "blue",
      fontSize: { [VAR_SYMBOL]: "inline", "--size": "16px" },
    };

    const component = render(
      <Text
        testID={testID}
        className="text-important"
        style={inlineWithVar as any}
      />,
    ).getByTestId(testID);

    // Important styles win, and CSS variable is filtered
    expect(component.props.style).toEqual({ color: "#f00" });
  });

  test("multiple components with different inline CSS variable scenarios", () => {
    registerCSS(`
      .parent { background-color: gray; }
      .child { color: black; }
    `);

    const parentStyle = {
      padding: 10,
      margin: { [VAR_SYMBOL]: "inline", "--margin": "5px" },
    };

    const childStyle = {
      fontSize: 14,
    };

    const { getByTestId } = render(
      <View testID="parent" className="parent" style={parentStyle as any}>
        <Text testID="child" className="child" style={childStyle} />
      </View>,
    );

    const parent = getByTestId("parent");
    const child = getByTestId("child");

    // Parent: CSS variable filtered, literal value kept
    expect(parent.props.style).toEqual([
      { backgroundColor: "#808080" },
      { padding: 10 },
    ]);

    // Child: no CSS variables, works normally
    expect(child.props.style).toEqual([{ color: "#000" }, { fontSize: 14 }]);
  });

  test("empty array after filtering all CSS variables from array style", () => {
    registerCSS(`.box { width: 100px; }`);

    const allVarsStyle = [
      { color: { [VAR_SYMBOL]: "inline", "--color": "red" } },
      { padding: { [VAR_SYMBOL]: "inline", "--padding": "10px" } },
    ];

    const component = render(
      <View testID={testID} className="box" style={allVarsStyle as any} />,
    ).getByTestId(testID);

    // When all inline styles are CSS variables, they're all filtered
    // Only className styles remain
    expect(component.props.style).toEqual({ width: 100 });
  });

  test("style override with same property - inline without VAR_SYMBOL should win", () => {
    registerCSS(`.text-red { color: red; }`);

    const component = render(
      <Text testID={testID} className="text-red" style={{ color: "green" }} />,
    ).getByTestId(testID);

    // Inline literal value should override className
    expect(component.props.style).toEqual({ color: "green" });
  });

  test("style override with same property - inline with VAR_SYMBOL should be filtered", () => {
    registerCSS(`.text-red { color: red; }`);

    const inlineWithVar = {
      color: { [VAR_SYMBOL]: "inline", "--color": "green" },
    };

    const component = render(
      <Text
        testID={testID}
        className="text-red"
        style={inlineWithVar as any}
      />,
    ).getByTestId(testID);

    // VAR_SYMBOL filtered, className color remains
    expect(component.props.style).toEqual({ color: "#f00" });
  });
});

describe("rightIsInline - Performance and Edge Cases", () => {
  test("deeply nested inline style with CSS variables", () => {
    registerCSS(`.container { padding: 10px; }`);

    const deepStyle = {
      margin: 5,
      shadowOffset: {
        [VAR_SYMBOL]: "inline",
        "--offset": "{ width: 0, height: 2 }",
      },
      borderWidth: 1,
    };

    const component = render(
      <View testID={testID} className="container" style={deepStyle as any} />,
    ).getByTestId(testID);

    // CSS variable object filtered, literals kept
    expect(component.props.style).toEqual([
      { padding: 10 },
      { margin: 5, borderWidth: 1 },
    ]);
  });

  test("null and undefined inline styles should be handled gracefully", () => {
    registerCSS(`.text { color: blue; }`);

    const component1 = render(
      <Text testID="test1" className="text" style={null} />,
    ).getByTestId("test1");

    const component2 = render(
      <Text testID="test2" className="text" style={undefined} />,
    ).getByTestId("test2");

    // Both should handle null/undefined gracefully
    expect(component1.props.style).toEqual({ color: "#00f" });
    expect(component2.props.style).toEqual({ color: "#00f" });
  });

  test("inline style overrides className with same property, no CSS variables", () => {
    registerCSS(`.text-red { color: red; }`);

    const component = render(
      <Text testID={testID} className="text-red" style={{ color: "green" }} />,
    ).getByTestId(testID);

    // Normal override behavior (no CSS variables involved)
    expect(component.props.style).toEqual({ color: "green" });
  });

  test("style array with mix of objects, nulls, undefined, and CSS variables", () => {
    registerCSS(`.base { padding: 8px; }`);

    const styleArray = [
      { margin: 4 }, // literal object
      { color: { [VAR_SYMBOL]: "inline", "--color": "blue" } }, // CSS variable object
      null, // null in array (valid in RN)
      { fontSize: 14 }, // literal object
      undefined, // undefined in array (valid in RN)
      { borderWidth: { [VAR_SYMBOL]: "inline", "--border": "2px" } }, // CSS variable
    ];

    const component = render(
      <View testID={testID} className="base" style={styleArray as any} />,
    ).getByTestId(testID);

    // CSS variables filtered, null/undefined preserved, literals kept
    expect(component.props.style).toEqual([
      { padding: 8 },
      [{ margin: 4 }, null, { fontSize: 14 }, undefined],
    ]);
  });

  test("empty object in inline style", () => {
    registerCSS(`.container { margin: 10px; }`);

    const component = render(
      <View testID={testID} className="container" style={{}} />,
    ).getByTestId(testID);

    // Empty inline style should not affect className styles
    expect(component.props.style).toEqual({ margin: 10 });
  });

  test("VAR_SYMBOL as only property in inline object", () => {
    registerCSS(`.text { font-size: 12px; }`);

    const varOnlyStyle = {
      [VAR_SYMBOL]: "inline",
      "--custom": "value",
    };

    const component = render(
      <Text testID={testID} className="text" style={varOnlyStyle as any} />,
    ).getByTestId(testID);

    // Entire object should be filtered
    expect(component.props.style).toEqual({ fontSize: 12 });
  });

  test("complex nested array with alternating literals and VAR_SYMBOL objects", () => {
    registerCSS(`.complex { color: red; }`);

    const complexStyle = [
      { padding: 5 },
      [{ margin: 2 }, { width: { [VAR_SYMBOL]: "inline", "--w": "100px" } }],
      { height: 50 },
      [
        { flex: { [VAR_SYMBOL]: "inline", "--flex": "1" } },
        { borderRadius: 8 },
      ],
    ];

    const component = render(
      <View testID={testID} className="complex" style={complexStyle as any} />,
    ).getByTestId(testID);

    // All VAR_SYMBOL objects filtered at all levels
    expect(component.props.style).toEqual([
      { color: "#f00" },
      [{ padding: 5 }, [{ margin: 2 }], { height: 50 }, [{ borderRadius: 8 }]],
    ]);
  });

  test("multiple properties with VAR_SYMBOL in different formats", () => {
    registerCSS(`.base { padding: 5px; }`);

    const multiVarStyle = {
      color: { [VAR_SYMBOL]: "inline", "--color": "red" },
      fontSize: 16, // literal
      lineHeight: { [VAR_SYMBOL]: "inline", "--lh": "24px" },
      fontWeight: "bold", // literal
      margin: { [VAR_SYMBOL]: "inline" }, // VAR_SYMBOL without other props
    };

    const component = render(
      <Text testID={testID} className="base" style={multiVarStyle as any} />,
    ).getByTestId(testID);

    // Only literals pass through
    expect(component.props.style).toEqual([
      { padding: 5 },
      {
        fontSize: 16,
        fontWeight: "bold",
      },
    ]);
  });

  test("no className, only inline style with VAR_SYMBOL", () => {
    const varStyle = {
      color: { [VAR_SYMBOL]: "inline", "--color": "blue" },
      fontSize: 14,
    };

    const component = render(
      <Text testID={testID} style={varStyle as any} />,
    ).getByTestId(testID);

    // VAR_SYMBOL filtered even without className
    expect(component.props.style).toEqual({ fontSize: 14 });
  });

  test("no className, inline style with only VAR_SYMBOL properties", () => {
    const allVarStyle = {
      color: { [VAR_SYMBOL]: "inline", "--color": "red" },
      padding: { [VAR_SYMBOL]: "inline", "--pad": "10px" },
    };

    const component = render(
      <View testID={testID} style={allVarStyle as any} />,
    ).getByTestId(testID);

    // All filtered, style should be undefined or empty
    expect(component.props.style).toBeUndefined();
  });
});

describe("rightIsInline - Important Style Interactions", () => {
  test("important styles with inline VAR_SYMBOL objects", () => {
    registerCSS(`
      .important-color { color: red !important; }
      .normal-size { font-size: 12px; }
    `);

    const inlineWithVars = {
      color: { [VAR_SYMBOL]: "inline", "--color": "blue" },
      fontSize: { [VAR_SYMBOL]: "inline", "--size": "20px" },
      lineHeight: 24,
    };

    const component = render(
      <Text
        testID={testID}
        className="important-color normal-size"
        style={inlineWithVars as any}
      />,
    ).getByTestId(testID);

    // Important overrides, VAR_SYMBOL filtered, literal kept
    expect(component.props.style).toEqual({
      color: "#f00",
      fontSize: 12,
      lineHeight: 24,
    });
  });

  test("multiple important properties with mixed inline styles", () => {
    registerCSS(`
      .important-multi {
        color: red !important;
        font-size: 14px !important;
        font-weight: bold !important;
      }
    `);

    const inlineStyle = {
      color: "blue",
      fontSize: 20,
      fontWeight: "normal" as const,
      lineHeight: 24,
    };

    const component = render(
      <Text testID={testID} className="important-multi" style={inlineStyle} />,
    ).getByTestId(testID);

    // All important properties override inline
    expect(component.props.style).toEqual({
      color: "#f00",
      fontSize: 14,
      fontWeight: "bold",
      lineHeight: 24,
    });
  });
});

describe("rightIsInline - Real-World Scenarios", () => {
  test("conditional inline styles with potential VAR_SYMBOL leaks", () => {
    registerCSS(`.button { padding: 10px; }`);

    const dynamicStyle = {
      backgroundColor: { [VAR_SYMBOL]: "inline", "--bg": "blue" },
    };

    const component = render(
      <View testID={testID} className="button" style={dynamicStyle as any} />,
    ).getByTestId(testID);

    // Dynamic VAR_SYMBOL should be filtered
    expect(component.props.style).toEqual({ padding: 10 });
  });

  test("spreading props that might contain VAR_SYMBOL", () => {
    registerCSS(`.container { margin: 5px; }`);

    const externalProps = {
      style: {
        padding: 10,
        color: { [VAR_SYMBOL]: "inline", "--color": "green" },
      },
    };

    const component = render(
      <View
        testID={testID}
        className="container"
        style={externalProps.style as any}
      />,
    ).getByTestId(testID);

    // VAR_SYMBOL from spread props should be filtered
    expect(component.props.style).toEqual([{ margin: 5 }, { padding: 10 }]);
  });

  test("style prop from component composition", () => {
    registerCSS(`
      .parent { background-color: white; }
      .child { color: black; }
    `);

    const childStyle = {
      fontSize: 14,
      fontWeight: { [VAR_SYMBOL]: "inline", "--weight": "bold" },
    };

    const { getByTestId } = render(
      <View testID="parent" className="parent">
        <Text testID="child" className="child" style={childStyle as any} />
      </View>,
    );

    const child = getByTestId("child");

    // Nested component should also filter VAR_SYMBOL
    expect(child.props.style).toEqual([{ color: "#000" }, { fontSize: 14 }]);
  });
});
