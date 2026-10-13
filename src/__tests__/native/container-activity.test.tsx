import { fireEvent, render, screen } from "@testing-library/react-native";
import { View } from "react-native-css/components/View";
import { registerCSS } from "react-native-css/jest";

const containerID = "container";
const childID = "child";

const RED = { color: "#f00" };

test("a size container takes no part in responder negotiation", () => {
  registerCSS(`
    .container { container-name: my-container; container-type: inline-size; }
    @container my-container (width > 100px) {
      .child { color: red; }
    }
  `);

  render(
    <View testID={containerID} className="container">
      <View testID={childID} className="child" />
    </View>,
  );

  expect(
    screen.getByTestId(containerID).props.onStartShouldSetResponder,
  ).toBeUndefined();
});

test("a group its descendants ask only about an attribute takes no part in responder negotiation", () => {
  registerCSS(`
    .group\\/item[data-state="on"] .child { color: red; }
  `);

  render(
    <View
      testID={containerID}
      className="group/item"
      {...{ dataSet: { state: "on" } }}
    >
      <View testID={childID} className="child" />
    </View>,
  );

  expect(screen.getByTestId(childID)).toHaveStyle(RED);
  expect(
    screen.getByTestId(containerID).props.onStartShouldSetResponder,
  ).toBeUndefined();
});

test("a group answers :active from the touches its subtree receives, and stays out of responder negotiation", () => {
  registerCSS(`
    .group\\/item:active .child { color: red; }
  `);

  render(
    <View testID={containerID} className="group/item">
      <View testID={childID} className="child" />
    </View>,
  );

  const container = screen.getByTestId(containerID);
  const child = screen.getByTestId(childID);

  expect(container.props.onStartShouldSetResponder).toBeUndefined();
  expect(child).not.toHaveStyle(RED);

  fireEvent(container, "touchStart");
  expect(child).toHaveStyle(RED);

  fireEvent(container, "touchEnd");
  expect(child).not.toHaveStyle(RED);

  fireEvent(container, "touchStart");
  expect(child).toHaveStyle(RED);

  fireEvent(container, "touchCancel");
  expect(child).not.toHaveStyle(RED);
});

test("a touch on a descendant activates the group, as every ancestor of the pressed element is :active", () => {
  registerCSS(`
    .group\\/item:active .child { color: red; }
  `);

  render(
    <View testID={containerID} className="group/item">
      <View testID={childID} className="child" />
    </View>,
  );

  const child = screen.getByTestId(childID);

  fireEvent(child, "touchStart");
  expect(child).toHaveStyle(RED);

  fireEvent(child, "touchEnd");
  expect(child).not.toHaveStyle(RED);
});

test("a group the touches reach keeps the touch handlers it was given", () => {
  registerCSS(`
    .group\\/item:active .child { color: red; }
  `);

  const onTouchStart = jest.fn();
  const onTouchEnd = jest.fn();

  render(
    <View
      testID={containerID}
      className="group/item"
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      <View testID={childID} className="child" />
    </View>,
  );

  const container = screen.getByTestId(containerID);

  fireEvent(container, "touchStart");
  expect(onTouchStart).toHaveBeenCalledTimes(1);
  expect(screen.getByTestId(childID)).toHaveStyle(RED);

  fireEvent(container, "touchEnd");
  expect(onTouchEnd).toHaveBeenCalledTimes(1);
  expect(screen.getByTestId(childID)).not.toHaveStyle(RED);
});

test("a group pressed for its own reasons answers :active through its press", () => {
  registerCSS(`
    .group\\/item:active .child { color: red; }
  `);

  const onPress = jest.fn();

  render(
    <View testID={containerID} className="group/item" {...{ onPress }}>
      <View testID={childID} className="child" />
    </View>,
  );

  const container = screen.getByTestId(containerID);
  const child = screen.getByTestId(childID);

  fireEvent(container, "pressIn");
  expect(child).toHaveStyle(RED);

  fireEvent(container, "pressOut");
  expect(child).not.toHaveStyle(RED);

  fireEvent.press(container);
  expect(onPress).toHaveBeenCalledTimes(1);
});
