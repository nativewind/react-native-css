import { fireEvent, render, screen } from "@testing-library/react-native";
import { View } from "react-native-css/components/View";
import { registerCSS } from "react-native-css/jest";

const parentID = "parent";
const childID = "child";

test("Unnamed containers", () => {
  registerCSS(`
    :root, :host {
      --color-white: #fff;
    }
    .\\@container {
      container-type: inline-size;
    }
    .\\@sm\\:text-white {
      @container (width >= 24rem) {
        color: var(--color-white);
      }
    }
  `);

  render(
    <View testID={parentID} className="@container">
      <View testID={childID} className="@sm:text-white" />
    </View>,
  );

  const parent = screen.getByTestId(parentID);
  const child = screen.getByTestId(childID);

  expect(child).toHaveStyle(undefined);

  // Jest does not fire layout events, so we need to manually
  fireEvent(parent, "layout", {
    nativeEvent: {
      layout: {
        width: 500,
        height: 200,
      },
    },
  });

  expect(child).toHaveStyle({ color: "#fff" });
});

test("container query width", () => {
  registerCSS(`
      .container {
        container-name: my-container;
        width: 200px;
      }

      .child {
        color: red;
      }

      @container (width > 400px) {
        .child {
          color: blue;
        }
      }
    `);

  render(
    <View testID={parentID} className="container">
      <View testID={childID} className="child" />
    </View>,
  );

  const parent = screen.getByTestId(parentID);
  const child = screen.getByTestId(childID);

  expect(parent.props.style).toStrictEqual({
    width: 200,
  });

  expect(child.props.style).toStrictEqual({
    color: "#f00",
  });

  fireEvent(parent, "layout", {
    nativeEvent: {
      layout: {
        width: 200,
        height: 200,
      },
    },
  });

  expect(child.props.style).toStrictEqual({
    color: "#f00",
  });

  screen.rerender(
    <View testID={parentID} className="container" style={{ width: 500 }}>
      <View testID={childID} className="child" />
    </View>,
  );

  fireEvent(parent, "layout", {
    nativeEvent: {
      layout: {
        width: 500,
        height: 200,
      },
    },
  });

  expect(parent.props.style).toStrictEqual({ width: 500 });

  expect(child.props.style).toStrictEqual({
    color: "#00f",
  });
});

describe("size feature comparisons", () => {
  /**
   * Every case is measured against the same 400x200 container, so the only
   * variable is the comparison operator. `min-`/`max-` prefixes are normalised
   * by lightningcss into `>=`/`<=` range conditions, which is why they belong
   * in this table rather than in one of their own.
   */
  const cases: [condition: string, matches: boolean][] = [
    ["width > 300px", true],
    ["width > 400px", false],
    ["width >= 400px", true],
    ["width >= 401px", false],
    ["min-width: 400px", true],
    ["min-width: 401px", false],
    ["width < 500px", true],
    ["width < 400px", false],
    ["width <= 400px", true],
    ["width <= 399px", false],
    ["max-width: 400px", true],
    ["max-width: 399px", false],
    ["width = 400px", true],
    ["width = 401px", false],
  ];

  test.each(cases)(
    "@container (%s) against a 400px container matches: %s",
    (condition, matches) => {
      registerCSS(`
        .container {
          container-type: inline-size;
        }

        .child {
          color: red;
        }

        @container (${condition}) {
          .child {
            color: blue;
          }
        }
      `);

      render(
        <View testID={parentID} className="container">
          <View testID={childID} className="child" />
        </View>,
      );

      const parent = screen.getByTestId(parentID);
      const child = screen.getByTestId(childID);

      fireEvent(parent, "layout", {
        nativeEvent: {
          layout: {
            width: 400,
            height: 200,
          },
        },
      });

      expect(child.props.style).toStrictEqual({
        color: matches ? "#00f" : "#f00",
      });
    },
  );
});
