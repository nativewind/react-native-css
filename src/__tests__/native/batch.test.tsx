import { Dimensions } from "react-native";

import { act, render, screen } from "@testing-library/react-native";
import { View } from "react-native-css/components/View";
import { registerCSS } from "react-native-css/jest";

import { batch, observable, type Effect } from "../../native/reactivity";

jest.mock("react-native", () => {
  const RN = jest.requireActual("react-native");
  RN.Platform.OS = "ios";
  return RN as unknown;
});

const rotate = (width: number) => {
  act(() => {
    const metrics = { width, height: 800, scale: 2, fontScale: 1 };
    Dimensions.set({ window: metrics, screen: metrics });
  });
};

const effectRecording = (record: () => void): Effect => ({
  observers: new Set(),
  run: record,
});

test.each([
  ["before", ".a { width: 10vw; color: var(--c); }"],
  ["after", ".a { color: var(--c); width: 10vw; }"],
])(
  "a rotation reaches an element reading a viewport unit %s a shared width-dependent variable",
  (_, rule) => {
    registerCSS(`
      :root { --c: blue; }
      @media (min-width: 500px) { :root { --c: red; } }
      ${rule}
      .b { color: var(--c); }
    `);
    rotate(300);
    render(
      <>
        <View testID="a" className="a" />
        <View testID="b" className="b" />
      </>,
    );

    for (const [width, color] of [
      [700, "red"],
      [300, "blue"],
      [700, "red"],
    ] as const) {
      rotate(width);
      expect(screen.getByTestId("a")).toHaveStyle({ width: width / 10, color });
      expect(screen.getByTestId("b")).toHaveStyle({ color });
    }
  },
);

test("an effect notified again while the batch drains runs again", () => {
  const source = observable(1);
  const derived = observable((read) => read(source) * 10);
  const seen: string[] = [];
  const subscriber = effectRecording(() => {
    seen.push(`${source.get()},${derived.get()}`);
  });

  source.get(subscriber);
  derived.get(subscriber);
  batch(() => {
    source.set(2);
  });

  expect(seen.at(-1)).toBe("2,20");
});

test("a batch defers every notification until its update returns, and runs each effect once", () => {
  const width = observable(1);
  const height = observable(1);
  let runs = 0;
  const subscriber = effectRecording(() => {
    runs += 1;
  });

  width.get(subscriber);
  height.get(subscriber);
  batch(() => {
    width.set(2);
    height.set(2);
    expect(runs).toBe(0);
  });

  expect(runs).toBe(1);
});
