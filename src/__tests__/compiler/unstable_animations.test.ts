import { compile } from "react-native-css/compiler";

test("test compiler", () => {
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

  expect(compiled.stylesheet()).toStrictEqual({
    k: [
      [
        "slide-in",
        [
          [
            "from",
            [
              {
                marginLeft: "100%",
              },
            ],
          ],
          [
            "to",
            [
              {
                marginLeft: "0%",
              },
            ],
          ],
        ],
      ],
    ],
    s: [
      [
        "test",
        [
          {
            a: true,
            d: [
              [[[{}, "animationName", ["slide-in"], 1]], "animationName"],
              {
                animationDelay: [0],
                animationDirection: ["normal"],
                animationDuration: [1000],
                animationFillMode: ["none"],
                animationIterationCount: [1],
                animationPlayState: ["running"],
                animationTimingFunction: "ease",
              },
            ],
            s: [1, 1],
          },
        ],
      ],
    ],
  });
});
