import { act, fireEvent, render, screen } from "@testing-library/react-native";
import { View } from "react-native-css/components/View";
import { registerCSS, testID } from "react-native-css/jest";

const children = undefined;

test("hover", () => {
  registerCSS(`
    .text-color {
      color: blue;
    }

    .text-color:hover {
      color: red;
    }
  `);

  render(<View testID={testID} className="text-color" />);
  const component = screen.getByTestId(testID);

  expect(component.props).toStrictEqual({
    testID,
    children,
    onHoverIn: expect.any(Function),
    onHoverOut: expect.any(Function),
    style: {
      color: "#0000ff",
    },
  });

  act(() => {
    fireEvent(component, "hoverIn");
  });

  expect(component.props).toStrictEqual({
    testID,
    children,
    onHoverIn: expect.any(Function),
    onHoverOut: expect.any(Function),
    style: {
      color: "#ff0000",
    },
  });
  act(() => {
    fireEvent(component, "hoverOut");
  });

  expect(component.props).toStrictEqual({
    testID,
    children,
    onHoverIn: expect.any(Function),
    onHoverOut: expect.any(Function),
    style: {
      color: "#0000ff",
    },
  });
});
