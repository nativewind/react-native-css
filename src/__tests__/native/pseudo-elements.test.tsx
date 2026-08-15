import { render, screen } from "@testing-library/react-native";
import { TextInput } from "react-native-css/components/TextInput";
import { View } from "react-native-css/components/View";
import { registerCSS, testID } from "react-native-css/jest";

const controlTestID = "control";

/**
 * Every case here renders the pseudo-element declaration beside a control that carries only
 * what the platform can express, and asserts the two are indistinguishable. That keeps the
 * expectation derived rather than a literal copied out of a passing run, and keeps it free of
 * the platform-specific values a semantic colour or a default rem would otherwise pin
 */
const propsWithoutTestID = (id: string): Record<string, unknown> => {
  const { testID: _testID, ...props } = screen.getByTestId(id).props;
  return props;
};

test("::selection { color } does not publish currentcolor to the subtree", () => {
  // declarations.ts mirrors `color` into --__rn-css-color, which every descendant reads as
  // currentColor. Scoping only `d` leaves the whole subtree painted the selection colour
  registerCSS(`
    .sel::selection { color: #ff0000; }
    .child { color: currentColor; }
  `);

  render(
    <View>
      <View className="sel">
        <View testID={testID} className="child" />
      </View>
      <View testID={controlTestID} className="child" />
    </View>,
  );

  const scoped = propsWithoutTestID(testID);

  expect(scoped).toStrictEqual(propsWithoutTestID(controlTestID));
  expect(scoped.style).not.toStrictEqual({ color: "#f00" });
});

test("::selection { font-size } does not become the element's em base", () => {
  // font-size is mirrored into --__rn-css-em, which every em on the element resolves against
  registerCSS(`
    .a::selection { font-size: 40px; }
    .a { width: 2em; }
    .control { width: 2em; }
  `);

  render(
    <View>
      <View testID={testID} className="a" />
      <View testID={controlTestID} className="control" />
    </View>,
  );

  expect(propsWithoutTestID(testID)).toStrictEqual(
    propsWithoutTestID(controlTestID),
  );
});

test("::selection { animation } does not render the host as animated", () => {
  // `a` swaps the host for an animated component. Every animation declaration is scoped away,
  // so there is nothing left for it to animate
  registerCSS(`
    .a::selection { animation: spin 1s; }
  `);

  render(
    <View>
      <View testID={testID} className="a" />
      <View testID={controlTestID} className="unstyled" />
    </View>,
  );

  expect(propsWithoutTestID(testID)).toStrictEqual(
    propsWithoutTestID(controlTestID),
  );
});

test("::selection { container-name } does not turn the host into a container", () => {
  // `c` registers the host as a named container, which adds onLayout measurement and the
  // focus/press handlers a container query needs
  registerCSS(`
    .a::selection { background-color: #ff0000; container-name: foo; }
    .control::selection { background-color: #ff0000; }
  `);

  render(
    <View>
      <View testID={testID} className="a" />
      <View testID={controlTestID} className="control" />
    </View>,
  );

  expect(propsWithoutTestID(testID)).toStrictEqual(
    propsWithoutTestID(controlTestID),
  );
});

test("::selection { background-color } still reaches selectionColor", () => {
  registerCSS(`.a::selection { background-color: #ff0000; }`);

  render(<TextInput testID={testID} className="a" />);

  expect(screen.getByTestId(testID).props).toStrictEqual({
    children: undefined,
    selectionColor: "#f00",
    style: {},
    testID,
  });
});

test("::selection { background-color: var() } still resolves an inherited variable", () => {
  // The variable lives on an ancestor, so the host only reads it because the scoped rule kept
  // its `dv` flag. Blanket-clearing the declaration-derived fields would break this
  registerCSS(`
    .parent { --x: #ff0000; }
    .a::selection { background-color: var(--x); }
  `);

  render(
    <View className="parent">
      <TextInput testID={testID} className="a" />
    </View>,
  );

  expect(screen.getByTestId(testID).props).toStrictEqual({
    children: undefined,
    selectionColor: "#f00",
    style: {},
    testID,
  });
});

test("::placeholder { color } does not publish currentcolor to the subtree", () => {
  // `color` IS the mapped declaration here, and it still mirrors into --__rn-css-color: the
  // placeholder's colour must not become the input's currentColor
  registerCSS(`
    .a::placeholder { color: #ff0000; }
    .child { color: currentColor; }
  `);

  render(
    <View>
      <TextInput className="a">
        <View testID={testID} className="child" />
      </TextInput>
      <View testID={controlTestID} className="child" />
    </View>,
  );

  expect(propsWithoutTestID(testID)).toStrictEqual(
    propsWithoutTestID(controlTestID),
  );
});
