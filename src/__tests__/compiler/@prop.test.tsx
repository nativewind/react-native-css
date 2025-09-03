import { render, screen } from "@testing-library/react-native";
import { compile } from "react-native-css/compiler";
import { View } from "react-native-css/components";
import {
  compileWithAutoDebug,
  registerCSS,
  testID,
} from "react-native-css/jest";

test("@prop target (nested @media)", () => {
  const compiled = registerCSS(`
    .my-class { 
      @prop test; 
      @media all {
        color: #00f;
      }
    }
  `);

  expect(compiled.stylesheet()).toStrictEqual({
    s: [
      [
        "my-class",
        [
          {
            d: [["#00f", ["test"]]],
            v: [["__rn-css-color", "#00f"]],
            s: [2, 1],
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
    test: "#00f",
    style: {},
  });
});

test("@prop target unparsed", () => {
  const compiled = registerCSS(`
    :root {
      --color-black: #000;
    }

    .my-class { 
      @prop test; 
      color: var(--color-black);
    }
  `);

  expect(compiled.stylesheet()).toStrictEqual({
    s: [
      [
        "my-class",
        [
          {
            d: [[[{}, "var", "color-black", 1], ["test"], 1]],
            dv: 1,
            s: [2, 1],
            v: [["__rn-css-current-color", [{}, "var", "color-black", 1]]],
          },
        ],
      ],
    ],
    vr: [["color-black", [["#000"]]]],
  });

  render(<View testID={testID} className="my-class" />);
  const component = screen.getByTestId(testID);

  expect(component.props).toStrictEqual({
    testID,
    children: undefined,
    test: "#000",
    style: {},
  });
});

test("@prop value: target", () => {
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

test("@prop value: nested target", () => {
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

test("@prop value: wildcard target", () => {
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

test("@prop value: wildcard nested target", () => {
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

test("@prop multiple", () => {
  const compiled = compileWithAutoDebug(`
    .test { 
      color: red; 
      background-color: oklab(40.1% 0.1143 0.045); 
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
                myBackgroundColor: "#7d2429",
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
