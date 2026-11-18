// Nothing here imports react-native at module scope, since the rewrite suite mocks it

interface RenderedNode {
  props: Record<string, unknown>;
  children: RenderedNode[] | null;
}

// GestureHandlerRootView installs a native module under Fabric, so a suite runs without the jest preset's nativeFabricUIManager, and puts it back because jest's teardown reads every global, and expo's lazy fetch then loads the renderer
export function withoutFabric(): void {
  const nativeFabricUIManager: unknown = Reflect.get(
    globalThis,
    "nativeFabricUIManager",
  );

  beforeAll(() => {
    Reflect.set(globalThis, "nativeFabricUIManager", undefined);
  });

  afterAll(() => {
    Reflect.set(globalThis, "nativeFabricUIManager", nativeFabricUIManager);
  });
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

// handlerTag counts handlers as they mount, so two renders of one tree differ only there
export function serializeRender(node: unknown): string {
  return JSON.stringify(node, (key, value: unknown) =>
    key === "handlerTag" ? undefined : value,
  );
}

// JSON.stringify drops function props, so handlers are compared by the value's type; Pressable renders testOnly_onPress whether or not one was passed
export function functionPropNames(node: unknown): string[][] {
  return collectProps(node).map((props) =>
    Object.entries(props)
      .filter(([, value]) => typeof value === "function")
      .map(([name]) => name)
      .sort(),
  );
}

// The merge nests style arrays, so styles are collected at every depth
function collectStyleEntries(style: unknown): Record<string, unknown>[] {
  if (Array.isArray(style)) {
    return style.flatMap((entry) => collectStyleEntries(entry));
  }

  return style !== null && typeof style === "object"
    ? [style as Record<string, unknown>]
    : [];
}

export function flattenStyles(node: unknown): Record<string, unknown>[] {
  return collectProps(node).flatMap((props) =>
    collectStyleEntries(props.style),
  );
}

// What Yoga reads off the outermost element: its style entries merged in order, later ones winning
export function rootStyle(node: unknown): Record<string, unknown> {
  const [root] = collectProps(node);
  const merged: Record<string, unknown> = {};

  for (const entry of collectStyleEntries(root?.style)) {
    Object.assign(merged, entry);
  }

  return merged;
}

export function deriveReDeclared(
  styledExports: Record<string, unknown>,
  gestureHandlerExports: Record<string, unknown>,
): string[] {
  return Object.keys(styledExports)
    .filter((name) => styledExports[name] !== gestureHandlerExports[name])
    .sort();
}

// Every gesture-handler export is either re-declared or excluded here with its reason
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

// Derived from the module, so a component missing from every bucket is still rendered and checked
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

// React Native's jest mock for DrawerLayoutAndroid renders a placeholder that forwards no props
export const handlerUnobservable = ["DrawerLayoutAndroid"];

/** Props a component will not render at all without. */
export const requiredProps: Record<string, Record<string, unknown>> = {
  DrawerLayout: { renderNavigationView: () => null },
  DrawerLayoutAndroid: { renderNavigationView: () => null },
  FlatList: { data: [], renderItem: () => null },
};
