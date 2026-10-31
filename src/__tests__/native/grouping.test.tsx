import { fireEvent, render, screen } from "@testing-library/react-native";
import { compile } from "react-native-css/compiler";
import { View } from "react-native-css/components/View";
import { registerCSS } from "react-native-css/jest";

// Verify group state at the Reanimated boundary; native motion is separate.
jest.mock("../../native/reanimated", () => ({
  animatedComponentFamily: (component: unknown) => component,
}));

const parentID = "parent";
const childID = "child";

jest.useFakeTimers();

test("groups", () => {
  registerCSS(`
    .group\\/item .my-class {
      color: red;
    }
  `);

  render(
    <View testID={parentID} className="group/item will-change-container">
      <View testID={childID} className="my-class" />
    </View>,
  );

  const component = screen.getByTestId(childID);

  expect(component.props.style).toStrictEqual({ color: "#f00" });

  screen.rerender(
    <View testID={parentID} className="will-change-container">
      <View testID={childID} className="my-class" />
    </View>,
  );

  expect(component.props.style).toStrictEqual(undefined);
});

test("group - active", () => {
  registerCSS(
    `.group\\/item:active .my-class {
      background-color: red;
    }`,
  );

  render(
    <View testID={parentID} className="group/item">
      <View testID={childID} className="my-class" />
    </View>,
  );

  const parent = screen.getByTestId(parentID);
  const child = screen.getByTestId(childID);

  expect(child.props.style).toStrictEqual(undefined);

  fireEvent(parent, "pressIn");

  expect(child.props.style).toStrictEqual({ backgroundColor: "#f00" });
});

test("group - active (animated) supplies changed and restored transition targets", () => {
  registerCSS(`.my-class { color: black; transition: color 1s linear; }
    .group:active .my-class { color: red; }`);
  render(
    <View testID={parentID} className="group">
      <View testID={childID} className="my-class" />
    </View>,
  );
  const expectStyle = (color: string) => {
    expect(screen.getByTestId(childID).props.style).toMatchObject({
      color,
      transitionProperty: ["color"],
      transitionDuration: [1000],
    });
  };
  expectStyle("#000");
  fireEvent(screen.getByTestId(parentID), "pressIn");
  expectStyle("#f00");
  fireEvent(screen.getByTestId(parentID), "pressOut");
  expectStyle("#000");
});

test("a rule nested in a descendant selector applies to that selector's subject", () => {
  registerCSS(
    `.group .x { color: red; @media (min-width: 0px) { color: blue; } }`,
  );

  render(
    <View testID={parentID} className="group">
      <View testID={childID} className="x" />
    </View>,
  );

  expect(screen.getByTestId(childID).props.style).toStrictEqual({
    color: "#00f",
  });
  expect(screen.getByTestId(parentID).props.style).toStrictEqual(undefined);
});

test("group selector", () => {
  registerCSS(
    `.my-a.my-b .my-class {
      color: red;
    }`,
  );

  const { rerender } = render(
    <View className="my-a my-b">
      <View testID={childID} className="my-class" />
    </View>,
  );

  const child = screen.getByTestId(childID);

  expect(child.props.style).toStrictEqual({ color: "#f00" });

  rerender(
    <View className="my-b">
      <View testID={childID} className="my-class" />
    </View>,
  );

  expect(child.props.style).toStrictEqual(undefined);
});

const RED = { color: "#f00" };
const CHAIN_CSS = `.outer .inner .subject { color: red; }`;

test("a chain compiles outermost first, each ancestor class registering a container", () => {
  const stylesheet = compile(CHAIN_CSS).stylesheet();
  const rule = (name: string) =>
    stylesheet.s?.find(([className]) => className === name)?.[1][0];

  expect(rule("subject")?.cq).toStrictEqual([
    { n: "g:outer" },
    { n: "g:inner" },
  ]);
  expect(rule("outer")?.c).toStrictEqual(["g:outer"]);
  expect(rule("inner")?.c).toStrictEqual(["g:inner"]);
});

