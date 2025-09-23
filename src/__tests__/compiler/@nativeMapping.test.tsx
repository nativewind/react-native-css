import { render, screen } from "@testing-library/react-native";
import { compile } from "react-native-css/compiler";
import { View } from "react-native-css/components";
import {
  compileWithAutoDebug,
  registerCSS,
  testID,
} from "react-native-css/jest";

test("@nativeMapping target (nested @media)", () => {
  const compiled = registerCSS(`
    .my-class { 
      @nativeMapping test; 
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

test("@nativeMapping target (nested @media and nested declarations)", () => {
  const compiled = registerCSS(`
    .my-class { 
      @nativeMapping test; 
      @media all {
        & {
          color: #00f;
        }
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
            s: [3, 1],
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

test("@nativeMapping target unparsed", () => {
  const compiled = registerCSS(`
    :root {
      --color-black: #000;
    }

    .my-class { 
      @nativeMapping test; 
      color: var(--color-black);
    }
  `);

  expect(compiled.stylesheet()).toStrictEqual({
    s: [
      [
        "my-class",
        [
          {
            d: [["#000", ["test"]]],
            s: [1, 1],
            v: [["__rn-css-color", "#000"]],
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
    test: "#000",
    style: {},
  });
});

test("@nativeMapping value: target", () => {
  const compiled = registerCSS(`
    .my-class { 
      color: red; 
      background-color: blue; 
      @nativeMapping background-color: myBackgroundColor;
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

test("@nativeMapping value: nested target", () => {
  const compiled = compile(`
    .test { 
      color: red; 
      background-color: blue; 
      @nativeMapping background-color: myBackgroundColor.nested;
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

test("@nativeMapping value: wildcard target", () => {
  const compiled = compile(`
    .test { 
      color: red; 
      background-color: blue; 
      @nativeMapping background-color: &.myBackgroundColor;
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

test("@nativeMapping value: wildcard nested target", () => {
  const compiled = registerCSS(`
    .my-class { 
      color: red; 
      background-color: blue; 
      @nativeMapping background-color: &.myBackgroundColor.test;
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
              ["#00f", ["&", "myBackgroundColor", "test"]],
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

test("@nativeMapping multiple", () => {
  const compiled = compileWithAutoDebug(`
    .test { 
      color: red; 
      background-color: oklab(40.1% 0.1143 0.045); 
      @nativeMapping {
        background-color: &.myBackgroundColor;
        color: &.myColor;
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

test("@nativeMapping dot notation shorthand", () => {
  const compiled = registerCSS(`
    .my-class { 
      @nativeMapping test.nested; 
      @media all {
        color: red;
      }
    }
  `);

  expect(compiled.stylesheet()).toStrictEqual({
    s: [
      [
        "my-class",
        [
          {
            d: [["#f00", ["test", "nested"]]],
            v: [["__rn-css-color", "#f00"]],
            s: [2, 1],
          },
        ],
      ],
    ],
  });

  render(<View testID={testID} className="my-class" />);
  const component = screen.getByTestId(testID);

  expect(component.props).toStrictEqual({
    children: undefined,
    style: {},
    test: {
      nested: "#f00",
    },
    testID: "react-native-css",
  });
});

test("@nativeMapping dot notation, escaped", () => {
  const compiled = registerCSS(`
    .my-class { 
      @nativeMapping test\\.nested; 
      @media all {
        color: red;
      }
    }
  `);

  expect(compiled.stylesheet()).toStrictEqual({
    s: [
      [
        "my-class",
        [
          {
            d: [["#f00", ["test", "nested"]]],
            v: [["__rn-css-color", "#f00"]],
            s: [2, 1],
          },
        ],
      ],
    ],
  });

  render(<View testID={testID} className="my-class" />);
  const component = screen.getByTestId(testID);

  expect(component.props).toStrictEqual({
    children: undefined,
    style: {},
    test: {
      nested: "#f00",
    },
    testID: "react-native-css",
  });
});
