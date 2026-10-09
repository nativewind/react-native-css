import { fireEvent, screen } from "@testing-library/react-native";
import type { StyleRule } from "react-native-css/compiler";
import { Switch, TextInput, View } from "react-native-css/components";
import {
  Specificity,
  specificityCompareFn,
} from "react-native-css/utilities/specificity";

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

test.each(["placeholder", "selection"])(
  "a %s: utility still sorts after its element utility once the sheet is serialised",
  async (variant) => {
    const { stylesheet } = await render(
      <TextInput
        testID={testID}
        className={`text-red-500 ${variant}:text-blue-500`}
      />,
    );

    const rules = (stylesheet().s ?? []).flatMap(([, ruleSet]) => ruleSet);
    const pseudoElementCounts = (sorted: StyleRule[]) =>
      sorted.map((rule) => rule.s[Specificity.PseudoElements] ?? 0);

    expect(pseudoElementCounts([...rules].sort(specificityCompareFn))).toEqual([
      0, 1,
    ]);

    // Metro injects the sheet as JSON, which writes each specificity hole as `null`.
    const transported = JSON.parse(JSON.stringify(rules)) as StyleRule[];

    for (const order of [transported, [...transported].reverse()]) {
      expect(
        pseudoElementCounts([...order].sort(specificityCompareFn)),
      ).toEqual([0, 1]);
    }
  },
);

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