test("a chain applies when its ancestors nest in the order it names, with anything between", () => {
  registerCSS(CHAIN_CSS);

  render(
    <>
      <View className="outer">
        <View className="inner">
          <View testID="adjacent" className="subject" />
        </View>
      </View>
      <View className="outer">
        <View>
          <View className="inner">
            <View>
              <View testID="intervening" className="subject" />
            </View>
          </View>
        </View>
      </View>
    </>,
  );

  expect(screen.getByTestId("adjacent")).toHaveStyle(RED);
  expect(screen.getByTestId("intervening")).toHaveStyle(RED);
});

test("a chain does not apply to its ancestors nested the other way round, side by side, or on one element", () => {
  registerCSS(CHAIN_CSS);

  render(
    <>
      <View className="inner">
        <View className="outer">
          <View testID="reversed" className="subject" />
        </View>
      </View>
      <View className="inner" />
      <View className="outer">
        <View testID="siblings" className="subject" />
      </View>
      <View className="outer inner">
        <View testID="one-element" className="subject" />
      </View>
    </>,
  );

  expect(screen.getByTestId("reversed").props.style).toStrictEqual(undefined);
  expect(screen.getByTestId("siblings").props.style).toStrictEqual(undefined);
  expect(screen.getByTestId("one-element").props.style).toStrictEqual(
    undefined,
  );
});

test("a three-deep chain answers its order the same way", () => {
  registerCSS(`.a .b .c .subject { color: red; }`);

  render(
    <>
      <View className="a">
        <View className="b">
          <View className="c">
            <View testID="ordered" className="subject" />
          </View>
        </View>
      </View>
      <View className="a">
        <View className="c">
          <View className="b">
            <View testID="swapped" className="subject" />
          </View>
        </View>
      </View>
    </>,
  );

  expect(screen.getByTestId("ordered")).toHaveStyle(RED);
  expect(screen.getByTestId("swapped").props.style).toStrictEqual(undefined);
});

test("each compound's interaction reads its own container", () => {
  registerCSS(`
    .outer .inner:hover .inner-hover { color: red; }
    .outer:hover .inner .outer-hover { color: red; }
  `);

  render(
    <View testID="outer" className="outer">
      <View testID="inner" className="inner">
        <View testID="inner-hover" className="inner-hover" />
        <View testID="outer-hover" className="outer-hover" />
      </View>
    </View>,
  );

  fireEvent(screen.getByTestId("inner"), "hoverIn");
  expect(screen.getByTestId("inner-hover")).toHaveStyle(RED);
  expect(screen.getByTestId("outer-hover").props.style).toStrictEqual(
    undefined,
  );

  fireEvent(screen.getByTestId("inner"), "hoverOut");
  fireEvent(screen.getByTestId("outer"), "hoverIn");
  expect(screen.getByTestId("inner-hover").props.style).toStrictEqual(
    undefined,
  );
  expect(screen.getByTestId("outer-hover")).toHaveStyle(RED);
});

test("an outer container's attribute is read from that container, and re-derives when it changes", () => {
  registerCSS(`.outer[data-state="on"] .inner .subject { color: red; }`);

  const tree = (state: string) => (
    <>
      <View className="outer" {...{ dataSet: { state } }}>
        <View className="inner">
          <View testID="ordered" className="subject" />
        </View>
      </View>
      <View className="inner">
        <View className="outer" {...{ dataSet: { state } }}>
          <View testID="reversed" className="subject" />
        </View>
      </View>
    </>
  );

  render(tree("on"));
  expect(screen.getByTestId("ordered")).toHaveStyle(RED);
  expect(screen.getByTestId("reversed").props.style).toStrictEqual(undefined);

  screen.rerender(tree("off"));
  expect(screen.getByTestId("ordered").props.style).toStrictEqual(undefined);
});

test("a chain renders the same styles twice over", () => {
  registerCSS(CHAIN_CSS);

  const tree = (
    <View className="outer">
      <View className="inner">
        <View testID="subject" className="subject" />
      </View>
    </View>
  );

  render(tree);
  const first = screen.getByTestId("subject").props.style;

  screen.rerender(tree);

  expect(screen.getByTestId("subject").props.style).toStrictEqual(first);
  expect(screen.getByTestId("subject")).toHaveStyle(RED);
});
