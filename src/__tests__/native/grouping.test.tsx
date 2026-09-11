import { fireEvent, render, screen } from "@testing-library/react-native";
import { View } from "react-native-css/components/View";
import { registerCSS } from "react-native-css/jest";

// Verify group state at the Reanimated boundary; native motion is separate.
jest.mock("../../native/reanimated", () => ({
  animatedComponentFamily: (component: unknown) => component,
}));

const parentID = "parent";
const childID = "child";

jest.useFakeTimers();

test("groups", () => {
  registerCSS(`
    .group\\/item .my-class {
      color: red;
    }
  `);

  render(
    <View testID={parentID} className="group/item will-change-container">
      <View testID={childID} className="my-class" />
    </View>,
  );

  const component = screen.getByTestId(childID);

  expect(component.props.style).toStrictEqual({ color: "#f00" });

  screen.rerender(
    <View testID={parentID} className="will-change-container">
      <View testID={childID} className="my-class" />
    </View>,
  );

  expect(component.props.style).toStrictEqual(undefined);
});

test("group - active", () => {
  registerCSS(
    `.group\\/item:active .my-class {
      background-color: red;
    }`,
  );

  render(
    <View testID={parentID} className="group/item">
      <View testID={childID} className="my-class" />
    </View>,
  );

  const parent = screen.getByTestId(parentID);
  const child = screen.getByTestId(childID);

  expect(child.props.style).toStrictEqual(undefined);

  fireEvent(parent, "pressIn");

  expect(child.props.style).toStrictEqual({ backgroundColor: "#f00" });
});

test("group - active (animated) supplies changed and restored transition targets", () => {
  registerCSS(`.my-class { color: black; transition: color 1s linear; }
    .group:active .my-class { color: red; }`);
  render(
    <View testID={parentID} className="group">
      <View testID={childID} className="my-class" />
    </View>,
  );
  const expectStyle = (color: string) => {
    expect(screen.getByTestId(childID).props.style).toMatchObject({
      color,
      transitionProperty: ["color"],
      transitionDuration: [1000],
    });
  };
  expectStyle("#000");
  fireEvent(screen.getByTestId(parentID), "pressIn");
  expectStyle("#f00");
  fireEvent(screen.getByTestId(parentID), "pressOut");
  expectStyle("#000");
});

test("group selector", () => {
  registerCSS(
    `.my-a.my-b .my-class {
      color: red;
    }`,
  );

  const { rerender } = render(
    <View className="my-a my-b">
      <View testID={childID} className="my-class" />
    </View>,
  );

  const child = screen.getByTestId(childID);

  expect(child.props.style).toStrictEqual({ color: "#f00" });

  rerender(
    <View className="my-b">
      <View testID={childID} className="my-class" />
    </View>,
  );

  expect(child.props.style).toStrictEqual(undefined);
});
