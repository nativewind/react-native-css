import { Activity, StrictMode, type ReactNode } from "react";
import { Button as RNButton, type ButtonProps } from "react-native";

import { act, render, screen } from "@testing-library/react-native";
import { VariableContextProvider } from "react-native-css";
import { copyComponentProperties } from "react-native-css/components/copyComponentProperties";
import { Text } from "react-native-css/components/Text";
import { View } from "react-native-css/components/View";
import { registerCSS } from "react-native-css/jest";
import { useCssElement } from "react-native-css/native";
import type {
  StyledConfiguration,
  StyledProps,
} from "react-native-css/runtime.types";

import { mappingToConfig } from "../../native/react/useNativeCss";
import { colorScheme, dimensions, type Effect } from "../../native/reactivity";
import { stylesFamily } from "../../native/styles";

const buttonMapping: StyledConfiguration<typeof RNButton> = {
  className: { target: false, nativeStyleMapping: { color: "color" } },
};

const Button = copyComponentProperties(
  RNButton,
  (props: StyledProps<ButtonProps, typeof buttonMapping>) =>
    useCssElement(RNButton, props, buttonMapping),
);

const titleColor = (title: string): unknown =>
  screen.getByText(title).props.style?.[1]?.color;

const withFreshVariables = (className: string, name: string) => (
  <VariableContextProvider value={{ [name]: "red" }}>
    <View className={className} />
  </VariableContextProvider>
);

test("identical elements share one resolved-style cache entry", () => {
  registerCSS(`.probe { color: red; width: 10px; }`);
  stylesFamily.clear();

  render(
    <>
      {Array.from({ length: 50 }, (_unused, index) => (
        <View key={index} className="probe" />
      ))}
    </>,
  );

  expect(stylesFamily.size()).toBe(1);
});

test("elements with different class lists keep distinct entries", () => {
  registerCSS(`.red { color: red; } .blue { color: blue; }`);
  stylesFamily.clear();

  render(
    <>
      <View className="red" />
      <View className="blue" />
    </>,
  );

  expect(stylesFamily.size()).toBe(2);
});

test("nothing writes to the config elements share", () => {
  // Compared by value, since a write to a frozen config does not throw here
  registerCSS(`.tinted { color: orange; }`);
  const shared = mappingToConfig(buttonMapping);
  const before = JSON.stringify(shared);

  render(<Button className="tinted" title="Go" onPress={() => undefined} />);

  expect(JSON.stringify(shared)).toBe(before);
  expect(titleColor("Go")).toBe("#ffa500");
});

test("a shared entry is not consumed by the first element that reads it", () => {
  registerCSS(`.tinted { color: orange; }`);
  stylesFamily.clear();
  const titles = ["a", "b", "c"];

  render(
    <>
      {titles.map((title) => (
        <Button
          key={title}
          className="tinted"
          title={title}
          onPress={() => undefined}
        />
      ))}
    </>,
  );

  expect(stylesFamily.size()).toBe(1);
  expect(titles.map(titleColor)).toStrictEqual([
    "#ffa500",
    "#ffa500",
    "#ffa500",
  ]);
});

test("re-rendering an element keeps the value its mapping took from the shared entry", () => {
  registerCSS(`.drain-once { color: orange; }`);

  const tree = render(
    <Button className="drain-once" title="Go" onPress={() => undefined} />,
  );
  expect(titleColor("Go")).toBe("#ffa500");

  for (let pass = 0; pass < 10; pass += 1) {
    tree.rerender(
      <Button className="drain-once" title="Go" onPress={() => undefined} />,
    );
    expect(titleColor("Go")).toBe("#ffa500");
  }
});

test("the cache releases an entry when the last element using it unmounts", () => {
  registerCSS(`.release-a { color: red; }`);
  stylesFamily.clear();

  const tree = render(<View className="release-a" />);
  expect(stylesFamily.size()).toBe(1);

  tree.unmount();
  expect(stylesFamily.size()).toBe(0);
});

