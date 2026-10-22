import { act, render, screen } from "@testing-library/react-native";
import { VariableContextProvider } from "react-native-css";
import { View } from "react-native-css/components/View";
import { registerCSS, testID } from "react-native-css/jest";
import {
  registeredInheritance,
  registeredInitialValues,
  resetVariableRegistries,
  VariableContext,
} from "react-native-css/native-internal";
import { colorScheme } from "react-native-css/runtime";

import { VAR_SYMBOL } from "../../native/reactivity";

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

test("a non-inheriting property a VariableContextProvider sets does not reach a descendant", () => {
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

test("an inheriting property a VariableContextProvider sets reaches a descendant", () => {
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

test("a VariableContextProvider's non-inheriting property stops where its inheriting siblings go on", () => {
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

test("a later registration that inherits lets the property inherit", () => {
  registerCSS(`
    ${registration}
    .parent { --my-var: 1px; }
    .other { --my-var: 2px; }
  `);
  expect(registeredInheritance("my-var").get()).toBe(false);

  registerCSS(`
    ${inheritingRegistration}
    .parent { --my-var: 1px; }
    .other { --my-var: 2px; }
  `);
  expect(registeredInheritance("my-var").get()).toBe(true);
});

test("a stylesheet without the @property rule leaves the registration in place", () => {
  registerCSS(`
    ${registration}
    .parent { --my-var: 1px; }
    .other { --my-var: 2px; }
  `);

  registerCSS(`
    .parent { --my-var: 1px; }
    .other { --my-var: 2px; }
  `);
  expect(registeredInheritance("my-var").get()).toBe(false);
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

test("re-registering keeps the observable a reader of the name holds", () => {
  const before = registeredInheritance("my-var");

  registerCSS(`
    ${registration}
    .parent { --my-var: 1px; }
    .other { --my-var: 2px; }
  `);

  expect(registeredInheritance("my-var")).toBe(before);
  expect(before.get()).toBe(false);
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

const registrationWithoutInitialValue = `
  @property --my-var {
    syntax: "*";
    inherits: false;
  }
`;

test("a re-registration without an initial value clears the earlier one", () => {
  registerCSS(`
    ${initialValueRegistration}
    ${initialValueConsumer}
  `);
  expect(registeredInitialValues("my-var").get()).toBe(3);

  registerCSS(registrationWithoutInitialValue);

  expect(registeredInitialValues("my-var").get()).toBeUndefined();
});

test("a mounted element drops an initial value its re-registration clears", () => {
  registerCSS(`
    ${initialValueRegistration}
    ${initialValueConsumer}
  `);

  render(<View testID={testID} className="probe" />);
  expect(screen.getByTestId(testID).props.style).toStrictEqual({ width: 5 });

  act(() => {
    registerCSS(registrationWithoutInitialValue);
  });

  expect(screen.getByTestId(testID).props.style).toStrictEqual({});
});

test("clearing an initial value keeps the observable its readers hold", () => {
  registerCSS(`
    ${initialValueRegistration}
    ${initialValueConsumer}
  `);
  const before = registeredInitialValues("my-var");

  registerCSS(registrationWithoutInitialValue);

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

  expect(registeredInheritance("my-var").get()).toBe(false);
  expect(registeredInitialValues("my-var").get()).toBe(3);
});

test("a registration does not outlive its test", () => {
  expect(registeredInheritance("my-var").get()).toBe(true);
  expect(registeredInitialValues("my-var").get()).toBeUndefined();
});

test("a second copy of the module shares the registered inheritance", () => {
  registeredInheritance("tw-ring-shadow").set(false);

  const secondCopy = loadRootCopy();

  expect(secondCopy.registeredInheritance).toBe(registeredInheritance);
  expect(secondCopy.registeredInheritance("tw-ring-shadow").get()).toBe(false);
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

const tailwindRingOffsetCss = `
  @property --tw-shadow { syntax: "*"; inherits: false; initial-value: 0 0 #0000; }
  @property --tw-ring-shadow { syntax: "*"; inherits: false; initial-value: 0 0 #0000; }
  @property --tw-ring-color { syntax: "*"; inherits: false; }
  @property --tw-ring-offset-width { syntax: "<length>"; inherits: false; initial-value: 0px; }

  .ring-2 {
    --tw-ring-shadow: 0 0 0 calc(2px + var(--tw-ring-offset-width)) var(--tw-ring-color, currentcolor);
    box-shadow: var(--tw-ring-shadow), var(--tw-shadow);
  }
  .ring-4 {
    --tw-ring-shadow: 0 0 0 calc(4px + var(--tw-ring-offset-width)) var(--tw-ring-color, currentcolor);
    box-shadow: var(--tw-ring-shadow), var(--tw-shadow);
  }
  .ring-red-500 { --tw-ring-color: #fb2c36; }
  .shadow-none {
    --tw-shadow: 0 0 #0000;
    box-shadow: var(--tw-ring-shadow), var(--tw-shadow);
  }
  .shadow-sm {
    --tw-shadow: 0 1px 3px 0 #0000001a;
    box-shadow: var(--tw-ring-shadow), var(--tw-shadow);
  }
`;

// Metro compiles and injects every CSS file of an app apart
test("a second stylesheet keeps the first one's registrations", () => {
  registerCSS(tailwindRingOffsetCss, { filename: "global.css" });
  registerCSS(`.other { color: red; }`, { filename: "other.css" });

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

const declaringTree = `
  .parent { --my-var: 10px; }
  .other { --my-var: 20px; }
  .child { width: var(--my-var); }
`;

function renderDeclaringTree() {
  render(
    <View testID={parentTestID} className="parent">
      <View testID={testID} className="child" />
    </View>,
  );
}

test("a second stylesheet registering another name keeps the first one's registrations", () => {
  registerCSS(`${registration} ${declaringTree}`, { filename: "global.css" });
  registerCSS(
    `@property --other-var { syntax: "<length>"; inherits: false; initial-value: 0px; }`,
    { filename: "other.css" },
  );

  renderDeclaringTree();

  expect(screen.getByTestId(testID).props.style).toStrictEqual({ width: 0 });
});

test("a mounted element follows a later stylesheet that stops the property inheriting", () => {
  registerCSS(declaringTree, { filename: "global.css" });
  renderDeclaringTree();
  expect(screen.getByTestId(testID).props.style).toStrictEqual({ width: 10 });

  act(() => {
    registerCSS(
      `@property --my-var { syntax: "<length>"; inherits: false; initial-value: 1px; }`,
      { filename: "other.css" },
    );
  });

  expect(screen.getByTestId(testID).props.style).toStrictEqual({ width: 1 });
});

test("a VariableContextProvider follows a later stylesheet that stops the property inheriting", () => {
  registerCSS(
    `.child { width: var(--my-var); } .other { width: var(--my-var); }`,
    {
      filename: "global.css",
    },
  );
  render(
    <VariableContextProvider value={{ "--my-var": 10 }}>
      <View testID={testID} className="child" />
    </VariableContextProvider>,
  );
  expect(screen.getByTestId(testID).props.style).toStrictEqual({ width: 10 });

  act(() => {
    registerCSS(
      `@property --my-var { syntax: "<length>"; inherits: false; initial-value: 1px; }`,
      { filename: "other.css" },
    );
  });

  expect(screen.getByTestId(testID).props.style).toStrictEqual({ width: 1 });
});

test("an ignored @property leaves the earlier registration of its name in force", () => {
  registerCSS(`
    @property --my-var { syntax: "<length>"; inherits: false; initial-value: 3px; }
    @property --my-var { syntax: "<length>"; inherits: true; initial-value: 2em; }
    ${declaringTree}
  `);

  renderDeclaringTree();

  expect(screen.getByTestId(testID).props.style).toStrictEqual({ width: 3 });
});

test("an element reading :root follows a later stylesheet that stops the property inheriting", () => {
  registerCSS(
    `:root { --my-var: 10px; } :root { --my-var: 10px; } .child { width: var(--my-var); }`,
    { filename: "global.css" },
  );
  render(<View testID={testID} className="child" />);
  expect(screen.getByTestId(testID).props.style).toStrictEqual({ width: 10 });

  act(() => {
    registerCSS(
      `@property --my-var { syntax: "<length>"; inherits: false; initial-value: 1px; }`,
      { filename: "other.css" },
    );
  });

  expect(screen.getByTestId(testID).props.style).toStrictEqual({ width: 1 });
});

test("an inheriting variable that refers to a non-inheriting one carries the declaring element's value", () => {
  registerCSS(`
    ${registration}
    .parent { --my-var: 10px; --alias: var(--my-var); }
    .other { --my-var: 20px; --alias: var(--my-var); }
    .child { width: var(--alias); }
  `);

  renderDeclaringTree();

  expect(screen.getByTestId(testID).props.style).toStrictEqual({ width: 10 });
});

test("currentcolor below a color that reads a non-inheriting property", () => {
  registerCSS(`
    @property --brand { syntax: "<color>"; inherits: false; initial-value: black; }
    .parent { --brand: red; color: var(--brand); }
    .other { --brand: blue; color: var(--brand); }
    .child { border-color: currentcolor; }
  `);

  render(
    <View testID={parentTestID} className="parent">
      <View testID={testID} className="child" />
    </View>,
  );

  expect(screen.getByTestId(testID).props.style).toStrictEqual({
    borderColor: "red",
  });
});

test("an element under VariableContext itself skips a non-inheriting property", () => {
  registerCSS(`${registration} .child { width: var(--my-var); }`);

  render(
    <VariableContext value={{ [VAR_SYMBOL]: true, "my-var": 10 }}>
      <View testID={testID} className="child" />
    </VariableContext>,
  );

  expect(screen.getByTestId(testID).props.style).toStrictEqual({ width: 0 });
});

test("a mounted element follows a later stylesheet that lets the property inherit", () => {
  registerCSS(`${registration} ${declaringTree}`, { filename: "global.css" });
  renderDeclaringTree();
  expect(screen.getByTestId(testID).props.style).toStrictEqual({ width: 0 });

  act(() => {
    registerCSS(inheritingRegistration, { filename: "other.css" });
  });

  expect(screen.getByTestId(testID).props.style).toStrictEqual({ width: 10 });
});

test("after a later stylesheet lets the property inherit, the ancestor's next value reaches a mounted element", () => {
  registerCSS(`${registration} ${declaringTree}`, { filename: "global.css" });
  const tree = (className: string) => (
    <View testID={parentTestID} className={className}>
      <View testID={testID} className="child" />
    </View>
  );
  render(tree("parent"));

  act(() => {
    registerCSS(inheritingRegistration, { filename: "other.css" });
  });
  act(() => {
    screen.rerender(tree("other"));
  });

  expect(screen.getByTestId(testID).props.style).toStrictEqual({ width: 20 });
});

test("an inheriting variable takes a non-inheriting one from its own element, not from an ancestor", () => {
  registerCSS(`
    ${registration}
    .grandparent { --my-var: 10px; }
    .parent { --alias: var(--my-var); }
    .child { width: var(--alias); }
  `);

  render(
    <View className="grandparent">
      <View className="parent">
        <View testID={testID} className="child" />
      </View>
    </View>,
  );

  expect(screen.getByTestId(testID).props.style).toStrictEqual({ width: 0 });
});

test("a single declaration that refers to a non-inheriting property carries its element's value", () => {
  registerCSS(`
    ${registration}
    .parent { --alias: var(--my-var); --my-var: 10px; }
    .child { width: var(--alias); }
  `);

  renderDeclaringTree();

  expect(screen.getByTestId(testID).props.style).toStrictEqual({ width: 10 });
});

test("a :root variable that refers to a non-inheriting property carries :root's value", () => {
  registerCSS(`
    ${registration}
    :root { --my-var: 10px; --alias: var(--my-var); }
    .child { width: var(--alias); }
  `);

  render(<View testID={testID} className="child" />);

  expect(screen.getByTestId(testID).props.style).toStrictEqual({ width: 10 });
});

test("a fallback inside an inheriting variable takes the declaring element's non-inheriting value", () => {
  registerCSS(`
    ${registration}
    .parent { --my-var: 10px; --alias: var(--unset, var(--my-var)); }
    .child { width: var(--alias); }
  `);

  renderDeclaringTree();

  expect(screen.getByTestId(testID).props.style).toStrictEqual({ width: 10 });
});

test("a cycle of non-inheriting properties leaves an inheriting variable its fallback", () => {
  registerCSS(`
    @property --a { syntax: "*"; inherits: false; }
    @property --b { syntax: "*"; inherits: false; }
    .parent { --a: var(--b, 1px); --b: var(--a, 2px); --alias: var(--a, 5px); }
    .child { width: var(--alias); }
  `);

  renderDeclaringTree();

  expect(screen.getByTestId(testID).props.style).toStrictEqual({ width: 5 });
});

test("a reference inside calc() in an inheriting variable takes the declaring element's value", () => {
  registerCSS(`
    ${registration}
    .parent { --my-var: 10px; --alias: calc(var(--my-var) * 2); }
    .child { width: var(--alias); }
  `);

  renderDeclaringTree();

  expect(screen.getByTestId(testID).props.style).toStrictEqual({ width: 20 });
});

test("an unchanged inheriting variable keeps a descendant's styles across its element's update", () => {
  registerCSS(`
    ${registration}
    .parent { --my-var: 10px; --alias: calc(var(--my-var) * 2); }
    .faded { opacity: 0.5; }
    .child { width: var(--alias); }
  `);
  const tree = (className: string) => (
    <View testID={parentTestID} className={className}>
      <View testID={testID} className="child" />
    </View>
  );
  render(tree("parent"));
  const before = screen.getByTestId(testID).props.style;

  act(() => {
    screen.rerender(tree("parent faded"));
  });

  expect(screen.getByTestId(parentTestID).props.style).toStrictEqual({
    opacity: 0.5,
  });
  expect(screen.getByTestId(testID).props.style).toBe(before);
});

test("a chain of single declarations ending at a non-inheriting property takes the declaring element's value", () => {
  registerCSS(`
    ${registration}
    .parent { --outer: var(--inner); --inner: var(--my-var); }
    .grandparent { --my-var: 10px; }
    .child { width: var(--outer); }
  `);

  render(
    <View className="grandparent">
      <View className="parent">
        <View testID={testID} className="child" />
      </View>
    </View>,
  );

  expect(screen.getByTestId(testID).props.style).toStrictEqual({ width: 0 });
});

test("a stylesheet repeating a registration leaves a mounted element's styles in place", () => {
  const shadowRegistration = `@property --tw-shadow { syntax: "*"; inherits: false; initial-value: 0 0 #0000; }`;
  registerCSS(
    `${shadowRegistration} .child { box-shadow: var(--tw-shadow); }`,
    {
      filename: "global.css",
    },
  );
  render(<View testID={testID} className="child" />);
  const before = screen.getByTestId(testID).props.style;

  act(() => {
    registerCSS(shadowRegistration, { filename: "other.css" });
  });

  expect(screen.getByTestId(testID).props.style).toBe(before);
});

test("a later stylesheet that swaps which property inherits reaches a mounted reader of each", () => {
  registerCSS(
    `
    @property --a { syntax: "<length>"; inherits: false; initial-value: 0px; }
    @property --b { syntax: "<length>"; inherits: true; initial-value: 0px; }
    .parent { --a: 10px; --b: 10px; }
    .other { --a: 20px; --b: 20px; }
    .child-a { width: var(--a); }
    .child-b { height: var(--b); }
  `,
    { filename: "global.css" },
  );
  render(
    <View className="parent">
      <View testID="child-a" className="child-a" />
      <View testID="child-b" className="child-b" />
    </View>,
  );

  act(() => {
    registerCSS(
      `
      @property --a { syntax: "<length>"; inherits: true; initial-value: 0px; }
      @property --b { syntax: "<length>"; inherits: false; initial-value: 0px; }
    `,
      { filename: "other.css" },
    );
  });

  expect(screen.getByTestId("child-a").props.style).toStrictEqual({
    width: 10,
  });
  expect(screen.getByTestId("child-b").props.style).toStrictEqual({
    height: 0,
  });
});

test("a cycle referenced twice in an inheriting variable gives each reference its fallback", () => {
  registerCSS(`
    @property --a { syntax: "*"; inherits: false; }
    @property --b { syntax: "*"; inherits: false; }
    .parent { --a: var(--b, 1px); --b: var(--a, 2px); --alias: calc(var(--a, 5px) + var(--a, 6px)); }
    .child { width: var(--alias); }
  `);

  renderDeclaringTree();

  expect(screen.getByTestId(testID).props.style).toStrictEqual({ width: 11 });
});

test("a property that depends on a cycle takes its own fallback for it", () => {
  registerCSS(`
    @property --a { syntax: "*"; inherits: false; }
    @property --b { syntax: "*"; inherits: false; }
    @property --c { syntax: "*"; inherits: false; }
    .parent { --c: var(--a, 3px); --a: var(--b, 1px); --b: var(--a, 2px); --alias: var(--c, 5px); }
    .child { width: var(--alias); }
  `);

  renderDeclaringTree();

  expect(screen.getByTestId(testID).props.style).toStrictEqual({ width: 3 });
});

test("a calc() of an inheriting property in an inheriting variable resolves on the reader", () => {
  registerCSS(`
    ${registration}
    .parent { --x: 10px; --alias: calc(var(--x) * 2); }
    .other { --x: 20px; --alias: calc(var(--x) * 3); }
    .child { width: var(--alias); }
  `);

  renderDeclaringTree();

  expect(screen.getByTestId(testID).props.style).toStrictEqual({ width: 20 });
});

test("a descendant keeps its styles when an ancestor's non-inheriting value changes", () => {
  registerCSS(`${registration} ${declaringTree}`);
  const tree = (className: string) => (
    <View testID={parentTestID} className={className}>
      <View testID={testID} className="child" />
    </View>
  );
  render(tree("parent"));
  const before = screen.getByTestId(testID).props.style;

  act(() => {
    screen.rerender(tree("other"));
  });

  expect(screen.getByTestId(testID).props.style).toBe(before);
});

test("an inheriting variable follows a universal value it refers to into dark mode", () => {
  registerCSS(`
    @property --b { syntax: "<color>"; inherits: false; initial-value: black; }
    * { --b: red; }
    @media (prefers-color-scheme: dark) { * { --b: blue; } }
    .parent { --border: var(--b); }
    .other { --border: green; }
    .child { border-color: var(--border); }
  `);
  renderDeclaringTree();
  expect(screen.getByTestId(testID).props.style).toStrictEqual({
    borderColor: "red",
  });

  act(() => {
    colorScheme.set("dark");
  });

  expect(screen.getByTestId(testID).props.style).toStrictEqual({
    borderColor: "blue",
  });
});

test("an inheriting variable follows a later stylesheet that changes the initial value it refers to", () => {
  registerCSS(
    `
    @property --b { syntax: "<length>"; inherits: false; initial-value: 3px; }
    .parent { --border: var(--b); }
    .other { --border: 1px; }
    .child { width: var(--border); }
  `,
    { filename: "global.css" },
  );
  renderDeclaringTree();
  expect(screen.getByTestId(testID).props.style).toStrictEqual({ width: 3 });

  act(() => {
    registerCSS(
      `@property --b { syntax: "<length>"; inherits: false; initial-value: 7px; }`,
      { filename: "other.css" },
    );
  });

  expect(screen.getByTestId(testID).props.style).toStrictEqual({ width: 7 });
});

test("an inheriting variable follows a later stylesheet that lets the property it refers to inherit", () => {
  registerCSS(
    `
    @property --b { syntax: "<length>"; inherits: false; initial-value: 3px; }
    .grandparent { --b: 10px; }
    .grandparent-too { --b: 20px; }
    .parent { --border: var(--b); }
    .other { --border: 1px; }
    .child { width: var(--border); }
  `,
    { filename: "global.css" },
  );
  render(
    <View className="grandparent">
      <View className="parent">
        <View testID={testID} className="child" />
      </View>
    </View>,
  );
  expect(screen.getByTestId(testID).props.style).toStrictEqual({ width: 3 });

  act(() => {
    registerCSS(
      `@property --b { syntax: "<length>"; inherits: true; initial-value: 3px; }`,
      { filename: "other.css" },
    );
  });

  expect(screen.getByTestId(testID).props.style).toStrictEqual({ width: 10 });
});

test("an inheriting variable of a property both * and its element declare carries the element's value", () => {
  registerCSS(`
    ${registration}
    * { --my-var: 1px; }
    .parent { --my-var: 10px; --alias: var(--my-var); }
    .child { width: var(--alias); }
  `);

  renderDeclaringTree();

  expect(screen.getByTestId(testID).props.style).toStrictEqual({ width: 10 });
});

test("an inheriting variable whose reference has no value leaves the reader its fallback", () => {
  registerCSS(`
    @property --none { syntax: "*"; inherits: false; }
    .parent { --alias: var(--none); }
    .other { --alias: 1px; }
    .child { width: var(--alias, 7px); }
  `);

  renderDeclaringTree();

  expect(screen.getByTestId(testID).props.style).toStrictEqual({ width: 7 });
});

const tailwindPropertiesLayer = `
  @layer properties {
    @supports ((-webkit-hyphens: none) and (not (margin-trim: inline))) or ((-moz-orient: inline) and (not (color:rgb(from red r g b)))) {
      *, :before, :after, ::backdrop { --tw-ring-color: initial; }
    }
  }
  @property --tw-ring-color { syntax: "*"; inherits: false; }
`;

test("an alias of a Tailwind property keeps the declaring element's value beside the properties layer", () => {
  registerCSS(`
    ${tailwindPropertiesLayer}
    .ring-red { --tw-ring-color: red; }
    .card { --card-ring: var(--tw-ring-color); }
    .child { border-color: var(--card-ring); }
  `);

  render(
    <View className="card ring-red">
      <View testID={testID} className="child" />
    </View>,
  );

  expect(screen.getByTestId(testID).props.style).toStrictEqual({
    borderColor: "red",
  });
});

test("a non-inheriting property declared only under a media query is not folded into its readers", () => {
  registerCSS(`
    ${registration}
    @media (min-width: 9999px) { * { --my-var: 10px; } }
    .child { width: var(--my-var); }
  `);

  render(<View testID={testID} className="child" />);

  expect(screen.getByTestId(testID).props.style).toStrictEqual({ width: 0 });
});

test("a :root variable whose reference has no value leaves the reader its fallback", () => {
  registerCSS(`
    @property --none { syntax: "*"; inherits: false; }
    :root { --alias: var(--none); }
    .child { width: var(--alias, 7px); }
  `);

  render(<View testID={testID} className="child" />);

  expect(screen.getByTestId(testID).props.style).toStrictEqual({ width: 7 });
});
