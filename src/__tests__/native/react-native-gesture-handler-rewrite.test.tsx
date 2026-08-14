import type { ComponentType } from "react";

import { render } from "@testing-library/react-native";
import { registerCSS, testID } from "react-native-css/jest";

/**
 * `nativeResolver` rewrites every `react-native` import outside this package to
 * `react-native-css/components` — react-native's own exports with the styled
 * components layered over them — and leaves this package's own files alone
 * (`isFromThisModule`), so the styled components themselves are built against
 * the real react-native. The re-entrancy flag below is that second half.
 *
 * Without it these five drop `className` outright, which is why the sibling
 * suite's object-identity assertions cannot stand in for this file: identity is
 * what `export *` guarantees by construction, and says nothing about whether the
 * re-export reaches a pixel.
 */
let mockRewriting = false;
jest.mock("react-native", (): Record<string, unknown> => {
  if (mockRewriting) {
    return jest.requireActual<Record<string, unknown>>("react-native");
  }

  mockRewriting = true;
  try {
    return jest.requireActual<Record<string, unknown>>(
      "react-native-css/components",
    );
  } finally {
    mockRewriting = false;
  }
});

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

function styledGestureHandler(): Record<string, unknown> {
  return jest.requireActual<Record<string, unknown>>(
    "react-native-css/components/react-native-gesture-handler",
  );
}

test("the rewrite is in effect", () => {
  // Every assertion below is vacuous if `react-native` resolves to itself here,
  // and the whole file would pass while measuring nothing.
  const rewritten = jest.requireMock<Record<string, unknown>>("react-native");
  const real = jest.requireActual<Record<string, unknown>>("react-native");

  expect(rewritten.View).not.toBe(real.View);
  expect(rewritten.Dimensions).toBe(real.Dimensions);
});

describe.each([
  ["ScrollView", 31, {}],
  ["Switch", 32, {}],
  ["TextInput", 33, {}],
  ["FlatList", 34, { data: [], renderItem: () => null }],
  ["Text", 35, {}],
])("%s", (name, width, extra: Record<string, unknown>) => {
  test("resolves className through the rewrite, so it needs no re-declaration", () => {
    registerCSS(`.w-${width} { width: ${width}px; }`);

    const Component = styledGestureHandler()[name] as ComponentType<
      Record<string, unknown>
    >;
    const tree = render(
      <Component testID={testID} className={`w-${width}`} {...extra} />,
    ).toJSON();

    expect(flattenStyles(tree)).toContainEqual(
      expect.objectContaining({ width }),
    );

    for (const props of collectProps(tree)) {
      expect(props).not.toHaveProperty("className");
    }
  });
});

test("ScrollView's contentContainerClassName survives the rewrite too", () => {
  registerCSS(`.w-52 { width: 52px; }`);

  const ScrollView = styledGestureHandler().ScrollView as ComponentType<
    Record<string, unknown>
  >;
  const tree = render(
    <ScrollView testID={testID} contentContainerClassName="w-52" />,
  ).toJSON();

  expect(
    collectProps(tree).map((props) => props.contentContainerStyle),
  ).toContainEqual({ width: 52 });
});
