import type { ComponentType } from "react";

import { render } from "@testing-library/react-native";
import { compile } from "react-native-css/compiler";
import * as StyledRNGH from "react-native-css/components/react-native-gesture-handler";
import { View } from "react-native-css/components/View";
import { registerCSS, testID } from "react-native-css/jest";
import * as RNGH from "react-native-gesture-handler";

import {
  deriveReDeclared,
  flattenStyles,
  requiredProps,
  withoutFabric,
} from "../_gesture-handler";

withoutFabric();

// The compiler emits the same declaration whichever component consumes it, so the interop is a runtime mapping

const styledExports = StyledRNGH as unknown as Record<string, unknown>;
const gestureHandlerExports = RNGH as unknown as Record<string, unknown>;

const reDeclared = deriveReDeclared(styledExports, gestureHandlerExports);

const CSS = `.w-13 { width: 13px; }`;

/** The one artifact every consumer below is driven from. */
const ARTIFACT = {
  s: [["w-13", [{ s: [1, 1], d: [{ width: 13 }] }]]],
};

function renderWith(
  component: unknown,
  props: Record<string, unknown>,
): unknown {
  const Component = component as ComponentType<Record<string, unknown>>;

  return render(<Component testID={testID} {...props} />).toJSON();
}

test("the artifact is a function of the CSS alone", () => {
  expect(compile(CSS).stylesheet()).toStrictEqual(ARTIFACT);

  // `registerCSS` is the same compile, so the runtime halves below read these bytes.
  expect(registerCSS(CSS).stylesheet()).toStrictEqual(ARTIFACT);
});

test("the declaration carries a style object, not a prop target", () => {
  const retargeted = compile(
    `.w-13 { @nativeMapping myTarget; width: 13px; }`,
  ).stylesheet().s?.[0]?.[1];

  expect(compile(CSS).stylesheet().s?.[0]?.[1]).toStrictEqual([
    { s: [1, 1], d: [{ width: 13 }] },
  ]);
  expect(retargeted).toStrictEqual([{ s: [1, 1], d: [[13, ["myTarget"]]] }]);
});

test("the census the two runtime halves are generated from is non-empty", () => {
  expect(reDeclared.length).toBeGreaterThan(0);
});

type Consumer = [
  label: string,
  component: unknown,
  extra: Record<string, unknown>,
];

/** One react-native primitive, then every gesture-handler member the wrapper re-declares. */
const consumers: Consumer[] = [
  ["react-native View", View, {}],
  ...reDeclared.map<Consumer>((name) => [
    `gesture-handler ${name}`,
    styledExports[name],
    requiredProps[name] ?? {},
  ]),
];

describe.each(consumers)("%s", (_label, component, extra) => {
  test("resolves the one artifact into a rendered style", () => {
    registerCSS(CSS);

    expect(
      flattenStyles(renderWith(component, { className: "w-13", ...extra })),
    ).toContainEqual(expect.objectContaining({ width: 13 }));
  });
});

describe.each(reDeclared)("%s", (name) => {
  test("the unwrapped twin leaves the same artifact unresolved", () => {
    registerCSS(CSS);

    const extra = requiredProps[name] ?? {};

    expect(
      flattenStyles(
        renderWith(styledExports[name], { className: "w-13", ...extra }),
      ),
    ).toContainEqual(expect.objectContaining({ width: 13 }));

    expect(
      flattenStyles(
        renderWith(gestureHandlerExports[name], {
          className: "w-13",
          ...extra,
        }),
      ),
    ).not.toContainEqual(expect.objectContaining({ width: 13 }));
  });
});
