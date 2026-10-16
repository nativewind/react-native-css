import { compile } from "react-native-css/compiler";

test("@property with length initial value", () => {
  const compiled = compile(`
@property --tw-translate-x {
  syntax: "<length-percentage>";
  inherits: false;
  initial-value: 0px;
}
`);

  const result = compiled.stylesheet();
  expect(result.vi).toBeDefined();

  const vrMap = new Map(result.vi);
  expect(vrMap.has("tw-translate-x")).toBe(true);
  expect(vrMap.get("tw-translate-x")).toStrictEqual([[0]]);
});

test("@property without initial value is skipped", () => {
  const compiled = compile(`
@property --tw-ring-color {
  syntax: "*";
  inherits: false;
}
`);

  const result = compiled.stylesheet();
  expect(result.vi).toBeUndefined();
  expect(result.vr).toBeUndefined();
});

test("@property with number initial value", () => {
  const compiled = compile(`
@property --tw-backdrop-opacity {
  syntax: "<number>";
  inherits: false;
  initial-value: 1;
}
`);

  const result = compiled.stylesheet();
  expect(result.vi).toBeDefined();

  const vrMap = new Map(result.vi);
  expect(vrMap.get("tw-backdrop-opacity")).toStrictEqual([[1]]);
});

test("@property with color initial value", () => {
  const compiled = compile(`
@property --tw-ring-offset-color {
  syntax: "<color>";
  inherits: false;
  initial-value: #fff;
}
`);

  const result = compiled.stylesheet();
  expect(result.vi).toBeDefined();

  const vrMap = new Map(result.vi);
  expect(vrMap.get("tw-ring-offset-color")).toStrictEqual([["#fff"]]);
});

test("@property with token-list initial value (shadow)", () => {
  const compiled = compile(`
@property --tw-shadow {
  syntax: "*";
  inherits: false;
  initial-value: 0 0 #0000;
}
`);

  const result = compiled.stylesheet();
  expect(result.vi).toBeDefined();

  const vrMap = new Map(result.vi);
  expect(vrMap.get("tw-shadow")).toStrictEqual([[[0, 0, "#0000"]]]);
});

test("@property defaults are neither root nor universal variables", () => {
  const compiled = compile(`
@property --tw-shadow {
  syntax: "*";
  inherits: false;
  initial-value: 0 0 #0000;
}
`);

  const result = compiled.stylesheet();
  expect(result.vi).toBeDefined();
  expect(result.vr).toBeUndefined();
  expect(result.vu).toBeUndefined();
});

test("a :root declaration and a registered default land in different slots", () => {
  const compiled = compile(`
@property --my-var {
  syntax: "<length>";
  inherits: true;
  initial-value: 0px;
}
:root { --my-var: 50px; }
:root { --my-var: 50px; }
`);

  const result = compiled.stylesheet();
  expect(new Map(result.vr).get("my-var")).toStrictEqual([[50]]);
  expect(new Map(result.vi).get("my-var")).toStrictEqual([[0]]);
});

test("@supports -moz-orient fallback no longer fires", () => {
  const compiled = compile(`
@supports (-moz-orient: inline) {
  *, ::before, ::after, ::backdrop {
    --tw-shadow: 0 0 #0000;
  }
}
`);

  const result = compiled.stylesheet();
  expect(result.vu).toBeUndefined();
});

test("@property + class override produces valid stylesheet", () => {
  const compiled = compile(`
@property --tw-shadow {
  syntax: "*";
  inherits: false;
  initial-value: 0 0 #0000;
}
@property --tw-inset-shadow {
  syntax: "*";
  inherits: false;
  initial-value: 0 0 #0000;
}
@property --tw-ring-shadow {
  syntax: "*";
  inherits: false;
  initial-value: 0 0 #0000;
}
@property --tw-inset-ring-shadow {
  syntax: "*";
  inherits: false;
  initial-value: 0 0 #0000;
}
@property --tw-ring-offset-shadow {
  syntax: "*";
  inherits: false;
  initial-value: 0 0 #0000;
}

.shadow-md {
  --tw-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1);
  box-shadow: var(--tw-inset-shadow), var(--tw-inset-ring-shadow), var(--tw-ring-offset-shadow), var(--tw-ring-shadow), var(--tw-shadow);
}
`);

  const result = compiled.stylesheet();
  expect(result.vi).toBeDefined();
  expect(result.s).toBeDefined();

  const shadowRule = result.s?.find(([name]) => name === "shadow-md");
  expect(shadowRule).toBeDefined();
});

