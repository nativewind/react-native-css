import { memo } from "react";
import {
  Button as RNButton,
  Image as RNImage,
  KeyboardAvoidingView as RNKeyboardAvoidingView,
  Text as RNText,
  TextInput as RNTextInput,
  StyleSheet,
  View,
  type ButtonProps,
  type TextInputProps,
  type ViewProps,
} from "react-native";

import { render, screen } from "@testing-library/react-native";
import { copyComponentProperties } from "react-native-css/components/copyComponentProperties";
import { KeyboardAvoidingView } from "react-native-css/components/KeyboardAvoidingView";
import { TextInput } from "react-native-css/components/TextInput";
import { registerCSS, testID } from "react-native-css/jest";
import { styled, useCssElement } from "react-native-css/native";
import type {
  StyledConfiguration,
  StyledProps,
} from "react-native-css/runtime.types";

test("Component preserves props when mapping specifies 'target: false'", () => {
  registerCSS(`.sign-in { color: orange; }`);

  const mapping: StyledConfiguration<typeof RNButton> = {
    className: {
      target: false,
      nativeStyleMapping: {
        color: "color",
      },
    },
  };

  const Button = copyComponentProperties(
    RNButton,
    (props: StyledProps<ButtonProps, typeof mapping>) => {
      return useCssElement(RNButton, props, mapping);
    },
  );

  const onPress = jest.fn();

  const result = render(
    <Button
      testID={testID}
      className="sign-in"
      title="Sign In"
      onPress={onPress}
    />,
  );

  expect(result.getByText("Sign In")).toBeTruthy();

  const renderedElement = result.getByTestId(testID);
  const renderedProps = renderedElement.props;

  expect(renderedProps.testID).toBe(testID);
  expect(renderedProps).not.toHaveProperty("className");

  // the <Text> element in the RN button
  // should apply an orange color to the element (because of the "sign-in" className)
  const titleElement = result.getByText("Sign In");
  expect(titleElement.props.style).toBeInstanceOf(Array);
  expect(titleElement.props.style).toHaveLength(2);
  expect(titleElement.props.style[1]).toEqual({ color: "#ffa500" });
});

test("nativeStyleMapping with boolean true extracts style prop using key name", () => {
  registerCSS(`.text-center { text-align: center; }`);

  const component = render(
    <TextInput testID={testID} className="text-center" />,
  ).getByTestId(testID);

  // textAlign should be extracted from style and mapped to the textAlign prop
  expect(component.props.textAlign).toBe("center");
  expect(component.props.style).not.toHaveProperty("textAlign");
});

test("nativeStyleMapping with boolean true works alongside other styles", () => {
  registerCSS(`
    .text-center { text-align: center; }
    .text-red { color: red; }
  `);

  const component = render(
    <TextInput testID={testID} className="text-center text-red" />,
  ).getByTestId(testID);

  // textAlign extracted to prop, color stays in style
  expect(component.props.textAlign).toBe("center");
  expect(component.props.style).toStrictEqual({ color: "#f00" });
});

test("nativeStyleMapping with boolean true on custom component", () => {
  registerCSS(`.text-right { text-align: right; }`);

  const mapping: StyledConfiguration<typeof RNTextInput> = {
    className: {
      target: "style",
      nativeStyleMapping: {
        textAlign: true,
      },
    },
  };

  const StyledTextInput = copyComponentProperties(
    RNTextInput,
    (props: StyledProps<TextInputProps, typeof mapping>) => {
      return useCssElement(RNTextInput, props, mapping);
    },
  );

  const component = render(
    <StyledTextInput testID={testID} className="text-right" />,
  ).getByTestId(testID);

  expect(component.props.textAlign).toBe("right");
  expect(component.props.style).not.toHaveProperty("textAlign");
});

test("KeyboardAvoidingView maps content classes through replacement, removal, and restoration", () => {
  registerCSS(
    `.first-content { padding: 12px; } .second-content { padding: 24px; }`,
  );
  const contentStyle = Object.freeze({ opacity: 0.5 });
  const result = render(
    <KeyboardAvoidingView behavior="position">
      <View testID="keyboard-child" />
    </KeyboardAvoidingView>,
  );
  for (const [className, padding] of [
    ["first-content", 12],
    ["second-content", 24],
    [undefined, undefined],
    ["first-content", 12],
  ] as const) {
    result.rerender(
      <KeyboardAvoidingView
        behavior="position"
        contentContainerClassName={className}
        contentContainerStyle={contentStyle}
      >
        <View testID="keyboard-child" />
      </KeyboardAvoidingView>,
    );
    const inner = result.UNSAFE_getByType(RNKeyboardAvoidingView);
    const style = StyleSheet.flatten(inner.props.contentContainerStyle);
    expect(style.padding).toBe(padding);
    expect(style.opacity).toBe(0.5);
    expect(contentStyle).toEqual({ opacity: 0.5 });
  }
});

interface LabelledProps extends ViewProps {
  readonly labelColor?: string;
  readonly badgeColor?: string;
}

