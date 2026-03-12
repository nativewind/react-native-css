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
  expect(result.vr).toBeDefined();

  const vrMap = new Map(result.vr);
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
  expect(result.vr).toBeDefined();

  const vrMap = new Map(result.vr);
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
  expect(result.vr).toBeDefined();

  const vrMap = new Map(result.vr);
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
  expect(result.vr).toBeDefined();

  const vrMap = new Map(result.vr);
  expect(vrMap.get("tw-shadow")).toStrictEqual([[[0, 0, "#0000"]]]);
});

test("@property defaults are root variables, not universal", () => {
  const compiled = compile(`
@property --tw-shadow {
  syntax: "*";
  inherits: false;
  initial-value: 0 0 #0000;
}
`);

  const result = compiled.stylesheet();
  expect(result.vr).toBeDefined();
  expect(result.vu).toBeUndefined();
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
  expect(result.vr).toBeDefined();
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
  expect(result.vr).toBeDefined();

  const vrMap = new Map(result.vr);
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
  expect(result.vr).toBeDefined();

  const vrMap = new Map(result.vr);
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
  expect(result.vr).toBeDefined();

  const vrMap = new Map(result.vr);
  // Single-child repeated (<length>+ with one value) should unwrap
  // to the same shape as a direct <length-percentage> type
  expect(vrMap.get("my-offset")).toStrictEqual([[10]]);
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
  expect(result.vr).toBeDefined();

  const vrMap = new Map(result.vr);
  // Multi-child repeated (<length>+ with two values) keeps the array form
  expect(vrMap.get("my-offsets")).toStrictEqual([[[10, 20]]]);
});
