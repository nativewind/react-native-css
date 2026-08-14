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

/**
 * Renders `.child` inside a container laid out at `width` x `height`, and
 * reports whether the `@container <condition>` rule won.
 *
 * `.child` is red outside the query and blue inside it, so the returned colour
 * is a direct reading of the condition's verdict.
 *
 * The condition is written out in full, parentheses included, because a
 * parenthesised size query is only one of the forms `<container-condition>`
 * accepts — `style(--foo: bar)` and a leading container name are not
 * expressible by a helper that adds the parentheses itself.
 */
function containerQueryMatches(
  condition: string,
  { width, height }: { width: number; height: number },
): boolean {
  registerCSS(`
    .container {
      container-type: size;
    }

    .child {
      color: red;
    }

    @container ${condition} {
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
    nativeEvent: { layout: { width, height } },
  });

  return child.props.style.color === "#00f";
}

describe("width comparisons", () => {
  /**
   * Every case is measured against the same 400x200 container, so the only
   * variable is the comparison operator. `min-`/`max-` prefixes are normalised
   * by lightningcss into `>=`/`<=` range conditions, which is why they belong
   * in this table rather than in one of their own.
   */
  const cases: [condition: string, matches: boolean][] = [
    ["(width > 300px)", true],
    ["(width > 400px)", false],
    ["(width >= 400px)", true],
    ["(width >= 401px)", false],
    ["(min-width: 400px)", true],
    ["(min-width: 401px)", false],
    ["(width < 500px)", true],
    ["(width < 400px)", false],
    ["(width <= 400px)", true],
    ["(width <= 399px)", false],
    ["(max-width: 400px)", true],
    ["(max-width: 399px)", false],
    ["(width = 400px)", true],
    ["(width = 401px)", false],
  ];

  test.each(cases)(
    "@container %s against a 400x200 container matches: %s",
    (condition, matches) => {
      expect(
        containerQueryMatches(condition, { width: 400, height: 200 }),
      ).toBe(matches);
    },
  );
});

describe("height comparisons", () => {
  /**
   * The same 400x200 container. Height is deliberately the smaller of the two
   * axes so that a height feature reading the container's width instead is a
   * visible failure rather than a coincidence.
   */
  const cases: [condition: string, matches: boolean][] = [
    ["(height > 100px)", true],
    ["(height > 200px)", false],
    ["(height > 300px)", false],
    ["(height >= 200px)", true],
    ["(min-height: 200px)", true],
    ["(min-height: 201px)", false],
    ["(height < 300px)", true],
    ["(height < 200px)", false],
    ["(height <= 200px)", true],
    ["(max-height: 300px)", true],
    ["(max-height: 199px)", false],
    ["(height = 200px)", true],
    ["(height = 400px)", false],
  ];

  test.each(cases)(
    "@container %s against a 400x200 container matches: %s",
    (condition, matches) => {
      expect(
        containerQueryMatches(condition, { width: 400, height: 200 }),
      ).toBe(matches);
    },
  );
});

describe("aspect ratio", () => {
  /**
   * A container's aspect ratio is its width over its height, so every case
   * names the container it is measured against — the 400x200 landscape one is
   * exactly 2, the 200x400 portrait one exactly 0.5, and 300x300 exactly 1.
   */
  const cases: [
    condition: string,
    size: { width: number; height: number },
    matches: boolean,
  ][] = [
    ["(aspect-ratio > 1)", { width: 400, height: 200 }, true],
    ["(aspect-ratio > 1)", { width: 200, height: 400 }, false],
    ["(aspect-ratio > 1)", { width: 300, height: 300 }, false],
    ["(aspect-ratio < 1)", { width: 200, height: 400 }, true],
    ["(aspect-ratio < 1)", { width: 400, height: 200 }, false],
    ["(aspect-ratio: 2/1)", { width: 400, height: 200 }, true],
    ["(aspect-ratio: 2/1)", { width: 300, height: 300 }, false],
    ["(min-aspect-ratio: 2/1)", { width: 400, height: 200 }, true],
    ["(min-aspect-ratio: 2/1)", { width: 399, height: 200 }, false],
    ["(max-aspect-ratio: 2/1)", { width: 400, height: 200 }, true],
    ["(max-aspect-ratio: 2/1)", { width: 401, height: 200 }, false],
  ];

  test.each(cases)(
    "@container %s against a %o container matches: %s",
    (condition, size, matches) => {
      expect(containerQueryMatches(condition, size)).toBe(matches);
    },
  );
});

describe("interval (range pair) conditions", () => {
  /**
   * A 600x200 container, so both bounds of an interval on either axis can be
   * placed on either side of the measured value. Each bound is exercised open
   * and closed, because an interval is two comparisons and getting one of them
   * wrong still looks like an interval.
   */
  const cases: [condition: string, matches: boolean][] = [
    ["(400px < width < 800px)", true],
    ["(400px < width < 500px)", false],
    ["(700px < width < 800px)", false],
    // The measured width sits exactly on a bound: open excludes it, closed
    // includes it, at both ends.
    ["(600px < width < 800px)", false],
    ["(600px <= width < 800px)", true],
    ["(400px < width < 600px)", false],
    ["(400px < width <= 600px)", true],
    // The same interval written in the other direction.
    ["(800px > width > 400px)", true],
    ["(500px > width > 400px)", false],
    ["(100px < height < 300px)", true],
    ["(100px < height < 200px)", false],
  ];

  test.each(cases)(
    "@container %s against a 600x200 container matches: %s",
    (condition, matches) => {
      expect(
        containerQueryMatches(condition, { width: 600, height: 200 }),
      ).toBe(matches);
    },
  );
});

describe("a condition the compiler cannot evaluate", () => {
  /**
   * A `@container` block the compiler cannot compile a condition for must not
   * reach the runtime at all. The failure mode this pins is not a missed match
   * but the reverse: a block emitted with no condition applies to every child
   * that carries the class, at every container size.
   */
  const cases: [label: string, condition: string][] = [
    ["style()", "style(--foo: bar)"],
    ["an unresolvable feature value", "(width > env(safe-area-inset-top))"],
  ];

  test.each(cases)("@container %s never matches", (_label, condition) => {
    expect(containerQueryMatches(condition, { width: 400, height: 200 })).toBe(
      false,
    );
    expect(containerQueryMatches(condition, { width: 200, height: 400 })).toBe(
      false,
    );
  });
});

describe("orientation", () => {
  const cases: [
    condition: string,
    size: { width: number; height: number },
    matches: boolean,
  ][] = [
    ["(orientation: landscape)", { width: 400, height: 200 }, true],
    ["(orientation: portrait)", { width: 400, height: 200 }, false],
    ["(orientation: landscape)", { width: 200, height: 400 }, false],
    ["(orientation: portrait)", { width: 200, height: 400 }, true],
    // A square container is portrait: `landscape` requires width > height.
    ["(orientation: landscape)", { width: 300, height: 300 }, false],
    ["(orientation: portrait)", { width: 300, height: 300 }, true],
  ];

  test.each(cases)(
    "@container %s against a %o container matches: %s",
    (condition, size, matches) => {
      expect(containerQueryMatches(condition, size)).toBe(matches);
    },
  );
});
