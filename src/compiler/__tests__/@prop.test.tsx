import { render, screen } from "@testing-library/react-native";
import { View } from "react-native-css/components";
import { registerCSS, testID } from "react-native-css/jest";

import { compile } from "../compiler";

test("@prop single", () => {
  const compiled = registerCSS(`
    .my-class { 
      color: red; 
      background-color: blue; 
      @prop background-color: myBackgroundColor;
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
                color: "#f00",
              },
              ["#00f", ["myBackgroundColor"]],
            ],
            v: [["__rn-css-color", "#f00"]],
            s: [1, 1],
          },
        ],
      ],
    ],
  });

  render(<View testID={testID} className="my-class" />);
  const component = screen.getByTestId(testID);

  expect(component.props).toStrictEqual({
    testID,
    children: undefined,
    myBackgroundColor: "#00f",
    style: {
      color: "#f00",
    },
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

  expect(compiled.stylesheet()).toStrictEqual({
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

test("@prop single, on target", () => {
  const compiled = compile(`
    .test { 
      color: red; 
      background-color: blue; 
      @prop background-color: *.myBackgroundColor;
    }
  `);

  expect(compiled.stylesheet()).toStrictEqual({
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

test("@prop single, nested", () => {
  const compiled = registerCSS(`
    .my-class { 
      color: red; 
      background-color: blue; 
      @prop background-color: *.myBackgroundColor.test;
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
                color: "#f00",
              },
              ["#00f", ["*", "myBackgroundColor", "test"]],
            ],
            v: [["__rn-css-color", "#f00"]],
            s: [1, 1],
          },
        ],
      ],
    ],
  });

  render(<View testID={testID} className="my-class" />);
  const component = screen.getByTestId(testID);

  expect(component.props.style).toStrictEqual({
    color: "#f00",
    myBackgroundColor: {
      test: "#00f",
    },
  });
});

test("@prop single, top level, nested", () => {
  const compiled = compile(`
    .test { 
      color: red; 
      background-color: blue; 
      @prop background-color: myBackgroundColor.test;
    }
  `);

  expect(compiled.stylesheet()).toStrictEqual({
    s: [
      [
        "test",
        [
          {
            d: [
              {
                color: "#f00",
              },
              ["#00f", ["myBackgroundColor", "test"]],
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
        background-color: *.myBackgroundColor;
        color: *.myColor;
      }
    }
  `);

  expect(compiled.stylesheet()).toStrictEqual({
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
