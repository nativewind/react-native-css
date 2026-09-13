import { render, screen } from "@testing-library/react-native";
import { Text } from "react-native-css/components/Text";
import { View } from "react-native-css/components/View";
import { registerCSS, testID } from "react-native-css/jest";

test(":disabled", () => {
  registerCSS(`.test:disabled { width: 10px; }`);

  // Test when disabled is false
  render(<View testID={testID} className="test" {...{ disabled: false }} />);
  let component = screen.getByTestId(testID);

  expect(component.type).toBe("View");
  expect(component.props).toStrictEqual({
    children: undefined,
    disabled: false,
    testID,
  });

  // Re-render with disabled true
  render(<View testID={testID} className="test" {...{ disabled: true }} />);
  component = screen.getByTestId(testID);

  expect(component.type).toBe("View");
  expect(component.props).toStrictEqual({
    children: undefined,
    disabled: true,
    style: { width: 10 },
    testID,
  });
});

test(":empty", () => {
  registerCSS(`.test:empty { width: 10px; }`);

  // Test when children is not empty
  render(<Text testID={testID} className="test" children="Hello World" />);
  let component = screen.getByTestId(testID);

  expect(component.type).toBe("Text");
  expect(component.props).toStrictEqual({
    children: "Hello World",
    testID,
  });

  // Re-render with empty children
  render(<Text testID={testID} className="test" />);
  component = screen.getByTestId(testID);

  expect(component.type).toBe("Text");
  expect(component.props).toStrictEqual({
    children: undefined,
    style: { width: 10 },
    testID,
  });
});

describe("dataSet attribute selector", () => {
  test("truthy", () => {
    registerCSS(`.test[data-test] { width: 10px; }`);

    // Test without dataSet
    render(<Text testID={testID} className="test" />);
    let component = screen.getByTestId(testID);

    expect(component.type).toBe("Text");
    expect(component.props).toStrictEqual({
      children: undefined,
      testID,
    });

    // Re-render with dataSet
    render(
      <Text
        testID={testID}
        className="test"
        {...{ dataSet: { test: true } }}
      />,
    );
    component = screen.getByTestId(testID);

    expect(component.type).toBe("Text");
    expect(component.props).toStrictEqual({
      children: undefined,
      dataSet: { test: true },
      style: {
        width: 10,
      },
      testID,
    });
  });

  test("equals", () => {
    registerCSS(`.test[data-test='1'] { width: 10px; }`);

    // Test without dataSet
    render(<Text testID={testID} className="test" />);
    let component = screen.getByTestId(testID);

    expect(component.type).toBe("Text");
    expect(component.props).toStrictEqual({
      children: undefined,
      testID,
    });

    // Test with wrong value
    render(
      <Text testID={testID} className="test" {...{ dataSet: { test: 2 } }} />,
    );
    component = screen.getByTestId(testID);

    expect(component.type).toBe("Text");
    expect(component.props).toStrictEqual({
      children: undefined,
      dataSet: { test: 2 },
      testID,
    });

    // Test with correct value
    render(
      <Text testID={testID} className="test" {...{ dataSet: { test: 1 } }} />,
    );
    component = screen.getByTestId(testID);

    expect(component.type).toBe("Text");
    expect(component.props).toStrictEqual({
      children: undefined,
      dataSet: { test: 1 },
      style: {
        width: 10,
      },
      testID,
    });
  });
});

