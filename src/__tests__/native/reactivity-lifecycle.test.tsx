import {
  Activity,
  startTransition,
  StrictMode,
  Suspense,
  use,
  type ReactElement,
} from "react";
import { Text } from "react-native";

import { act, render, renderAsync } from "@testing-library/react-native";
import { View } from "react-native-css/components/View";
import { registerCSS } from "react-native-css/jest";
import { useNativeVariable } from "react-native-css/native";
import {
  rootVariables,
  StyleCollection,
} from "react-native-css/native-internal";

import * as rulesModule from "../../native/react/rules";
import * as useNativeCssModule from "../../native/react/useNativeCss";
import { cleanupEffect, observable, vh, vw } from "../../native/reactivity";
import * as calculatePropsModule from "../../native/styles/calculate-props";

test("cleaned observers receive no later notifications", () => {
  const value = observable(0);
  const effect = {
    observers: new Set<import("../../native/reactivity").Observable<unknown>>(),
    run: jest.fn(),
  };
  value.get(effect);
  value.set(1);
  expect(effect.run).toHaveBeenCalledTimes(1);
  cleanupEffect(effect);
  value.set(2);
  expect(effect.run).toHaveBeenCalledTimes(1);
  expect(value.observers.size).toBe(0);
});

test("native variable hook releases its subscription on unmount", () => {
  const value = rootVariables("audit-hook-lifecycle");
  value.set([[10]]);
  const before = value.observers.size;
  function Sample() {
    const current = useNativeVariable("--audit-hook-lifecycle");
    return <Text testID="value">{String(current)}</Text>;
  }
  const screen = render(<Sample />);
  expect(screen.getByTestId("value").props.children).toBe("10");
  act(() => {
    value.set([[20]]);
  });
  expect(screen.getByTestId("value").props.children).toBe("20");
  screen.unmount();
  expect(value.observers.size).toBe(before);
});

test("viewport styles release their subscription on unmount", () => {
  registerCSS(".audit-lifecycle { width: 10vw; }");
  const before = vw.observers.size;
  const screen = render(<View testID="sample" className="audit-lifecycle" />);
  expect(screen.getByTestId("sample").props.style.width).toBeGreaterThan(0);
  expect(vw.observers.size).toBeGreaterThan(before);
  screen.unmount();
  expect(vw.observers.size).toBe(before);
});

test("variable subscriptions follow a changed variable name", () => {
  const first = rootVariables("audit-first");
  const second = rootVariables("audit-second");
  first.set([[10]]);
  second.set([[30]]);
  function Sample({ name }: { name: string }) {
    return <Text testID="value">{String(useNativeVariable(name))}</Text>;
  }
  const screen = render(<Sample name="audit-first" />);
  expect(first.observers.size).toBe(1);
  screen.rerender(<Sample name="audit-second" />);
  expect(screen.getByTestId("value").props.children).toBe("30");
  expect(first.observers.size).toBe(0);
  act(() => {
    second.set([[40]]);
  });
  expect(screen.getByTestId("value").props.children).toBe("40");
  screen.unmount();
  expect(second.observers.size).toBe(0);
});

test("a shared stylesheet remains reactive until its final consumer unmounts", () => {
  registerCSS(".audit-shared { width: 10vw; }");
  const original = vw.get();
  const before = vw.observers.size;
  const first = render(<View testID="first" className="audit-shared" />);
  const second = render(<View testID="second" className="audit-shared" />);
  first.unmount();
  act(() => {
    vw.set(500);
  });
  expect(second.getByTestId("second").props.style.width).toBe(50);
  second.unmount();
  expect(vw.observers.size).toBe(before);
  act(() => {
    vw.set(original);
  });
});

test("a remounted viewport consumer reads changes made while unmounted", () => {
  registerCSS(".audit-remount { width: 10vw; }");
  const original = vw.get();
  const first = render(<View testID="sample" className="audit-remount" />);
  first.unmount();
  act(() => {
    vw.set(600);
  });
  const second = render(<View testID="sample" className="audit-remount" />);
  expect(second.getByTestId("sample").props.style.width).toBe(60);
  second.unmount();
  act(() => {
    vw.set(original);
  });
});

