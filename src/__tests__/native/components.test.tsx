import {
  Button as RNButton,
  TextInput as RNTextInput,
  View as RNView,
  type ButtonProps,
  type TextInputProps,
  type ViewProps,
} from "react-native";

import { render } from "@testing-library/react-native";
import { copyComponentProperties } from "react-native-css/components/copyComponentProperties";
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

/**
 * A component with props of its own for a `target: false` config to write into.
 *
 * `nativeStyleMapping` is typed against the target component's props, so the defect below is only
 * expressible on a component that HAS the props being mapped to — which is also exactly who it
 * bites. Every shipped component is either bare-string or `{ target: "style" }`; the one exception,
 * `Button`, maps `{ color: "color" }` onto a component that ignores an unknown `style` prop.
 */
interface LabelledProps extends ViewProps {
  readonly labelColor?: string;
  readonly badgeColor?: string;
}

const Labelled = (props: LabelledProps) => <RNView {...props} />;

test("a target:false config does not take a style-target config's declarations", () => {
  // `calculateProps` writes a `target: false` config's declarations into `normal.style`, because
  // `rule.target || "style"` turns the `false` into that string, and `nativeStyleMapping` reads
  // them back out by the same hardcoded name. The pair is deliberate — the scratch space is how the
  // declarations travel — but it is not PRIVATE, so a component carrying both kinds of config puts
  // both sets in one place and each drains the other's.
  //
  // Both configs carry a `color`, so a swap is visible whichever way it goes: the style-target
  // config's orange must stay in `style`, and only the `target: false` config's blue may be
  // redistributed into `labelColor`.
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
  // Three places already say this config owns no style prop: `usePassthrough` skips it,
  // `deepMergeConfig` returns before writing a target, and web's `useCssElement` resolves a boolean
  // target to the source key instead. The shared scratch space shipped one regardless, carrying
  // whatever no mapping entry drained.
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
  // With one scratch key shared by every `target: false` config, a second one drains whatever the
  // first left. Keying the scratch on the config's own source makes that unrepresentable rather
  // than merely unlikely: a source is a mapping key, so two configs cannot share one.
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
  // The same pair as the first test with the configs declared the other way round. The swap it
  // guards against is order-independent, so a fix that only worked one way round would pass there
  // and fail here.
  //
  // `.c6` also carries a declaration NO mapping entry drains. It has nowhere to go — the config
  // asked for no style prop — so it is dropped. Before this, it rode the shared scratch out as
  // `style: { fontSize: 20 }` on a component that had declared it wanted no `style`.
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

test("the important path gets its own scratch space too", () => {
  // `getStyledProps` calls `nativeStyleMapping` twice per config — once for `normal` and once for
  // `important` — so the one changed read has two call sites and the other three tests only reach
  // the first. An `!important` declaration travels in the important object, where the same shared
  // `style` key produced the same drain.
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
  // The behaviour change this fix carries, pinned rather than left to a PR sentence. A `target:
  // false` config owns no style prop, so a declaration its mapping does not name has nowhere to go.
  // It used to ride the shared scratch out as a real `style` prop — `transform` here, which is a
  // VISIBLE effect applied to a component that declared it wanted no `style` at all.
  //
  // There is a runtime escape hatch — a dotted destination writes wherever it points, so
  // `{ color: "style.color" }` puts the declaration back. It is not asserted here because it does
  // not TYPE: `nativeStyleMapping` destinations are constrained to the component's own prop paths,
  // and no path reaches inside `style`. A typed caller therefore has no way to keep one.
  registerCSS(`.d1 { transform: translateX(10px); color: orange; }`);

  const Dropping = styled(Labelled, {
    labelClassName: {
      target: false,
      nativeStyleMapping: { color: "labelColor" },
    },
  });

  const dropped = render(
    <Dropping testID={testID} labelClassName="d1" />,
  ).getByTestId(testID);

  expect(dropped.props.labelColor).toBe("#ffa500");
  expect(dropped.props).not.toHaveProperty("style");
});
