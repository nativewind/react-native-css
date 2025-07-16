import { compile } from "../compiler";

test.skip("test compiler", () => {
  const compiled = compile(`
    .test { 
      @react-native rename {
        backgroundColor: myBackgroundColor;
        borderWidth: my.borderWidth;
        fontSize: ^myFontSize;
        borderColor: ^top.level.nested;
      }
      color: red; 
      background-color: red;
      border-width: 1px;
      font-size: 16px;
      --test: red;
      border-color: blue; 
      border-color: var(--test)
    }
  `);

  expect(compiled).toStrictEqual({
    s: [
      [
        "test",
        [
          [
            {
              s: [1, 1],
              d: [
                {
                  color: "#ff0000",
                },
                ["#ff0000", ["style", "myBackgroundColor"]],
                [1, ["style", "my", "borderWidth"]],
                [16, ["myFontSize"]],
                ["#0000ff", ["top", "level", "nested"]],
                [[{}, "var", ["test"]], ["top", "level", "nested"], 1],
              ],
              dv: 1,
              v: [["test", "red"]],
            },
          ],
        ],
      ],
    ],
  });
});

test.skip("removes unused CSS variables", () => {
  const compiled = compile(`
    .test { 
      --blue: blue;
      --green: green;
      --red: red;
      color: var(--red, var(--blue))
    }
  `);

  expect(compiled).toStrictEqual({
    s: [
      [
        "test",
        [
          [
            {
              s: [1, 1],
              v: [
                ["blue", "blue"],
                ["red", "red"],
              ],
              dv: 1,
              d: [[[{}, "var", ["red", [{}, "var", ["blue"]]]], "color", 1]],
            },
          ],
        ],
      ],
    ],
  });
});

test.skip("preserves unused CSS variables with preserve-variables", () => {
  const compiled = compile(`
    @react-native config {
      preserve-variables: --green, --blue;
    }

    .test { 
      --green: green;
      --red: red;
      color: var(--red)
    }
  `);

  expect(compiled).toStrictEqual({
    s: [
      [
        "test",
        [
          [
            {
              s: [1, 1],
              v: [
                ["green", "green"],
                ["red", "red"],
              ],
              d: [[[{}, "var", ["red"]], "color", 1]],
              dv: 1,
            },
          ],
        ],
      ],
    ],
  });
});

test.skip("transitions", () => {
  const compiled = compile(`
    .test { 
      color: red;
      transition: color 1s linear;
    }
  `);

  expect(compiled).toStrictEqual({
    s: [
      [
        "test",
        [
          [
            {
              d: [
                {
                  color: "#ff0000",
                  transitionDelay: [0],
                  transitionDuration: [1000],
                  transitionProperty: ["color"],
                  transitionTimingFunction: ["linear"],
                },
              ],
              s: [1, 1],
            },
          ],
        ],
      ],
    ],
  });
});

test.skip("animations", () => {
  const compiled = compile(`
    .test { 
      animation: spin 1s linear infinite;
    }

    @keyframes spin {
      to {
        transform: rotate(360deg);
      }
    }
  `);

  expect(compiled).toStrictEqual({
    k: [
      [
        "spin",
        [
          {
            0: { transform: [[{}, "rotate", "0deg"]] },
            100: { transform: [[{}, "rotate", "360deg"]] },
          },
        ],
      ],
    ],
    s: [
      [
        "test",
        [
          [
            {
              a: 1,
              d: [
                {
                  animationDelay: [0],
                  animationDirection: ["normal"],
                  animationDuration: [1000],
                  animationFillMode: ["none"],
                  animationIterationCount: [-1],
                  animationName: [[{}, "animation", ["spin"], 1]],
                  animationPlayState: ["running"],
                  animationTimingFunction: ["linear"],
                },
              ],
              s: [1, 1],
            },
          ],
        ],
      ],
    ],
  });
});
