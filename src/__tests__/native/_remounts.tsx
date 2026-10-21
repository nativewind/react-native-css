import { useEffect, type ComponentProps, type ReactElement } from "react";
import { StyleSheet } from "react-native";

import { render, screen } from "@testing-library/react-native";
import { ScrollView } from "react-native-css/components/ScrollView";
import { View } from "react-native-css/components/View";

export const parentID = "parent";

export const remountWarning = {
  variable: (classNames: string) =>
    `ReactNativeCss: ${classNames} added or removed a variable after the initial render. This causes the components state to be reset and all children be re-mounted. Use the className 'will-change-variable' to avoid this warning. If this was caused by sibling components being added/removed, use a 'key' prop so React can track the component correctly.`,
  container: (classNames: string) =>
    `ReactNativeCss: ${classNames} added or removed a container after the initial render. This causes the components state to be reset and all children be re-mounted. This will cause unexpected behavior. Use the className 'will-change-container' to avoid this warning. If this was caused by sibling components being added/removed, use a 'key' prop so React can track the component correctly.`,
  animation: (classNames: string) =>
    `ReactNativeCss: ${classNames} added or removed an animation after the initial render. This causes the components state to be reset and all children be re-mounted. This will cause unexpected behavior. Use the className 'will-change-animation' to avoid this warning. If this was caused by sibling components being added/removed, use a 'key' prop so React can track the component correctly.`,
  pressable: (classNames: string) =>
    `ReactNativeCss: ${classNames} added or removed a pressable state after the initial render. This causes the components state to be reset and all children be re-mounted. This will cause unexpected behavior. Use the className 'will-change-pressable' to avoid this warning. If this was caused by sibling components being added/removed, use a 'key' prop so React can track the component correctly.`,
};

export type ScrollViewProps = ComponentProps<typeof ScrollView>;

// useNativeCss swaps a View that has an onPress for a Pressable, although ViewProps declares none
export type ViewProps = ComponentProps<typeof View> & { onPress?: () => void };

export type ClassNameSource = "className" | "contentContainerClassName";

export const sources: ClassNameSource[] = [
  "className",
  "contentContainerClassName",
];

export function otherSource(source: ClassNameSource): ClassNameSource {
  return source === "className" ? "contentContainerClassName" : "className";
}

export function withClassNames(
  source: ClassNameSource,
  classNames: string,
): ScrollViewProps {
  return source === "className"
    ? { className: classNames }
    : { contentContainerClassName: classNames };
}

export function paddingOf(source: ClassNameSource) {
  const scroller = screen.getByTestId(parentID);
  const style: ScrollViewProps["style"] =
    source === "className"
      ? scroller.props.style
      : scroller.props.contentContainerStyle;

  return StyleSheet.flatten(style).padding;
}

// Counts the children's mounts, so a test observes a re-mount instead of inferring it from the warning
export function trackRemounts() {
  const log = jest.fn();
  const mounts = jest.fn();

  beforeAll(() => {
    jest.spyOn(console, "log").mockImplementation(log);
  });

  beforeEach(() => {
    log.mockClear();
    mounts.mockClear();
  });

  function MountCounter() {
    useEffect(() => {
      mounts();
    }, []);

    return null;
  }

  return {
    log,
    MountCounter,
    scrollView: (props: ScrollViewProps) => (
      <ScrollView testID={parentID} {...props}>
        <MountCounter />
      </ScrollView>
    ),
    view: (props: ViewProps) => (
      <View testID={parentID} {...props}>
        <MountCounter />
      </View>
    ),
    renderChanges: (first: ReactElement, ...rerenders: ReactElement[]) => {
      render(first);
      const mountLogs = [...log.mock.calls];

      for (const element of rerenders) {
        screen.rerender(element);
      }

      return {
        mountLogs,
        logs: log.mock.calls.slice(mountLogs.length),
        remounts: mounts.mock.calls.length - 1,
      };
    },
  };
}
