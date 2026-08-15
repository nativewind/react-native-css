import { act, render, screen } from "@testing-library/react-native";
import { VariableContextProvider } from "react-native-css";
import { View } from "react-native-css/components/View";
import { registerCSS, testID } from "react-native-css/jest";
import {
  nonInheritedVariables,
  registeredInitialValues,
  resetVariableRegistries,
} from "react-native-css/native-internal";

const parentTestID = "parent";

const registration = `
  @property --my-var {
    syntax: "<length>";
    inherits: false;
    initial-value: 0px;
  }
`;

const inheritingRegistration = `
  @property --my-var {
    syntax: "<length>";
    inherits: true;
    initial-value: 0px;
  }
`;

// Most custom properties below are declared twice. A property with a single definition is
// folded into its consumers by the compile-time inliner, so a runtime assertion over one
// would be measuring the compiler. The tests that name the inliner as their subject say so

/* ------------------------------------------------------------------ *
 * Channel 1 — VariableContextProvider
 * ------------------------------------------------------------------ */

test("VariableContextProvider does not publish a non-inheriting property", () => {
  // Web renders this provider as a real <div style={{"--my-var": 10}}>, so the browser's
  // own cascade withholds a non-inheriting property from the descendant. Native has to
  // reach the same answer or the two platforms disagree on the rule this feature IS
  registerCSS(`
    ${registration}
    .parent { --my-var: 1px; }
    .other { --my-var: 2px; }
    .child { width: var(--my-var); }
  `);

  render(
    <VariableContextProvider value={{ "--my-var": 10 }}>
      <View testID={testID} className="child" />
    </VariableContextProvider>,
  );

  expect(screen.getByTestId(testID).props.style).toStrictEqual({ width: 0 });
});

test("VariableContextProvider still publishes an inheriting property", () => {
  registerCSS(`
    ${inheritingRegistration}
    .parent { --my-var: 1px; }
    .other { --my-var: 2px; }
    .child { width: var(--my-var); }
  `);

  render(
    <VariableContextProvider value={{ "--my-var": 10 }}>
      <View testID={testID} className="child" />
    </VariableContextProvider>,
  );

  expect(screen.getByTestId(testID).props.style).toStrictEqual({ width: 10 });
});

test("VariableContextProvider withholds one property without withholding its siblings", () => {
  registerCSS(`
    ${registration}
    @property --kept {
      syntax: "<length>";
      inherits: true;
      initial-value: 0px;
    }
    .parent { --my-var: 1px; --kept: 1px; }
    .other { --my-var: 2px; --kept: 2px; }
    .child { width: var(--my-var); height: var(--kept); }
  `);

  render(
    <VariableContextProvider value={{ "--my-var": 10, "--kept": 20 }}>
      <View testID={testID} className="child" />
    </VariableContextProvider>,
  );

  expect(screen.getByTestId(testID).props.style).toStrictEqual({
    width: 0,
    height: 20,
  });
});

/* ------------------------------------------------------------------ *
 * Channel 3 — :root, and the compile-time inliner behind it
 * ------------------------------------------------------------------ */

test(":root does not supply a non-inheriting property to a descendant", () => {
  // :root declares the property on the root element. Every other element gets it by
  // INHERITANCE, which is exactly what the registration switches off. The value the
  // descendant must see is the registered initial value
  registerCSS(`
    ${registration}
    :root { --my-var: 50px; }
    :root { --my-var: 50px; }
    .child { width: var(--my-var); }
  `);

  render(<View testID={testID} className="child" />);

  expect(screen.getByTestId(testID).props.style).toStrictEqual({ width: 0 });
});

test(":root does not supply a non-inheriting property, whichever order it is declared in", () => {
  // The two values share one rootVariables slot, so the winner is decided by source
  // order. Tailwind emits @property first and :root after, which is the losing order
  registerCSS(`
    :root { --my-var: 50px; }
    :root { --my-var: 50px; }
    ${registration}
    .child { width: var(--my-var); }
  `);

  render(<View testID={testID} className="child" />);

  expect(screen.getByTestId(testID).props.style).toStrictEqual({ width: 0 });
});

