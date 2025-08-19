import { render, screen } from "@testing-library/react-native";
import { Text } from "react-native-css/components/Text";
import { View } from "react-native-css/components/View";
import { registerCSS } from "react-native-css/jest";

const parentID = "parent";
const childID = "child";

const log = jest.fn();

beforeAll(() => {
  jest.spyOn(console, "log").mockImplementation(log);
});

beforeEach(() => {
  log.mockClear();
});

test("adding a group", () => {
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

  const child = screen.getByTestId(childID);

  expect(child.props.style).toStrictEqual(undefined);

  screen.rerender(
    <View testID={parentID} className="group">
      <Text testID={childID} className="my-class" />
    </View>,
  );

  expect(log.mock.calls).toEqual([
    [
      "ReactNativeCss: className 'group' added or removed a container after the initial render. This causes the components state to be reset and all children be re-mounted. This will cause unexpected behavior. Use the className 'will-change-container' to avoid this warning. If this was caused by sibling components being added/removed, use a 'key' prop so React can track the component correctly.",
    ],
  ]);
});

test("will-change-container", () => {
  registerCSS(
    `.group .my-class {
      color: red;
    }`,
  );

  render(
    <View testID={parentID} className="will-change-container">
      <Text testID={childID} className="my-class" />
    </View>,
  );

  const child = screen.getByTestId(childID);

  expect(child.props.style).toStrictEqual(undefined);

  screen.rerender(
    <View testID={parentID} className="group">
      <Text testID={childID} className="my-class" />
    </View>,
  );

  // There shouldn't be any error, as we continued to have a container
  expect(log.mock.calls).toEqual([]);
});
