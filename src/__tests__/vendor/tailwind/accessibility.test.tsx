import { renderCurrentTest } from "./_tailwind";

describe("Accessibility - Screen Readers", () => {
  test("sr-only", async () => {
    const result = await renderCurrentTest();
    expect(result).toStrictEqual({
      props: {
        style: {
          borderWidth: 0,
          height: 1,
          margin: -1,
          overflow: "hidden",
          padding: 0,
          position: "absolute",
          width: 1,
        },
      },
      warnings: {
        properties: ["clip", "white-space"],
      },
    });
  });

  test("not-sr-only", async () => {
    const result = await renderCurrentTest();
    expect(result).toStrictEqual({
      props: {
        style: {
          margin: 0,
          overflow: "visible",
          padding: 0,
          position: "static",
        },
      },
      warnings: {
        properties: ["clip", "white-space"],
        values: {
          width: "auto",
          height: "auto",
        },
      },
    });
  });
});
