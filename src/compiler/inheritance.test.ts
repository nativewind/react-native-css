import { compile } from "../compiler";

test("nested classes", () => {
  const compiled = compile(`
.my-class .test {
  color: red;
}`);

  expect(compiled.stylesheet()).toStrictEqual({
    s: [
      [
        "my-class",
        [
          {
            c: ["my-class"],
            s: [0],
          },
        ],
      ],
      [
        "test",
        [
          {
            cq: [{ n: "my-class" }],
            d: [{ color: "#f00" }],
            v: [["__rn-css-color", "#f00"]],
            s: [1, 2],
          },
        ],
      ],
    ],
  });
});

test("multiple tiers classes", () => {
  const compiled = compile(`
.one .two .test {
  color: red;
}`);

  expect(compiled.stylesheet()).toStrictEqual({
    s: [
      [
        "one",
        [
          {
            c: ["one"],
            s: [0],
          },
        ],
      ],
      [
        "two",
        [
          {
            c: ["two"],
            s: [0],
          },
        ],
      ],
      [
        "test",
        [
          {
            cq: [{ n: "one" }, { n: "two" }],
            d: [{ color: "#f00" }],
            v: [["__rn-css-color", "#f00"]],
            s: [1, 3],
          },
        ],
      ],
    ],
  });
});

test("tiers with multiple classes", () => {
  const compiled = compile(`
.one .two.three .test {
  color: red;
}`);

  expect(compiled.stylesheet()).toStrictEqual({
    s: [
      [
        "one",
        [
          {
            c: ["one"],
            s: [0],
          },
        ],
      ],
      [
        "three",
        [
          {
            c: ["three"],
            s: [0],
          },
        ],
      ],
      [
        "test",
        [
          {
            cq: [
              { n: "one" },
              {
                a: [["a", "className", "*=", "two"]],
                n: "three",
              },
            ],
            d: [{ color: "#f00" }],
            v: [["__rn-css-color", "#f00"]],
            s: [1, 4],
          },
        ],
      ],
    ],
  });
});
