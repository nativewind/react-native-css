import { render, screen } from "@testing-library/react-native";
import { View } from "react-native-css/components/View";
import { registerCSS, testID } from "react-native-css/jest";

const parentTestID = "parent";

// Every custom property below is declared twice. A property with a single definition is
// inlined into its consumers at compile time and never reaches the runtime path under test
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

  // The child resolves the registered initial value, not the ancestor's 10px
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

// Every Tailwind v4 shadow-* utility composes var(--tw-ring-shadow), shadow-none included
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

  // The descendant paints nothing, as every layer it composes is transparent
  expect(screen.getByTestId(testID).props.style).toStrictEqual({
    boxShadow: [],
  });
});