test(":root with a single declaration does not supply a non-inheriting property", () => {
  // A property declared once is folded into its consumers by the compile-time inliner,
  // which resolves it before any registry exists. A runtime-only fix cannot reach this
  registerCSS(`
    ${registration}
    :root { --my-var: 50px; }
    .child { width: var(--my-var); }
  `);

  render(<View testID={testID} className="child" />);

  expect(screen.getByTestId(testID).props.style).toStrictEqual({ width: 0 });
});

test("an ancestor class with a single declaration does not supply a non-inheriting property", () => {
  registerCSS(`
    ${registration}
    .parent { --my-var: 10px; }
    .child { width: var(--my-var); }
  `);

  render(
    <View testID={parentTestID} className="parent">
      <View testID={testID} className="child" />
    </View>,
  );

  expect(screen.getByTestId(testID).props.style).toStrictEqual({ width: 0 });
});

test("a single-declaration non-inheriting property still applies to the element declaring it", () => {
  // The counterpart to the test above: blocking the inliner must not cost the declaring
  // element its own value, which now has to resolve at runtime instead of at compile time
  registerCSS(`
    ${registration}
    .self { --my-var: 10px; width: var(--my-var); }
  `);

  render(<View testID={testID} className="self" />);

  expect(screen.getByTestId(testID).props.style).toStrictEqual({ width: 10 });
});

test(":root still supplies an inheriting property to a descendant", () => {
  registerCSS(`
    ${inheritingRegistration}
    :root { --my-var: 50px; }
    :root { --my-var: 50px; }
    .child { width: var(--my-var); }
  `);

  render(<View testID={testID} className="child" />);

  expect(screen.getByTestId(testID).props.style).toStrictEqual({ width: 50 });
});

test("a :root declaration beats a registered initial value declared after it", () => {
  // Both are values of the same name, but one is a DECLARATION and the other is the
  // property's default. A declaration wins, wherever the @property block happens to sit
  registerCSS(`
    :root { --my-var: 50px; }
    :root { --my-var: 50px; }
    ${inheritingRegistration}
    .child { width: var(--my-var); }
  `);

  render(<View testID={testID} className="child" />);

  expect(screen.getByTestId(testID).props.style).toStrictEqual({ width: 50 });
});

test("an element declaring a non-inheriting property beats :root for itself", () => {
  registerCSS(`
    ${registration}
    :root { --my-var: 50px; }
    :root { --my-var: 50px; }
    .self { --my-var: 30px; width: var(--my-var); }
    .other { --my-var: 40px; }
  `);

  render(<View testID={testID} className="self" />);

  expect(screen.getByTestId(testID).props.style).toStrictEqual({ width: 30 });
});

/* ------------------------------------------------------------------ *
 * The universal selector declares, it does not hand down
 * ------------------------------------------------------------------ */

test("* supplies a non-inheriting property to every element", () => {
  // `*` matches each element in its own right, so each one DECLARES the property and
  // the registration never comes into it. This is the rung :root is skipped for
  registerCSS(`
    ${registration}
    * { --my-var: 5px; }
    .child { width: var(--my-var); }
  `);

  render(<View testID={testID} className="child" />);

  expect(screen.getByTestId(testID).props.style).toStrictEqual({ width: 5 });
});

test("* supplies a non-inheriting property at every depth", () => {
  registerCSS(`
    ${registration}
    * { --my-var: 5px; }
    .parent { opacity: 1; }
    .child { width: var(--my-var); }
  `);

  render(
    <View testID={parentTestID} className="parent">
      <View className="parent">
        <View testID={testID} className="child" />
      </View>
    </View>,
  );

  expect(screen.getByTestId(testID).props.style).toStrictEqual({ width: 5 });
});

test("* beats :root for the same name", () => {
  // A declaration on the element beats a value inherited from the root
  registerCSS(`
    ${inheritingRegistration}
    :root { --my-var: 50px; }
    :root { --my-var: 50px; }
    * { --my-var: 5px; }
    .child { width: var(--my-var); }
  `);

  render(<View testID={testID} className="child" />);

  expect(screen.getByTestId(testID).props.style).toStrictEqual({ width: 5 });
});

/* ------------------------------------------------------------------ *
 * Lifecycle — re-registration replaces, it does not accumulate
 * ------------------------------------------------------------------ */