// nativeStyleMapping is typed against the target's props, so a target:false config needs a component that has some
const Labelled = (props: LabelledProps) => <View {...props} />;

test("a target:false config does not take a style-target config's declarations", () => {
  registerCSS(`.c1 { color: orange; } .c2 { color: blue; }`);

  const Styled = styled(Labelled, {
    className: { target: "style" },
    labelClassName: {
      target: false,
      nativeStyleMapping: { color: "labelColor" },
    },
  });

  const component = render(
    <Styled testID={testID} className="c1" labelClassName="c2" />,
  ).getByTestId(testID);

  expect(component.props.style).toStrictEqual({ color: "#ffa500" });
  expect(component.props.labelColor).toBe("#00f");
});

test("a target:false config emits no style prop", () => {
  registerCSS(`.c3 { color: orange; font-size: 20px; }`);

  const Styled = styled(Labelled, {
    labelClassName: {
      target: false,
      nativeStyleMapping: { color: "labelColor" },
    },
  });

  const component = render(
    <Styled testID={testID} labelClassName="c3" />,
  ).getByTestId(testID);

  expect(component.props.labelColor).toBe("#ffa500");
  expect(component.props).not.toHaveProperty("style");
});

test("two target:false configs each keep their own declarations", () => {
  registerCSS(`.c4 { color: orange; } .c5 { color: blue; }`);

  const Styled = styled(Labelled, {
    labelClassName: {
      target: false,
      nativeStyleMapping: { color: "labelColor" },
    },
    badgeClassName: {
      target: false,
      nativeStyleMapping: { color: "badgeColor" },
    },
  });

  const component = render(
    <Styled testID={testID} labelClassName="c4" badgeClassName="c5" />,
  ).getByTestId(testID);

  expect(component.props.labelColor).toBe("#ffa500");
  expect(component.props.badgeColor).toBe("#00f");
  expect(component.props).not.toHaveProperty("labelClassName");
  expect(component.props).not.toHaveProperty("badgeClassName");
});

test("declaration order does not change what either config gets", () => {
  registerCSS(
    `.c6 { color: orange; font-size: 20px; } .c7 { background-color: blue; }`,
  );

  const Styled = styled(Labelled, {
    labelClassName: {
      target: false,
      nativeStyleMapping: { color: "labelColor" },
    },
    className: { target: "style" },
  });

  const component = render(
    <Styled testID={testID} className="c7" labelClassName="c6" />,
  ).getByTestId(testID);

  expect(component.props.labelColor).toBe("#ffa500");
  expect(component.props.style).toStrictEqual({ backgroundColor: "#00f" });
  expect(component.props).not.toHaveProperty("labelClassName");
});

test("an !important declaration keeps to its own config", () => {
  registerCSS(`
    .i1 { color: orange !important; }
    .i2 { color: blue !important; font-size: 11px !important; }
  `);

  const Styled = styled(Labelled, {
    className: { target: "style" },
    labelClassName: {
      target: false,
      nativeStyleMapping: { color: "labelColor" },
    },
  });

  const component = render(
    <Styled testID={testID} className="i1" labelClassName="i2" />,
  ).getByTestId(testID);

  expect(component.props.style).toStrictEqual({ color: "#ffa500" });
  expect(component.props.labelColor).toBe("#00f");
});

test("a declaration no mapping entry names is dropped, not moved into style", () => {
  registerCSS(`.d1 { transform: translateX(10px); color: orange; }`);

  const Mapped = styled(Labelled, {
    labelClassName: {
      target: false,
      nativeStyleMapping: { color: "labelColor" },
    },
  });
  const Shorthand = styled(Labelled, { labelClassName: false });

  const mapped = render(
    <Mapped testID={testID} labelClassName="d1" />,
  ).getByTestId(testID);
  expect(mapped.props.labelColor).toBe("#ffa500");
  expect(mapped.props).not.toHaveProperty("style");

  const shorthand = render(
    <Shorthand testID="shorthand" {...{ labelClassName: "d1" }} />,
  ).getByTestId("shorthand");
  expect(shorthand.props).not.toHaveProperty("style");
});

test("a target:false mapping on an image with object-fit holds on every render", () => {
  registerCSS(
    `.contain { object-fit: contain; width: 10px; } .tint { color: red; }`,
  );
  const TintedImage = styled(RNImage, {
    tintClassName: {
      target: false,
      nativeStyleMapping: { color: "tintColor" },
    },
    className: "style",
  });
  const element = () => (
    <TintedImage
      testID={testID}
      source={{ uri: "test-image" }}
      className="contain"
      tintClassName="tint"
    />
  );

  render(element());
  for (let round = 0; round < 3; round++) {
    const image = screen.getByTestId(testID);
    expect(image.props.tintColor).toBe("#f00");
    expect(StyleSheet.flatten(image.props.style)).toEqual({
      width: 10,
      objectFit: "contain",
    });
    screen.rerender(element());
  }
});

