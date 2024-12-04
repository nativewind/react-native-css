import { compile } from "../compiler";

test("test compiler", () => {
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
              v: [["test", "red"]],
            },
          ],
        ],
      ],
    ],
  });
});

test("removes unused CSS variables", () => {
  const compiled = compile(`
    .test { 
      --blue: blue;
      --green: green;
      --red: red;
      color: var(--red, var(--blue))
    }
  `);

  console.log(JSON.stringify(compiled, null, 2));
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
              d: [[[{}, "var", ["red", [{}, "var", ["blue"]]]], "color", 1]],
            },
          ],
        ],
      ],
    ],
  });
});

test("preserves unused CSS variables with preserve-variables", () => {
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
            },
          ],
        ],
      ],
    ],
  });
});
