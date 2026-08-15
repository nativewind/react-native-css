import type { ComponentType } from "react";
import { DrawerLayoutAndroid as RNDrawerLayoutAndroid } from "react-native";

import { render } from "@testing-library/react-native";
import * as StyledRNGH from "react-native-css/components/react-native-gesture-handler";
import { registerCSS, testID } from "react-native-css/jest";
import * as RNGH from "react-native-gesture-handler";

import {
  collectProps,
  deprecatedByGestureHandler,
  deriveExcludedComponents,
  deriveReDeclared,
  flattenStyles,
  gestureHandlers,
  notAComponent,
  reachedByTheRewrite,
  reasonedExclusions,
  requiredProps,
  unobservable,
} from "../_gesture-handler";

const styledExports = StyledRNGH as unknown as Record<string, unknown>;
const gestureHandlerExports = RNGH as unknown as Record<string, unknown>;

const reDeclared = deriveReDeclared(styledExports, gestureHandlerExports);
const excludedComponents = deriveExcludedComponents(
  gestureHandlerExports,
  reDeclared,
);

/** Each component gets a width no other test uses, so "the style reached the tree" is exact. */
const cases: [name: string, width: number][] = reDeclared.map((name, index) => [
  name,
  11 + index,
]);

function renderWith(
  component: unknown,
  props: Record<string, unknown>,
): unknown {
  const Component = component as ComponentType<Record<string, unknown>>;

  return render(<Component testID={testID} {...props} />).toJSON();
}

test("every gesture-handler export is either re-declared or excluded with a reason", () => {
  const accounted = new Set([
    ...reDeclared,
    ...notAComponent,
    ...reasonedExclusions,
  ]);

  expect(
    Object.keys(gestureHandlerExports).filter((name) => !accounted.has(name)),
  ).toEqual([]);

  // An empty census would generate no cases at all and every `describe.each`
  // below would silently assert nothing.
  expect(reDeclared).toEqual([
    "BaseButton",
    "BorderlessButton",
    "DrawerLayoutAndroid",
    "Pressable",
    "PureNativeButton",
    "RawButton",
    "RectButton",
  ]);
});

describe.each(cases)("%s", (name, width) => {
  const className = `w-${width}`;
  const extra = requiredProps[name] ?? {};

  test("resolves className into the rendered style", () => {
    registerCSS(`.${className} { width: ${width}px; }`);

    const tree = renderWith(styledExports[name], { className, ...extra });

    // The touchables merge their own keys into the same object, so the
    // claim is that this declaration reached the style — not that it is alone.
    expect(flattenStyles(tree)).toContainEqual(
      expect.objectContaining({ width }),
    );
  });

  test("never forwards className to a rendered element", () => {
    registerCSS(`.${className} { width: ${width}px; }`);

    const tree = renderWith(styledExports[name], { className, ...extra });

    for (const props of collectProps(tree)) {
      expect(props).not.toHaveProperty("className");
    }
  });

  test("the unwrapped component drops the declaration — the bug this closes", () => {
    registerCSS(`.${className} { width: ${width}px; }`);

    // Asserting the absence alone would pass over an empty set — `RawButton`
    // renders no `style` prop at all — and so would pass with a misspelled class,
    // a failed `registerCSS`, or a component that renders nothing. Pinning that
    // the same declaration DOES reach the re-declared twin is what makes the
    // absence a measurement.
    expect(
      flattenStyles(renderWith(styledExports[name], { className, ...extra })),
    ).toContainEqual(expect.objectContaining({ width }));

    expect(
      flattenStyles(
        renderWith(gestureHandlerExports[name], { className, ...extra }),
      ),
    ).not.toContainEqual(expect.objectContaining({ width }));
  });

  test("keeps an inline style beside the className styles", () => {
    registerCSS(`.${className} { width: ${width}px; }`);

    const height = 100 + width;
    const styles = flattenStyles(
      renderWith(styledExports[name], {
        className,
        style: { height },
        ...extra,
      }),
    );

    // The two merge into one object on the button family and into a nested array
    // on Pressable; both shapes are reachable and neither value is lost.
    expect(styles).toContainEqual(expect.objectContaining({ width }));
    expect(styles).toContainEqual(expect.objectContaining({ height }));
  });

  test("renders identically to the unwrapped component when no className is given", () => {
    // The resolver routes every gesture-handler import in the graph through this
    // module — react-navigation, react-native-screens, bottom-sheet — so the
    // no-className path has to stay byte-identical.
    expect(JSON.stringify(renderWith(styledExports[name], extra))).toBe(
      JSON.stringify(renderWith(gestureHandlerExports[name], extra)),
    );
  });
});

test("resolves a function style beside className on Pressable", () => {
  registerCSS(`.w-46 { width: 46px; }`);

  // `Pressable` calls `style({ pressed })` when it is a function. Merging className
  // into an array would leave `typeof style === "object"`, the callback would never
  // be invoked, and the raw function would reach the native component — silently
  // dropping every pressed-state style the caller wrote.
  const tree = renderWith(StyledRNGH.Pressable, {
    className: "w-46",
    style: ({ pressed }: { pressed: boolean }) => ({
      opacity: pressed ? 0.5 : 1,
    }),
  });
  const styles = flattenStyles(tree);

  expect(styles).toContainEqual(expect.objectContaining({ width: 46 }));
  expect(styles).toContainEqual(expect.objectContaining({ opacity: 1 }));

  for (const props of collectProps(tree)) {
    expect(typeof props.style).not.toBe("function");
  }
});