test("@property with percentage initial value", () => {
  const compiled = compile(`
@property --tw-shadow-alpha {
  syntax: "<percentage>";
  inherits: false;
  initial-value: 100%;
}
`);

  const result = compiled.stylesheet();
  expect(result.vi).toBeDefined();

  const vrMap = new Map(result.vi);
  expect(vrMap.get("tw-shadow-alpha")).toStrictEqual([["100%"]]);
});

test("multiple @property declarations with verified values", () => {
  const compiled = compile(`
@property --tw-translate-x {
  syntax: "<length-percentage>";
  inherits: false;
  initial-value: 0px;
}
@property --tw-translate-y {
  syntax: "<length-percentage>";
  inherits: false;
  initial-value: 0px;
}
@property --tw-rotate {
  syntax: "<angle>";
  inherits: false;
  initial-value: 0deg;
}
`);

  const result = compiled.stylesheet();
  expect(result.vi).toBeDefined();

  const vrMap = new Map(result.vi);
  expect(vrMap.get("tw-translate-x")).toStrictEqual([[0]]);
  expect(vrMap.get("tw-translate-y")).toStrictEqual([[0]]);
  expect(vrMap.get("tw-rotate")).toStrictEqual([["0deg"]]);
});

test("@property with repeated single-child unwraps to scalar", () => {
  const compiled = compile(`
@property --my-offset {
  syntax: "<length>+";
  inherits: false;
  initial-value: 10px;
}
`);

  const result = compiled.stylesheet();
  expect(result.vi).toBeDefined();

  const vrMap = new Map(result.vi);
  // Single-child repeated (<length>+ with one value) should unwrap
  // to the same shape as a direct <length-percentage> type
  expect(vrMap.get("my-offset")).toStrictEqual([[10]]);
});

test("@property inherits: false is recorded, initial value or not", () => {
  const compiled = compile(`
@property --tw-ring-shadow {
  syntax: "*";
  inherits: false;
  initial-value: 0 0 #0000;
}
@property --tw-ring-color {
  syntax: "*";
  inherits: false;
}
`);

  const result = compiled.stylesheet();
  expect(result.vn).toStrictEqual(["tw-ring-shadow", "tw-ring-color"]);
  expect(new Map(result.vi).has("tw-ring-color")).toBe(false);
});

test("vn carries exactly the properties declared inherits: false", () => {
  const declarations: [name: string, inherits: boolean][] = [
    ["--a-off", false],
    ["--b-on", true],
    ["--c-off", false],
    ["--d-on", true],
  ];

  const compiled = compile(
    declarations
      .map(
        ([name, inherits]) =>
          `@property ${name} { syntax: "<length>"; inherits: ${inherits}; initial-value: 0px; }`,
      )
      .join("\n"),
  );

  expect(declarations.length).toBeGreaterThan(0);
  expect([...(compiled.stylesheet().vn ?? [])].sort()).toStrictEqual(
    declarations
      .filter(([, inherits]) => !inherits)
      .map(([name]) => name.slice(2))
      .sort(),
  );
});

test("a non-inheriting property is left to the runtime, however few rules declare it", () => {
  const compiled = compile(`
@property --pinned {
  syntax: "<length>";
  inherits: false;
  initial-value: 0px;
}
.parent { --pinned: 10px; }
.child { width: var(--pinned); }
`);

  const result = compiled.stylesheet();
  const child = result.s?.find(([name]) => name === "child");

  expect(result.s?.find(([name]) => name === "parent")).toBeDefined();
  expect(JSON.stringify(child)).toContain('"var"');
});

test("an inheriting property with one declaration is still inlined", () => {
  const compiled = compile(`
@property --folded {
  syntax: "<length>";
  inherits: true;
  initial-value: 0px;
}
.parent { --folded: 10px; }
.child { width: var(--folded); }
`);

  const result = compiled.stylesheet();
  const child = result.s?.find(([name]) => name === "child");

  expect(JSON.stringify(child)).not.toContain('"var"');
  expect(JSON.stringify(child)).toContain("10");
});

test("@property inherits: true is not recorded", () => {
  const compiled = compile(`
@property --my-brand {
  syntax: "<color>";
  inherits: true;
  initial-value: red;
}
`);

  const result = compiled.stylesheet();
  expect(result.vn).toBeUndefined();
});