test("an entry shared by two elements survives until both unmount", () => {
  registerCSS(`.release-b { color: blue; }`);
  stylesFamily.clear();

  const first = render(<View className="release-b" />);
  const second = render(<View className="release-b" />);
  expect(stylesFamily.size()).toBe(1);

  first.unmount();
  expect(stylesFamily.size()).toBe(1);

  second.unmount();
  expect(stylesFamily.size()).toBe(0);
});

test.each([
  ["a viewport unit", `.reactive { width: 10vw; }`],
  ["an undefined variable", `.reactive { color: var(--not-defined); }`],
  [
    "a dark-mode root variable",
    `:root { --brand: red; }
     @media (prefers-color-scheme: dark) { :root { --brand: blue; } }
     .reactive { color: var(--brand); }`,
  ],
])("an entry reading %s is released on unmount", (_, css) => {
  registerCSS(css);
  stylesFamily.clear();

  const tree = render(<View className="reactive" />);
  expect(stylesFamily.size()).toBe(1);

  tree.unmount();
  expect(stylesFamily.size()).toBe(0);
});

test("a viewport-unit entry stays reactive while mounted", () => {
  registerCSS(`.reactive-live { width: 50vw; }`);
  stylesFamily.clear();

  const tree = render(<View testID="live" className="reactive-live" />);

  act(() => {
    dimensions.set({ ...dimensions.get(), width: 400 });
  });

  expect(tree.getByTestId("live").props.style).toStrictEqual({ width: 200 });
  tree.unmount();
});

test("a root-variable change does not notify unrelated colorScheme subscribers", () => {
  const css = (light: string) => `
    :root { --amp: ${light}; }
    @media (prefers-color-scheme: dark) { :root { --amp: blue; } }
    .amp-user { color: var(--amp); }
  `;
  registerCSS(css("red"));
  stylesFamily.clear();

  const tree = render(<View testID="amp" className="amp-user" />);

  let unrelatedRuns = 0;
  const unrelated: Effect = {
    observers: new Set(),
    run: () => {
      unrelatedRuns += 1;
    },
  };
  colorScheme.get(unrelated);

  act(() => {
    registerCSS(css("green"));
  });

  expect(tree.getByTestId("amp")).toHaveStyle({ color: "green" });
  expect(unrelatedRuns).toBe(0);
  tree.unmount();
});

test("an animated viewport-unit class survives a dimension change", () => {
  registerCSS(`
    @keyframes spin { from { opacity: 0; } to { opacity: 1; } }
    .cycle-boom { width: 50vw; animation: spin 1s; }
  `);
  stylesFamily.clear();

  const tree = render(<View testID="boom" className="cycle-boom" />);

  expect(() => {
    act(() => {
      dimensions.set({ ...dimensions.get(), width: 400 });
    });
  }).not.toThrow();

  tree.unmount();
});

test("a superseded entry is released while the element stays mounted", () => {
  registerCSS(`.release-c { color: var(--probe); }`);
  stylesFamily.clear();

  const tree = render(withFreshVariables("release-c", "--probe"));
  for (let pass = 0; pass < 12; pass += 1) {
    tree.rerender(withFreshVariables("release-c", "--probe"));
  }

  expect(stylesFamily.size()).toBe(1);

  tree.unmount();
  expect(stylesFamily.size()).toBe(0);
});

test("unmounting an element does not delete another element's live entry", () => {
  registerCSS(`.shared-identity { color: red; }`);
  stylesFamily.clear();

  const first = render(<View className="shared-identity" />);
  const second = render(<View className="shared-identity" />);
  expect(stylesFamily.size()).toBe(1);

  first.unmount();
  expect(stylesFamily.size()).toBe(1);

  const third = render(<View className="shared-identity" />);
  expect(stylesFamily.size()).toBe(1);

  second.unmount();
  third.unmount();
  expect(stylesFamily.size()).toBe(0);
});

