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

const loadRootCopy = () => {
  jest.resetModules();
  return jest.requireActual<typeof import("../../native-internal/root")>(
    "../../native-internal/root",
  );
};

// A custom property declared once is folded into its consumers at compile time, so these declare theirs twice

test("a non-inheriting custom property does not reach a descendant", () => {
  registerCSS(`
    ${registration}
    .parent { --my-var: 10px; }
    .other { --my-var: 20px; }
    .child { width: var(--my-var); }
  `);

  render(
    <View testID={parentTestID} className="parent">
      <View testID={testID} className="child" />
    </View>,
  );

  expect(screen.getByTestId(testID).props.style).toStrictEqual({ width: 0 });
});

test("a non-inheriting custom property does not reach a grandchild", () => {
  registerCSS(`
    ${registration}
    .parent { --my-var: 11px; }
    .other { --my-var: 20px; }
    .mid { opacity: 1; }
    .child { height: var(--my-var); }
  `);

  render(
    <View testID={parentTestID} className="parent">
      <View className="mid">
        <View testID={testID} className="child" />
      </View>
    </View>,
  );

  expect(screen.getByTestId(testID).props.style).toStrictEqual({ height: 0 });
});

test("an inheriting custom property still reaches a descendant", () => {
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

test("an unregistered custom property still inherits", () => {
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

test("a registration whose initial value depends on the element is ignored, so the property inherits", () => {
  registerCSS(`
    @property --my-var {
      syntax: "<length>";
      inherits: false;
      initial-value: 2em;
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

test("a non-inheriting custom property still applies to the element declaring it", () => {
  registerCSS(`
    ${registration}
    .self { --my-var: 10px; width: var(--my-var); }
    .other { --my-var: 20px; }
  `);

  render(<View testID={testID} className="self" />);

  expect(screen.getByTestId(testID).props.style).toStrictEqual({ width: 10 });
});

test("a descendant declaring the property itself wins over the ancestor", () => {
  registerCSS(`
    ${registration}
    .parent { --my-var: 10px; }
    .other { --my-var: 20px; }
    .child { --my-var: 30px; width: var(--my-var); }
  `);

  render(
    <View testID={parentTestID} className="parent">
      <View testID={testID} className="child" />
    </View>,
  );

  expect(screen.getByTestId(testID).props.style).toStrictEqual({ width: 30 });
});

test("a descendant falls through to the var() fallback when the registration has no initial value", () => {
  registerCSS(`
    @property --no-init {
      syntax: "*";
      inherits: false;
    }
    .parent { --no-init: 10px; }
    .other { --no-init: 20px; }
    .child { width: var(--no-init, 99px); }
  `);

  render(
    <View testID={parentTestID} className="parent">
      <View testID={testID} className="child" />
    </View>,
  );

  expect(screen.getByTestId(testID).props.style).toStrictEqual({ width: 99 });
});

test("VariableContextProvider does not publish a non-inheriting property", () => {
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

test.each([
  [
    "after",
    `${registration} :root { --my-var: 50px; } :root { --my-var: 50px; }`,
  ],
  [
    "before",
    `:root { --my-var: 50px; } :root { --my-var: 50px; } ${registration}`,
  ],
  ["once, after", `${registration} :root { --my-var: 50px; }`],
])(
  ":root does not supply a non-inheriting property to an element, declared %s the registration",
  (_, css) => {
    registerCSS(`
      ${css}
      .child { width: var(--my-var); }
    `);

    render(<View testID={testID} className="child" />);

    expect(screen.getByTestId(testID).props.style).toStrictEqual({ width: 0 });
  },
);

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
  registerCSS(`
    ${registration}
    .self { --my-var: 10px; width: var(--my-var); }
  `);

  render(<View testID={testID} className="self" />);

  expect(screen.getByTestId(testID).props.style).toStrictEqual({ width: 10 });
});

test(":root still supplies an inheriting property to an element", () => {
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

describe.each([undefined, false] as const)(
  "with inlineVariables=%s",
  (inlineVariables) => {
    test("* supplies a non-inheriting property to every element", () => {
      registerCSS(
        `
        ${registration}
        * { --my-var: 5px; }
        .child { width: var(--my-var); }
      `,
        { inlineVariables },
      );

      render(<View testID={testID} className="child" />);

      expect(screen.getByTestId(testID).props.style).toStrictEqual({
        width: 5,
      });
    });

    test("* supplies a non-inheriting property at every depth", () => {
      registerCSS(
        `
        ${registration}
        * { --my-var: 5px; }
        .parent { opacity: 1; }
        .child { width: var(--my-var); }
      `,
        { inlineVariables },
      );

      render(
        <View testID={parentTestID} className="parent">
          <View className="parent">
            <View testID={testID} className="child" />
          </View>
        </View>,
      );

      expect(screen.getByTestId(testID).props.style).toStrictEqual({
        width: 5,
      });
    });
  },
);

test("* beats :root for the same name", () => {
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

test("re-registering a stylesheet replaces the non-inheriting registry", () => {
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
  const before = nonInheritedVariables;

  registerCSS(`
    ${registration}
    .parent { --my-var: 1px; }
    .other { --my-var: 2px; }
  `);

  expect(nonInheritedVariables).toBe(before);
  expect(globalThis.__react_native_css_non_inherited_variables).toBe(before);
});

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
  registerCSS(`
    ${initialValueRegistration}
    ${initialValueConsumer}
  `);

  render(<View testID={testID} className="probe" />);
  expect(screen.getByTestId(testID).props.style).toStrictEqual({ width: 5 });

  act(() => {
    registerCSS(initialValueConsumer);
  });

  expect(screen.getByTestId(testID).props.style).toStrictEqual({});
});

test("retracting an initial value keeps the observable its readers hold", () => {
  registerCSS(`
    ${initialValueRegistration}
    ${initialValueConsumer}
  `);
  const before = registeredInitialValues("my-var");

  registerCSS(initialValueConsumer);

  expect(registeredInitialValues("my-var")).toBe(before);
});

test("resetVariableRegistries retracts a registered initial value", () => {
  registerCSS(`
    ${initialValueRegistration}
    ${initialValueConsumer}
  `);
  expect(registeredInitialValues("my-var").get()).toBe(3);

  resetVariableRegistries();

  expect(registeredInitialValues("my-var").get()).toBeUndefined();
});

test("a registration lasts for its test", () => {
  registerCSS(initialValueRegistration);

  expect(nonInheritedVariables.has("my-var")).toBe(true);
  expect(registeredInitialValues("my-var").get()).toBe(3);
});

test("a registration does not outlive its test", () => {
  expect(nonInheritedVariables.size).toBe(0);
  expect(registeredInitialValues("my-var").get()).toBeUndefined();
});

test("a second copy of the module shares the non-inheriting registry", () => {
  nonInheritedVariables.add("tw-ring-shadow");

  const secondCopy = loadRootCopy();

  expect(secondCopy.nonInheritedVariables).toBe(nonInheritedVariables);
  expect(secondCopy.nonInheritedVariables.has("tw-ring-shadow")).toBe(true);
});

test("a second copy of the module shares the registered initial values", () => {
  registerCSS(`
    @property --tw-ring-offset-width {
      syntax: "<length>";
      inherits: false;
      initial-value: 0px;
    }
    .ring { width: calc(2px + var(--tw-ring-offset-width)); }
    .offset { --tw-ring-offset-width: 4px; }
  `);

  const secondCopy = loadRootCopy();

  expect(secondCopy.registeredInitialValues).toBe(registeredInitialValues);
  expect(secondCopy.registeredInitialValues("tw-ring-offset-width").get()).toBe(
    0,
  );
});

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
  registerCSS(`${tailwindRingCss} .text-ink { color: #123456; }`);

  render(
    <View testID={parentTestID} className="ring-2 ring-red-500 text-ink">
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
        color: "#123456",
      },
    ],
  });
});

test("a ring-only element does not paint another utility's shadow", () => {
  registerCSS(`
    @property --tw-shadow { syntax: "*"; inherits: false; initial-value: 0 0 #0000; }
    @property --tw-ring-shadow { syntax: "*"; inherits: false; initial-value: 0 0 #0000; }
    .shadow-sm {
      --tw-shadow: 0 1px 3px 0 #ff0000;
      box-shadow: var(--tw-ring-shadow), var(--tw-shadow);
    }
    .ring-2 {
      --tw-ring-shadow: 0 0 0 2px #0000ff;
      box-shadow: var(--tw-ring-shadow), var(--tw-shadow);
    }
  `);

  render(<View testID={testID} className="ring-2" />);

  expect(screen.getByTestId(testID).props.style).toStrictEqual({
    boxShadow: [
      {
        offsetX: 0,
        offsetY: 0,
        blurRadius: 0,
        spreadDistance: 2,
        color: "#00f",
      },
    ],
  });
});
