/** @jsxImportSource react-native-css */
import { Text, View } from "react-native";

import {
  fireEvent,
  registerCSS,
  render,
  screen,
  setupAllComponents,
} from "react-native-css/jest";
import { getAnimatedStyle } from "react-native-reanimated";

const parentID = "parent";
const childID = "child";
setupAllComponents();

jest.useFakeTimers();

test("group", async () => {
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

  expect(getByTestId(childID)).toHaveStyle({ color: "#ff0000" });

  rerender(
    <View testID={parentID}>
      <View testID={childID} className="my-class" />
    </View>,
  );

  expect(getByTestId(childID)).toHaveStyle(undefined);
});

test("group - active", async () => {
  registerCSS(
    `.group\\/item:active .my-class {
      color: red;
    }`,
  );

  render(
    <View testID={parentID} className="group/item">
      <View testID={childID} className="my-class" />
    </View>,
  );

  const parent = screen.getByTestId(parentID);
  const child = screen.getByTestId(childID);

  expect(child).toHaveStyle(undefined);

  fireEvent(parent, "pressIn");

  expect(child).toHaveStyle({ color: "#ff0000" });
});

test("group - active (animated)", async () => {
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

  expect(child).toHaveStyle(undefined);

  fireEvent(parent, "pressIn");

  jest.advanceTimersByTime(0);

  expect(getAnimatedStyle(child)).toStrictEqual({
    color: "rgba(0, 0, 0, 1)",
  });

  jest.advanceTimersByTime(500);

  expect(getAnimatedStyle(child)).toStrictEqual({
    color: "rgba(151, 0, 0, 1)",
  });

  jest.advanceTimersByTime(500);

  expect(getAnimatedStyle(child)).toStrictEqual({
    color: "rgba(255, 0, 0, 1)",
  });
});

test("group", async () => {
  registerCSS(
    `.group .my-class {
      color: red;
    }`,
  );

  render(
    <View testID={parentID}>
      <Text testID={childID} className="my-class" />
    </View>,
  );

  expect(screen.getByTestId(childID)).toHaveStyle(undefined);

  screen.rerender(
    <View testID={parentID} className="group">
      <Text testID={childID} className="my-class" />
    </View>,
  );

  screen.debug();

  expect(screen.getByTestId(childID)).toHaveStyle({ color: "#ff0000" });
});

test("group selector", async () => {
  registerCSS(
    `.group.test .my-class {
      color: red;
    }`,
  );

  const { rerender, getByTestId } = render(
    <View className="group test">
      <View testID={childID} className="my-class" />
    </View>,
  );

  expect(getByTestId(childID)).toHaveStyle({ color: "#ff0000" });

  rerender(
    <View>
      <View testID={childID} className="my-class" />
    </View>,
  );

  expect(getByTestId(childID)).toHaveStyle(undefined);
});
