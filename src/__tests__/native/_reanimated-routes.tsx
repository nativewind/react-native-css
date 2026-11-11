import { StyleSheet } from "react-native";

import { render, screen } from "@testing-library/react-native";
import { compile } from "react-native-css/compiler";
import { View } from "react-native-css/components/View";
import { registerCSS, testID } from "react-native-css/jest";
import { StyleCollection } from "react-native-css/native";

import { animatedComponentFamily } from "../../native/reanimated";

/** As written, through a variable the compiler folds, through one the runtime keeps, and kept through the JSON a device reads. */
export const routes = ["written", "folded", "kept", "wire"] as const;

export type Route = (typeof routes)[number];

export const variableRoutes = ["folded", "kept", "wire"] as const;

/** The routes on which the runtime, not lightningcss, reads the value. */
export const runtimeRoutes = ["kept", "wire"] as const;

/** The routes on which the declaration itself holds the value's comma groups. */
export const declarationRoutes = ["written", "folded"] as const;

function registerOnRoute(
  route: Route,
  property: string,
  value: string,
  reference: string,
  declarations: string,
) {
  const css =
    route === "written"
      ? `.a { ${declarations} ${property}: ${value}; }`
      : `.a { ${declarations} --v: ${value}; ${property}: ${reference}; }`;

  switch (route) {
    case "written":
    case "folded":
      registerCSS(css);
      return;
    case "kept":
      registerCSS(css, { inlineVariables: false });
      return;
    case "wire": {
      const sheet = compile(css, { inlineVariables: false }).stylesheet();
      StyleCollection.inject(JSON.parse(JSON.stringify(sheet)) as typeof sheet);
      return;
    }
    default:
      route satisfies never;
  }
}

/**
 * Whether `.a { property: value }` hands its element to Reanimated on a route, and the style it hands over; a variable route holds `value` in `--v` and writes `reference`, after the rule's other `declarations`.
 * The calling test file mocks `../../native/reanimated` with a `jest.fn` that returns the component it is given.
 */
export function renderOnRoute(
  route: Route,
  property: string,
  value: string,
  reference = "var(--v)",
  declarations = "",
) {
  registerOnRoute(route, property, value, reference, declarations);
  jest.mocked(animatedComponentFamily).mockClear();
  render(<View testID={testID} className="a" />);

  const reached = {
    animated: jest.mocked(animatedComponentFamily).mock.calls.length > 0,
    style: (StyleSheet.flatten(screen.getByTestId(testID).props.style) ??
      {}) as Readonly<Record<string, unknown>>,
  };

  screen.unmount();
  return reached;
}
