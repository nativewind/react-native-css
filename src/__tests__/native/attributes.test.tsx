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

describe("[class=…] reads the prop the class list actually arrives on", () => {
  // CSS 2.1 §5.8.1's own example is `span[class=example]`. On React Native the
  // class list is `className`, so an unmapped query reads `props.class` — which no
  // element has — and answers false for every element. The compiler's own compound
  // path already maps it, building `["a", "className", "*=", name]` for a second
  // class name in the same selector.
  const matchedWidth = (
    selector: string,
    className: string,
  ): number | undefined => {
    registerCSS(`.test${selector} { width: 10px; }`);
    render(<Text testID={testID} className={`test ${className}`} />);
    const style = screen.getByTestId(testID).props.style as
      | { width?: number }
      | undefined;
    return style?.width;
  };

  test("[class~=val] finds one word of the class list", () => {
    expect(matchedWidth(`[class~='example']`, "example")).toBe(10);
    expect(matchedWidth(`[class~='example']`, "other")).toBeUndefined();
  });

  test("[class*=val] finds a substring of the class list", () => {
    expect(matchedWidth(`[class*='xamp']`, "example")).toBe(10);
    expect(matchedWidth(`[class*='xamp']`, "other")).toBeUndefined();
  });

  test("[class] is present whenever the element carries a class", () => {
    expect(matchedWidth(`[class]`, "example")).toBe(10);
  });

  test("the name maps at the :is() build site too", () => {
    // `:is()` builds its queries on a separate path, so the mapping has to reach
    // it as well.
    expect(matchedWidth(`:is([class~='example'])`, "example")).toBe(10);
  });
});
