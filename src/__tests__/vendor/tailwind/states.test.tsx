import { Platform } from "react-native";

import { fireEvent, screen } from "@testing-library/react-native";
import { Switch, TextInput, View } from "react-native-css/components";

import { render } from "./_tailwind";

const testID = "component";

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

  test("hover", async () => {
    await render(<TextInput testID={testID} className="hover:text-white" />);

    const component = screen.getByTestId(testID);

    expect(component).not.toHaveStyle({ color: "#fff" });

    fireEvent(component, "hoverIn");
    expect(component).toHaveStyle({ color: "#fff" });

    fireEvent(component, "hoverOut");
    expect(component).not.toHaveStyle({ color: "#fff" });
  });

  test("mixed", async () => {
    await render(
      <TextInput testID={testID} className="active:hover:focus:text-white" />,
    );

    const component = screen.getByTestId(testID);
    expect(component).not.toHaveStyle({ color: "#fff" });

    fireEvent(component, "pressIn");
    expect(component).not.toHaveStyle({ color: "#fff" });

    fireEvent(component, "hoverIn");
    expect(component).not.toHaveStyle({ color: "#fff" });

    fireEvent(component, "focus");
    expect(component).toHaveStyle({ color: "#fff" });
  });
});

// Tailwind's hover: holds only where the primary input can hover, which a touchscreen cannot
test("hover does not apply on a touchscreen", async () => {
  await render(<TextInput testID={testID} className="hover:text-white" />);

  const component = screen.getByTestId(testID);
  fireEvent(component, "hoverIn");

  expect(component).not.toHaveStyle({ color: "#fff" });
});

test("focus", async () => {
  await render(<TextInput testID={testID} className="focus:text-white" />);

  const component = screen.getByTestId(testID);

  expect(component).not.toHaveStyle({ color: "#fff" });

  fireEvent(component, "focus");
  expect(component).toHaveStyle({ color: "#fff" });

  fireEvent(component, "blur");
  expect(component).not.toHaveStyle({ color: "#fff" });
});

test("active", async () => {
  await render(<TextInput testID={testID} className="active:text-white" />);

  const component = screen.getByTestId(testID);

  expect(component).not.toHaveStyle({ color: "#fff" });

  fireEvent(component, "pressIn");
  expect(component).toHaveStyle({ color: "#fff" });

  fireEvent(component, "pressOut");
  expect(component).not.toHaveStyle({ color: "#fff" });
});

test("selection", async () => {
  await render(<TextInput testID={testID} className="selection:text-black" />);

  const component = screen.getByTestId(testID);
  expect(component.props).toEqual({
    testID,
    selectionColor: "#000",
    children: undefined,
    style: {},
  });
});

test("ltr:", async () => {
  await render(<View testID={testID} className="ltr:text-black" />);

  const component = screen.getByTestId(testID);
  expect(component).toHaveStyle({
    color: "#000",
  });
});

test("placeholder", async () => {
  await render(
    <TextInput testID={testID} className="placeholder:text-black" />,
  );

  const component = screen.getByTestId(testID);
  expect(component.props).toEqual({
    testID,
    placeholderTextColor: "#000",
    children: undefined,
    style: {},
  });
});

test("disabled", async () => {
  const { rerender } = await render(
    <Switch testID={testID} className="disabled:bg-black" />,
  );

  const component = screen.getByTestId(testID);
  expect(component.props).toEqual(
    expect.objectContaining({
      testID,
      style: {
        alignSelf: "flex-start",
      },
    }),
  );

  rerender(<Switch testID={testID} disabled className="disabled:bg-black" />);

  expect(component.props).toEqual(
    expect.objectContaining({
      testID,
      style: [
        {
          alignSelf: "flex-start",
        },
        {
          backgroundColor: "#000",
        },
      ],
    }),
  );

  rerender(
    <Switch testID={testID} disabled={false} className="disabled:bg-black" />,
  );

  expect(component.props).toEqual(
    expect.objectContaining({
      testID,
      style: {
        alignSelf: "flex-start",
      },
    }),
  );
});
