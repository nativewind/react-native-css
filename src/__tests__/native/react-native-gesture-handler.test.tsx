import type { ComponentType, ReactElement } from "react";
import { DrawerLayoutAndroid as RNDrawerLayoutAndroid } from "react-native";

import { fireEvent, render } from "@testing-library/react-native";
import * as StyledRNGH from "react-native-css/components/react-native-gesture-handler";
import { registerCSS, testID } from "react-native-css/jest";
import * as RNGH from "react-native-gesture-handler";
import type { PressableProps } from "react-native-gesture-handler";

import {
  collectProps,
  deprecatedByGestureHandler,
  deriveExcludedComponents,
  deriveReDeclared,
  disableFabric,
  flattenStyles,
  functionPropNames,
  gestureHandlers,
  handlerUnobservable,
  notAComponent,
  reachedByTheRewrite,
  reasonedExclusions,
  requiredProps,
  unobservable,
} from "../_gesture-handler";

beforeAll(disableFabric);

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
    "GestureHandlerRootView",
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

  test("forwards the same handlers as the unwrapped component", () => {
    // The guard above compares serialized bytes, and `JSON.stringify` drops exactly the
    // props whose value is a function — so a wrapper that destructured `onPress` out and
    // forwarded the rest renders byte-identically and passes it. This is the complement:
    // the two together see the whole prop set, and neither alone does.
    const withHandler = { ...extra, onPress: () => undefined };

    expect(
      functionPropNames(renderWith(styledExports[name], withHandler)),
    ).toEqual(
      functionPropNames(renderWith(gestureHandlerExports[name], withHandler)),
    );
  });
});

/**
 * The comparison above is an equality, so it is only a measurement where both sides have
 * something in them. These are the members that render a handler at all.
 */
const handlerObservable = reDeclared.filter(
  (name) => !handlerUnobservable.includes(name),
);

test("every member the handler guard is a measurement on renders one", () => {
  expect(handlerObservable.length).toBeGreaterThan(0);
  expect(handlerUnobservable.length).toBeGreaterThan(0);

  for (const name of handlerObservable) {
    expect(
      functionPropNames(
        renderWith(styledExports[name], {
          ...(requiredProps[name] ?? {}),
          onPress: () => undefined,
        }),
      ).flat(),
    ).not.toEqual([]);
  }
});

test("DrawerLayoutAndroid renders no handler, so its case is an empty equality", () => {
  // Pins the one exclusion above. React Native's jest mock for the Android-only component
  // renders a debug placeholder and drops every prop, testID included, so the generated
  // comparison for it is `[] === []` and would pass over any wrapper at all. If the mock
  // ever forwards props, this turns red and the exclusion is retaken.
  expect(
    functionPropNames(
      renderWith(styledExports.DrawerLayoutAndroid, {
        ...requiredProps.DrawerLayoutAndroid,
        onPress: () => undefined,
      }),
    ).flat(),
  ).toEqual([]);
});

test("a press cannot stand in for the handler guard — it answers from the caller", () => {
  // The obvious closer for a swallowed handler is to fire one, and it does not work.
  // `fireEvent`'s `findEventHandler` walks `element.parent` until some element carries a
  // prop matching the event, and the JSX element the test itself wrote is on that path —
  // so a component that drops `onPress` on the floor still answers a press with the
  // caller's own callback. The swallowing component below is the mutation this guard
  // exists to catch, and the two assertions are the two verdicts on it.
  let presses = 0;

  function SwallowsOnPress({
    onPress: _onPress,
    ...rest
  }: PressableProps & { onPress: () => void }): ReactElement {
    return <RNGH.Pressable {...rest} />;
  }

  const view = render(
    <SwallowsOnPress
      testID={testID}
      onPress={() => {
        presses += 1;
      }}
    />,
  );

  fireEvent.press(view.getByTestId(testID));
  expect(presses).toBe(1);

  expect(functionPropNames(view.toJSON())).not.toEqual(
    functionPropNames(renderWith(RNGH.Pressable, { onPress: () => undefined })),
  );
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

/**
 * `GestureHandlerRootView` renders `style={style ?? styles.container}` over a private
 * `{ flex: 1 }`, so the fallback is reached only while `style` is absent — and a
 * `className: "style"` mapping is exactly a thing that makes it present. A wrapper that
 * only mapped the class would resolve the class and silently un-flex every root view
 * that carries one, collapsing the app to its content's height. The wrapper carries the
 * default itself for that reason, and these three pin the boundary the `??` draws:
 * the class does not count as a style, an inline style does.
 */
describe("GestureHandlerRootView's flex:1 default", () => {
  test("survives a className, which supplies a style where none was given", () => {
    registerCSS(`.w-95 { width: 95px; }`);

    const styles = flattenStyles(
      renderWith(StyledRNGH.GestureHandlerRootView, { className: "w-95" }),
    );

    expect(styles).toContainEqual(expect.objectContaining({ width: 95 }));
    expect(styles).toContainEqual(expect.objectContaining({ flex: 1 }));
  });

  test("yields to an inline style, exactly as the unwrapped component does", () => {
    // Not a defect being preserved out of caution: `??` is gesture-handler's own
    // documented contract for the prop, and an interop wrapper that improved on it
    // would make the styled root view behave unlike the one every other consumer
    // in the graph renders.
    const styles = flattenStyles(
      renderWith(StyledRNGH.GestureHandlerRootView, {
        style: { margin: 3 },
      }),
    );

    expect(styles).toContainEqual(expect.objectContaining({ margin: 3 }));
    expect(styles).not.toContainEqual(expect.objectContaining({ flex: 1 }));
  });

  test("yields to an inline style given beside a className", () => {
    registerCSS(`.w-96 { width: 96px; }`);

    const styles = flattenStyles(
      renderWith(StyledRNGH.GestureHandlerRootView, {
        className: "w-96",
        style: { margin: 4 },
      }),
    );

    expect(styles).toContainEqual(expect.objectContaining({ width: 96 }));
    expect(styles).toContainEqual(expect.objectContaining({ margin: 4 }));
    expect(styles).not.toContainEqual(expect.objectContaining({ flex: 1 }));
  });
});

test("re-exports the members it does not re-declare", () => {
  for (const name of [...notAComponent, ...reasonedExclusions]) {
    expect(styledExports[name]).toBe(gestureHandlerExports[name]);
  }
});

/**
 * The register says `className` is DROPPED on the members it does not re-declare.
 * Dropped and leaked are different failures and only one of them is what the register
 * claims: `PureNativeButton` — a member of the button family absent from the mappings
 * by omission — renders `{"type":"RNGestureHandlerButton","props":{"className":"pnb"}}`
 * unwrapped, putting the raw class string on a codegen'd native view.
 *
 * The census is derived from the module rather than from the reason buckets, so a
 * further omission is rendered and held to the invariant here on the commit that
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
