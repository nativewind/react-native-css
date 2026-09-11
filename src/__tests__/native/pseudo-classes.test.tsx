import { act, fireEvent, render, screen } from "@testing-library/react-native";
import { Pressable } from "react-native-css/components/Pressable";
import { TextInput } from "react-native-css/components/TextInput";
import { View } from "react-native-css/components/View";
import { registerCSS, testID } from "react-native-css/jest";

const children = undefined;

test.each([
  ["hover", "hoverIn", "hoverOut"],
  ["focus", "focus", "blur"],
  ["active", "pressIn", "pressOut"],
])("null event callbacks retain the %s state cycle", (state, enter, leave) => {
  registerCSS(`.nullable { opacity: 0.5; } .nullable:${state} { opacity: 1; }`);
  render(
    <Pressable
      testID={testID}
      className="nullable"
      onHoverIn={null}
      onHoverOut={null}
      onFocus={null}
      onBlur={null}
      onPress={null}
      onPressIn={null}
      onPressOut={null}
    />,
  );
  expect(screen.getByTestId(testID).props.style.opacity).toBe(0.5);
  fireEvent(screen.getByTestId(testID), enter);
  expect(screen.getByTestId(testID).props.style.opacity).toBe(1);
  fireEvent(screen.getByTestId(testID), leave);
  expect(screen.getByTestId(testID).props.style.opacity).toBe(0.5);
});

test("shared focus and blur callback preserves both style transitions", () => {
  registerCSS(`.field { color: blue; } .field:focus { color: red; }`);
  const callback = jest.fn();
  const replacement = jest.fn();
  const field = (handler: () => void) => (
    <TextInput
      testID={testID}
      className="field"
      onFocus={handler}
      onBlur={handler}
    />
  );
  const view = render(field(callback));

  for (const handler of [callback, replacement]) {
    view.rerender(field(handler));
    expect(screen.getByTestId(testID).props.style.color).toBe("#00f");
    fireEvent(screen.getByTestId(testID), "focus");
    expect(screen.getByTestId(testID).props.style.color).toBe("#f00");
    fireEvent(screen.getByTestId(testID), "blur");
    expect(screen.getByTestId(testID).props.style.color).toBe("#00f");
    expect(handler).toHaveBeenCalledTimes(2);
  }
});

test("shared hover callback preserves entering and leaving the component", () => {
  registerCSS(`.tile { color: blue; } .tile:hover { color: red; }`);
  const callback = jest.fn();
  render(
    <Pressable
      testID={testID}
      className="tile"
      onHoverIn={callback}
      onHoverOut={callback}
    />,
  );
  for (let cycle = 0; cycle < 2; cycle++) {
    fireEvent(screen.getByTestId(testID), "hoverIn");
    expect(screen.getByTestId(testID).props.style.color).toBe("#f00");
    fireEvent(screen.getByTestId(testID), "hoverOut");
    expect(screen.getByTestId(testID).props.style.color).toBe("#00f");
  }
  expect(callback).toHaveBeenCalledTimes(4);
});

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
      color: "#00f",
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
      color: "#f00",
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
      color: "#00f",
    },
  });
});