test("re-exports the members it does not re-declare", () => {
  for (const name of [...notAComponent, ...reasonedExclusions]) {
    expect(styledExports[name]).toBe(gestureHandlerExports[name]);
  }
});

/**
 * The register says `className` is DROPPED on the members it does not re-declare.
 * Dropped and leaked are different failures and only one of them is what the register
 * claims: `PureNativeButton` — the sixth member of the button family, absent from the
 * first five by omission — rendered `{"type":"RNGestureHandlerButton","props":
 * {"className":"pnb"}}`, putting the raw class string on a codegen'd native view.
 *
 * The census is derived from the module rather than from the reason buckets, so a
 * seventh omission is rendered and held to the invariant here on the commit that
 * introduces it, without anybody having to notice a name is missing from a list.
 */
const droppedWithoutTheRewrite = excludedComponents.filter(
  (name) => !reachedByTheRewrite.includes(name),
);

test("every census a describe.each reads is non-empty", () => {
  // A narrowed export surface, or a bucket emptied in a refactor, would generate no
  // cases at all and every block below would silently assert nothing.
  expect(reDeclared.length).toBeGreaterThan(0);
  expect(excludedComponents.length).toBeGreaterThan(0);
  expect(droppedWithoutTheRewrite.length).toBeGreaterThan(0);
  expect(reachedByTheRewrite.length).toBeGreaterThan(0);
  expect(gestureHandlers.length).toBeGreaterThan(0);
  expect(deprecatedByGestureHandler.length).toBeGreaterThan(0);
  expect(unobservable.length).toBeGreaterThan(0);
});

describe.each(droppedWithoutTheRewrite)("%s", (name) => {
  test("drops className rather than leaking it onto a rendered element", () => {
    registerCSS(`.w-93 { width: 93px; }`);

    const Component = styledExports[name] as ComponentType<
      Record<string, unknown>
    >;
    const tree = render(
      <Component
        testID={testID}
        className="w-93"
        {...(requiredProps[name] ?? {})}
      >
        <RNGH.Text>child</RNGH.Text>
      </Component>,
    ).toJSON();

    for (const props of collectProps(tree)) {
      expect(props).not.toHaveProperty("className");
    }
  });
});

describe.each(deprecatedByGestureHandler)("%s", (name) => {
  const extra = requiredProps[name] ?? {};

  test("drops className — left as-is because gesture-handler deprecates it", () => {
    // Pins the exclusion register: these are not re-declared because gesture-handler
    // marks them `@deprecated`, NOT because the rewrite reaches them. It does not —
    // `components/index.cts` has no styled twin for `TouchableNativeFeedback`, and
    // the other five are gesture-handler's own components. The rewrite suite pins
    // that missing twin by object identity.
    registerCSS(`.w-91 { width: 91px; }`);

    const Component = styledExports[name] as ComponentType<
      Record<string, unknown>
    >;
    const tree = render(
      <Component testID={testID} className="w-91" {...extra}>
        <RNGH.Text>child</RNGH.Text>
      </Component>,
    ).toJSON();

    expect(flattenStyles(tree)).not.toContainEqual(
      expect.objectContaining({ width: 91 }),
    );
  });
});

/**
 * The other half of the register, and the reason the rewrite suite is not a
 * restatement of this one: WITHOUT the rewrite these five put the raw class string
 * on the element, exactly as `PureNativeButton` did. They are excluded because the
 * rewrite substitutes a styled react-native primitive underneath them, so what makes
 * the exclusion true is a thing this file cannot see — measured here as the failure
 * it becomes when that substitution is absent.
 */
describe.each(reachedByTheRewrite)("%s", (name) => {
  test("leaks className without the rewrite, which is what the rewrite is for", () => {
    registerCSS(`.w-94 { width: 94px; }`);

    const Component = styledExports[name] as ComponentType<
      Record<string, unknown>
    >;
    const tree = render(
      <Component
        testID={testID}
        className="w-94"
        {...(requiredProps[name] ?? {})}
      />,
    ).toJSON();

    expect(
      collectProps(tree).filter((props) => Object.hasOwn(props, "className")),
    ).not.toEqual([]);
  });
});

test("gesture-handler's DrawerLayoutAndroid is its own component, not a re-export", () => {
  // The exclusion this replaces read "components/index.cts re-exports these straight
  // from react-native, so there is no styled twin for them to inherit from" — which
  // assumed gesture-handler hands back react-native's component. It wraps it in
  // `createNativeWrapper` instead, so the rewrite never sees a `react-native`
  // specifier here at all and the class was dropped on a component nothing reached.
  expect(gestureHandlerExports.DrawerLayoutAndroid).not.toBe(
    RNDrawerLayoutAndroid,
  );
});

test("RefreshControl carries no props a test at this tier could read", () => {
  // React Native's own jest mock renders `<RCTRefreshControl />` and drops every
  // prop, so no test here can watch a style reach it — react-native-css's own
  // components included. This is why the register excludes it rather than mapping
  // it; if the mock ever forwards props, this turns red and the decision is retaken.
  registerCSS(`.w-92 { width: 92px; }`);

  const tree = renderWith(StyledRNGH.RefreshControl, {
    className: "w-92",
    refreshing: false,
  });

  expect(collectProps(tree)).toEqual([{}]);
});
