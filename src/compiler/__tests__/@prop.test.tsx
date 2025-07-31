import { compile } from "../compiler";

test("@prop single", () => {
  const compiled = compile(`
    .test { 
      color: red; 
      background-color: blue; 
      @prop background-color: myBackgroundColor;
    }
  `);

  expect(compiled).toStrictEqual({
    s: [
      [
        "test",
        [
          {
            d: [
              {
                color: "#f00",
                myBackgroundColor: "#00f",
              },
            ],
            v: [["__rn-css-color", "#f00"]],
            s: [1, 1],
          },
        ],
      ],
    ],
  });
});

test("@prop single, nested value", () => {
  const compiled = compile(`
    .test { 
      color: red; 
      background-color: blue; 
      @prop background-color: myBackgroundColor.nested;
    }
  `);

  expect(compiled).toStrictEqual({
    s: [
      [
        "test",
        [
          {
            d: [
              {
                color: "#f00",
              },
              ["#00f", ["myBackgroundColor", "nested"]],
            ],
            s: [1, 1],
            v: [["__rn-css-color", "#f00"]],
          },
        ],
      ],
    ],
  });
});

test("@prop single, top level", () => {
  const compiled = compile(`
    .test { 
      color: red; 
      background-color: blue; 
      @prop background-color: ^myBackgroundColor;
    }
  `);

  expect(compiled).toStrictEqual({
    s: [
      [
        "test",
        [
          {
            d: [
              {
                color: "#f00",
              },
              ["#00f", ["^", "myBackgroundColor"]],
            ],
            v: [["__rn-css-color", "#f00"]],
            s: [1, 1],
          },
        ],
      ],
    ],
  });
});

test("@prop single, top level, nested", () => {
  const compiled = compile(`
    .test { 
      color: red; 
      background-color: blue; 
      @prop background-color: ^myBackgroundColor.test;
    }
  `);

  expect(compiled).toStrictEqual({
    s: [
      [
        "test",
        [
          {
            d: [
              {
                color: "#f00",
              },
              ["#00f", ["^", "myBackgroundColor", "test"]],
            ],
            v: [["__rn-css-color", "#f00"]],
            s: [1, 1],
          },
        ],
      ],
    ],
  });
});

test("@prop single, top level, nested", () => {
  const compiled = compile(`
    .test { 
      color: red; 
      background-color: blue; 
      @prop background-color: ^myBackgroundColor.test;
    }
  `);

  expect(compiled).toStrictEqual({
    s: [
      [
        "test",
        [
          {
            d: [
              {
                color: "#f00",
              },
              ["#00f", ["^", "myBackgroundColor", "test"]],
            ],
            s: [1, 1],
            v: [["__rn-css-color", "#f00"]],
          },
        ],
      ],
    ],
  });
});

test("@prop multiple", () => {
  const compiled = compile(`
    .test { 
      color: red; 
      background-color: blue; 
      @prop {
        background-color: myBackgroundColor;
        color: myColor;
      }
    }
  `);

  expect(compiled).toStrictEqual({
    s: [
      [
        "test",
        [
          {
            d: [
              {
                myBackgroundColor: "#00f",
                myColor: "#f00",
              },
            ],
            v: [["__rn-css-color", "#f00"]],
            s: [1, 1],
          },
        ],
      ],
    ],
  });
});
