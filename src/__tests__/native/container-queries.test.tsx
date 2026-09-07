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
 * An ancestor attribute selector — what Tailwind writes as `group-data-[state=open]:*` and
 * `group-disabled:*` — compiles to a container query carrying an attribute condition, and that
 * condition asks about the CONTAINER's props rather than the element's own. These pin that it is
 * ANSWERED, in both directions: applied when the container matches, withheld when it does not.
 *
 * The selector is spelled the way Tailwind emits an ancestor variant — `:is(:where(.group) *)` —
 * because a bare descendant combinator compiles to nothing. `.group` needs no `container-type`:
 * the compiler registers `g:group` from the selector itself, and declaring one would register
 * the DEFAULT container instead, under a name the query never asks for.
 */
const ANCESTOR_ATTRIBUTE_CSS = `
    .subject:is(:where(.group)[data-state="open"] *) {
      color: blue;
    }
  `;

test("an ancestor attribute condition is withheld when the container does not match", () => {
  registerCSS(ANCESTOR_ATTRIBUTE_CSS);

  render(
    <View
      testID={parentID}
      className="group"
      {...{ dataSet: { state: "closed" } }}
    >
      <View testID={childID} className="subject" />
    </View>,
  );

  expect(screen.getByTestId(childID)).not.toHaveStyle({ color: "#00f" });
});

test("an ancestor attribute condition applies when the container matches", () => {
  registerCSS(ANCESTOR_ATTRIBUTE_CSS);

  render(
    <View
      testID={parentID}
      className="group"
      {...{ dataSet: { state: "open" } }}
    >
      <View testID={childID} className="subject" />
    </View>,
  );

  expect(screen.getByTestId(childID)).toHaveStyle({ color: "#00f" });
});

test("a container carrying no value at all does not satisfy the condition", () => {
  registerCSS(ANCESTOR_ATTRIBUTE_CSS);

  render(
    <View testID={parentID} className="group">
      <View testID={childID} className="subject" />
    </View>,
  );

  expect(screen.getByTestId(childID)).not.toHaveStyle({ color: "#00f" });
});

test("the condition reads the CONTAINER, not the element that carries the class", () => {
  registerCSS(ANCESTOR_ATTRIBUTE_CSS);

  // The value sits on the child. An ancestor selector must not answer from it, or every element
  // would satisfy its own group condition.
  render(
    <View testID={parentID} className="group">
      <View
        testID={childID}
        className="subject"
        {...{ dataSet: { state: "open" } }}
      />
    </View>,
  );

  expect(screen.getByTestId(childID)).not.toHaveStyle({ color: "#00f" });
});

test("a change on the container re-evaluates the descendant", () => {
  registerCSS(ANCESTOR_ATTRIBUTE_CSS);

  const closed = (
    <View
      testID={parentID}
      className="group"
      {...{ dataSet: { state: "closed" } }}
    >
      <View testID={childID} className="subject" />
    </View>
  );
  const open = (
    <View
      testID={parentID}
      className="group"
      {...{ dataSet: { state: "open" } }}
    >
      <View testID={childID} className="subject" />
    </View>
  );

  const { rerender } = render(closed);
  expect(screen.getByTestId(childID)).not.toHaveStyle({ color: "#00f" });

  rerender(open);
  expect(screen.getByTestId(childID)).toHaveStyle({ color: "#00f" });

  // And back — a condition that latches on is a different defect with the same first half.
  rerender(closed);
  expect(screen.getByTestId(childID)).not.toHaveStyle({ color: "#00f" });
});

test("an ancestor presence condition reads the container's own value", () => {
  registerCSS(`
    .subject:is(:where(.group)[data-open] *) {
      color: red;
    }
  `);

  render(
    <View testID={parentID} className="group" {...{ dataSet: { open: true } }}>
      <View testID={childID} className="subject" />
    </View>,
  );

  expect(screen.getByTestId(childID)).toHaveStyle({ color: "#f00" });
});

test("an ancestor presence condition is withheld when the container lacks the value", () => {
  registerCSS(`
    .subject:is(:where(.group)[data-open] *) {
      color: red;
    }
  `);

  render(
    <View testID={parentID} className="group">
      <View testID={childID} className="subject" />
    </View>,
  );

  expect(screen.getByTestId(childID)).not.toHaveStyle({ color: "#f00" });
});

/**
 * A KNOWN LIMIT, pinned rather than left silent.
 *
 * CSS matches `:is(:where(.group)[data-state="open"] *)` against ANY ancestor carrying the class
 * and the value. A container context holds one entry per container name, so the nearest ancestor
 * of that name is the only one consulted, and an outer match behind a non-matching inner one is
 * missed.
 *
 * That is correct for a real `@container` — CSS Containment names the query container as the
 * NEAREST eligible ancestor — and it is a divergence for the group form, which is a descendant
 * combinator wearing a container query. Carrying every same-named ancestor would mean an array in
 * the container context, and a fresh array identity on each render defeats the `["c", name, …]`
 * render guard, which compares by identity. So it is a context-shape decision rather than a local
 * one.
 *
 * These pin what the runtime does today, so a change of mind about it is a deliberate edit here.
 */
test("only the nearest same-named group is consulted", () => {
  registerCSS(ANCESTOR_ATTRIBUTE_CSS);

  render(
    <View testID="outer" className="group" {...{ dataSet: { state: "open" } }}>
      <View className="group" {...{ dataSet: { state: "closed" } }}>
        <View testID={childID} className="subject" />
      </View>
    </View>,
  );

  // CSS would match here, via the outer group.
  expect(screen.getByTestId(childID)).not.toHaveStyle({ color: "#00f" });
});

test("the nearest same-named group answers even when an outer one does not", () => {
  registerCSS(ANCESTOR_ATTRIBUTE_CSS);

  render(
    <View
      testID="outer"
      className="group"
      {...{ dataSet: { state: "closed" } }}
    >
      <View className="group" {...{ dataSet: { state: "open" } }}>
        <View testID={childID} className="subject" />
      </View>
    </View>,
  );

  expect(screen.getByTestId(childID)).toHaveStyle({ color: "#00f" });
});

test("an element is not its own group ancestor", () => {
  registerCSS(ANCESTOR_ATTRIBUTE_CSS);

  // `:is(:where(.group) *)` selects a DESCENDANT, so an element carrying both classes must not
  // satisfy its own group condition. This agrees with CSS and is the half most easily broken by
  // answering an ancestor condition from the element's own props.
  render(
    <View
      testID={childID}
      className="group subject"
      {...{ dataSet: { state: "open" } }}
    />,
  );

  expect(screen.getByTestId(childID)).not.toHaveStyle({ color: "#00f" });
});
