import {
  Button as RNButton,
  TextInput as RNTextInput,
  type ButtonProps,
  type TextInputProps,
} from "react-native";

import { render } from "@testing-library/react-native";
import { copyComponentProperties } from "react-native-css/components/copyComponentProperties";
import { TextInput } from "react-native-css/components/TextInput";
import { registerCSS, testID } from "react-native-css/jest";
import { useCssElement } from "react-native-css/native";
import type {
  StyledConfiguration,
  StyledProps,
} from "react-native-css/runtime.types";

test("Component preserves props when mapping specifies 'target: false'", () => {
  registerCSS(`.sign-in { color: orange; }`);

  const mapping: StyledConfiguration<typeof RNButton> = {
    className: {
      target: false,
      nativeStyleMapping: {
        color: "color",
      },
    },
  };

  const Button = copyComponentProperties(
    RNButton,
    (props: StyledProps<ButtonProps, typeof mapping>) => {
      return useCssElement(RNButton, props, mapping);
    },
  );

  const onPress = jest.fn();

  const result = render(
    <Button
      testID={testID}
      className="sign-in"
      title="Sign In"
      onPress={onPress}
    />,
  );

  expect(result.getByText("Sign In")).toBeTruthy();

  const renderedElement = result.getByTestId(testID);
  const renderedProps = renderedElement.props;

  expect(renderedProps.testID).toBe(testID);
  expect(renderedProps).not.toHaveProperty("className");

  // the <Text> element in the RN button
  // should apply an orange color to the element (because of the "sign-in" className)
  const titleElement = result.getByText("Sign In");
  expect(titleElement.props.style).toBeInstanceOf(Array);
  expect(titleElement.props.style).toHaveLength(2);
  expect(titleElement.props.style[1]).toEqual({ color: "#ffa500" });
});

test("nativeStyleMapping with boolean true extracts style prop using key name", () => {
  registerCSS(`.text-center { text-align: center; }`);

  const component = render(
    <TextInput testID={testID} className="text-center" />,
  ).getByTestId(testID);

  // textAlign should be extracted from style and mapped to the textAlign prop
  expect(component.props.textAlign).toBe("center");
  expect(component.props.style).not.toHaveProperty("textAlign");
});

test("nativeStyleMapping with boolean true works alongside other styles", () => {
  registerCSS(`
    .text-center { text-align: center; }
    .text-red { color: red; }
  `);

  const component = render(
    <TextInput testID={testID} className="text-center text-red" />,
  ).getByTestId(testID);

  // textAlign extracted to prop, color stays in style
  expect(component.props.textAlign).toBe("center");
  expect(component.props.style).toStrictEqual({ color: "#f00" });
});

test("nativeStyleMapping with boolean true on custom component", () => {
  registerCSS(`.text-right { text-align: right; }`);

  const mapping: StyledConfiguration<typeof RNTextInput> = {
    className: {
      target: "style",
      nativeStyleMapping: {
        textAlign: true,
      },
    },
  };

  const StyledTextInput = copyComponentProperties(
    RNTextInput,
    (props: StyledProps<TextInputProps, typeof mapping>) => {
      return useCssElement(RNTextInput, props, mapping);
    },
  );

  const component = render(
    <StyledTextInput testID={testID} className="text-right" />,
  ).getByTestId(testID);

  expect(component.props.textAlign).toBe("right");
  expect(component.props.style).not.toHaveProperty("textAlign");
});
