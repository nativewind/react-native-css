import { render, screen } from "@testing-library/react-native";
import { View } from "react-native-css/components/View";
import { registerCSS, testID } from "react-native-css/jest";

/**
 * Tailwind CSS utilities
 *
 * These tests are designed to ensure that complex Tailwind CSS utilities are compiled correctly.
 * For the full Tailwind CSS test suite, see the Nativewind repository.
 */

test("transition", () => {
  const compiled = registerCSS(`
:root, :host {
  --default-transition-duration: 150ms;
  --default-transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
}

.transition {
  transition-property: color, background-color, border-color, outline-color, text-decoration-color, fill, stroke, --tw-gradient-from, --tw-gradient-via, --tw-gradient-to, opacity, box-shadow, transform, translate, scale, rotate, filter, -webkit-backdrop-filter, backdrop-filter, display, visibility, content-visibility, overlay, pointer-events;
  transition-timing-function: var(--tw-ease, var(--default-transition-timing-function));
  transition-duration: var(--tw-duration, var(--default-transition-duration));
}
  `);

  expect(compiled.stylesheet()).toStrictEqual({
    s: [
      [
        "transition",
        [
          {
            a: true,
            d: [
              {
                transitionProperty: [
                  "color",
                  "backgroundColor",
                  "borderColor",
                  "textDecorationColor",
                  "fill",
                  "stroke",
                  "opacity",
                  "boxShadow",
                  "transform",
                  "translate",
                  "scale",
                  "rotate",
                  "filter",
                  "display",
                  "pointerEvents",
                ],
              },
              [
                [
                  {},
                  "var",
                  [
                    "tw-ease",
                    [{}, "var", "default-transition-timing-function", 1],
                  ],
                  1,
                ],
                "transitionTimingFunction",
                1,
              ],
              [
                [
                  {},
                  "var",
                  [
                    "tw-duration",
                    [{}, "var", "default-transition-duration", 1],
                  ],
                  1,
                ],
                "transitionDuration",
                1,
              ],
            ],
            dv: 1,
            s: [2, 1],
          },
        ],
      ],
    ],
    vr: [
      ["default-transition-duration", [[150]]],
      [
        "default-transition-timing-function",
        [[[{}, "cubic-bezier", [0.4, 0, 0.2, 1]]]],
      ],
    ],
  });
});

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

  expect(compiled.stylesheet()).toStrictEqual({
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

test("filter", () => {
  const compiled = registerCSS(`
:root, :host {
  --drop-shadow-md: 0 3px 3px rgb(0 0 0 / 0.12);
}

.brightness-50 {
  --tw-brightness: brightness(50%);
  filter: var(--tw-blur,) var(--tw-brightness,) var(--tw-contrast,) var(--tw-grayscale,) var(--tw-hue-rotate,) var(--tw-invert,) var(--tw-saturate,) var(--tw-sepia,) var(--tw-drop-shadow,);
}

.drop-shadow-md {
  --tw-drop-shadow-size: drop-shadow(0 3px 3px var(--tw-drop-shadow-color, rgb(0 0 0 / 0.12)));
  --tw-drop-shadow: drop-shadow(var(--drop-shadow-md));
  filter: var(--tw-blur,) var(--tw-brightness,) var(--tw-contrast,) var(--tw-grayscale,) var(--tw-hue-rotate,) var(--tw-invert,) var(--tw-saturate,) var(--tw-sepia,) var(--tw-drop-shadow,);
}
  `);

  expect(compiled.stylesheet()).toStrictEqual({
    s: [
      [
        "brightness-50",
        [
          {
            d: [
              [
                [
                  [{}, "var", "tw-blur", 1],
                  [{}, "var", "tw-brightness", 1],
                  [{}, "var", "tw-contrast", 1],
                  [{}, "var", "tw-grayscale", 1],
                  [{}, "var", "tw-hue-rotate", 1],
                  [{}, "var", "tw-invert", 1],
                  [{}, "var", "tw-saturate", 1],
                  [{}, "var", "tw-sepia", 1],
                  [{}, "var", "tw-drop-shadow", 1],
                ],
                "filter",
              ],
            ],
            s: [2, 1],
            v: [["tw-brightness", [{}, "brightness", "50%"]]],
          },
        ],
      ],
      [
        "drop-shadow-md",
        [
          {
            d: [
              [
                [
                  [{}, "var", "tw-blur", 1],
                  [{}, "var", "tw-brightness", 1],
                  [{}, "var", "tw-contrast", 1],
                  [{}, "var", "tw-grayscale", 1],
                  [{}, "var", "tw-hue-rotate", 1],
                  [{}, "var", "tw-invert", 1],
                  [{}, "var", "tw-saturate", 1],
                  [{}, "var", "tw-sepia", 1],
                  [{}, "var", "tw-drop-shadow", 1],
                ],
                "filter",
              ],
            ],
            s: [3, 1],
            v: [
              [
                "tw-drop-shadow-size",
                [
                  {},
                  "drop-shadow",
                  [
                    0,
                    3,
                    3,
                    [{}, "var", ["tw-drop-shadow-color", "#0000001f"], 1],
                  ],
                ],
              ],
              [
                "tw-drop-shadow",
                [{}, "drop-shadow", [{}, "var", "drop-shadow-md", 1]],
              ],
            ],
          },
        ],
      ],
    ],
    vr: [["drop-shadow-md", [[[0, 3, 3, "#0000001f"]]]]],
  });

  render(<View testID={testID} className="brightness-50 drop-shadow-md" />);
  const component = screen.getByTestId(testID);

  expect(component.type).toBe("View");
  expect(component.props).toStrictEqual({
    children: undefined,
    style: {
      filter: [
        { brightness: "50%" },
        {
          dropShadow: {
            blurRadius: 3,
            color: "#0000001f",
            offsetX: 0,
            offsetY: 3,
          },
        },
      ],
    },
    testID,
  });
});

test("line-clamp", () => {
  const compiled = registerCSS(`
    .my-class {
      overflow: hidden;
      display: -webkit-box;
      -webkit-box-orient: vertical;
      -webkit-line-clamp: 1
    }
  `);

  expect(compiled.stylesheet()).toStrictEqual({
    s: [
      [
        "my-class",
        [
          {
            d: [
              {
                overflow: "hidden",
              },
              [1, ["numberOfLines"]],
            ],
            s: [1, 1],
          },
        ],
      ],
    ],
  });

  render(<View testID={testID} className="my-class" />);
  const component = screen.getByTestId(testID);

  expect(component.props).toStrictEqual({
    children: undefined,
    numberOfLines: 1,
    style: {
      overflow: "hidden",
    },
    testID,
  });
});
