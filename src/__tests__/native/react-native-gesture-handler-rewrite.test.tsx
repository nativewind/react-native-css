import type { ComponentType } from "react";

import { render } from "@testing-library/react-native";
import { registerCSS, testID } from "react-native-css/jest";

import {
  collectProps,
  deprecatedByGestureHandler,
  disableFabric,
  flattenStyles,
  reachedByTheRewrite,
  requiredProps,
} from "../_gesture-handler";

beforeAll(disableFabric);

/**
 * `nativeResolver` rewrites every `react-native` import outside this package to
 * `react-native-css/components` — react-native's own exports with the styled
 * components layered over them — and leaves this package's own files alone
 * (`isFromThisModule`), so the styled components themselves are built against
 * the real react-native. The re-entrancy flag below is that second half.
 *
 * Without it these five drop `className` outright, which is why the sibling
 * suite's object-identity assertions cannot stand in for this file: identity is
 * what `export *` guarantees by construction, and says nothing about whether the
 * re-export reaches a pixel.
 */
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
  // Every assertion below is vacuous if `react-native` resolves to itself here,
  // and the whole file would pass while measuring nothing.
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

/**
 * The rewrite substitutes `react-native-css/components` for `react-native`, but that
 * module layers a styled twin over only SOME of react-native's exports and re-exports
 * the rest untouched (`components/index.cts`). So "the rewrite reaches it" and "the
 * class survives" are different claims, and the register once conflated them:
 * `TouchableNativeFeedback` was excluded as gesture-handler's own only on Android,
 * "elsewhere it re-exports React Native's, which the rewrite reaches". The rewrite
 * does reach the specifier — and hands back the identical unstyled component, so the
 * class is dropped on every platform.
 */
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
    // A full walk of react-native's exports is not available to derive this from —
    // reading `DevMenu` and friends calls `TurboModuleRegistry.getEnforcing` and
    // throws outside a native binary. Naming both groups and requiring each to be
    // non-empty is what keeps the two `test.each` blocks from becoming zero cases.
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
  // React Native's own component is Android-only and returns null on this platform,
  // so an assertion that no style reached the tree would be an absence over an empty
  // set — it would pass with a misspelled class or a broken registerCSS. The claim
  // that discriminates is the identity above; this pins why.
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
  // The register's ground for these six is `@deprecated`, which the rewrite cannot
  // change. Asserting the bucket is non-empty keeps the sibling suite's generated
  // cases from silently becoming zero.
  expect(deprecatedByGestureHandler).toContain("TouchableNativeFeedback");
  expect(deprecatedByGestureHandler.length).toBeGreaterThan(0);
});
