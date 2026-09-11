import { act, render, screen } from "@testing-library/react-native";
import { VariableContextProvider } from "react-native-css";
import { compile } from "react-native-css/compiler";
import { View } from "react-native-css/components/View";
import { registerCSS } from "react-native-css/jest";
import {
  rootVariables,
  StyleCollection,
  universalVariables,
} from "react-native-css/native-internal";

test("universal variables do not overwrite the root variable store", () => {
  registerCSS(
    `:root { --audit-universal-store: 10px; } * { --audit-universal-store: 20px; }`,
    { inlineVariables: false },
  );
  expect(rootVariables("audit-universal-store").get()).toBe(10);
  expect(universalVariables("audit-universal-store").get()).toBe(20);
});

test("a universal declaration overrides an inherited class variable", () => {
  registerCSS(
    `
    * { --audit-universal-parent: 20px; }
    .parent { --audit-universal-parent: 40px; }
    .child { width: var(--audit-universal-parent); }
  `,
    { inlineVariables: false },
  );
  render(
    <View className="parent">
      <View testID="child" className="child" />
    </View>,
  );
  expect(screen.getByTestId("child").props.style).toStrictEqual({ width: 20 });
});

test("a class declaration overrides a universal declaration", () => {
  registerCSS(
    `
    * { --audit-universal-local: 20px; }
    .child { --audit-universal-local: 60px; width: var(--audit-universal-local); }
  `,
    { inlineVariables: false },
  );
  render(<View testID="child" className="child" />);
  expect(screen.getByTestId("child").props.style).toStrictEqual({ width: 60 });
});

test("a universal declaration overrides a variable inherited from a provider", () => {
  registerCSS(
    `
    * { --audit-universal-provider: 20px; }
    .child { width: var(--audit-universal-provider); }
  `,
    { inlineVariables: false },
  );
  render(
    <VariableContextProvider value={{ "--audit-universal-provider": 40 }}>
      <View testID="child" className="child" />
    </VariableContextProvider>,
  );
  expect(screen.getByTestId("child").props.style).toStrictEqual({ width: 20 });
});

test("mounted universal variable consumers update and restore without changing the root", () => {
  registerCSS(
    `
    :root { --audit-universal-update: 10px; }
    * { --audit-universal-update: 20px; }
    .child { width: var(--audit-universal-update); }
  `,
    { inlineVariables: false },
  );
  render(<View testID="child" className="child" />);
  expect(screen.getByTestId("child").props.style).toStrictEqual({ width: 20 });
  act(() => {
    StyleCollection.inject(
      compile(`* { --audit-universal-update: 30px; }`, {
        inlineVariables: false,
      }).stylesheet(),
    );
  });
  expect(screen.getByTestId("child").props.style).toStrictEqual({ width: 30 });
  act(() => {
    StyleCollection.inject(
      compile(`* { --audit-universal-update: 20px; }`, {
        inlineVariables: false,
      }).stylesheet(),
    );
  });
  expect(screen.getByTestId("child").props.style).toStrictEqual({ width: 20 });
  expect(rootVariables("audit-universal-update").get()).toBe(10);
});
