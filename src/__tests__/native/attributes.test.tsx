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

describe("a namespace-qualified attribute selector represents nothing", () => {
  const matchedWidth = (selector: string): number | undefined => {
    registerCSS(`.test${selector} { width: 10px; }`);
    render(
      <Text testID={testID} className="test" {...{ dataSet: { x: "a" } }} />,
    );
    const style = screen.getByTestId(testID).props.style as
      | { width?: number }
      | undefined;
    return style?.width;
  };

  // Measured against lightningcss: only `[ns|att]` reports a `specific` namespace.
  // `[att]` and `[|att]` report none and `[*|att]` reports `any`, and with no
  // namespaced props in the tree those three denote the same set.
  test.each([
    ["no namespace", `[data-x='a']`],
    ["explicitly no namespace", `[|data-x='a']`],
    ["any namespace", `[*|data-x='a']`],
  ])("%s matches the prop", (_label, selector) => {
    expect(matchedWidth(selector)).toBe(10);
  });

  test("a declared prefix matches nothing — no prop is in a namespace", () => {
    registerCSS(
      `@namespace ns url(http://example.com/ns); .test[ns|data-x='a'] { width: 10px; }`,
    );
    render(
      <Text testID={testID} className="test" {...{ dataSet: { x: "a" } }} />,
    );
    expect(screen.getByTestId(testID).props.style).toBeUndefined();
  });

  test("an undeclared prefix matches nothing — the selector is invalid", () => {
    // Selectors L3 §6.3.3. lightningcss passes the prefix through rather than
    // rejecting it, so dropping the selector is this compiler's job.
    expect(matchedWidth(`[undeclared|data-x='a']`)).toBeUndefined();
  });
});
