import { Platform } from "react-native";

import { fireEvent, screen } from "@testing-library/react-native";
import { View } from "react-native-css/components";

import { render } from "./_tailwind";

const grandparentID = "grandparentID";
const parentID = "parent";
const childID = "child";

describe("on a primary input that hovers", () => {
  beforeEach(() => {
    if (Platform.OS !== "ios") {
      throw new Error("the suite runs on the iOS preset");
    }
    jest.spyOn(Platform, "isMacCatalyst", "get").mockReturnValue(true);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test("Styling based on parent state (group-{modifier})", async () => {
    await render(
      <View testID={parentID} className="group">
        <View testID={childID} className="group-hover:text-white" />
      </View>,
    );

    const parent = screen.getByTestId(parentID);
    const child = screen.getByTestId(childID);

    expect(parent).not.toHaveStyle({ color: "#fff" });
    expect(child).not.toHaveStyle({ color: "#fff" });

    fireEvent(parent, "hoverIn");

    expect(child).toHaveStyle({ color: "#fff" });
  });

  test("Differentiating nested groups", async () => {
    await render(
      <View testID={grandparentID} className="group/grandparent">
        <View testID={parentID} className="group/parent">
          <View className="group-hover/grandparent:text-white" />
          <View testID={childID} className="group-hover/parent:text-white" />
        </View>
      </View>,
    );

    const grandparent = screen.getByTestId(grandparentID);
    const parent = screen.getByTestId(parentID);
    const child = screen.getByTestId(childID);

    expect(grandparent).not.toHaveStyle({ color: "#fff" });
    expect(parent).not.toHaveStyle({ color: "#fff" });
    expect(child).not.toHaveStyle({ color: "#fff" });

    fireEvent(grandparent, "hoverIn");

    expect(child).not.toHaveStyle({ color: "#fff" });

    fireEvent(parent, "hoverIn");

    expect(child).toHaveStyle({ color: "#fff" });
  });
});

// Tailwind's group-hover: holds only where the primary input can hover, which a touchscreen cannot
test("group-hover does not apply on a touchscreen", async () => {
  await render(
    <View testID={parentID} className="group">
      <View testID={childID} className="group-hover:text-white" />
    </View>,
  );

  fireEvent(screen.getByTestId(parentID), "hoverIn");

  expect(screen.getByTestId(childID)).not.toHaveStyle({ color: "#fff" });
});

test("arbitrary groups - single className", async () => {
  const { rerender } = await render(
    <View testID={parentID} className="group">
      <View testID={childID} className="group-[.test]:text-white" />
    </View>,
  );

  const parent = screen.getByTestId(parentID);
  const child = screen.getByTestId(childID);

  expect(parent).not.toHaveStyle({ color: "#fff" });
  expect(child).not.toHaveStyle({ color: "#fff" });

  rerender(
    <View testID={parentID} className="group test">
      <View testID={childID} className="group-[.test]:text-white" />
    </View>,
  );

  expect(child).toHaveStyle({ color: "#fff" });
});

test("arbitrary groups - multiple className", async () => {
  const { rerender } = await render(
    <View testID={parentID} className="group">
      <View testID={childID} className="group-[.test.test2]:text-white" />
    </View>,
  );

  const parent = screen.getByTestId(parentID);
  const child = screen.getByTestId(childID);

  expect(parent).not.toHaveStyle({ color: "#fff" });
  expect(child).not.toHaveStyle({ color: "#fff" });

  rerender(
    <View testID={parentID} className="group test">
      <View testID={childID} className="group-[.test.test2]:text-white" />
    </View>,
  );

  expect(parent).not.toHaveStyle({ color: "#fff" });
  expect(child).not.toHaveStyle({ color: "#fff" });

  rerender(
    <View testID={parentID} className="group test test2">
      <View testID={childID} className="group-[.test.test2]:text-white" />
    </View>,
  );

  expect(child).toHaveStyle({ color: "#fff" });
});

test("arbitrary groups - props", async () => {
  const { rerender } = await render(
    <View testID={parentID} className="group" accessibilityLabel="test">
      <View
        testID={childID}
        className="group-[[accessibilityLabel=works]]:text-white"
      />
    </View>,
  );

  const parent = screen.getByTestId(parentID);
  const child = screen.getByTestId(childID);

  expect(parent).not.toHaveStyle({ color: "#fff" });
  expect(child).not.toHaveStyle({ color: "#fff" });

  rerender(
    <View testID={parentID} className="group" accessibilityLabel="works">
      <View
        testID={childID}
        className="group-[[accessibilityLabel=works]]:text-white"
      />
    </View>,
  );

  expect(child).toHaveStyle({ color: "#fff" });
});
