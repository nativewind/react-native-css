import { compile } from "react-native-css/compiler";

test("@property with length initial value", () => {
  const compiled = compile(`
@property --tw-translate-x {
  syntax: "<length-percentage>";
  inherits: false;
  initial-value: 0px;
}
`);

  expect(compiled.stylesheet().vp).toStrictEqual([
    ["tw-translate-x", false, 0],
  ]);
});

test("@property without an initial value registers none", () => {
  const compiled = compile(`
@property --tw-ring-color {
  syntax: "*";
  inherits: false;
}
`);

  const result = compiled.stylesheet();
  expect(result.vp).toStrictEqual([["tw-ring-color", false]]);
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

  expect(compiled.stylesheet().vp).toStrictEqual([
    ["tw-backdrop-opacity", false, 1],
  ]);
});

test("@property with color initial value", () => {
  const compiled = compile(`
@property --tw-ring-offset-color {
  syntax: "<color>";
  inherits: false;
  initial-value: #fff;
}
`);

  expect(compiled.stylesheet().vp).toStrictEqual([
    ["tw-ring-offset-color", false, "#fff"],
  ]);
});

test("@property with token-list initial value (shadow)", () => {
  const compiled = compile(`
@property --tw-shadow {
  syntax: "*";
  inherits: false;
  initial-value: 0 0 #0000;
}
`);

  expect(compiled.stylesheet().vp).toStrictEqual([
    ["tw-shadow", false, [0, 0, "#0000"]],
  ]);
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
  expect(result.vp).toStrictEqual([["tw-shadow", false, [0, 0, "#0000"]]]);
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
  expect(result.vp).toStrictEqual([["my-var", true, 0]]);
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
  expect(result.vp).toStrictEqual([
    ["tw-shadow", false, [0, 0, "#0000"]],
    ["tw-inset-shadow", false, [0, 0, "#0000"]],
    ["tw-ring-shadow", false, [0, 0, "#0000"]],
    ["tw-inset-ring-shadow", false, [0, 0, "#0000"]],
    ["tw-ring-offset-shadow", false, [0, 0, "#0000"]],
  ]);
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

  expect(compiled.stylesheet().vp).toStrictEqual([
    ["tw-shadow-alpha", false, "100%"],
  ]);
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

  expect(compiled.stylesheet().vp).toStrictEqual([
    ["tw-translate-x", false, 0],
    ["tw-translate-y", false, 0],
    ["tw-rotate", false, "0deg"],
  ]);
});

test("@property with repeated single-child unwraps to scalar", () => {
  const compiled = compile(`
@property --my-offset {
  syntax: "<length>+";
  inherits: false;
  initial-value: 10px;
}
`);

  // Single-child repeated (<length>+ with one value) should unwrap
  // to the same shape as a direct <length-percentage> type
  expect(compiled.stylesheet().vp).toStrictEqual([["my-offset", false, 10]]);
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

  expect(compiled.stylesheet().vp).toStrictEqual([
    ["tw-ring-shadow", false, [0, 0, "#0000"]],
    ["tw-ring-color", false],
  ]);
});

