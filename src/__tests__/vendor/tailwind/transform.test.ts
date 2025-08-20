import { renderCurrentTest, renderSimple } from "./_tailwind";

describe("Transforms - Scale", () => {
  test("scale-0", async () => {
    expect(await renderCurrentTest()).toStrictEqual({
      props: {
        style: {
          transform: [{ scale: "0%" }],
        },
      },
    });
  });
  test("scale-x-50", async () => {
    expect(await renderCurrentTest()).toStrictEqual({
      props: {
        style: {
          transform: [{ scaleX: "50%" }, { scaleY: 1 }],
        },
      },
    });
  });
  test("scale-y-50", async () => {
    expect(await renderCurrentTest()).toStrictEqual({
      props: {
        style: {
          transform: [{ scaleX: 1 }, { scaleY: "50%" }],
        },
      },
    });
  });
  test("scale-50", async () => {
    expect(await renderCurrentTest()).toStrictEqual({
      props: {
        style: {
          transform: [{ scale: "50%" }],
        },
      },
    });
  });
});

describe("Transforms - Rotate", () => {
  test("rotate-0", async () => {
    expect(await renderCurrentTest()).toStrictEqual({
      props: {
        style: {
          transform: [{ rotateZ: "0deg" }],
        },
      },
    });
  });
  test("rotate-180", async () => {
    expect(await renderCurrentTest()).toStrictEqual({
      props: {
        style: {
          transform: [{ rotateZ: "180deg" }],
        },
      },
    });
  });
  test("rotate-[30deg]", async () => {
    expect(await renderCurrentTest()).toStrictEqual({
      props: {
        style: {
          transform: [{ rotateZ: "30deg" }],
        },
      },
    });
  });
});

describe("Transforms - Translate", () => {
  test("translate-x-0", async () => {
    expect(await renderCurrentTest()).toStrictEqual({
      props: {
        style: {
          transform: [{ translateX: 0 }],
        },
      },
    });
  });
  test("translate-y-0", async () => {
    expect(await renderCurrentTest()).toStrictEqual({
      props: {
        style: {
          transform: [{ translateY: 0 }],
        },
      },
    });
  });
  test("translate-x-px", async () => {
    expect(await renderCurrentTest()).toStrictEqual({
      props: {
        style: {
          transform: [{ translateX: 1 }],
        },
      },
    });
  });
  test("translate-y-px", async () => {
    expect(await renderCurrentTest()).toStrictEqual({
      props: {
        style: {
          transform: [{ translateY: 1 }],
        },
      },
    });
  });
  test("translate-x-1", async () => {
    expect(await renderCurrentTest()).toStrictEqual({
      props: {
        style: {
          transform: [{ translateX: 3.5 }],
        },
      },
    });
  });
  test("translate-y-1", async () => {
    expect(await renderCurrentTest()).toStrictEqual({
      props: {
        style: {
          transform: [{ translateY: 3.5 }],
        },
      },
    });
  });
});

describe("Transforms - Translate (%)", () => {
  test("translate-x-1/2", async () => {
    expect(await renderCurrentTest()).toStrictEqual({
      props: { style: { transform: [{ translateX: "50%" }] } },
    });
  });

  test("translate-y-1/2", async () => {
    expect(await renderCurrentTest()).toStrictEqual({
      props: {
        style: {
          transform: [{ translateY: "50%" }],
        },
      },
    });
  });
  test("translate-x-full", async () => {
    expect(await renderCurrentTest()).toStrictEqual({
      props: {
        style: {
          transform: [{ translateX: "100%" }],
        },
      },
    });
  });
  test("translate-y-full", async () => {
    expect(await renderCurrentTest()).toStrictEqual({
      props: {
        style: {
          transform: [{ translateY: "100%" }],
        },
      },
    });
  });
});

describe("Transforms - Skew", () => {
  test("skew-x-0", async () => {
    expect(await renderCurrentTest()).toStrictEqual({
      props: {
        style: {
          transform: [{ skewX: "0deg" }],
        },
      },
    });
  });
  test("skew-y-0", async () => {
    expect(await renderCurrentTest()).toStrictEqual({
      props: {
        style: {
          transform: [{ skewY: "0deg" }],
        },
      },
    });
  });
  test("skew-x-1", async () => {
    expect(await renderCurrentTest()).toStrictEqual({
      props: {
        style: {
          transform: [{ skewX: "1deg" }],
        },
      },
    });
  });
  test("skew-y-1", async () => {
    expect(await renderCurrentTest()).toStrictEqual({
      props: {
        style: {
          transform: [{ skewY: "1deg" }],
        },
      },
    });
  });
});

describe("Transforms - Mixed", () => {
  test("rotate-90 skew-y-1 translate-x-1", async () => {
    expect(
      await renderSimple({
        className: "rotate-90 skew-y-1 translate-x-1",
      }),
    ).toStrictEqual({
      props: {
        style: {
          transform: [
            { skewY: "1deg" },
            { translateX: 3.5 },
            { rotateZ: "90deg" },
          ],
        },
      },
    });
  });

  describe("Transforms - Transform Origin", () => {
    test("origin-center", async () => {
      expect(await renderCurrentTest()).toStrictEqual({
        props: {},
        warnings: { properties: ["transform-origin"] },
      });
    });
    test("origin-top", async () => {
      expect(await renderCurrentTest()).toStrictEqual({
        props: {},
        warnings: { properties: ["transform-origin"] },
      });
    });
    test("origin-top-right", async () => {
      expect(await renderCurrentTest()).toStrictEqual({
        props: {},
        warnings: { properties: ["transform-origin"] },
      });
    });
    test("origin-right", async () => {
      expect(await renderCurrentTest()).toStrictEqual({
        props: {},
        warnings: { properties: ["transform-origin"] },
      });
    });
    test("origin-bottom-right", async () => {
      expect(await renderCurrentTest()).toStrictEqual({
        props: {},
        warnings: { properties: ["transform-origin"] },
      });
    });
    test("origin-bottom", async () => {
      expect(await renderCurrentTest()).toStrictEqual({
        props: {},
        warnings: { properties: ["transform-origin"] },
      });
    });
    test("origin-bottom-left", async () => {
      expect(await renderCurrentTest()).toStrictEqual({
        props: {},
        warnings: { properties: ["transform-origin"] },
      });
    });
    test("origin-left", async () => {
      expect(await renderCurrentTest()).toStrictEqual({
        props: {},
        warnings: { properties: ["transform-origin"] },
      });
    });
    test("origin-top-left", async () => {
      expect(await renderCurrentTest()).toStrictEqual({
        props: {},
        warnings: { properties: ["transform-origin"] },
      });
    });
  });
});
