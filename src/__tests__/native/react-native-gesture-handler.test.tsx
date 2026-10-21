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
  flattenStyles,
  functionPropNames,
  gestureHandlers,
  handlerUnobservable,
  notAComponent,
  reachedByTheRewrite,
  reasonedExclusions,
  requiredProps,
  rootStyle,
  serializeRender,
  unobservable,
  withoutFabric,
} from "../_gesture-handler";

withoutFabric();

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

    expect(styles).toContainEqual(expect.objectContaining({ width }));
    expect(styles).toContainEqual(expect.objectContaining({ height }));
  });

  test("renders identically to the unwrapped component when no className is given", () => {
    expect(serializeRender(renderWith(styledExports[name], extra))).toBe(
      serializeRender(renderWith(gestureHandlerExports[name], extra)),
    );
  });

  test("forwards the same handlers as the unwrapped component", () => {
    const withHandler = { ...extra, onPress: () => undefined };

    expect(
      functionPropNames(renderWith(styledExports[name], withHandler)),
    ).toEqual(
      functionPropNames(renderWith(gestureHandlerExports[name], withHandler)),
    );
  });
});

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
  // fireEvent walks up to the test's own element, so a swallowed onPress still answers a press
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

// GestureHandlerRootView falls back to flex: 1 only while style is absent, and a class counts as a style only when it sizes the root itself
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
    // The ?? is gesture-handler's own contract, which the styled root view keeps
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

  test.each([
    ["grow-0", "flex-grow: 0", { flexGrow: 0 }],
    ["shrink-0", "flex-shrink: 0", { flexShrink: 0 }],
    ["basis-90", "flex-basis: 90px", { flexBasis: 90 }],
    ["flex-none", "flex: none", { flexGrow: 0, flexShrink: 0 }],
  ])(
    "yields to a className that states its own flex sizing (%s)",
    (className, declaration, sizing) => {
      registerCSS(`.${className} { ${declaration}; }`);

      const style = rootStyle(
        renderWith(StyledRNGH.GestureHandlerRootView, { className }),
      );

      expect(style).toMatchObject(sizing);
      expect(style).not.toHaveProperty("flex");
    },
  );
});

test("re-exports the members it does not re-declare", () => {
  for (const name of [...notAComponent, ...reasonedExclusions]) {
    expect(styledExports[name]).toBe(gestureHandlerExports[name]);
  }
});

const droppedWithoutTheRewrite = excludedComponents.filter(
  (name) => !reachedByTheRewrite.includes(name),
);

test("every census a describe.each reads is non-empty", () => {
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
  expect(gestureHandlerExports.DrawerLayoutAndroid).not.toBe(
    RNDrawerLayoutAndroid,
  );
});

test("RefreshControl carries no props a test at this tier could read", () => {
  // React Native's jest mock renders RCTRefreshControl without props, so no test can watch a style reach it
  registerCSS(`.w-92 { width: 92px; }`);

  const tree = renderWith(StyledRNGH.RefreshControl, {
    className: "w-92",
    refreshing: false,
  });

  expect(collectProps(tree)).toEqual([{}]);
});