test("a superseded element does not delete the entry it left behind", () => {
  registerCSS(`.stale-a { color: red; } .stale-b { color: blue; }`);
  stylesFamily.clear();

  const first = render(<View className="stale-a" />);
  first.rerender(<View className="stale-b" />);

  const second = render(<View className="stale-a" />);
  expect(stylesFamily.size()).toBe(2);

  first.unmount();
  expect(stylesFamily.size()).toBe(1);

  second.unmount();
  expect(stylesFamily.size()).toBe(0);
});

test("StrictMode's replayed effects keep one entry per class list", () => {
  registerCSS(`.strict-shared { width: 10vw; }`);
  stylesFamily.clear();

  const strict = (element: ReactNode) => <StrictMode>{element}</StrictMode>;
  const sizes: number[] = [];

  const first = render(strict(<View className="strict-shared" />));
  sizes.push(stylesFamily.size());
  const second = render(strict(<View className="strict-shared" />));
  sizes.push(stylesFamily.size());
  first.unmount();
  sizes.push(stylesFamily.size());
  const third = render(strict(<View className="strict-shared" />));
  sizes.push(stylesFamily.size());
  second.unmount();
  third.unmount();
  sizes.push(stylesFamily.size());

  expect(sizes).toStrictEqual([1, 1, 1, 1, 0]);
});

test("an element Activity hides and shows again keeps sharing its entry", () => {
  registerCSS(`.activity-shared { width: 10vw; }`);
  stylesFamily.clear();

  const toggled = (mode: "hidden" | "visible") => (
    <Activity mode={mode}>
      <View className="activity-shared" />
    </Activity>
  );

  const first = render(toggled("visible"));
  first.rerender(toggled("hidden"));
  first.rerender(toggled("visible"));
  expect(stylesFamily.size()).toBe(1);

  const second = render(<View className="activity-shared" />);
  expect(stylesFamily.size()).toBe(1);

  first.unmount();
  expect(stylesFamily.size()).toBe(1);

  const third = render(<View className="activity-shared" />);
  expect(stylesFamily.size()).toBe(1);

  second.unmount();
  third.unmount();
  expect(stylesFamily.size()).toBe(0);
});

test("mounting and unmounting a tree repeatedly returns the cache to empty", () => {
  registerCSS(`
    .stress-a { color: red; }
    .stress-b { color: blue; }
    .stress-c { font-size: 12px; }
  `);
  stylesFamily.clear();

  const peaks: number[] = [];

  for (let cycle = 0; cycle < 25; cycle += 1) {
    const tree = render(
      <View className="stress-a">
        <View className="stress-b">
          <Text className="stress-c">deep</Text>
        </View>
        <View className="stress-b" />
      </View>,
    );
    peaks.push(stylesFamily.size());
    tree.unmount();

    expect(stylesFamily.size()).toBe(0);
  }

  expect(peaks).toStrictEqual(Array.from({ length: 25 }, () => 3));
});

test("an entry shared across many siblings survives until the last one goes", () => {
  registerCSS(`.stress-shared { color: green; }`);
  stylesFamily.clear();

  const trees = Array.from({ length: 30 }, () =>
    render(<View className="stress-shared" />),
  );
  expect(stylesFamily.size()).toBe(1);

  for (const [index, tree] of trees.entries()) {
    tree.unmount();
    expect(stylesFamily.size()).toBe(index === trees.length - 1 ? 0 : 1);
  }
});

test("per-render key churn stays flat and drains completely", () => {
  registerCSS(`.stress-churn { color: var(--churn); }`);
  stylesFamily.clear();

  const tree = render(withFreshVariables("stress-churn", "--churn"));

  const sizes: number[] = [];
  for (let pass = 0; pass < 50; pass += 1) {
    tree.rerender(withFreshVariables("stress-churn", "--churn"));
    sizes.push(stylesFamily.size());
  }

  expect(sizes).toStrictEqual(Array.from({ length: 50 }, () => 1));

  tree.unmount();
  expect(stylesFamily.size()).toBe(0);
});
