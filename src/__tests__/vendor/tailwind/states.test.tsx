import { I18nManager } from "react-native";

import { fireEvent, screen } from "@testing-library/react-native";
import type { StyleRule } from "react-native-css/compiler";
import { Switch, TextInput, View } from "react-native-css/components";
import {
  Specificity,
  specificityCompareFn,
} from "react-native-css/utilities/specificity";

import { render } from "./_tailwind";

const testID = "component";

const originalIsRTL = Object.getOwnPropertyDescriptor(I18nManager, "isRTL");
afterEach(() => {
  if (originalIsRTL) {
    Object.defineProperty(I18nManager, "isRTL", originalIsRTL);
  }
});

function setIsRTL(isRTL: boolean) {
  Object.defineProperty(I18nManager, "isRTL", {
    configurable: true,
    value: isRTL,
  });
}

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

// A pseudo-element rule ranks equal to both of its neighbours on main, so the sort cannot move them past it
test.each(["placeholder:text-gray-400", "selection:text-blue-200"])(
  "a pressed background outranks the resting one with %s between them once the sheet is serialised",
  async (pseudoElementUtility) => {
    const className = `active:bg-gray-100 ${pseudoElementUtility} bg-white`;
    const { stylesheet } = await render(
      <TextInput testID={testID} className={className} />,
    );
    const ruleSets = new Map(stylesheet().s ?? []);

    // Metro injects the sheet as JSON, which writes each specificity hole as `null`.
    const transported = className
      .split(" ")
      .flatMap((name) =>
        (
          JSON.parse(JSON.stringify(ruleSets.get(name) ?? [])) as StyleRule[]
        ).map((rule) => ({ name, rule })),
      );

    const cascade = [...transported]
      .sort((a, b) => specificityCompareFn(a.rule, b.rule))
      .map(({ name }) => name);

    expect(cascade.indexOf("bg-white")).toBeLessThan(
      cascade.indexOf("active:bg-gray-100"),
    );
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

// Tailwind compiles these to :dir(), which lightningcss downcompiles to
// :lang() for a fixed list of RTL languages. Both paths have to survive the
// compiler and end up as a dir condition. See #453.
test.each([true, false])("rtl: with isRTL=%s", async (isRTL) => {
  setIsRTL(isRTL);

  await render(<View testID={testID} className="rtl:text-white" />);

  expect(screen.getByTestId(testID)).toHaveStyle(
    isRTL ? { color: "#fff" } : undefined,
  );
});

test.each([true, false])("ltr: with isRTL=%s", async (isRTL) => {
  setIsRTL(isRTL);

  await render(<View testID={testID} className="ltr:text-white" />);

  expect(screen.getByTestId(testID)).toHaveStyle(
    isRTL ? undefined : { color: "#fff" },
  );
});
