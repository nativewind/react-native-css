import { Activity } from "react";

import { act, render } from "@testing-library/react-native";
import { View } from "react-native-css/components/View";
import { registerCSS, testID } from "react-native-css/jest";
import { colorScheme } from "react-native-css/runtime";

/**
 * <Activity mode="hidden"> renders children without mounting effects, so
 * conditions may change between useNativeCss's state initializer and its
 * first effect setup.
 */

function Fixture({ className }: { className: string }) {
  return <View testID={testID} className={className} />;
}

function ActivityFixture({
  hidden,
  className,
}: {
  hidden: boolean;
  className: string;
}) {
  return (
    <Activity mode={hidden ? "hidden" : "visible"}>
      <Fixture className={className} />
    </Activity>
  );
}

test("pre-rendered hidden Activity shows current styles on first show and stays reactive", () => {
  registerCSS(`
.audit-activity-prerender { color: blue; }

@media (prefers-color-scheme: dark) {
  .audit-activity-prerender { color: red; }
}
`);

  const screen = render(
    <ActivityFixture hidden className="audit-activity-prerender" />,
  );

  // Effects mount for the first time
  screen.rerender(
    <ActivityFixture hidden={false} className="audit-activity-prerender" />,
  );
  expect(screen.getByTestId(testID).props.style).toStrictEqual({
    color: "#00f",
  });

  // Subscriptions are live
  act(() => {
    colorScheme.set("dark");
  });
  expect(screen.getByTestId(testID).props.style).toStrictEqual({
    color: "#f00",
  });

  screen.unmount();
});

test("applies condition changes made while pre-rendered hidden, before first show", () => {
  registerCSS(`
.audit-activity-stale { color: blue; }

@media (prefers-color-scheme: dark) {
  .audit-activity-stale { color: red; }
}
`);

  const screen = render(
    <ActivityFixture hidden className="audit-activity-stale" />,
  );

  // Change conditions after the initializer, before effects mount
  act(() => {
    colorScheme.set("dark");
  });

  screen.rerender(
    <ActivityFixture hidden={false} className="audit-activity-stale" />,
  );

  expect(screen.getByTestId(testID).props.style).toStrictEqual({
    color: "#f00",
  });

  screen.unmount();
});

test("unrelated condition changes during the pre-render window do not force a catch-up render", () => {
  registerCSS(`
.audit-activity-unrelated { color: blue; }
`);

  // colorScheme is not a dependency, so changing it should not force a re-render
  let renders = 0;
  function CountingFixture({ className }: { className: string }) {
    renders++;
    return <View testID={testID} className={className} />;
  }

  const screen = render(
    <Activity mode="hidden">
      <CountingFixture className="audit-activity-unrelated" />
    </Activity>,
  );

  expect(renders).toBe(1);

  act(() => {
    colorScheme.set("dark");
  });

  screen.rerender(
    <Activity mode="visible">
      <CountingFixture className="audit-activity-unrelated" />
    </Activity>,
  );

  expect(screen.getByTestId(testID).props.style).toStrictEqual({
    color: "#00f",
  });

  // No extra catch-up render
  expect(renders).toBe(2);

  screen.unmount();
});

test("applies condition changes made while hidden, after a visible mount (mid-life replay)", () => {
  registerCSS(`
.audit-activity-midlife { color: blue; }

@media (prefers-color-scheme: dark) {
  .audit-activity-midlife { color: red; }
}
`);

  const screen = render(
    <ActivityFixture hidden={false} className="audit-activity-midlife" />,
  );
  expect(screen.getByTestId(testID).props.style).toStrictEqual({
    color: "#00f",
  });

  // Hiding keeps state but cleans up effects
  screen.rerender(
    <ActivityFixture hidden className="audit-activity-midlife" />,
  );

  act(() => {
    colorScheme.set("dark");
  });

  screen.rerender(
    <ActivityFixture hidden={false} className="audit-activity-midlife" />,
  );
  expect(screen.getByTestId(testID).props.style).toStrictEqual({
    color: "#f00",
  });

  screen.unmount();
});
