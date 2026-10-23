/* eslint-disable @typescript-eslint/no-deprecated */
import { render, screen } from "@testing-library/react-native";
import { View } from "react-native-css/components/View";
import { registerCSS, testID } from "react-native-css/jest";
import { vars } from "react-native-css/runtime";

test("vars", () => {
  registerCSS(
    `.my-class {
        color: var(--color);
      }`,
  );

  render(
    <View
      testID={testID}
      className="my-class"
      style={vars({ color: "red" })}
    />,
  );

  const element = screen.getByTestId(testID);
  expect(element.props.style).toMatchObject({
    color: "red",
  });

  screen.rerender(
    <View
      testID={testID}
      className="my-class"
      style={vars({ color: "blue" })}
    />,
  );

  expect(element.props.style).toMatchObject({
    color: "blue",
  });
});

const parentTestID = "parent";

const registration = `
  @property --my-var {
    syntax: "<length>";
    inherits: false;
    initial-value: 0px;
  }
`;

const inheritingRegistration = `
  @property --my-var {
    syntax: "<length>";
    inherits: true;
    initial-value: 0px;
  }
`;

// An element whose rules declare no variable publishes no context, so each carrier declares an unrelated one, twice to escape inlining
const publishesVariables = `
  .has-vars { --trigger: 1px; }
  .has-vars-too { --trigger: 2px; }
`;

test("an inline vars() non-inheriting property does not reach a descendant", () => {
  registerCSS(`
    ${registration}
    ${publishesVariables}
    .parent { --my-var: 1px; }
    .other { --my-var: 2px; }
    .child { width: var(--my-var); }
  `);

  render(
    <View
      testID={parentTestID}
      className="has-vars"
      style={vars({ "--my-var": 10 })}
    >
      <View testID={testID} className="child" />
    </View>,
  );

  expect(screen.getByTestId(testID).props.style).toStrictEqual({ width: 0 });
});

test("an inline vars() non-inheriting property still applies to the element carrying it", () => {
  registerCSS(`
    ${registration}
    ${publishesVariables}
    .parent { --my-var: 1px; }
    .other { --my-var: 2px; }
    .self { width: var(--my-var); }
  `);

  render(
    <View
      testID={testID}
      className="self has-vars"
      style={vars({ "--my-var": 10 })}
    />,
  );

  expect(screen.getByTestId(testID).props.style).toStrictEqual({ width: 10 });
});

test("an inline vars() inheriting property still reaches a descendant", () => {
  registerCSS(`
    ${inheritingRegistration}
    ${publishesVariables}
    .parent { --my-var: 1px; }
    .other { --my-var: 2px; }
    .child { width: var(--my-var); }
  `);

  render(
    <View
      testID={parentTestID}
      className="has-vars"
      style={vars({ "--my-var": 10 })}
    >
      <View testID={testID} className="child" />
    </View>,
  );

  expect(screen.getByTestId(testID).props.style).toStrictEqual({ width: 10 });
});

test("an inline vars() does not hand an ancestor's variable to the subtree", () => {
  registerCSS(`
    .ancestor { --shared: 1px; }
    .ancestor-too { --shared: 2px; }
    .middle { --shared: 50px; }
    .middle-too { --shared: 60px; }
    .child { width: var(--shared); }
  `);

  render(
    <View className="ancestor">
      <View className="middle" style={vars({ "--unrelated": 7 })}>
        <View testID={testID} className="child" />
      </View>
    </View>,
  );

  expect(screen.getByTestId(testID).props.style).toStrictEqual({ width: 50 });
});

test("an inline vars() unregistered property still reaches a descendant", () => {
  registerCSS(`
    ${publishesVariables}
    .parent { --my-var: 1px; }
    .other { --my-var: 2px; }
    .child { width: var(--my-var); }
  `);

  render(
    <View
      testID={parentTestID}
      className="has-vars"
      style={vars({ "--my-var": 10 })}
    >
      <View testID={testID} className="child" />
    </View>,
  );

  expect(screen.getByTestId(testID).props.style).toStrictEqual({ width: 10 });
});