test("an unregistered custom property is not recorded", () => {
  // Declared twice, since a single declaration is inlined away and the sheet would be empty
  const compiled = compile(`
.my-class { --my-var: 10px; }
.other { --my-var: 20px; }
`);

  const result = compiled.stylesheet();
  expect(result.s).toBeDefined();
  expect(result.vn).toBeUndefined();
  expect(result.vi).toBeUndefined();
});

test("@property records a name once, however many rules declare it", () => {
  // Different syntaxes, since lightningcss collapses identical @property rules
  const compiled = compile(`
@property --dup {
  syntax: "<length>";
  inherits: false;
  initial-value: 0px;
}
@property --dup {
  syntax: "*";
  inherits: false;
}
`);

  expect(compiled.stylesheet().vn).toStrictEqual(["dup"]);
});

test("the last @property declaration of a name decides inherits", () => {
  const inheritsLast = compile(`
@property --flip { syntax: "*"; inherits: false; }
@property --flip { syntax: "<length>"; inherits: true; initial-value: 0px; }
`);
  expect(inheritsLast.stylesheet().vn).toBeUndefined();

  const nonInheritingLast = compile(`
@property --flip { syntax: "<length>"; inherits: true; initial-value: 0px; }
@property --flip { syntax: "*"; inherits: false; }
`);
  expect(nonInheritingLast.stylesheet().vn).toStrictEqual(["flip"]);
});

test("@property with repeated multi-child preserves array", () => {
  const compiled = compile(`
@property --my-offsets {
  syntax: "<length>+";
  inherits: false;
  initial-value: 10px 20px;
}
`);

  const result = compiled.stylesheet();
  expect(result.vi).toBeDefined();

  const vrMap = new Map(result.vi);
  // Multi-child repeated (<length>+ with two values) keeps the array form
  expect(vrMap.get("my-offsets")).toStrictEqual([[[10, 20]]]);
});

test.each([
  "2em",
  "1rem",
  "1ch",
  "2lh",
  "1cqw",
  "calc(1px + 1em)",
  "min(1px, 1em)",
])(
  "an initial value of %s depends on the element, so the registration is ignored",
  (initialValue) => {
    const result = compile(
      `@property --x { syntax: "<length>"; inherits: false; initial-value: ${initialValue}; }`,
    ).stylesheet();

    expect(result.vn).toBeUndefined();
    expect(result.vi).toBeUndefined();
  },
);

test.each([
  ["<length>", "3px", 3],
  ["<length>", "calc(1px + 2px)", 3],
  ["<length-percentage>", "30%", "30%"],
])("a %s initial value of %s registers", (syntax, initialValue, expected) => {
  const result = compile(
    `@property --x { syntax: "${syntax}"; inherits: false; initial-value: ${initialValue}; }`,
  ).stylesheet();

  expect(result.vn).toStrictEqual(["x"]);
  expect(new Map(result.vi).get("x")).toStrictEqual([[expected]]);
});

test.each(["1vw", "2svh", "max(1px, 2vw)"])(
  "a viewport-relative initial value of %s registers",
  (initialValue) => {
    const result = compile(
      `@property --x { syntax: "<length>"; inherits: false; initial-value: ${initialValue}; }`,
    ).stylesheet();

    expect(result.vn).toStrictEqual(["x"]);
  },
);

test.each([
  ["translateX(1em)", undefined],
  ["translateX(30%)", ["x"]],
])(
  "a transform initial value of %s registers only when it is element-independent",
  (initialValue, expected) => {
    const result = compile(
      `@property --x { syntax: "<transform-function>"; inherits: false; initial-value: ${initialValue}; }`,
    ).stylesheet();

    expect(result.vn).toStrictEqual(expected);
  },
);

test("an ignored registration leaves a single declaration to the inliner", () => {
  const compiled = compile(`
@property --ignored {
  syntax: "<length>";
  inherits: false;
  initial-value: 2em;
}
.parent { --ignored: 10px; }
.child { width: var(--ignored); }
`);

  const child = compiled.stylesheet().s?.find(([name]) => name === "child");

  expect(JSON.stringify(child)).not.toContain('"var"');
});

test("a non-inheriting property declared once on * is still inlined", () => {
  const compiled = compile(`
@property --everywhere {
  syntax: "*";
  inherits: false;
  initial-value: solid;
}
* { --everywhere: dashed; }
.child { border-style: var(--everywhere); }
`);

  const child = compiled.stylesheet().s?.find(([name]) => name === "child");

  expect(JSON.stringify(child)).not.toContain('"var"');
});
