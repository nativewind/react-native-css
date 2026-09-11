import { type StyleProp, type ViewStyle } from "react-native";

import { useCssElement } from "../../web/api";
import { assignStyle } from "../../web/assign-style";

interface Props {
  testID?: string;
  className?: string;
  style?:
    | StyleProp<ViewStyle>
    | ((state: { pressed: boolean }) => StyleProp<ViewStyle>);
  nested?: {
    child?: { style?: StyleProp<ViewStyle> };
    slots?: { style?: StyleProp<ViewStyle> }[];
  };
}
const Base = (_props: Props) => null;

test("web mapping preserves frozen caller owned nested props", () => {
  const original = Object.freeze({
    child: Object.freeze({ style: Object.freeze({ opacity: 0.5 }) }),
  });
  const props = { nested: original, className: "p-4", testID: "test" };
  const element = useCssElement(Base, props, {
    className: "nested.child.style",
  });
  expect(element.props).toEqual({
    testID: "test",
    nested: {
      child: { style: [{ opacity: 0.5 }, { $$css: true, className: "p-4" }] },
    },
  });
  expect(props).toEqual({
    nested: { child: { style: { opacity: 0.5 } } },
    className: "p-4",
    testID: "test",
  });
  expect(element.props.nested).not.toBe(original);
});

test("web mapping preserves nested arrays and unrelated entries", () => {
  const first = Object.freeze({ style: Object.freeze({ opacity: 0.5 }) });
  const second = Object.freeze({ style: Object.freeze({ width: 20 }) });
  const slots = Object.freeze([first, second]);
  const element = {
    props: assignStyle(
      { $$css: true, className: "p-4" },
      ["nested", "slots", "0", "style"],
      { nested: { slots } },
    ),
  };
  expect(Array.isArray(element.props.nested.slots)).toBe(true);
  expect(element.props.nested.slots[0].style).toEqual([
    { opacity: 0.5 },
    { $$css: true, className: "p-4" },
  ]);
  expect(element.props.nested.slots[1]).toBe(second);
  expect(slots[0]).toBe(first);
});

test("web callback styles preserve arguments and inline styles", () => {
  const callback = jest.fn((state: { pressed: boolean }) => ({
    opacity: state.pressed ? 0.5 : 1,
  }));
  const props = { style: callback, className: "p-4" };
  const element = useCssElement(Base, props, { className: "style" });
  const evaluate = element.props.style as (state: {
    pressed: boolean;
  }) => unknown;
  expect(evaluate({ pressed: true })).toEqual([
    { opacity: 0.5 },
    { $$css: true, className: "p-4" },
  ]);
  expect(callback).toHaveBeenCalledWith({ pressed: true });
  expect(props.style).toBe(callback);
});

test("web class updates and removal preserve the original inline array", () => {
  const style = [{ opacity: 0.5 }];
  for (const className of ["p-4", "p-8", undefined, "p-4"]) {
    const element = useCssElement(
      Base,
      { style, className },
      { className: "style" },
    );
    expect(element.props.style).toEqual(
      className ? [style, { $$css: true, className }] : style,
    );
    expect(style).toEqual([{ opacity: 0.5 }]);
  }
});
