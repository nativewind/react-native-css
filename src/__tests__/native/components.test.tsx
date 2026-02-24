import { Button as RNButton, type ButtonProps } from "react-native";

import { render } from "@testing-library/react-native";
import { copyComponentProperties } from "react-native-css/components/copyComponentProperties";
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
