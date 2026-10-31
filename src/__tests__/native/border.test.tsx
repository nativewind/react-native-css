import { render, screen } from "@testing-library/react-native";
import { View } from "react-native-css/components/View";
import { registerCSS, testID } from "react-native-css/jest";

describe("border values from runtime variables", () => {
  test("width, style and color", () => {
    registerCSS(
      `.test {
        --border: 2px solid #123456;
        border: var(--border);
      }`,
      { inlineVariables: false },
    );

    render(<View testID={testID} className="test" />);
    const component = screen.getByTestId(testID);

    expect(component.props.style).toStrictEqual({
      borderWidth: 2,
      borderStyle: "solid",
      borderColor: "#123456",
    });
  });

  test("color", () => {
    registerCSS(
      `.test {
        --color: #123456;
        border: 2px solid var(--color);
      }`,
      { inlineVariables: false },
    );

    render(<View testID={testID} className="test" />);
    const component = screen.getByTestId(testID);

    expect(component.props.style).toStrictEqual({
      borderWidth: 2,
      borderStyle: "solid",
      borderColor: "#123456",
    });
  });
});
