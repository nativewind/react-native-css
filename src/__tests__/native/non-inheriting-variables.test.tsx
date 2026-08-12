import { render, screen } from "@testing-library/react-native";
import { View } from "react-native-css/components/View";
import { registerCSS, testID } from "react-native-css/jest";

const parentTestID = "parent";

/**
 * A custom property registered with `inherits: false` does not cascade to
 * descendants (css-properties-values-api-1 §2.2).
 *
 * Variable inheritance is otherwise unconditional: `VariableContext` receives
 * every custom property an element declares, so a descendant resolves an
 * ancestor's private value. Tailwind v4 leans on the descriptor heavily — its
 * whole `--tw-*` shadow/ring set is registered non-inheriting precisely so a
 * ring on one element cannot reach another element's `box-shadow`.
 *
 * Every fixture below declares each custom property TWICE. A property with a
 * single definition is folded into its consumers at compile time, which never
 * reaches the runtime path under test — and real Tailwind output always has
 * many definitions (one per `ring-*` / `shadow-*` utility), so two is the
 * faithful shape rather than a trick.
 */
test("a non-inheriting custom property does not reach a descendant", () => {
  registerCSS(`
    @property --my-var {
      syntax: "<length>";
      inherits: false;
      initial-value: 0px;
    }
    .parent { --my-var: 10px; }
    .other { --my-var: 20px; }
    .child { width: var(--my-var); }
  `);

  render(
    <View testID={parentTestID} className="parent">
      <View testID={testID} className="child" />
    </View>,
  );

  // The registered initial value is what the child resolves — its ancestor's
  // 10px is private to the ancestor.
  expect(screen.getByTestId(testID).props.style).toStrictEqual({ width: 0 });
});

test("an inheriting custom property still reaches a descendant", () => {
  registerCSS(`
    @property --my-var {
      syntax: "<length>";
      inherits: true;
      initial-value: 0px;
    }
    .parent { --my-var: 10px; }
    .other { --my-var: 20px; }
    .child { width: var(--my-var); }
  `);

  render(
    <View testID={parentTestID} className="parent">
      <View testID={testID} className="child" />
    </View>,
  );

  expect(screen.getByTestId(testID).props.style).toStrictEqual({ width: 10 });
});

test("an unregistered custom property still inherits", () => {
  // No @property rule, so the CSS default applies: custom properties inherit.
  registerCSS(`
    .parent { --my-var: 10px; }
    .other { --my-var: 20px; }
    .child { width: var(--my-var); }
  `);

  render(
    <View testID={parentTestID} className="parent">
      <View testID={testID} className="child" />
    </View>,
  );

  expect(screen.getByTestId(testID).props.style).toStrictEqual({ width: 10 });
});

test("a non-inheriting custom property still applies to the element declaring it", () => {
  registerCSS(`
    @property --my-var {
      syntax: "<length>";
      inherits: false;
      initial-value: 0px;
    }
    .self { --my-var: 10px; width: var(--my-var); }
    .other { --my-var: 20px; }
  `);

  render(<View testID={testID} className="self" />);

  expect(screen.getByTestId(testID).props.style).toStrictEqual({ width: 10 });
});

/**
 * The shape this defect actually ships as.
 *
 * Every Tailwind v4 `shadow-*` utility — `shadow-none` included — emits the
 * same five-variable composition, so an element declaring any of them reads
 * `var(--tw-ring-shadow)`. With the descriptor ignored, a descendant carrying
 * `shadow-none` renders its ANCESTOR's ring around itself.
 */
test("an ancestor's ring does not reach a descendant's box-shadow", () => {
  registerCSS(`
    @property --tw-shadow { syntax: "*"; inherits: false; initial-value: 0 0 #0000; }
    @property --tw-ring-shadow { syntax: "*"; inherits: false; initial-value: 0 0 #0000; }
    @property --tw-ring-color { syntax: "*"; inherits: false; }

    .ring-2 {
      --tw-ring-shadow: 0 0 0 2px var(--tw-ring-color, currentcolor);
      box-shadow: var(--tw-ring-shadow), var(--tw-shadow);
    }
    .ring-4 {
      --tw-ring-shadow: 0 0 0 4px var(--tw-ring-color, currentcolor);
      box-shadow: var(--tw-ring-shadow), var(--tw-shadow);
    }
    .ring-red { --tw-ring-color: #fb2c36; }
    .ring-blue { --tw-ring-color: #2c36fb; }
    .shadow-none {
      --tw-shadow: 0 0 #0000;
      box-shadow: var(--tw-ring-shadow), var(--tw-shadow);
    }
    .shadow-sm {
      --tw-shadow: 0 1px 3px 0 #0000001a;
      box-shadow: var(--tw-ring-shadow), var(--tw-shadow);
    }
  `);

  render(
    <View testID={parentTestID} className="ring-2 ring-red">
      <View testID={testID} className="shadow-none" />
    </View>,
  );

  // The ancestor paints its own ring.
  expect(screen.getByTestId(parentTestID).props.style).toStrictEqual({
    boxShadow: [
      {
        offsetX: 0,
        offsetY: 0,
        blurRadius: 0,
        spreadDistance: 2,
        color: "#fb2c36",
      },
    ],
  });

  // The descendant paints nothing — every layer it composes is transparent.
  expect(screen.getByTestId(testID).props.style).toStrictEqual({
    boxShadow: [],
  });
});
