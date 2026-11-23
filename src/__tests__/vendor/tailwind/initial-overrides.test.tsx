import { dimensions } from "../../../native/reactivity";
import { renderSimple } from "./_tailwind";

// `via-none` and `*-initial` set a variable to `initial`, so under a variant they override the colour another utility sets, and the reader takes its fallback
describe.each([
  ["narrow", 375],
  ["md", 1024],
] as const)(
  "Tailwind utilities that set a variable to initial, %s",
  (_size, width) => {
    beforeEach(() => {
      dimensions.set({ ...dimensions.get(), width });
    });

    test("md:via-none", async () => {
      const via = width >= 768 ? "" : " #00c950 50%,";

      expect(
        await renderSimple({
          className:
            "bg-linear-to-r from-red-500 via-green-500 md:via-none to-blue-500",
        }),
      ).toStrictEqual({
        props: {
          style: {
            experimental_backgroundImage: `linear-gradient(to right, #fb2c36 0%,${via} #2b7fff 100%)`,
          },
        },
      });
    });

    test("md:shadow-initial", async () => {
      const color = width >= 768 ? "#0000001a" : "#fb2c36";

      expect(
        await renderSimple({
          className: "shadow-md shadow-red-500 md:shadow-initial",
        }),
      ).toStrictEqual({
        props: {
          style: {
            boxShadow: [
              {
                blurRadius: 6,
                color,
                offsetX: 0,
                offsetY: 4,
                spreadDistance: -1,
              },
              {
                blurRadius: 4,
                color,
                offsetX: 0,
                offsetY: 2,
                spreadDistance: -2,
              },
            ],
          },
        },
      });
    });

    test("md:inset-shadow-initial", async () => {
      const color = width >= 768 ? "#0000000d" : "#fb2c36";

      expect(
        await renderSimple({
          className:
            "inset-shadow-sm inset-shadow-red-500 md:inset-shadow-initial",
        }),
      ).toStrictEqual({
        props: {
          style: {
            boxShadow: [
              { blurRadius: 4, color, inset: true, offsetX: 0, offsetY: 2 },
            ],
          },
        },
      });
    });
  },
);
