import { act, fireEvent, render, screen } from "@testing-library/react-native";
import { compile } from "react-native-css/compiler";
import { View } from "react-native-css/components/View";
import { registerCSS } from "react-native-css/jest";
import { StyleCollection } from "react-native-css/native";

import { dimensions } from "../../native/reactivity";

// Metro hands a device the sheet through JSON.stringify, which writes Infinity, NaN and an array's undefined as null
export type Route = "in memory" | "over the wire";

export interface BoxSize {
  readonly width: number;
  readonly height: number;
}

function inject(css: string, route: Route): void {
  switch (route) {
    case "in memory":
      registerCSS(css);
      return;
    case "over the wire": {
      const stylesheet = compile(css).stylesheet();
      StyleCollection.inject(
        JSON.parse(JSON.stringify(stylesheet)) as typeof stylesheet,
      );
      return;
    }
    default:
      route satisfies never;
  }
}

export function mediaMatches(
  condition: string,
  size: BoxSize = { width: 600, height: 400 },
  route: Route = "in memory",
): boolean {
  inject(
    `
    .child { width: 10px; }
    @media ${condition} { .child { width: 37px; } }
  `,
    route,
  );
  act(() => {
    dimensions.set({ ...dimensions.get(), ...size });
  });
  const { unmount } = render(<View testID="child" className="child" />);
  const matches = childMatches();
  unmount();
  return matches;
}

export function containerMatches(
  condition: string,
  size: BoxSize = { width: 400, height: 200 },
  route: Route = "in memory",
): boolean {
  inject(
    `
    .parent { container-type: size; }
    .child { width: 10px; }
    @container ${condition} { .child { width: 37px; } }
  `,
    route,
  );
  act(() => {
    dimensions.set({ ...dimensions.get(), width: 600, height: 400 });
  });
  const { unmount } = render(
    <View testID="parent" className="parent">
      <View testID="child" className="child" />
    </View>,
  );
  fireEvent(screen.getByTestId("parent"), "layout", {
    nativeEvent: { layout: { x: 0, y: 0, ...size } },
  });
  const matches = childMatches();
  unmount();
  return matches;
}

// The child's own rule gives it 10 and the condition's 37, so any other width is a failure of the test rather than an answer
export function childMatches(): boolean {
  const { width } = screen.getByTestId("child").props.style;

  if (width !== 10 && width !== 37) {
    throw new Error(
      `.child is ${String(width)} wide, neither its rule's 10 nor its condition's 37`,
    );
  }

  return width === 37;
}