test("a target:false mapping after a style config leaves style alone on every render", () => {
  registerCSS(`.base { font-size: 12px; } .selection { color: red; }`);
  const SelectableText = styled(RNText, {
    className: "style",
    selectionClassName: {
      target: false,
      nativeStyleMapping: { color: "selectionColor" },
    },
  });
  const element = () => (
    <SelectableText
      testID={testID}
      className="base"
      selectionClassName="selection"
    />
  );

  render(element());
  for (let round = 0; round < 3; round++) {
    const text = screen.getByTestId(testID);
    expect(text.props.selectionColor).toBe("#f00");
    expect(text.props.style).toStrictEqual({ fontSize: 12 });
    screen.rerender(element());
  }
});

test("a mapping into an earlier config's target keeps its value on every render", () => {
  registerCSS(`.faded { opacity: 0.5; } .label { color: blue; }`);
  const Bordered = styled(Labelled, {
    className: "style",
    labelClassName: {
      target: false,
      nativeStyleMapping: { color: "style.borderColor" },
    },
  });
  const element = () => (
    <Bordered testID={testID} className="faded" labelClassName="label" />
  );

  render(element());
  for (let round = 0; round < 3; round++) {
    expect(screen.getByTestId(testID).props.style).toStrictEqual({
      opacity: 0.5,
      borderColor: "#00f",
    });
    screen.rerender(element());
  }
});

test("a target:false mapping into style keeps its value where no inline style meets it", () => {
  registerCSS(`.label { color: blue; }`);
  const Bordered = styled(Labelled, {
    labelClassName: {
      target: false,
      nativeStyleMapping: { color: "style.borderColor" },
    },
  });

  render(<Bordered testID={testID} labelClassName="label" />);

  expect(screen.getByTestId(testID).props.style).toStrictEqual({
    borderColor: "#00f",
  });
});

test("a mapping builds its props once while the classes stay the same", () => {
  registerCSS(`.c10 { color: orange; opacity: 0.5; } .c11 { color: blue; }`);
  let renders = 0;
  const CountedLabelled = memo((props: LabelledProps) => {
    renders++;
    return <View {...props} />;
  });
  const Styled = styled(CountedLabelled, {
    className: { target: "style", nativeStyleMapping: { color: "labelColor" } },
    borderClassName: {
      target: false,
      nativeStyleMapping: { color: "style.borderColor" },
    },
  });
  const element = () => (
    <Styled testID={testID} className="c10" borderClassName="c11" />
  );

  render(element());
  screen.rerender(element());
  screen.rerender(element());

  expect(renders).toBe(1);
  expect(screen.getByTestId(testID).props).toMatchObject({
    labelColor: "#ffa500",
    style: { opacity: 0.5, borderColor: "#00f" },
  });
});

test("a target:false config follows its class as it is set, removed and set again", () => {
  registerCSS(`.c8 { background-color: blue; } .c9 { color: orange; }`);
  const Styled = styled(Labelled, {
    className: "style",
    labelClassName: {
      target: false,
      nativeStyleMapping: { color: "labelColor" },
    },
  });

  render(<Styled testID={testID} className="c8" />);
  for (const [labelClassName, labelColor] of [
    ["c9", "#ffa500"],
    [undefined, undefined],
    ["c9", "#ffa500"],
  ] as const) {
    screen.rerender(
      <Styled testID={testID} className="c8" labelClassName={labelClassName} />,
    );
    const component = screen.getByTestId(testID);
    expect(component.props.labelColor).toBe(labelColor);
    expect(component.props.style).toStrictEqual({ backgroundColor: "#00f" });
  }
});

// docs/v5-engine-contracts.md: target: false discards unmapped compiled styles while retaining original inline styles
test("a target:false class's declarations that name their own props stay under it on an Image", () => {
  registerCSS(`.tint { color: red; object-fit: cover; opacity: 0.5; }`);
  const TintedImage = styled(RNImage, {
    tintClassName: {
      target: false,
      nativeStyleMapping: { color: "tintColor" },
    },
  });

  render(
    <TintedImage
      testID={testID}
      source={{ uri: "test-image" }}
      tintClassName="tint"
    />,
  );
  const image = screen.getByTestId(testID);

  expect(image.props.tintColor).toBe("#f00");
  expect(image.props.style).toBeUndefined();
});

test.each([
  ["drops them unmapped", { color: "selectionColor" }, {}],
  [
    "maps one it names",
    { color: "selectionColor", cursorColor: true },
    { cursorColor: "#008000" },
  ],
] as const)(
  "a target:false class's declarations that name their own props stay under it on a TextInput, and the mapping %s",
  (_, nativeStyleMapping, expected) => {
    registerCSS(
      `.label { color: red; caret-color: green; -webkit-line-clamp: 2; }`,
    );
    const LabelledInput = styled(RNTextInput, {
      labelClassName: { target: false, nativeStyleMapping },
    });

    render(<LabelledInput testID={testID} labelClassName="label" />);
    const { selectionColor, cursorColor, numberOfLines } =
      screen.getByTestId(testID).props;

    expect({ selectionColor, cursorColor, numberOfLines }).toStrictEqual({
      selectionColor: "#f00",
      cursorColor: undefined,
      numberOfLines: undefined,
      ...expected,
    });
  },
);
