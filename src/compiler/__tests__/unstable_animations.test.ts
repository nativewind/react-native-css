import { compile } from "../compiler";

test.skip("test compiler", () => {
  const compiled = compile(
    `
    .test { 
      animation: slide-in 1s;
    }
      
    @keyframes slide-in {
      from {
        margin-left: 100%;
      }

      to {
        margin-left: 0%;
      }
    }
  `,
  );

  expect(compiled).toStrictEqual({
    k: [
      [
        "slide-in",
        [
          ["from", [{ marginLeft: "100%" }]],
          ["to", [{ marginLeft: "0%" }]],
        ],
      ],
    ],
    s: [
      [
        "test",
        [
          [
            {
              s: [1, 1],
              d: [
                {
                  animationName: [[{}, "animation", ["slide-in"], 1]],
                  animationDuration: [1000],
                  animationTimingFunction: ["ease"],
                  animationIterationCount: [1],
                  animationDirection: ["normal"],
                  animationPlayState: ["running"],
                  animationDelay: [0],
                  animationFillMode: ["none"],
                },
              ],
            },
          ],
        ],
      ],
    ],
  });
});