test("vp carries each registration's inherits", () => {
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

  expect(
    compiled.stylesheet().vp?.map(([name, inherits]) => [name, inherits]),
  ).toStrictEqual(
    declarations.map(([name, inherits]) => [name.slice(2), inherits]),
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

  expect(compiled.stylesheet().s).toStrictEqual([
    ["parent", [{ s: [1, 1], v: [["pinned", 10]] }]],
    [
      "child",
      [{ s: [2, 1], d: [[[{}, "var", "pinned", 1], "width", 1]], dv: 1 }],
    ],
  ]);
});

test("a single declaration that refers to a non-inheriting property is left to the runtime", () => {
  const compiled = compile(`
@property --my-var {
  syntax: "<length>";
  inherits: false;
  initial-value: 0px;
}
.parent { --alias: var(--my-var); --my-var: 10px; }
.child { width: var(--alias); }
`);

  expect(compiled.stylesheet().s).toStrictEqual([
    [
      "parent",
      [
        {
          s: [1, 1],
          v: [
            ["alias", [{}, "var", "my-var", 1]],
            ["my-var", 10],
          ],
        },
      ],
    ],
    [
      "child",
      [{ s: [2, 1], d: [[[{}, "var", "alias", 1], "width", 1]], dv: 1 }],
    ],
  ]);
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

  expect(compiled.stylesheet().s).toStrictEqual([
    ["child", [{ s: [1, 1], d: [{ width: 10 }] }]],
  ]);
});

test("@property inherits: true is recorded as inheriting", () => {
  const compiled = compile(`
@property --my-brand {
  syntax: "<color>";
  inherits: true;
  initial-value: red;
}
`);

  expect(
    compiled.stylesheet().vp?.map(([name, inherits]) => [name, inherits]),
  ).toStrictEqual([["my-brand", true]]);
});

test("an unregistered custom property is not recorded", () => {
  // Declared twice, since a single declaration is inlined away and the sheet would be empty
  const compiled = compile(`
.my-class { --my-var: 10px; }
.other { --my-var: 20px; }
`);

  const result = compiled.stylesheet();
  expect(result.s).toBeDefined();
  expect(result.vp).toBeUndefined();
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

  expect(compiled.stylesheet().vp).toStrictEqual([["dup", false]]);
});

test("the last @property declaration of a name decides inherits", () => {
  const inheritsLast = compile(`
@property --flip { syntax: "*"; inherits: false; }
@property --flip { syntax: "<length>"; inherits: true; initial-value: 0px; }
`);
  expect(inheritsLast.stylesheet().vp).toStrictEqual([["flip", true, 0]]);

  const nonInheritingLast = compile(`
@property --flip { syntax: "<length>"; inherits: true; initial-value: 0px; }
@property --flip { syntax: "*"; inherits: false; }
`);
  expect(nonInheritingLast.stylesheet().vp).toStrictEqual([["flip", false]]);
});

test("an ignored @property leaves the earlier registration of its name", () => {
  const result = compile(`
@property --x { syntax: "<length>"; inherits: false; initial-value: 3px; }
@property --x { syntax: "<length>"; inherits: true; initial-value: 2em; }
`).stylesheet();

  expect(result.vp).toStrictEqual([["x", false, 3]]);
});

test.each([
  ["<time>", "1s"],
  ["<resolution>", "2dppx"],
  ["<image>", "linear-gradient(red, blue)"],
  ["<url>", 'url("a.png")'],
  ["<transform-function>", "rotate(45deg)"],
  ["<transform-list>", "rotate(45deg) scale(2)"],
  ["<time>+", "1s 2s"],
])(
  "a registration whose %s initial value has no descriptor is left out",
  (syntax, initialValue) => {
    const result = compile(
      `@property --x { syntax: "${syntax}"; inherits: false; initial-value: ${initialValue}; }`,
    ).stylesheet();

    expect(result.vp).toBeUndefined();
  },
);

test("a property left unregistered is inlined like any other declared once", () => {
  const result = compile(`
@property --t { syntax: "<transform-function>"; inherits: false; initial-value: rotate(45deg); }
.parent { --t: rotate(10deg); }
.child { transform: var(--t); }
`).stylesheet();

  expect(result.s).toStrictEqual([
    [
      "child",
      [
        {
          s: [1, 1],
          d: [[[{}, "transform", [[{}, "rotate", "10deg"]]], "transform"]],
        },
      ],
    ],
  ]);
});

test("an @property nested in @media is not registered", () => {
  const result = compile(`
@media (min-width: 1px) {
  @property --x { syntax: "<length>"; inherits: false; initial-value: 3px; }
}
`).stylesheet();

  expect(result.vp).toBeUndefined();
});

test("the last @property declaration of a name decides what the inliner folds", () => {
  const consumers = `
.parent { --flip: 10px; }
.child { width: var(--flip); }
`;
  const child = (css: string) =>
    JSON.stringify(
      compile(css)
        .stylesheet()
        .s?.find(([name]) => name === "child"),
    );

  expect(
    child(`
@property --flip { syntax: "*"; inherits: false; }
@property --flip { syntax: "<length>"; inherits: true; initial-value: 0px; }
${consumers}`),
  ).not.toContain('"var"');
  expect(
    child(`
@property --flip { syntax: "<length>"; inherits: true; initial-value: 0px; }
@property --flip { syntax: "*"; inherits: false; }
${consumers}`),
  ).toContain('"var"');
});

test("@property with repeated multi-child preserves array", () => {
  const compiled = compile(`
@property --my-offsets {
  syntax: "<length>+";
  inherits: false;
  initial-value: 10px 20px;
}
`);

  // Multi-child repeated (<length>+ with two values) keeps the array form
  expect(compiled.stylesheet().vp).toStrictEqual([
    ["my-offsets", false, [10, 20]],
  ]);
});

// A valid registration decides its name over the earlier one, whether or not its initial value has a descriptor; an ignored one leaves the earlier one
function afterAValidRegistration(syntax: string, initialValue: string) {
  return compile(`
@property --x { syntax: "<length>"; inherits: false; initial-value: 7px; }
@property --x { syntax: "${syntax}"; inherits: false; initial-value: ${initialValue}; }
`).stylesheet().vp;
}

const earlierRegistration = [["x", false, 7]];

test.each([
  "2em",
  "1rem",
  "1ch",
  "2lh",
  "1cqw",
  "calc(1px + 1em)",
  "min(1px, 1em)",
  "calc(2 * min(1em, 1px))",
  "round(1em, 1px)",
  "round(1vw, 1em)",
])(
  "an initial value of %s depends on the element, so the registration is ignored",
  (initialValue) => {
    expect(afterAValidRegistration("<length>", initialValue)).toStrictEqual(
      earlierRegistration,
    );
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

  expect(result.vp).toStrictEqual([["x", false, expected]]);
});

test.each([
  ["1vw", [["x", false, [{}, "vw", 1, 1]]]],
  ["2svh", undefined],
  ["max(1px, 2vw)", undefined],
  ["calc(2 * min(2px, 1vw))", undefined],
  ["round(1vw, 1px)", undefined],
])(
  "a viewport-relative initial value of %s decides its name",
  (initialValue, expected) => {
    expect(afterAValidRegistration("<length>", initialValue)).toStrictEqual(
      expected,
    );
  },
);

test.each([
  ["<transform-function>", "translateX(1em)", false],
  ["<transform-function>", "translateX(30%)", true],
  ["<transform-function>", "translate(1em, 0)", false],
  ["<transform-function>", "translate(3px, 0)", true],
  ["<transform-function>", "translate3d(0, 0, 1em)", false],
  ["<transform-function>", "translate3d(3px, 0, 0)", true],
  ["<transform-function>", "scale(2)", true],
  ["<transform-function>", "rotate(45deg)", true],
  ["<transform-function>", "skew(10deg)", true],
  ["<transform-function>", "matrix(1, 0, 0, 1, 3, 0)", true],
  ["<transform-list>", "translateX(1em) rotate(45deg)", false],
  ["<transform-list>", "translateX(3px) rotate(45deg)", true],
])(
  "a %s initial value of %s decides its name only when it is element-independent",
  (syntax, initialValue, independent) => {
    expect(afterAValidRegistration(syntax, initialValue)).toStrictEqual(
      independent ? undefined : earlierRegistration,
    );
  },
);

// Chromium and WebKit keep an <image> registration whose stops depend on the element, and Firefox ignores it; this follows the two
test("an <image> registration with an element-relative stop still decides its name", () => {
  expect(
    afterAValidRegistration("<image>", "linear-gradient(red 1em, blue)"),
  ).toStrictEqual(undefined);
});

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

test.each([
  "--everywhere: dashed;",
  "border-width: 1px; --everywhere: dashed;",
  "--everywhere: dashed !important;",
])(
  "a non-inheriting property declared once on * is still inlined, from * { %s }",
  (declarations) => {
    const compiled = compile(`
@property --everywhere {
  syntax: "*";
  inherits: false;
  initial-value: solid;
}
* { ${declarations} }
.child { border-style: var(--everywhere); }
`);

    const child = compiled.stylesheet().s?.find(([name]) => name === "child");

    expect(JSON.stringify(child)).not.toContain('"var"');
    expect(JSON.stringify(child)).toContain('"dashed"');
  },
);

test.each([
  ["rgb()'s alpha", "rgb(255 0 0 / var(--a))", "color"],
  ["hsl()'s alpha", "hsl(0 100% 50% / var(--a))", "color"],
  ["light-dark()", "light-dark(rgb(255 0 0 / var(--a)), blue)", "color"],
  [
    "light-dark()'s dark branch",
    "light-dark(blue, rgb(255 0 0 / var(--a)))",
    "color",
  ],
  ["an env() fallback", "env(safe-area-inset-top, var(--a))", "width"],
])(
  "a single declaration that refers to a non-inheriting property through %s is left to the runtime",
  (_place, value, property) => {
    const result = compile(`
@property --a { syntax: "*"; inherits: false; }
.parent { --a: 0.5; --alias: ${value}; }
.child { ${property}: var(--alias); }
`).stylesheet();

    expect(
      result.s?.find(([name]) => name === "child")?.[1][0]?.d,
    ).toStrictEqual([[[{}, "var", "alias", 1], property, 1]]);
  },
);

test.each([
  [
    "both * and a class declare",
    "* { --x: 1px; } .a { --x: 10px; --alias: var(--x); }",
  ],
  ["no rule in the sheet declares", ".b { --alias: var(--x); }"],
  [
    "a universal rule under a rejected @supports declares",
    "@supports (-webkit-hyphens: none) { * { --x: initial; } } .a { --x: 10px; } .b { --alias: var(--x); }",
  ],
])(
  "a single declaration that refers to a non-inheriting property %s is left to the runtime",
  (_declarations, css) => {
    const result = compile(`
@property --x { syntax: "<length>"; inherits: false; initial-value: 0px; }
${css}
.child { width: var(--alias); }
`).stylesheet();

    expect(
      result.s?.find(([name]) => name === "child")?.[1][0]?.d,
    ).toStrictEqual([[[{}, "var", "alias", 1], "width", 1]]);
  },
);

test("a non-inheriting property declared once on * under a media query is left to the runtime", () => {
  const result = compile(`
@property --x { syntax: "<length>"; inherits: false; initial-value: 0px; }
@media (min-width: 9999px) { * { --x: 10px; } }
.child { width: var(--x); }
`).stylesheet();

  expect(result.s?.find(([name]) => name === "child")?.[1][0]?.d).toStrictEqual(
    [[[{}, "var", "x", 1], "width", 1]],
  );
});

test("an @property after a rejected @supports and a @media block still registers", () => {
  const result = compile(`
@supports (-webkit-hyphens: none) { * { --y: initial; } }
@media (min-width: 10px) {
  @property --z { syntax: "<length>"; inherits: false; initial-value: 1px; }
}
@property --x { syntax: "<length>"; inherits: false; initial-value: 3px; }
`).stylesheet();

  expect(result.vp).toStrictEqual([["x", false, 3]]);
});

test("an @property under an @supports that fails is not registered", () => {
  const result = compile(`
@supports (-webkit-hyphens: none) {
  @property --x { syntax: "<length>"; inherits: false; initial-value: 3px; }
}
`).stylesheet();

  expect(result.vp).toBeUndefined();
});
