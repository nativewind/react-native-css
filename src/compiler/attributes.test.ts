import { compile } from "../compiler";

test("multiple classes", () => {
  const compiled = compile(`
.my-class.test {
  color: red;
}`);

  expect(compiled).toStrictEqual({
    s: [
      [
        "test",
        [
          {
            aq: [["a", "className", "*=", "my-class"]],
            d: [
              {
                color: "#f00",
              },
            ],
            s: [1, 2],
          },
        ],
      ],
    ],
  });
});
