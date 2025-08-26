import { renderCurrentTest } from "./_tailwind";

describe("Filters - Blur", () => {
  test("blur-xs", async () => {
    expect(await renderCurrentTest()).toStrictEqual({
      props: {
        style: {
          filter: [{ blur: 4 }],
        },
      },
      warnings: {
        values: {
          filter: [
            "initial",
            "initial",
            "initial",
            "initial",
            "initial",
            "initial",
            "initial",
            "initial",
            "initial",
            "initial",
            "initial",
            "initial",
          ],
        },
      },
    });
  });
});

describe("Filters - Brightness", () => {
  test("brightness-0", async () => {
    expect(await renderCurrentTest()).toStrictEqual({
      props: {
        style: {
          filter: [{ brightness: "0%" }],
        },
      },
      warnings: {
        values: {
          filter: [
            "initial",
            "initial",
            "initial",
            "initial",
            "initial",
            "initial",
            "initial",
            "initial",
            "initial",
            "initial",
            "initial",
            "initial",
          ],
        },
      },
    });
  });
});

describe("Filters - Contrast", () => {
  test("contrast-0", async () => {
    expect(await renderCurrentTest()).toStrictEqual({
      props: {
        style: {
          filter: [{ contrast: "0%" }],
        },
      },
      warnings: {
        values: {
          filter: [
            "initial",
            "initial",
            "initial",
            "initial",
            "initial",
            "initial",
            "initial",
            "initial",
            "initial",
            "initial",
            "initial",
            "initial",
          ],
        },
      },
    });
  });
  test("contrast-50", async () => {
    expect(await renderCurrentTest()).toStrictEqual({
      props: {
        style: {
          filter: [{ contrast: "50%" }],
        },
      },
      warnings: {
        values: {
          filter: [
            "initial",
            "initial",
            "initial",
            "initial",
            "initial",
            "initial",
            "initial",
            "initial",
            "initial",
            "initial",
            "initial",
            "initial",
          ],
        },
      },
    });
  });
  test("contrast-200", async () => {
    expect(await renderCurrentTest()).toStrictEqual({
      props: {
        style: {
          filter: [{ contrast: "200%" }],
        },
      },
      warnings: {
        values: {
          filter: [
            "initial",
            "initial",
            "initial",
            "initial",
            "initial",
            "initial",
            "initial",
            "initial",
            "initial",
            "initial",
            "initial",
            "initial",
          ],
        },
      },
    });
  });
});

describe("Filters - Drop Shadow", () => {
  test("drop-shadow", async () => {
    expect(await renderCurrentTest()).toStrictEqual({
      props: {
        style: {
          filter: [
            [
              {
                dropShadow: {
                  blurRadius: 2,
                  color: "#0000001a",
                  offsetX: 0,
                  offsetY: 1,
                },
              },
              {
                dropShadow: {
                  blurRadius: 1,
                  color: "#0000000f",
                  offsetX: 0,
                  offsetY: 1,
                },
              },
            ],
          ],
        },
      },
      warnings: {
        values: {
          filter: [
            "initial",
            "initial",
            "initial",
            "initial",
            "initial",
            "initial",
            "initial",
            "initial",
            "initial",
            "initial",
            "initial",
            "initial",
          ],
        },
      },
    });
  });
});

describe("Filters - Grayscale", () => {
  test("grayscale", async () => {
    expect(await renderCurrentTest()).toStrictEqual({
      props: {
        style: {
          filter: [{ grayscale: "100%" }],
        },
      },
      warnings: {
        values: {
          filter: [
            "initial",
            "initial",
            "initial",
            "initial",
            "initial",
            "initial",
            "initial",
            "initial",
            "initial",
            "initial",
            "initial",
            "initial",
          ],
        },
      },
    });
  });
  test("grayscale-0", async () => {
    expect(await renderCurrentTest()).toStrictEqual({
      props: {
        style: {
          filter: [{ grayscale: "0%" }],
        },
      },
      warnings: {
        values: {
          filter: [
            "initial",
            "initial",
            "initial",
            "initial",
            "initial",
            "initial",
            "initial",
            "initial",
            "initial",
            "initial",
            "initial",
            "initial",
          ],
        },
      },
    });
  });
});

describe("Filters - Hue Rotate", () => {
  test("hue-rotate-0", async () => {
    expect(await renderCurrentTest()).toStrictEqual({
      props: {
        style: {
          filter: [{ hueRotate: "0deg" }],
        },
      },
      warnings: {
        values: {
          filter: [
            "initial",
            "initial",
            "initial",
            "initial",
            "initial",
            "initial",
            "initial",
            "initial",
            "initial",
            "initial",
            "initial",
            "initial",
          ],
        },
      },
    });
  });
  test("hue-rotate-180", async () => {
    expect(await renderCurrentTest()).toStrictEqual({
      props: {
        style: {
          filter: [{ hueRotate: "180deg" }],
        },
      },
      warnings: {
        values: {
          filter: [
            "initial",
            "initial",
            "initial",
            "initial",
            "initial",
            "initial",
            "initial",
            "initial",
            "initial",
            "initial",
            "initial",
            "initial",
          ],
        },
      },
    });
  });
});