test("StrictMode variable consumers remain reactive and release subscriptions", () => {
  const value = rootVariables("audit-strict-variable");
  value.set([[10]]);
  function Sample() {
    return (
      <Text testID="value">
        {String(useNativeVariable("audit-strict-variable"))}
      </Text>
    );
  }
  const screen = render(
    <StrictMode>
      <Sample />
    </StrictMode>,
  );
  act(() => {
    value.set([[20]]);
  });
  expect(screen.getByTestId("value").props.children).toBe("20");
  screen.unmount();
  expect(value.observers.size).toBe(0);
});

test("StrictMode viewport consumers remain reactive and release subscriptions", () => {
  registerCSS(".audit-strict-width { width: 10vw; }");
  const rules = StyleCollection.styles("audit-strict-width");
  const ruleCount = rules.observers.size;
  const original = vw.get();
  const before = vw.observers.size;
  const screen = render(
    <StrictMode>
      <View testID="sample" className="audit-strict-width" />
    </StrictMode>,
  );
  act(() => {
    vw.set(700);
  });
  expect(screen.getByTestId("sample").props.style.width).toBe(70);
  screen.unmount();
  expect(rules.observers.size).toBe(ruleCount);
  expect(vw.observers.size).toBe(before);
  act(() => {
    vw.set(original);
  });
});

function captureConsoleErrors() {
  const error = jest.spyOn(console, "error").mockImplementation(jest.fn());
  return {
    messages: () => error.mock.calls.map(([message]) => String(message)),
    restore: () => {
      error.mockRestore();
    },
  };
}

const neverResolves = new Promise<never>(jest.fn());

test("a viewport change between render and commit reaches the element once it commits", () => {
  registerCSS(".audit-render-window { width: 10vw; }");
  const original = vw.get();
  const errors = captureConsoleErrors();
  function ResizeDuringRender() {
    vw.set(800);
    return null;
  }
  try {
    const screen = render(
      <>
        <View testID="sample" className="audit-render-window" />
        <ResizeDuringRender />
      </>,
    );
    expect(errors.messages()).toEqual([]);
    expect(screen.getByTestId("sample").props.style.width).toBe(80);
    screen.unmount();
  } finally {
    errors.restore();
    act(() => {
      vw.set(original);
    });
  }
});

function NeverResolves() {
  return use(neverResolves);
}

function SampleBesideSuspense({
  className,
  suspended,
}: {
  className: string;
  suspended: boolean;
}) {
  return (
    <>
      <View testID="sample" className={className} />
      <Suspense fallback={null}>
        {suspended ? <NeverResolves /> : null}
      </Suspense>
    </>
  );
}

async function renderDiscardedClassChange(
  committedClassName: string,
  discardedClassName: string,
) {
  const screen = render(
    <SampleBesideSuspense className={committedClassName} suspended={false} />,
  );
  await act(() => {
    startTransition(() => {
      screen.rerender(
        <SampleBesideSuspense className={discardedClassName} suspended />,
      );
    });
    return Promise.resolve();
  });
  return screen;
}

test("a render React discards leaves no subscription and takes no later update", async () => {
  registerCSS(".audit-discarded-render { width: 10vw; }");
  const original = vw.get();
  const before = vw.observers.size;
  const errors = captureConsoleErrors();
  try {
    const screen = await renderAsync(
      <Suspense fallback={<Text testID="fallback">loading</Text>}>
        <View testID="sample" className="audit-discarded-render" />
        <NeverResolves />
      </Suspense>,
    );
    expect(screen.getByTestId("fallback")).toBeTruthy();
    expect(screen.queryByTestId("sample")).toBeNull();
    expect(vw.observers.size).toBe(before);
    await act(() => {
      vw.set(900);
      return Promise.resolve();
    });
    expect(errors.messages()).toEqual([]);
    await screen.unmountAsync();
  } finally {
    errors.restore();
    act(() => {
      vw.set(original);
    });
  }
});

test("mounting an element computes its styles once", () => {
  registerCSS(".audit-single-computation { width: 10vw; }");
  const computations = jest.spyOn(calculatePropsModule, "calculateProps");
  try {
    const screen = render(
      <View testID="sample" className="audit-single-computation" />,
    );
    expect(screen.getByTestId("sample").props.style.width).toBeGreaterThan(0);
    expect(computations).toHaveBeenCalledTimes(1);
    screen.unmount();
  } finally {
    computations.mockRestore();
  }
});

