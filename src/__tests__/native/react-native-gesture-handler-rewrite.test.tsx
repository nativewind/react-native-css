import type { ComponentType } from "react";

import { render } from "@testing-library/react-native";
import { registerCSS, testID } from "react-native-css/jest";

import {
  collectProps,
  deprecatedByGestureHandler,
  flattenStyles,
  reachedByTheRewrite,
  requiredProps,
  withoutFabric,
} from "../_gesture-handler";

withoutFabric();

// The rewrite substitutes react-native-css/components for react-native everywhere but this package's own files
let mockRewriting = false;
jest.mock("react-native", (): Record<string, unknown> => {
  if (mockRewriting) {
    return jest.requireActual<Record<string, unknown>>("react-native");
  }

  mockRewriting = true;
  try {
    return jest.requireActual<Record<string, unknown>>(
      "react-native-css/components",
    );
  } finally {
    mockRewriting = false;
  }
});

function styledGestureHandler(): Record<string, unknown> {
  return jest.requireActual<Record<string, unknown>>(
    "react-native-css/components/react-native-gesture-handler",
  );
}

function rewrittenReactNative(): Record<string, unknown> {
  return jest.requireMock<Record<string, unknown>>("react-native");
}

function realReactNative(): Record<string, unknown> {
  return jest.requireActual<Record<string, unknown>>("react-native");
}

test("the rewrite is in effect", () => {
  expect(rewrittenReactNative().View).not.toBe(realReactNative().View);
  expect(rewrittenReactNative().Dimensions).toBe(realReactNative().Dimensions);
});

describe.each(
  reachedByTheRewrite.map((name) => [name, requiredProps[name] ?? {}] as const),
)("%s", (name, extra) => {
  test("resolves className through the rewrite, so it needs no re-declaration", () => {
    registerCSS(`.w-51 { width: 51px; }`);

    const Component = styledGestureHandler()[name] as ComponentType<
      Record<string, unknown>
    >;
    const tree = render(
      <Component testID={testID} className="w-51" {...extra} />,
    ).toJSON();

    expect(flattenStyles(tree)).toContainEqual(
      expect.objectContaining({ width: 51 }),
    );

    for (const props of collectProps(tree)) {
      expect(props).not.toHaveProperty("className");
    }
  });
});

test("ScrollView's contentContainerClassName survives the rewrite too", () => {
  registerCSS(`.w-52 { width: 52px; }`);

  const ScrollView = styledGestureHandler().ScrollView as ComponentType<
    Record<string, unknown>
  >;
  const tree = render(
    <ScrollView testID={testID} contentContainerClassName="w-52" />,
  ).toJSON();

  expect(
    collectProps(tree).map((props) => props.contentContainerStyle),
  ).toContainEqual({ width: 52 });
});

// react-native-css/components layers styled twins over only some react-native exports and re-exports the rest unstyled
const WITH_A_STYLED_TWIN = [
  "View",
  "Text",
  "ScrollView",
  "TouchableOpacity",
  "TouchableHighlight",
];
const PASSED_THROUGH_UNSTYLED = [
  "TouchableNativeFeedback",
  "DrawerLayoutAndroid",
];

describe("a rewritten name only carries className if it has a styled twin", () => {
  function hasStyledTwin(name: string): boolean {
    return rewrittenReactNative()[name] !== realReactNative()[name];
  }

  test("both verdicts are reachable, so neither group is asserting a constant", () => {
    // Reading every react-native export throws outside a native binary, so both groups are named and required to be non-empty
    expect(WITH_A_STYLED_TWIN.length).toBeGreaterThan(0);
    expect(PASSED_THROUGH_UNSTYLED.length).toBeGreaterThan(0);
  });

  test.each(WITH_A_STYLED_TWIN)("%s has a styled twin", (name) => {
    expect(hasStyledTwin(name)).toBe(true);
  });

  test.each(PASSED_THROUGH_UNSTYLED)(
    "%s is passed through unstyled — the register's missing twin",
    (name) => {
      expect(hasStyledTwin(name)).toBe(false);
    },
  );
});

test("TouchableNativeFeedback renders nothing here, so identity is the only reading", () => {
  registerCSS(`.w-53 { width: 53px; }`);

  const TouchableNativeFeedback = styledGestureHandler()
    .TouchableNativeFeedback as ComponentType<Record<string, unknown>>;

  expect(
    render(
      <TouchableNativeFeedback testID={testID} className="w-53">
        <></>
      </TouchableNativeFeedback>,
    ).toJSON(),
  ).toBeNull();
});

test("the deprecated bucket is still deprecated under the rewrite", () => {
  expect(deprecatedByGestureHandler).toContain("TouchableNativeFeedback");
  expect(deprecatedByGestureHandler.length).toBeGreaterThan(0);
});
