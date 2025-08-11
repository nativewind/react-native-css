import { fireEvent, render, screen } from "@testing-library/react-native";
import { View } from "react-native-css/components/View";
import { registerCSS } from "react-native-css/jest";

// import { getAnimatedStyle } from "react-native-reanimated";

const parentID = "parent";
const childID = "child";

jest.useFakeTimers();

test("groups", () => {
  registerCSS(
    `.group\\/item .my-class {
      color: red;
    }`,
  );

  const { rerender, getByTestId } = render(
    <View testID={parentID} className="group/item">
      <View testID={childID} className="my-class" />
    </View>,
  );

  const component = getByTestId(childID);

  expect(component.props.style).toStrictEqual({ color: "#f00" });

  rerender(
    <View testID={parentID}>
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

test.skip("group - active (animated)", () => {
  registerCSS(`
    .group\\/item:active .my-class {
      color: red;
      transition: color 1s;
    }`);

  render(
    <View testID={parentID} className="group/item">
      <View testID={childID} className="my-class" />
    </View>,
  );

  const parent = screen.getByTestId(parentID);
  const child = screen.getByTestId(childID);

  expect(child.props.style).toStrictEqual(undefined);

  fireEvent(parent, "pressIn");

  jest.advanceTimersByTime(0);

  // expect(getAnimatedStyle(child)).toStrictEqual({
  //   color: "rgba(0, 0, 0, 1)",
  // });

  jest.advanceTimersByTime(500);

  // expect(getAnimatedStyle(child)).toStrictEqual({
  //   color: "rgba(151, 0, 0, 1)",
  // });

  jest.advanceTimersByTime(500);

  // expect(getAnimatedStyle(child)).toStrictEqual({
  //   color: "rgba(255, 0, 0, 1)",
  // });
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