test("a render React discards leaves the committed element subscribed", async () => {
  registerCSS(
    ".audit-kept-first { width: 10vw; } .audit-kept-second { width: 20px; }",
  );
  const original = vw.get();
  const screen = await renderDiscardedClassChange(
    "audit-kept-first",
    "audit-kept-second",
  );
  try {
    expect(screen.getByTestId("sample").props.style.width).toBe(original / 10);
    await act(() => {
      vw.set(1000);
      return Promise.resolve();
    });
    expect(screen.getByTestId("sample").props.style.width).toBe(100);
  } finally {
    screen.unmount();
    act(() => {
      vw.set(original);
    });
  }
});

test("class changes detach the old rule subscription", () => {
  registerCSS(
    ".audit-rule-first { width: 10px; } .audit-rule-second { width: 20px; }",
  );
  const first = StyleCollection.styles("audit-rule-first");
  const second = StyleCollection.styles("audit-rule-second");
  const screen = render(<View testID="sample" className="audit-rule-first" />);
  expect(first.observers.size).toBe(1);
  screen.rerender(<View testID="sample" className="audit-rule-second" />);
  expect(screen.getByTestId("sample").props.style.width).toBe(20);
  expect(first.observers.size).toBe(0);
  screen.unmount();
  expect(second.observers.size).toBe(0);
});

function setViewport(width: number, height: number) {
  act(() => {
    vw.set(width);
    vh.set(height);
  });
}

test("a class change React discards leaves the committed element following its rules", async () => {
  registerCSS(`
    .audit-rule-kept-first { height: 5px; }
    @media (min-width: 600px) { .audit-rule-kept-first { width: 10px; } }
    .audit-rule-kept-second { width: 20px; }
  `);
  const originalWidth = vw.get();
  const originalHeight = vh.get();
  setViewport(500, 500);
  const screen = await renderDiscardedClassChange(
    "audit-rule-kept-first",
    "audit-rule-kept-second",
  );
  try {
    expect(screen.getByTestId("sample").props.style).toStrictEqual({
      height: 5,
    });
    await act(() => {
      vw.set(700);
      return Promise.resolve();
    });
    expect(screen.getByTestId("sample").props.style).toStrictEqual({
      height: 5,
      width: 10,
    });
  } finally {
    screen.unmount();
    setViewport(originalWidth, originalHeight);
  }
});

test("a class change React discards leaves no subscription to the discarded rules", async () => {
  registerCSS(`
    .audit-rule-gone-first { width: 10px; }
    @media (min-width: 600px) { .audit-rule-gone-second { width: 20px; } }
  `);
  const discardedRules = StyleCollection.styles("audit-rule-gone-second");
  const viewportObservers = vw.observers.size;
  const screen = await renderDiscardedClassChange(
    "audit-rule-gone-first",
    "audit-rule-gone-second",
  );
  try {
    expect(screen.getByTestId("sample").props.style).toStrictEqual({
      width: 10,
    });
    expect(discardedRules.observers.size).toBe(0);
    expect(vw.observers.size).toBe(viewportObservers);
  } finally {
    screen.unmount();
  }
});

test("mounting an element runs its rule pass once", () => {
  registerCSS(".audit-single-rule-pass { width: 10px; }");
  const rulePasses = jest.spyOn(rulesModule, "updateRules");
  try {
    const screen = render(
      <View testID="sample" className="audit-single-rule-pass" />,
    );
    expect(screen.getByTestId("sample").props.style).toStrictEqual({
      width: 10,
    });
    expect(rulePasses).toHaveBeenCalledTimes(1);
    screen.unmount();
  } finally {
    rulePasses.mockRestore();
  }
});

const ELEMENT_MOUNTS = [
  ["mounted once", (element: ReactElement) => render(element)],
  [
    "whose effects StrictMode ran twice",
    (element: ReactElement) => render(<StrictMode>{element}</StrictMode>),
  ],
  [
    "that Activity hid and showed again",
    (element: ReactElement) => {
      const screen = render(<Activity mode="visible">{element}</Activity>);
      screen.rerender(<Activity mode="hidden">{element}</Activity>);
      screen.rerender(<Activity mode="visible">{element}</Activity>);
      return screen;
    },
  ],
] as const;

