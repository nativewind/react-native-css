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
  // A registered initial value is not a declaration on any element. :root's are values
  // the root element HAS and descendants inherit, and *'s are declared on each element;
  // this is what the property resolves to where nothing declares it. Sharing vr let
  // source order pick between a :root declaration and the default, and left a
  // non-inheriting property no way to reach its default once :root was skipped
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
  // --tw-ring-color has no initial value, so it publishes no registered default
  expect(result.vn).toStrictEqual(["tw-ring-shadow", "tw-ring-color"]);
  expect(new Map(result.vi).has("tw-ring-color")).toBe(false);
});

test("vn carries exactly the properties declared inherits: false", () => {
  // Derived rather than restated: the expected set is read off the source CSS, so a
  // property added to the fixture is covered without touching the assertion
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

test("@property without an inherits descriptor never reaches the registry", () => {
  // syntax and inherits are both required; a rule missing either is invalid
  // (css-properties-values-api-1). The spec has the invalid rule ignored, while
  // lightningcss rejects the whole sheet — either way no half-registration exists for
  // the inherit flag to be guessed from, which is the property this pins
  expect(() =>
    compile(`
@property --no-descriptor {
  syntax: "<length>";
  initial-value: 0px;
}
`),
  ).toThrow("Invalid @ rule body");
});

test("a non-inheriting property is left to the runtime, however few rules declare it", () => {
  // The inliner folds a property with one declaration into its consumers, which answers
  // for every element the consumer matches. That is sound only while the value reaches
  // all of them, and a non-inheriting property reaches the declaring element alone
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

  // The declaration survives as a rule, and the consumer still holds a var() call
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
  // Custom properties inherit by default; only an @property rule can opt out.
  // Declared twice on purpose: with one definition the inliner erases it and the
  // compiled output is empty, so the assertion would hold for a stylesheet
  // containing nothing at all.
  const compiled = compile(`
.my-class { --my-var: 10px; }
.other { --my-var: 20px; }
`);

  const result = compiled.stylesheet();
  expect(result.s).toBeDefined();
  expect(result.vn).toBeUndefined();
  // Neither half of a registration is emitted. This is the sheet a Fast Refresh produces
  // when an @property rule is deleted, so it is what the runtime has to retract AGAINST
  expect(result.vi).toBeUndefined();
});

test("@property records a name once, however many rules declare it", () => {
  // Different syntaxes on purpose — lightningcss collapses identical @property
  // blocks before the visitor sees them, so an identical pair would not reach
  // the Set that does the deduplicating.
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

test("@property inside @media is not recorded — a known limitation", () => {
  // lightningcss reports the nested rule as type "unknown" and extractRule drops it,
  // so neither vn nor vi is emitted. Pinned in both directions: the day extractRule
  // learns about a nested @property, vn has to follow it.
  const compiled = compile(`
@media (min-width: 100px) {
  @property --scoped {
    syntax: "*";
    inherits: false;
    initial-value: 0 0 #0000;
  }
}
`);

  const result = compiled.stylesheet();
  expect(result.vn).toBeUndefined();
  expect(result.vi).toBeUndefined();
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