describe("Filters - Invert", () => {
  test("invert-0", async () => {
    expect(await renderCurrentTest()).toStrictEqual({
      props: {
        style: {
          filter: [{ invert: "0%" }],
        },
      },

      warnings: {
        values: {
          filter: [
            "initial",
            "initial",
            "initial",
            "initial",
            "initial",
            "initial",
            "initial",
            "initial",
            "initial",
            "initial",
            "initial",
            "initial",
          ],
        },
      },
    });
  });
  test("invert", async () => {
    expect(await renderCurrentTest()).toStrictEqual({
      props: {
        style: {
          filter: [{ invert: "100%" }],
        },
      },

      warnings: {
        values: {
          filter: [
            "initial",
            "initial",
            "initial",
            "initial",
            "initial",
            "initial",
            "initial",
            "initial",
            "initial",
            "initial",
            "initial",
            "initial",
          ],
        },
      },
    });
  });
});

describe("Filters - Saturate", () => {
  test("saturate-0", async () => {
    expect(await renderCurrentTest()).toStrictEqual({
      props: {
        style: {
          filter: [{ saturate: "0%" }],
        },
      },

      warnings: {
        values: {
          filter: [
            "initial",
            "initial",
            "initial",
            "initial",
            "initial",
            "initial",
            "initial",
            "initial",
            "initial",
            "initial",
            "initial",
            "initial",
          ],
        },
      },
    });
  });
  test("saturate-100", async () => {
    expect(await renderCurrentTest()).toStrictEqual({
      props: {
        style: {
          filter: [{ saturate: "100%" }],
        },
      },

      warnings: {
        values: {
          filter: [
            "initial",
            "initial",
            "initial",
            "initial",
            "initial",
            "initial",
            "initial",
            "initial",
            "initial",
            "initial",
            "initial",
            "initial",
          ],
        },
      },
    });
  });
});

describe("Filters - Sepia", () => {
  test("sepia", async () => {
    expect(await renderCurrentTest()).toStrictEqual({
      props: {
        style: {
          filter: [{ sepia: "100%" }],
        },
      },
      warnings: {
        values: {
          filter: [
            "initial",
            "initial",
            "initial",
            "initial",
            "initial",
            "initial",
            "initial",
            "initial",
            "initial",
            "initial",
            "initial",
            "initial",
          ],
        },
      },
    });
  });
});

describe("Filters - Backdrop Blur", () => {
  test("backdrop-blur-none", async () => {
    expect(await renderCurrentTest()).toStrictEqual({
      props: {},
      warnings: { properties: ["backdrop-filter", "backdrop-filter"] },
    });
  });
});

describe("Filters - Backdrop Brightness", () => {
  test("backdrop-brightness-0", async () => {
    expect(await renderCurrentTest()).toStrictEqual({
      props: {},
      warnings: { properties: ["backdrop-filter", "backdrop-filter"] },
    });
  });
});

describe("Filters - Backdrop Contrast", () => {
  test("backdrop-contrast-0", async () => {
    expect(await renderCurrentTest()).toStrictEqual({
      props: {},
      warnings: { properties: ["backdrop-filter", "backdrop-filter"] },
    });
  });
});

describe("Filters - Backdrop Grayscale", () => {
  test("backdrop-grayscale-0", async () => {
    expect(await renderCurrentTest()).toStrictEqual({
      props: {},
      warnings: { properties: ["backdrop-filter", "backdrop-filter"] },
    });
  });
});

describe("Filters - Backdrop Hue Rotate", () => {
  test("backdrop-hue-rotate-0", async () => {
    expect(await renderCurrentTest()).toStrictEqual({
      props: {},
      warnings: { properties: ["backdrop-filter", "backdrop-filter"] },
    });
  });
});

describe("Filters - Backdrop Invert", () => {
  test("backdrop-invert-0", async () => {
    expect(await renderCurrentTest()).toStrictEqual({
      props: {},
      warnings: { properties: ["backdrop-filter", "backdrop-filter"] },
    });
  });
});

describe("Filters - Backdrop Opacity", () => {
  test("backdrop-opacity-0", async () => {
    expect(await renderCurrentTest()).toStrictEqual({
      props: {},
      warnings: { properties: ["backdrop-filter", "backdrop-filter"] },
    });
  });
});

describe("Filters - Backdrop Saturate", () => {
  test("backdrop-saturate-0", async () => {
    expect(await renderCurrentTest()).toStrictEqual({
      props: {},
      warnings: { properties: ["backdrop-filter", "backdrop-filter"] },
    });
  });
});

describe("Filters - Backdrop Sepia", () => {
  test("backdrop-sepia-0", async () => {
    expect(await renderCurrentTest()).toStrictEqual({
      props: {},
      warnings: { properties: ["backdrop-filter", "backdrop-filter"] },
    });
  });
});
