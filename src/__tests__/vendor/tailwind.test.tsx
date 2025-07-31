import { View } from "react-native-css/components/View";
import { registerCSS, render, screen, testID } from "react-native-css/jest";

/**
 * Tailwind CSS utilities
 *
 * These tests are designed to ensure that complex Tailwind CSS utilities are compiled correctly.
 * For the full Tailwind CSS test suite, see the Nativewind repository.
 */

test("box-shadow", () => {
  const compiled = registerCSS(`
.shadow-xl {
  --tw-shadow: 0 20px 25px -5px var(--tw-shadow-color, rgb(0 0 0 / 0.1)), 0 8px 10px -6px var(--tw-shadow-color, rgb(0 0 0 / 0.1));
  box-shadow: var(--tw-inset-shadow), var(--tw-inset-ring-shadow), var(--tw-ring-offset-shadow), var(--tw-ring-shadow), var(--tw-shadow);
}
.shadow-red-500 {
  --tw-shadow-color: oklch(63.7% 0.237 25.331);
  @supports (color: color-mix(in lab, red, red)) {
    --tw-shadow-color: color-mix(in oklab, var(--color-red-500) var(--tw-shadow-alpha), transparent);
  }
}
  `);

  expect(compiled).toStrictEqual({
    s: [
      [
        "shadow-xl",
        [
          {
            d: [
              [
                [
                  {},
                  "@boxShadow",
                  [
                    [{}, "var", "tw-inset-shadow", 1],
                    [{}, "var", "tw-inset-ring-shadow", 1],
                    [{}, "var", "tw-ring-offset-shadow", 1],
                    [{}, "var", "tw-ring-shadow", 1],
                    [{}, "var", "tw-shadow", 1],
                  ],
                  1,
                ],
                "boxShadow",
                1,
              ],
            ],
            dv: 1,
            s: [1, 1],
            v: [
              [
                "tw-shadow",
                [
                  [
                    0,
                    20,
                    25,
                    -5,
                    [{}, "var", ["tw-shadow-color", "#0000001a"], 1],
                  ],
                  [
                    0,
                    8,
                    10,
                    -6,
                    [{}, "var", ["tw-shadow-color", "#0000001a"], 1],
                  ],
                ],
              ],
            ],
          },
        ],
      ],
      [
        "shadow-red-500",
        [
          {
            s: [2, 1],
            v: [["tw-shadow-color", "#fb2c36"]],
          },
        ],
      ],
    ],
  });

  render(<View testID={testID} className="shadow-xl shadow-red-500" />);
  const component = screen.getByTestId(testID);

  expect(component.type).toBe("View");
  expect(component.props).toStrictEqual({
    children: undefined,
    style: {
      boxShadow: [
        {
          blurRadius: 25,
          color: "#fb2c36",
          offsetX: 0,
          offsetY: 20,
          spreadDistance: -5,
        },
        {
          blurRadius: 10,
          color: "#fb2c36",
          offsetX: 0,
          offsetY: 8,
          spreadDistance: -6,
        },
      ],
    },
    testID,
  });
});