// Selectors 4 section 6: token boundaries, language matching, and ASCII flags.
test.each([
  [
    "|=",
    "en",
    ["fr", "en", "en-US", "english", "en"],
    [false, true, true, false, true],
  ],
  [
    "~=",
    "active",
    [
      "inactive",
      "before\tactive\nafter",
      "active\rafter",
      "active\fafter",
      "active\u00a0after",
    ],
    [false, true, true, true, false],
  ],
] as const)(
  "attribute %s observes exact boundaries across updates",
  (operator, token, values, matches) => {
    registerCSS(
      `.test { width: 40px; } .test[data-test${operator}"${token}"] { width: 80px; }`,
    );
    const tree = (value: string) => (
      <View
        testID={testID}
        className="test"
        {...{ dataSet: { test: value } }}
      />
    );
    render(tree(values[0]));
    for (const [i, value] of values.entries()) {
      screen.rerender(tree(value));
      expect(screen.getByTestId(testID).props.style.width).toBe(
        matches[i] ? 80 : 40,
      );
    }
  },
);

test.each(["=", "~=", "|=", "^=", "$=", "*="] as const)(
  "attribute %s preserves explicit ASCII insensitive matching",
  (operator) => {
    registerCSS(
      `.test { width: 40px; } .test[data-test${operator}"ACTIVE" i] { width: 80px; }`,
    );
    const tree = (value: string) => (
      <View
        testID={testID}
        className="test"
        {...{ dataSet: { test: value } }}
      />
    );
    render(tree("active"));
    expect(screen.getByTestId(testID).props.style.width).toBe(80);
    screen.rerender(tree("closed"));
    expect(screen.getByTestId(testID).props.style.width).toBe(40);
    screen.rerender(tree("ACTIVE"));
    expect(screen.getByTestId(testID).props.style.width).toBe(80);
  },
);

test.each(["", " s", " i"] as const)(
  "attribute case flag %s has ASCII only semantics",
  (flag) => {
    registerCSS(
      `.test { width: 40px; } .test[data-test="Ä"${flag}] { width: 80px; }`,
    );
    render(
      <View testID={testID} className="test" {...{ dataSet: { test: "ä" } }} />,
    );
    expect(screen.getByTestId(testID).props.style.width).toBe(40);
  },
);

test("compound classes require complete tokens in either selector order", () => {
  registerCSS(
    ".base { width: 40px; height: 20px; } .card.active { width: 80px; } .active.card { height: 60px; }",
  );
  const tree = (names: string) => (
    <View testID={testID} className={`base ${names}`} />
  );
  render(tree("card inactive"));
  for (const names of [
    "card inactive",
    "postcard active",
    "card active",
    "card inactive",
    "postcard active",
    "card active",
  ]) {
    screen.rerender(tree(names));
    expect(screen.getByTestId(testID).props.style).toMatchObject(
      names === "card active"
        ? { width: 80, height: 60 }
        : { width: 40, height: 20 },
    );
  }
});

test.each(["", " s"] as const)(
  "attribute flag %s preserves letter case",
  (flag) => {
    registerCSS(
      `.test { width: 40px; } .test[data-test="ACTIVE"${flag}] { width: 80px; }`,
    );
    const tree = (value: string) => (
      <View
        testID={testID}
        className="test"
        {...{ dataSet: { test: value } }}
      />
    );
    render(tree("active"));
    expect(screen.getByTestId(testID).props.style.width).toBe(40);
    screen.rerender(tree("ACTIVE"));
    expect(screen.getByTestId(testID).props.style.width).toBe(80);
  },
);

test.each(["=", "|=", "~=", "^=", "$=", "*="] as const)(
  "empty %s attribute operand follows selector rules",
  (operator) => {
    registerCSS(
      `.test { width: 40px; } .test[data-test${operator}""] { width: 80px; }`,
    );
    const tree = (value?: string) => (
      <View
        testID={testID}
        className="test"
        {...{ dataSet: { test: value } }}
      />
    );
    render(tree());
    expect(screen.getByTestId(testID).props.style.width).toBe(40);
    screen.rerender(tree(""));
    expect(screen.getByTestId(testID).props.style.width).toBe(
      operator === "=" || operator === "|=" ? 80 : 40,
    );
    screen.rerender(tree());
    expect(screen.getByTestId(testID).props.style.width).toBe(40);
  },
);