test.each(ELEMENT_MOUNTS)(
  "a viewport change that moves no rule renders nothing and computes no styles on an element %s",
  (_shape, mount) => {
    registerCSS(`
      .audit-rule-unmoved { height: 5px; }
      @media (min-width: 600px) { .audit-rule-unmoved { width: 10px; } }
    `);
    const originalWidth = vw.get();
    const originalHeight = vh.get();
    setViewport(500, 500);
    const screen = mount(
      <View testID="sample" className="audit-rule-unmoved" />,
    );
    const renders = jest.spyOn(useNativeCssModule, "useNativeCss");
    const computations = jest.spyOn(calculatePropsModule, "calculateProps");
    try {
      act(() => {
        vw.set(550);
      });
      expect(renders).not.toHaveBeenCalled();
      expect(computations).not.toHaveBeenCalled();
      expect(screen.getByTestId("sample").props.style).toStrictEqual({
        height: 5,
      });
    } finally {
      computations.mockRestore();
      renders.mockRestore();
      screen.unmount();
      setViewport(originalWidth, originalHeight);
    }
  },
);

test("a viewport change between render and commit reaches the element's rules once it commits", () => {
  registerCSS(`
    .audit-rule-window { height: 5px; }
    @media (min-width: 600px) { .audit-rule-window { width: 10px; } }
  `);
  const originalWidth = vw.get();
  const originalHeight = vh.get();
  setViewport(500, 500);
  const errors = captureConsoleErrors();
  function ResizeDuringRender() {
    vw.set(700);
    return null;
  }
  try {
    const screen = render(
      <>
        <View testID="sample" className="audit-rule-window" />
        <ResizeDuringRender />
      </>,
    );
    expect(errors.messages()).toEqual([]);
    expect(screen.getByTestId("sample").props.style).toStrictEqual({
      height: 5,
      width: 10,
    });
    screen.unmount();
  } finally {
    errors.restore();
    setViewport(originalWidth, originalHeight);
  }
});

test("a rule pass that reads more after a change follows what it read", () => {
  registerCSS(`
    .audit-rule-reads-more { height: 5px; }
    @media (min-width: 600px) and (min-height: 600px) {
      .audit-rule-reads-more { width: 10px; }
    }
  `);
  const originalWidth = vw.get();
  const originalHeight = vh.get();
  setViewport(500, 500);
  const screen = render(
    <View testID="sample" className="audit-rule-reads-more" />,
  );
  try {
    act(() => {
      vw.set(700);
    });
    expect(screen.getByTestId("sample").props.style).toStrictEqual({
      height: 5,
    });
    act(() => {
      vh.set(700);
    });
    expect(screen.getByTestId("sample").props.style).toStrictEqual({
      height: 5,
      width: 10,
    });
  } finally {
    screen.unmount();
    setViewport(originalWidth, originalHeight);
  }
});

test("StrictMode rule consumers remain reactive and release subscriptions", () => {
  registerCSS(`
    .audit-strict-rule { height: 5px; }
    @media (min-width: 600px) { .audit-strict-rule { width: 10px; } }
  `);
  const rules = StyleCollection.styles("audit-strict-rule");
  const originalWidth = vw.get();
  const originalHeight = vh.get();
  setViewport(500, 500);
  const viewportObservers = vw.observers.size;
  const screen = render(
    <StrictMode>
      <View testID="sample" className="audit-strict-rule" />
    </StrictMode>,
  );
  try {
    act(() => {
      vw.set(700);
    });
    expect(screen.getByTestId("sample").props.style).toStrictEqual({
      height: 5,
      width: 10,
    });
  } finally {
    screen.unmount();
    expect(rules.observers.size).toBe(0);
    expect(vw.observers.size).toBe(viewportObservers);
    setViewport(originalWidth, originalHeight);
  }
});

test("an element Activity hid follows rules that changed while it was hidden", async () => {
  registerCSS(`
    .audit-activity-rule { height: 5px; }
    @media (min-width: 600px) { .audit-activity-rule { width: 10px; } }
  `);
  const originalWidth = vw.get();
  const originalHeight = vh.get();
  setViewport(500, 500);
  function Sample({ mode }: { mode: "visible" | "hidden" }) {
    return (
      <Activity mode={mode}>
        <View testID="sample" className="audit-activity-rule" />
      </Activity>
    );
  }
  const screen = await renderAsync(<Sample mode="visible" />);
  try {
    await screen.rerenderAsync(<Sample mode="hidden" />);
    await act(() => {
      vw.set(700);
      return Promise.resolve();
    });
    await screen.rerenderAsync(<Sample mode="visible" />);
    expect(screen.getByTestId("sample").props.style).toStrictEqual({
      height: 5,
      width: 10,
    });
  } finally {
    await screen.unmountAsync();
    setViewport(originalWidth, originalHeight);
  }
});
