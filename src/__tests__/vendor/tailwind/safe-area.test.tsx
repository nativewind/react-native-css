import type { ViewProps } from "react-native";

import { SafeAreaProvider } from "react-native-css/components/react-native-safe-area-context";
import { type Metrics } from "react-native-safe-area-context";

import { renderCurrentTest } from "./_tailwind";

const initialMetrics: Metrics = {
  insets: {
    top: 10,
    bottom: 10,
    left: 10,
    right: 10,
  },
  frame: {
    x: 0,
    y: 0,
    height: 100,
    width: 100,
  },
};

function Wrapper({ children }: ViewProps) {
  return (
    <SafeAreaProvider initialMetrics={initialMetrics}>
      {children}
    </SafeAreaProvider>
  );
}

test("m-safe", async () => {
  expect(await renderCurrentTest({ wrapper: Wrapper })).toStrictEqual({
    props: {
      style: {
        marginBottom: 10,
        marginLeft: 10,
        marginRight: 10,
        marginTop: 10,
      },
    },
  });
});

test("mx-safe", async () => {
  expect(await renderCurrentTest({ wrapper: Wrapper })).toStrictEqual({
    props: {
      style: {
        marginLeft: 10,
        marginRight: 10,
      },
    },
  });
});
test("my-safe", async () => {
  expect(await renderCurrentTest({ wrapper: Wrapper })).toStrictEqual({
    props: {
      style: {
        marginBottom: 10,
        marginTop: 10,
      },
    },
  });
});
test("ms-safe", async () => {
  expect(await renderCurrentTest({ wrapper: Wrapper })).toStrictEqual({
    props: {
      style: {
        marginInlineStart: 10,
      },
    },
  });
});
test("me-safe", async () => {
  expect(await renderCurrentTest({ wrapper: Wrapper })).toStrictEqual({
    props: {
      style: {
        marginInlineEnd: 10,
      },
    },
  });
});
test("mt-safe", async () => {
  expect(await renderCurrentTest({ wrapper: Wrapper })).toStrictEqual({
    props: {
      style: {
        marginTop: 10,
      },
    },
  });
});
test("mr-safe", async () => {
  expect(await renderCurrentTest({ wrapper: Wrapper })).toStrictEqual({
    props: {
      style: {
        marginRight: 10,
      },
    },
  });
});
test("mb-safe", async () => {
  expect(await renderCurrentTest({ wrapper: Wrapper })).toStrictEqual({
    props: {
      style: {
        marginBottom: 10,
      },
    },
  });
});

test("ml-safe", async () => {
  expect(await renderCurrentTest({ wrapper: Wrapper })).toStrictEqual({
    props: {
      style: {
        marginLeft: 10,
      },
    },
  });
});

test("p-safe", async () => {
  expect(await renderCurrentTest({ wrapper: Wrapper })).toStrictEqual({
    props: {
      style: {
        paddingBottom: 10,
        paddingLeft: 10,
        paddingRight: 10,
        paddingTop: 10,
      },
    },
  });
});

test("px-safe", async () => {
  expect(await renderCurrentTest({ wrapper: Wrapper })).toStrictEqual({
    props: {
      style: {
        paddingLeft: 10,
        paddingRight: 10,
      },
    },
  });
});
test("py-safe", async () => {
  expect(await renderCurrentTest({ wrapper: Wrapper })).toStrictEqual({
    props: {
      style: {
        paddingBottom: 10,
        paddingTop: 10,
      },
    },
  });
});
test("ps-safe", async () => {
  expect(await renderCurrentTest({ wrapper: Wrapper })).toStrictEqual({
    props: {
      style: {
        paddingInlineStart: 10,
      },
    },
  });
});
test("pe-safe", async () => {
  expect(await renderCurrentTest({ wrapper: Wrapper })).toStrictEqual({
    props: {
      style: {
        paddingInlineEnd: 10,
      },
    },
  });
});
test("pt-safe", async () => {
  expect(await renderCurrentTest({ wrapper: Wrapper })).toStrictEqual({
    props: {
      style: {
        paddingTop: 10,
      },
    },
  });
});
test("pr-safe", async () => {
  expect(await renderCurrentTest({ wrapper: Wrapper })).toStrictEqual({
    props: {
      style: {
        paddingRight: 10,
      },
    },
  });
});
test("pb-safe", async () => {
  expect(await renderCurrentTest({ wrapper: Wrapper })).toStrictEqual({
    props: {
      style: {
        paddingBottom: 10,
      },
    },
  });
});
test("pl-safe", async () => {
  expect(await renderCurrentTest({ wrapper: Wrapper })).toStrictEqual({
    props: {
      style: {
        paddingLeft: 10,
      },
    },
  });
});

