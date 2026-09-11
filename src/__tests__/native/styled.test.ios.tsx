import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";

import { render, screen } from "@testing-library/react-native";
import { VariableContextProvider } from "react-native-css";
import { View as CssView } from "react-native-css/components/View";
import { registerCSS, testID } from "react-native-css/jest";
import { styled } from "react-native-css/runtime";

const children = undefined;

test("static styles w/ only target", () => {
  registerCSS(`
    .text-blue-500 {
      color: blue;
    }
  `);

  const StyleView = styled(View, {
    className: "style",
  });

  render(
    <StyleView testID={testID} className="text-blue-500 hover:text-red-500" />,
  );
  const component = screen.getByTestId(testID);

  expect(component.props).toStrictEqual({
    testID,
    children,
    style: {
      color: "#00f",
    },
  });
});

test("static styles w/ target & nativeStyleMapping", () => {
  registerCSS(`
    .text-blue-500 {
      color: blue;
      background-color: red;
    }
  `);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const StyleView = styled(View as any, {
    className: {
      target: "other",
      nativeStyleToProp: {
        color: "myColor",
      },
    },
  });

  render(
    <StyleView testID={testID} className="text-blue-500 hover:text-red-500" />,
  );

  const component = screen.getByTestId(testID);
  expect(component.props).toStrictEqual({
    testID,
    children,
    myColor: "#00f",
    other: {
      backgroundColor: "#f00",
    },
  });
});

test("static styles w/ target none", () => {
  registerCSS(`
    .text-blue-500 {
      color: blue;
      background-color: red;
    }
  `);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const StyleView = styled(View as any, {
    className: {
      target: false,
      nativeStyleToProp: {
        color: "myColor",
      },
    },
  });

  render(
    <StyleView testID={testID} className="text-blue-500 hover:text-red-500" />,
  );
  const component = screen.getByTestId(testID);

  expect(component.props).toStrictEqual({
    testID,
    children,
    myColor: "#00f",
  });
});

test("dynamic styles w/ target & nativeStyleToProp", () => {
  registerCSS(`
    .text-blue-500 {
      --blue: blue;
      --red: red;
      color: var(--blue);
      background-color: var(--red);
    }
  `);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const StyleView = styled(View as any, {
    className: {
      target: "other",
      nativeStyleToProp: {
        color: "myColor",
      },
    },
  });

  render(
    <StyleView testID={testID} className="text-blue-500 hover:text-red-500" />,
  );
  const component = screen.getByTestId(testID);

  expect(component.props).toStrictEqual({
    testID,
    children,
    myColor: "#00f",
    other: {
      backgroundColor: "#f00",
    },
  });
});

// Both spellings are part of the declared API during migration.
test.each(["nativeStyleMapping", "nativeStyleToProp"] as const)(
  "%s updates, removes, and restores mapped values without discarding inline styles",
  (option) => {
    registerCSS(`.first { color: blue; background-color: red; }
      .second { color: green; background-color: red; }`);
    const StyledView = styled(View, {
      className: { target: false, [option]: { color: "accessibilityLabel" } },
    });
    render(<StyledView testID={testID} style={{ opacity: 0.4 }} />);
    for (const [className, expected] of [
      ["first", "#00f"],
      ["second", "#008000"],
      ["", undefined],
      ["first", "#00f"],
    ] as const) {
      const element = (
        <StyledView
          testID={testID}
          className={className}
          style={{ opacity: 0.4 }}
        />
      );
      screen.rerender(element);
      expect(screen.getByTestId(testID).props.accessibilityLabel).toBe(
        expected,
      );
      expect(screen.getByTestId(testID).props.style).toEqual({ opacity: 0.4 });
    }
  },
);

test.each([false, true])(
  "current mapping wins over deprecated alias (empty: %s)",
  (empty) => {
    registerCSS(`.subject { color: blue; }`);
    const StyledView = styled(View, {
      className: {
        target: "style",
        nativeStyleMapping: empty ? {} : { color: "accessibilityLabel" },
        nativeStyleToProp: { color: "testID" },
      },
    });
    render(<StyledView testID={testID} className="subject" />);
    const props = screen.getByTestId(testID).props;
    expect(props.accessibilityLabel).toBe(empty ? undefined : "#00f");
    if (empty) expect(props.style).toEqual({ color: "#00f" });
  },
);

test("passThrough resolves three segment targets and updates without leaking root props", () => {
  registerCSS(`.first { width: 40px; } .second { width: 80px; }`);
  interface Props {
    nested?: { inner?: { style?: StyleProp<ViewStyle> } };
  }
  const Base = (props: Props) => {
    expect(props).not.toHaveProperty("inner");
    return <CssView testID={testID} style={props.nested?.inner?.style} />;
  };
  const Wrapped = styled(
    Base,
    { className: "nested.inner.style" },
    { passThrough: true },
  );
  render(<Wrapped className="first" />);
  for (const [className, expected] of [
    ["first", 40],
    ["second", 80],
    [undefined, undefined],
    ["first", 40],
  ] as const) {
    screen.rerender(<Wrapped className={className} />);
    expect(
      StyleSheet.flatten(screen.getByTestId(testID).props.style)?.width,
    ).toBe(expected);
  }
});

