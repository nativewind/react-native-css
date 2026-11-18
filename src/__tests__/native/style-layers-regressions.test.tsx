import { Animated, View as RNView, StyleSheet } from "react-native";

import { act, render } from "@testing-library/react-native";
import { Pressable } from "react-native-css/components/Pressable";
import { ScrollView } from "react-native-css/components/ScrollView";
import { registerCSS, testID } from "react-native-css/jest";
import { styled } from "react-native-css/native";
import { VAR_SYMBOL } from "react-native-css/native/reactivity";

// Each case renders as it does in Nativewind v4, which applies the class, then the inline style, then !important

const CSS = `
.p-4 { padding: 16px; }
.bg-red\\! { background-color: red !important; }
`;

beforeEach(() => registerCSS(CSS));

test("an !important class on contentContainerClassName keeps the class's other values and the inline style", () => {
  const component = render(
    <ScrollView
      testID={testID}
      contentContainerClassName="bg-red! p-4"
      contentContainerStyle={{ backgroundColor: "blue", margin: 2 }}
    />,
  ).getByTestId(testID);

  expect(StyleSheet.flatten(component.props.contentContainerStyle)).toEqual({
    padding: 16,
    backgroundColor: "#f00",
    margin: 2,
  });
});

describe.each(["p-4", "p-4 bg-red!"])("className=%s", (className) => {
  test("an inline Animated.Value stays live", () => {
    const AnimatedView = styled(Animated.View, { className: "style" });
    const opacity = new Animated.Value(0.5);

    const component = render(
      <AnimatedView
        testID={testID}
        className={className}
        style={{ opacity }}
      />,
    ).getByTestId(testID);

    act(() => {
      opacity.setValue(0.9);
    });

    expect(StyleSheet.flatten(component.props.style)).toMatchObject({
      padding: 16,
      opacity: 0.9,
    });
  });

  test("an inline style that holds no CSS variable reaches the component as the same object", () => {
    const inline = { margin: 2 };

    const component = render(
      <RNViewStyled testID={testID} className={className} style={inline} />,
    ).getByTestId(testID);

    // Layered, at any depth, never copied
    expect([component.props.style].flat(Infinity)).toContain(inline);
  });
});

const RNViewStyled = styled(RNView, { className: { target: "style" } });

test.each([
  [[]],
  [{ height: undefined }],
  [{ [VAR_SYMBOL]: "inline", brand: "red" }],
])("the object form keeps the class's style beside an inline %p", (inline) => {
  const component = render(
    <RNViewStyled testID={testID} className="p-4" style={inline as never} />,
  ).getByTestId(testID);

  expect(StyleSheet.flatten(component.props.style)).toMatchObject({
    padding: 16,
  });
  expect(StyleSheet.flatten(component.props.style)).not.toHaveProperty("brand");
});

test("a Pressable's callback style runs between a class and an !important class", () => {
  const component = render(
    <Pressable
      testID={testID}
      className="p-4 bg-red!"
      style={({ pressed }) => ({
        opacity: pressed ? 0.5 : 1,
        backgroundColor: "blue",
      })}
    />,
  ).getByTestId(testID);

  expect(StyleSheet.flatten(component.props.style)).toEqual({
    padding: 16,
    opacity: 1,
    backgroundColor: "#f00",
  });
});
