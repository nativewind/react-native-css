import { compile } from "../compiler";

test("nested classes", () => {
  const compiled = compile(`
.my-class .test {
  color: red;
}`);

  expect(compiled).toStrictEqual({
    s: [
      [
        "test",
        [
          {
            cq: [{ n: "my-class" }],
            d: [{ color: "rgb(100% 0% 0%)" }],
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

  expect(compiled).toStrictEqual({
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
            d: [{ color: "rgb(100% 0% 0%)" }],
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

  expect(compiled).toStrictEqual({
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
            aq: [["a", "className", "*=", "two"]],
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
            d: [{ color: "rgb(100% 0% 0%)" }],
            s: [1, 4],
          },
        ],
      ],
    ],
  });
});
