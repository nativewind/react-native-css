/**
 * Shared by the three gesture-handler suites — the two native ones and the compiler
 * one. Nothing here imports `react-native` or `react-native-gesture-handler` at module
 * scope: the rewrite suite mocks `react-native`, so a module-scope import would resolve
 * gesture-handler's own imports through the mock and quietly change what the census
 * means. Each suite hands its module objects in instead.
 */

interface RenderedNode {
  props: Record<string, unknown>;
  children: RenderedNode[] | null;
}

/**
 * `GestureHandlerRootView` calls `maybeInitializeFabric()` while rendering, which
 * reaches `RNGestureHandlerModule.install()` — a method the JS module carries only
 * inside a native binary. React Native's own jest setup defines `nativeFabricUIManager`
 * as `{}`, and `isFabric()` reads that global and nothing else, so clearing it takes
 * the branch that never touches the module. Every suite that renders the re-declared
 * census needs this, which is why it is here rather than in one of them.
 */
export function disableFabric(): void {
  Reflect.set(globalThis, "nativeFabricUIManager", undefined);
}

/** Every rendered element's props, at any depth. */
export function collectProps(node: unknown): Record<string, unknown>[] {
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
 * Every rendered element's function-valued prop names, at any depth. `JSON.stringify`
 * drops exactly the props whose value is a function, so a byte comparison of two trees
 * is blind to a wrapper that swallows a handler — and these nodes carry up to four.
 * This is the complement of what the byte comparison sees, which is what makes the two
 * together a whole guard.
 *
 * The value TYPE is the discriminator, not the name. Gesture Handler's Pressable renders
 * `testOnly_onPress={props.onPress}` unconditionally, so the KEY is present either way
 * and `Object.keys()` reports no difference at all; only the value goes `undefined`.
 */
export function functionPropNames(node: unknown): string[][] {
  return collectProps(node).map((props) =>
    Object.entries(props)
      .filter(([, value]) => typeof value === "function")
      .map(([name]) => name)
      .sort(),
  );
}

/**
 * Every style object in the tree, at any array depth. The merge nests — a Pressable
 * carrying both `className` and `style` renders `[{}, [{…}, {…}]]` — so flattening a
 * single level would report an absence that is really a depth.
 */
export function flattenStyles(node: unknown): Record<string, unknown>[] {
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

/**
 * Derived from the module, not restated: a member the wrapper re-declares is one whose
 * export is no longer the one `export *` provided. Every generated case reads this, so
 * a further re-declaration is covered the moment it lands.
 */
export function deriveReDeclared(
  styledExports: Record<string, unknown>,
  gestureHandlerExports: Record<string, unknown>,
): string[] {
  return Object.keys(styledExports)
    .filter((name) => styledExports[name] !== gestureHandlerExports[name])
    .sort();
}

/**
 * The exclusion register, executable. Every gesture-handler export sits in exactly one
 * of these groups or in the derived re-declared set, so a member can be neither
 * re-declared nor excluded only by failing the accounting test — which is how
 * `PureNativeButton`, a sixth member of the button family, went unnoticed.
 */
export const notAComponent = [
  "Directions",
  "Gesture",
  "GestureDetector",
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
export const gestureHandlers = [
  "FlingGestureHandler",
  "ForceTouchGestureHandler",
  "LongPressGestureHandler",
  "NativeViewGestureHandler",
  "PanGestureHandler",
  "PinchGestureHandler",
  "RotationGestureHandler",
  "TapGestureHandler",
];

/** Reached by the `react-native` rewrite already — see the rewrite suite. */
export const reachedByTheRewrite = [
  "FlatList",
  "ScrollView",
  "Switch",
  "Text",
  "TextInput",
];

/** className is dropped, and gesture-handler marks every one `@deprecated`. */
export const deprecatedByGestureHandler = [
  "DrawerLayout",
  "Swipeable",
  "TouchableHighlight",
  "TouchableNativeFeedback",
  "TouchableOpacity",
  "TouchableWithoutFeedback",
];

/** className is dropped, and no test at this tier can observe a fix. */
export const unobservable = ["RefreshControl"];

/** Every name the register gives a reason to, across the four component buckets. */
export const reasonedExclusions = [
  ...gestureHandlers,
  ...reachedByTheRewrite,
  ...deprecatedByGestureHandler,
  ...unobservable,
];

/**
 * Derived, not the union of the buckets above: every export that renders and is not
 * re-declared, whether or not anybody wrote a reason for it. The two differ exactly
 * when a member has been missed, and the drop invariant is generated from THIS — so
 * an unhandled component is rendered and held to the invariant rather than waiting
 * for the accounting test to notice a name is absent from a list.
 *
 * The domain is `Object.keys` over the index module, and that is the limit of what
 * deriving buys: ReanimatedDrawerLayout and ReanimatedSwipeable ship from their own
 * entry points, so they are outside it permanently and no upstream change can enrol
 * them here. Covering those two is an edit to this file, not a thing it notices.
 */
export function deriveExcludedComponents(
  gestureHandlerExports: Record<string, unknown>,
  reDeclared: string[],
): string[] {
  return Object.keys(gestureHandlerExports)
    .filter(
      (name) => !reDeclared.includes(name) && !notAComponent.includes(name),
    )
    .sort();
}

/**
 * Re-declared members that render no function-valued prop for the guard to compare, so
 * its verdict on them is an equality between two empty sets. React Native's jest mock for
 * the Android-only DrawerLayoutAndroid renders a debug placeholder `View` and forwards
 * none of its props — not `testID`, not a callback — which is the same tier limit the
 * RefreshControl exclusion stands on. Naming it is what stops the generated case reading
 * as a measurement it is not, and the pinned test beside the block is what keeps the
 * name honest.
 */
export const handlerUnobservable = ["DrawerLayoutAndroid"];

/** Props a component will not render at all without. */
export const requiredProps: Record<string, Record<string, unknown>> = {
  DrawerLayout: { renderNavigationView: () => null },
  DrawerLayoutAndroid: { renderNavigationView: () => null },
  FlatList: { data: [], renderItem: () => null },
};
