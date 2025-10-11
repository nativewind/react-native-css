import { render, screen } from "@testing-library/react-native";
import { View } from "react-native-css/components/View";
import { registerCSS, testID } from "react-native-css/jest";

test("color-mix() - keyword", () => {
  registerCSS(
    `.test {
      --bg: red;
      @supports (color: color-mix(in lab, red, red)) {
        background-color: color-mix(in oklab, var(--bg) 50%, transparent);
      }
    }
  `,
    {
      inlineVariables: false,
    },
  );

  render(<View testID={testID} className="test" />);
  const component = screen.getByTestId(testID);

  expect(component.props.style).toStrictEqual({
    backgroundColor: "rgba(255, 0, 0, 0.5)",
  });
});

test("color-mix() - oklch", () => {
  registerCSS(
    `.test {
      --bg:  oklch(0.577 0.245 27.325);
      @supports (color: color-mix(in lab, red, red)) {
        background-color: color-mix(in oklab, var(--bg) 50%, transparent);
      }
    }
  `,
    {
      inlineVariables: false,
    },
  );

  render(<View testID={testID} className="test" />);
  const component = screen.getByTestId(testID);

  expect(component.props.style).toStrictEqual({
    backgroundColor: "rgba(231, 0, 11, 0.5)",
  });
});
