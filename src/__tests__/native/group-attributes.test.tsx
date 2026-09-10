import { memo } from "react";

import { render, screen } from "@testing-library/react-native";
import { View } from "react-native-css/components";
import { registerCSS } from "react-native-css/jest";

const Child = memo(() => <View testID="child" className="child" />);

test("named attribute groups update memoized descendants and isolate siblings", () => {
  registerCSS(`
    .group { container-name: group; }
    .child { width: 40px; }
    .group[data-state="open"] .child { width: 80px; }
  `);
  const subject = (state?: string) => (
    <>
      <View className="group" {...{ dataSet: { state } }}>
        <Child />
      </View>
      <View className="group" {...{ dataSet: { state: "closed" } }}>
        <View testID="sibling" className="child" />
      </View>
    </>
  );
  render(subject("closed"));
  expect(screen.getByTestId("child").props.style.width).toBe(40);
  screen.rerender(subject("open"));
  expect(screen.getByTestId("child").props.style.width).toBe(80);
  expect(screen.getByTestId("sibling").props.style.width).toBe(40);
  screen.rerender(subject());
  expect(screen.getByTestId("child").props.style.width).toBe(40);
});

test("the nearest named ancestor supplies the attribute condition", () => {
  registerCSS(`.group { container-name: group; } .child { width: 40px; }
    .group[aria-selected="true"] .child { width: 80px; }`);
  const subject = (inner: boolean) => (
    <View className="group" aria-selected>
      <View className="group" aria-selected={inner}>
        <Child />
      </View>
    </View>
  );
  render(subject(false));
  expect(screen.getByTestId("child").props.style.width).toBe(40);
  screen.rerender(subject(true));
  expect(screen.getByTestId("child").props.style.width).toBe(80);
  screen.rerender(subject(false));
  expect(screen.getByTestId("child").props.style.width).toBe(40);
});