test("min-h-screen-safe", async () => {
  // calc(100vh - (env(safe-area-inset-top) + env(safe-area-inset-bottom)));
  expect(await renderCurrentTest({ wrapper: Wrapper })).toStrictEqual({
    props: {
      style: {
        minHeight: 1314,
      },
    },
  });
});

test("max-h-screen-safe", async () => {
  // calc(100vh - (env(safe-area-inset-top) + env(safe-area-inset-bottom)));
  expect(await renderCurrentTest({ wrapper: Wrapper })).toStrictEqual({
    props: {
      style: {
        maxHeight: 1314,
      },
    },
  });
});

test("h-screen-safe", async () => {
  // calc(100vh - (env(safe-area-inset-top) + env(safe-area-inset-bottom)));
  expect(await renderCurrentTest({ wrapper: Wrapper })).toStrictEqual({
    props: {
      style: {
        height: 1314,
      },
    },
  });
});

test("inset-safe", async () => {
  expect(await renderCurrentTest({ wrapper: Wrapper })).toStrictEqual({
    props: {
      style: {
        bottom: 10,
        left: 10,
        right: 10,
        top: 10,
      },
    },
  });
});
test("inset-x-safe", async () => {
  expect(await renderCurrentTest({ wrapper: Wrapper })).toStrictEqual({
    props: {
      style: {
        left: 10,
        right: 10,
      },
    },
  });
});
test("inset-y-safe", async () => {
  expect(await renderCurrentTest({ wrapper: Wrapper })).toStrictEqual({
    props: {
      style: {
        bottom: 10,
        top: 10,
      },
    },
  });
});
test("start-safe", async () => {
  expect(await renderCurrentTest({ wrapper: Wrapper })).toStrictEqual({
    props: {
      style: {
        insetInlineStart: 10,
      },
    },
  });
});
test("end-safe", async () => {
  expect(await renderCurrentTest({ wrapper: Wrapper })).toStrictEqual({
    props: {
      style: {
        insetInlineEnd: 10,
      },
    },
  });
});
test("top-safe", async () => {
  expect(await renderCurrentTest({ wrapper: Wrapper })).toStrictEqual({
    props: {
      style: {
        top: 10,
      },
    },
  });
});
test("right-safe", async () => {
  expect(await renderCurrentTest({ wrapper: Wrapper })).toStrictEqual({
    props: {
      style: {
        right: 10,
      },
    },
  });
});
test("bottom-safe", async () => {
  expect(await renderCurrentTest({ wrapper: Wrapper })).toStrictEqual({
    props: {
      style: {
        bottom: 10,
      },
    },
  });
});
test("left-safe", async () => {
  expect(await renderCurrentTest({ wrapper: Wrapper })).toStrictEqual({
    props: {
      style: {
        left: 10,
      },
    },
  });
});

test("pb-safe-offset-4", async () => {
  // calc(env(safe-area-inset-right) + 2rem);
  expect(
    await renderCurrentTest({
      wrapper: Wrapper,
    }),
  ).toStrictEqual({
    props: {
      style: {
        paddingBottom: 24, // 10 + 14
      },
    },
  });
});

test("pb-safe-or-20", async () => {
  // --spacing: 3.5
  // max(env(safe-area-inset-bottom), calc(var(--spacing) * 20));
  expect(
    await renderCurrentTest({
      wrapper: Wrapper,
    }),
  ).toStrictEqual({
    props: {
      style: {
        paddingBottom: 70,
      },
    },
  });
});
