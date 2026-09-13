import { fireEvent, screen } from "@testing-library/react-native";
import { Switch, TextInput, View } from "react-native-css/components";

import { render } from "./_tailwind";

const testID = "component";

test("hover", async () => {
  await render(<TextInput testID={testID} className="hover:text-white" />);

  const component = screen.getByTestId(testID);

  expect(component).toHaveStyle(undefined);

  fireEvent(component, "hoverIn");
  expect(component).toHaveStyle({ color: "#fff" });

  fireEvent(component, "hoverOut");
  expect(component).toHaveStyle(undefined);
});

test("focus", async () => {
  await render(<TextInput testID={testID} className="focus:text-white" />);

  const component = screen.getByTestId(testID);

  expect(component).toHaveStyle(undefined);

  fireEvent(component, "focus");
  expect(component).toHaveStyle({ color: "#fff" });

  fireEvent(component, "blur");
  expect(component).toHaveStyle(undefined);
});

test("active", async () => {
  await render(<TextInput testID={testID} className="active:text-white" />);

  const component = screen.getByTestId(testID);

  expect(component).toHaveStyle(undefined);

  fireEvent(component, "pressIn");
  expect(component).toHaveStyle({ color: "#fff" });

  fireEvent(component, "pressOut");
  expect(component).toHaveStyle(undefined);
});

test("mixed", async () => {
  await render(
    <TextInput testID={testID} className="active:hover:focus:text-white" />,
  );

  const component = screen.getByTestId(testID);
  expect(component).toHaveStyle(undefined);

  fireEvent(component, "pressIn");
  expect(component).toHaveStyle(undefined);

  fireEvent(component, "hoverIn");
  expect(component).toHaveStyle(undefined);

  fireEvent(component, "focus");
  expect(component).toHaveStyle({ color: "#fff" });
});

// selection:bg-*, not selection:text-*. selectionColor is the band behind the selected
// text, which is background-color in CSS; color there has no React Native prop
test("selection", async () => {
  await render(<TextInput testID={testID} className="selection:bg-black" />);

  const component = screen.getByTestId(testID);
  expect(component.props).toEqual({
    testID,
    selectionColor: "#000",
    children: undefined,
    style: {},
  });
});

test("selection: an unmappable declaration does not reach the element", async () => {
  // selection:text-* is `color` inside ::selection — the selected TEXT colour, which has no
  // React Native prop. Nothing reaches the element and the compiler says what it dropped
  const { warnings } = await render(
    <TextInput testID={testID} className="selection:text-black" />,
  );

  expect(screen.getByTestId(testID).props).toEqual({
    testID,
    children: undefined,
  });

  expect(warnings()).toStrictEqual({
    values: { "::selection": ["color"] },
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
