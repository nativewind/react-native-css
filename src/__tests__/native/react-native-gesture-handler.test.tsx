import type { ComponentType } from "react";

import { render } from "@testing-library/react-native";
import * as StyledRNGH from "react-native-css/components/react-native-gesture-handler";
import { registerCSS, testID } from "react-native-css/jest";
import * as RNGH from "react-native-gesture-handler";

interface RenderedNode {
  props: Record<string, unknown>;
  children: RenderedNode[] | null;
}

function collectProps(node: unknown): Record<string, unknown>[] {
  if (node === null || typeof node !== "object") {
    return [];
  }

  if (Array.isArray(node)) {
    return node.flatMap((child) => collectProps(child));
  }

  const { props, children } = node as RenderedNode;

  return [props, ...collectProps(children)];
}

/**
 * Every style object in the tree, at any array depth. The merge nests — a Pressable
 * carrying both `className` and `style` renders `[{}, [{…}, {…}]]` — so flattening a
 * single level would report an absence that is really a depth.
 */
function flattenStyles(node: unknown): Record<string, unknown>[] {
  const collect = (style: unknown): Record<string, unknown>[] => {
    if (Array.isArray(style)) {
      return style.flatMap((entry) => collect(entry));
    }

    return style !== null && typeof style === "object"
      ? [style as Record<string, unknown>]
      : [];
  };

  return collectProps(node).flatMap((props) => collect(props.style));
}

const styledExports = StyledRNGH as unknown as Record<string, unknown>;
const gestureHandlerExports = RNGH as unknown as Record<string, unknown>;

/**
 * Derived from the module, not restated: a member this wrapper re-declares is one whose
 * export is no longer the one `export *` would have provided. Every case below is
 * generated from this, so a sixth re-declaration is covered the moment it lands.
 */
const reDeclared: string[] = Object.keys(styledExports)
  .filter((name) => styledExports[name] !== gestureHandlerExports[name])
  .sort();

/**
 * The exclusion register, executable. Every remaining gesture-handler export sits in one
 * of these groups with its reason, so a member can be neither re-declared nor excluded
 * only by failing the accounting test below — which is how `PureNativeButton`, a sixth
 * member of the button family, went unnoticed.
 */
const notAComponent = [
  "Directions",
  "Gesture",
  "GestureDetector",
  "GestureHandlerRootView",
  "HoverEffect",
  "MouseButton",
  "PointerType",
  "State",
  "createNativeWrapper",
  "enableExperimentalWebImplementation",
  "enableLegacyWebImplementation",
  "gestureHandlerRootHOC",
];

/** Handlers wrap a child; they render no view of their own for a style to land on. */
const gestureHandlers = [
  "FlingGestureHandler",
  "ForceTouchGestureHandler",
  "LongPressGestureHandler",
  "NativeViewGestureHandler",
  "PanGestureHandler",
  "PinchGestureHandler",
  "RotationGestureHandler",
  "TapGestureHandler",
];

/** Reached by the `react-native` rewrite already — see the rewrite test alongside this. */
const reachedByTheRewrite = [
  "FlatList",
  "ScrollView",
  "Switch",
  "Text",
  "TextInput",
];

/** className is dropped, and gesture-handler marks every one `@deprecated`. */
const deprecatedByGestureHandler = [
  "DrawerLayout",
  "Swipeable",
  "TouchableHighlight",
  "TouchableNativeFeedback",
  "TouchableOpacity",
  "TouchableWithoutFeedback",
];

/** className is dropped, and no test at this tier can observe a fix — see below. */
const unobservable = ["RefreshControl"];

/** Props a component will not render at all without. */
const requiredProps: Record<string, Record<string, unknown>> = {
  DrawerLayout: { renderNavigationView: () => null },
  DrawerLayoutAndroid: { renderNavigationView: () => null },
};

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
    ...gestureHandlers,
    ...reachedByTheRewrite,
    ...deprecatedByGestureHandler,
    ...unobservable,
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
  for (const name of [
    ...notAComponent,
    ...gestureHandlers,
    ...reachedByTheRewrite,
    ...deprecatedByGestureHandler,
    ...unobservable,
  ]) {
    expect(styledExports[name]).toBe(gestureHandlerExports[name]);
  }
});

describe.each(deprecatedByGestureHandler)("%s", (name) => {
  const extra = requiredProps[name] ?? {};

  test("drops className — left as-is because gesture-handler deprecates it", () => {
    // Pins the exclusion register: these are not re-declared because gesture-handler
    // marks them `@deprecated`, NOT because the rewrite reaches them. It does not —
    // `components/index.cts` has no styled twin for `TouchableNativeFeedback`, and
    // the other five are gesture-handler's own components.
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