test("re-registering a stylesheet replaces the non-inheriting registry", () => {
  // Fast Refresh re-injects the whole stylesheet. Editing `inherits: false` to `true` has
  // to take effect; an append-only registry pins the property non-inheriting for the rest
  // of the session and only a full reload clears it
  registerCSS(`
    ${registration}
    .parent { --my-var: 1px; }
    .other { --my-var: 2px; }
  `);
  expect(nonInheritedVariables.has("my-var")).toBe(true);

  registerCSS(`
    ${inheritingRegistration}
    .parent { --my-var: 1px; }
    .other { --my-var: 2px; }
  `);
  expect(nonInheritedVariables.has("my-var")).toBe(false);
});

test("deleting an @property rule un-registers the property", () => {
  registerCSS(`
    ${registration}
    .parent { --my-var: 1px; }
    .other { --my-var: 2px; }
  `);
  expect(nonInheritedVariables.has("my-var")).toBe(true);

  registerCSS(`
    .parent { --my-var: 1px; }
    .other { --my-var: 2px; }
  `);
  expect(nonInheritedVariables.has("my-var")).toBe(false);
});

test("a re-registered property inherits again in a rendered tree", () => {
  registerCSS(`
    ${registration}
    .parent { --my-var: 10px; }
    .other { --my-var: 20px; }
    .child { width: var(--my-var); }
  `);

  registerCSS(`
    ${inheritingRegistration}
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

test("re-registering keeps the registry object identity", () => {
  // The globalThis pin exists so two copies of native-internal/root share ONE container.
  // A reload replaces the container's CONTENTS; swapping the container itself would hand
  // the other copy a Set nothing writes to any more
  const before = nonInheritedVariables;

  registerCSS(`
    ${registration}
    .parent { --my-var: 1px; }
    .other { --my-var: 2px; }
  `);

  expect(nonInheritedVariables).toBe(before);
  expect(globalThis.__react_native_css_non_inherited_variables).toBe(before);
});

/* ------------------------------------------------------------------ *
 * Lifecycle — a reload retracts a registered initial value
 * ------------------------------------------------------------------ */

// Composed into arithmetic ON THE DECLARING ELEMENT, which is how Tailwind reads
// `--tw-ring-offset-width`: `calc(2px + var(--tw-ring-offset-width))`. A registration that
// outlives the rule declaring it does not hand a descendant something it should not have
// inherited, it corrupts a length an element computes for itself
const initialValueRegistration = `
  @property --my-var {
    syntax: "<length>";
    inherits: false;
    initial-value: 3px;
  }
`;

const initialValueConsumer = `
  .probe { width: calc(2px + var(--my-var)); }
  .a { --my-var: 10px; }
  .b { --my-var: 20px; }
`;

test("a sheet registering nothing leaves the consumer no width", () => {
  // The control for the two tests below. `.probe` reads a property no rule it matches
  // declares and no @property registers, so the whole declaration drops
  registerCSS(initialValueConsumer);

  render(<View testID={testID} className="probe" />);

  expect(screen.getByTestId(testID).props.style).toStrictEqual({});
});

test("deleting an @property rule retracts its initial value", () => {
  registerCSS(`
    ${initialValueRegistration}
    ${initialValueConsumer}
  `);
  expect(registeredInitialValues("my-var").get()).toBe(3);

  registerCSS(initialValueConsumer);

  expect(registeredInitialValues("my-var").get()).toBeUndefined();
});

test("a mounted element drops a retracted initial value", () => {
  // Deleting an @property rule un-registered only half of it: the name left
  // `nonInheritedVariables` and the initial value stayed, so the two halves of one
  // registration disagreed and the element kept painting a width the sheet no longer
  // declares anywhere
  registerCSS(`
    ${initialValueRegistration}
    ${initialValueConsumer}
  `);

  render(<View testID={testID} className="probe" />);
  expect(screen.getByTestId(testID).props.style).toStrictEqual({ width: 5 });

  act(() => {
    registerCSS(initialValueConsumer);
  });

  // Exactly what the same sheet paints when it is the first one loaded, two tests above
  expect(screen.getByTestId(testID).props.style).toStrictEqual({});
});

test("retracting an initial value keeps the observable its readers hold", () => {
  // This is why the retraction is `.set(undefined)` and not `.clear()`. Clearing the family
  // drops the map entry without notifying anyone, so a mounted reader keeps the deleted
  // value AND the next registration of the same name lands on an observable it never
  // subscribed to — the reader is then stranded for the rest of the session
  registerCSS(`
    ${initialValueRegistration}
    ${initialValueConsumer}
  `);
  const before = registeredInitialValues("my-var");

  registerCSS(initialValueConsumer);

  expect(registeredInitialValues("my-var")).toBe(before);
});

test("resetVariableRegistries retracts a registered initial value", () => {
  // The jest preset's beforeEach is all that stands between one test's @property
  // registration and the next test's. A plain clear() is right HERE and wrong in inject():
  // testing-library unmounts between tests, so this retraction has no reader to strand
  registerCSS(`
    ${initialValueRegistration}
    ${initialValueConsumer}
  `);
  expect(registeredInitialValues("my-var").get()).toBe(3);

  resetVariableRegistries();

  expect(registeredInitialValues("my-var").get()).toBeUndefined();
});

/* ------------------------------------------------------------------ *
 * Tailwind v4 ring composition, end to end
 * ------------------------------------------------------------------ */

const tailwindRingCss = `
  @property --tw-shadow { syntax: "*"; inherits: false; initial-value: 0 0 #0000; }
  @property --tw-ring-shadow { syntax: "*"; inherits: false; initial-value: 0 0 #0000; }
  @property --tw-ring-color { syntax: "*"; inherits: false; }
  @property --tw-ring-offset-shadow { syntax: "*"; inherits: false; initial-value: 0 0 #0000; }

  .ring-2 {
    --tw-ring-shadow: 0 0 0 2px var(--tw-ring-color, currentcolor);
    box-shadow: var(--tw-ring-offset-shadow), var(--tw-ring-shadow), var(--tw-shadow);
  }
  .ring-4 {
    --tw-ring-shadow: 0 0 0 4px var(--tw-ring-color, currentcolor);
    box-shadow: var(--tw-ring-offset-shadow), var(--tw-ring-shadow), var(--tw-shadow);
  }
  .ring-red-500 { --tw-ring-color: #fb2c36; }
  .ring-blue-500 { --tw-ring-color: #2c36fb; }
  .shadow-none {
    --tw-shadow: 0 0 #0000;
    box-shadow: var(--tw-ring-offset-shadow), var(--tw-ring-shadow), var(--tw-shadow);
  }
  .shadow-sm {
    --tw-shadow: 0 1px 3px 0 #0000001a;
    box-shadow: var(--tw-ring-offset-shadow), var(--tw-ring-shadow), var(--tw-shadow);
  }
`;

test("a shadow-none descendant of a ringed ancestor paints no ring", () => {
  // The device report this whole feature comes from: on an Android handset a shadow-none
  // descendant painted its ancestor's ring, because every Tailwind shadow-* utility
  // composes var(--tw-ring-shadow) and that variable used to inherit
  registerCSS(tailwindRingCss);

  render(
    <View testID={parentTestID} className="ring-2 ring-red-500">
      <View testID={testID} className="shadow-none" />
    </View>,
  );

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

  expect(screen.getByTestId(testID).props.style).toStrictEqual({
    boxShadow: [],
  });
});

test("a ringed descendant of a ringed ancestor paints only its own ring", () => {
  registerCSS(tailwindRingCss);

  render(
    <View testID={parentTestID} className="ring-2 ring-red-500">
      <View testID={testID} className="ring-4 ring-blue-500" />
    </View>,
  );

  expect(screen.getByTestId(testID).props.style).toStrictEqual({
    boxShadow: [
      {
        offsetX: 0,
        offsetY: 0,
        blurRadius: 0,
        spreadDistance: 4,
        color: "#2c36fb",
      },
    ],
  });
});

test("a ringed descendant inherits neither the ring width nor the ring colour", () => {
  // ring-4 with no ring colour of its own must reach its own currentcolor fallback, NOT
  // the ancestor's red. Two variables, two independent leaks, one assertion.
  // currentcolor resolves to the platform's text colour, as in filters.test.tsx
  registerCSS(tailwindRingCss);

  render(
    <View testID={parentTestID} className="ring-2 ring-red-500">
      <View testID={testID} className="ring-4" />
    </View>,
  );

  expect(screen.getByTestId(testID).props.style).toStrictEqual({
    boxShadow: [
      {
        offsetX: 0,
        offsetY: 0,
        blurRadius: 0,
        spreadDistance: 4,
        color: { semantic: ["label", "labelColor"] },
      },
    ],
  });
});
