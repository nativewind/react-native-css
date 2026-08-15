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

// Each custom property is declared twice so the compile-time inliner cannot fold it,
// which is what puts the runtime path under test.
//
// The carrier also has a className declaring an UNRELATED variable. An element whose
// rules declare no variable at all publishes no context, so its inline vars() reach no
// descendant either way and the assertion below would hold without the property registry
// having been consulted at all
const publishesVariables = `
  .has-vars { --trigger: 1px; }
  .has-vars-too { --trigger: 2px; }
`;

test("an inline vars() non-inheriting property does not reach a descendant", () => {
  // css-properties-values-api-1: the inherit flag belongs to the REGISTRATION, not to the
  // declaration. An inline declaration wins the cascade on the element it sits on; it
  // cannot make a non-inherited property inherit. Web agrees, because vars() there is a
  // plain inline custom-property declaration handed straight to the browser
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
  // The other half of the rule: withheld from descendants, honoured on the element itself
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
  // The published object merged the inherited bag OVER the element's own, so carrying
  // any inline vars() — even one naming an unrelated variable — replaced every value
  // the element declared with its ancestor's
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