test("passThrough preserves caller owned nested props and inline style arrays", () => {
  registerCSS(`.first { width: 40px; } .second { width: 80px; }`);
  interface Props {
    nested: { style?: StyleProp<ViewStyle>; label: string };
  }
  const Base = ({ nested }: Props) => (
    <CssView
      testID={testID}
      accessibilityLabel={nested.label}
      style={nested.style}
    />
  );
  const Wrapped = styled(
    Base,
    { className: "nested.style" },
    { passThrough: true },
  );
  const styles = [{ height: 12 }, { opacity: 0.5 }];
  const nested = Object.freeze({ style: styles, label: "preserved" });
  render(<Wrapped nested={nested} className="first" />);
  for (const [className, expected] of [
    ["first", 40],
    ["second", 80],
    [undefined, undefined],
    ["first", 40],
  ] as const) {
    screen.rerender(<Wrapped nested={nested} className={className} />);
    const props = screen.getByTestId(testID).props;
    expect(StyleSheet.flatten(props.style)).toMatchObject({
      height: 12,
      opacity: 0.5,
    });
    expect(StyleSheet.flatten(props.style).width).toBe(expected);
    expect(props.accessibilityLabel).toBe("preserved");
    expect(nested.style).toBe(styles);
    expect(styles).toEqual([{ height: 12 }, { opacity: 0.5 }]);
  }
});

test("passThrough default mapping resolves variables in the receiving component context", () => {
  registerCSS(`.deferred { width: var(--deferred-size); }`);
  interface Props {
    size: number;
    style?: StyleProp<ViewStyle>;
  }
  const Base = ({ size, style }: Props) => (
    <VariableContextProvider value={{ "--deferred-size": size }}>
      <CssView testID={testID} style={style} />
    </VariableContextProvider>
  );
  const Wrapped = styled(Base, undefined, { passThrough: true });
  render(<Wrapped size={40} className="deferred" style={{ height: 12 }} />);
  expect(StyleSheet.flatten(screen.getByTestId(testID).props.style)).toEqual({
    width: 40,
    height: 12,
  });
  screen.rerender(
    <Wrapped size={80} className="deferred" style={{ height: 12 }} />,
  );
  expect(StyleSheet.flatten(screen.getByTestId(testID).props.style)).toEqual({
    width: 80,
    height: 12,
  });
});

test("passThrough false target consumes its source without changing ordinary props", () => {
  registerCSS(`.discarded { width: 40px; }`);
  interface Props {
    style?: StyleProp<ViewStyle>;
    accessibilityLabel?: string;
  }
  const Base = (props: Props) => {
    expect(props).not.toHaveProperty("className");
    return <CssView {...props} testID={testID} />;
  };
  const Wrapped = styled(
    Base,
    { className: { target: false } },
    { passThrough: true },
  );
  render(
    <Wrapped
      className="discarded"
      style={{ height: 12 }}
      accessibilityLabel="preserved"
    />,
  );
  const props = screen.getByTestId(testID).props;
  expect(StyleSheet.flatten(props.style)).toEqual({ height: 12 });
  expect(props.accessibilityLabel).toBe("preserved");
});

test("independent nested mappings retain both inline and class styles", () => {
  registerCSS(`.first { width: 40px; } .second { width: 80px; }`);
  interface Props {
    a?: { style?: StyleProp<ViewStyle> };
    b?: { style?: StyleProp<ViewStyle> };
  }
  const Base = ({ a, b }: Props) => (
    <>
      <View testID="mapped-a" style={a?.style} />
      <View testID="mapped-b" style={b?.style} />
    </>
  );
  const Wrapped = styled(Base, {
    firstClass: "a.style",
    secondClass: "b.style",
  });
  const a = Object.freeze({ style: { height: 12 } });
  const b = Object.freeze({ style: { height: 24 } });
  render(<Wrapped a={a} b={b} firstClass="first" secondClass="second" />);
  for (const [firstClass, secondClass, firstWidth, secondWidth] of [
    ["first", "second", 40, 80],
    ["second", "first", 80, 40],
    [undefined, undefined, undefined, undefined],
    ["first", "second", 40, 80],
  ] as const) {
    screen.rerender(
      <Wrapped a={a} b={b} firstClass={firstClass} secondClass={secondClass} />,
    );
    expect(
      StyleSheet.flatten(screen.getByTestId("mapped-a").props.style),
    ).toEqual({
      height: 12,
      ...(firstWidth === undefined ? {} : { width: firstWidth }),
    });
    expect(
      StyleSheet.flatten(screen.getByTestId("mapped-b").props.style),
    ).toEqual({
      height: 24,
      ...(secondWidth === undefined ? {} : { width: secondWidth }),
    });
    expect(a).toEqual({ style: { height: 12 } });
    expect(b).toEqual({ style: { height: 24 } });
  }
});

test("three segment native target does not leak intermediate keys into root props", () => {
  registerCSS(`.subject { width: 40px; }`);
  interface Props {
    outer?: { inner?: { style?: StyleProp<ViewStyle> } };
  }
  const Base = (props: Props) => {
    expect(props).not.toHaveProperty("inner");
    expect(props).not.toHaveProperty("style");
    return <View testID={testID} style={props.outer?.inner?.style} />;
  };
  const Wrapped = styled(Base, { className: "outer.inner.style" });
  render(
    <Wrapped
      className="subject"
      outer={{ inner: { style: { height: 12 } } }}
    />,
  );
  expect(StyleSheet.flatten(screen.getByTestId(testID).props.style)).toEqual({
    width: 40,
    height: 12,
  });
});
