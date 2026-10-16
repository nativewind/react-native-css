import { compile } from "react-native-css/compiler";

const RTL = ["=", "dir", "rtl"] as const;
const LTR = ["=", "dir", "ltr"] as const;
const ANCESTOR_RTL = ["=", "ancestor-dir", "rtl"] as const;
const ROOT_RTL = ["=", "root-dir", "rtl"] as const;
const SELF_RTL = ["a", "dir", "=", "rtl", "i"] as const;
const PADDING = { paddingLeft: 4 } as const;

describe("the subject compound", () => {
  test("a bare :dir() compiles to the dir condition", () => {
    expect(
      compile(`.bare:dir(rtl) { padding-left: 4px; }`).stylesheet(),
    ).toStrictEqual({
      s: [["bare", [{ s: [1, 2], d: [PADDING], m: [RTL] }]]],
    });
  });

  test("both directions are answerable", () => {
    expect(
      compile(`.bare:dir(ltr) { padding-left: 4px; }`).stylesheet(),
    ).toStrictEqual({
      s: [["bare", [{ s: [1, 2], d: [PADDING], m: [LTR] }]]],
    });
  });

  test("a [dir] attribute is the element's own prop, read ASCII-case-insensitively", () => {
    expect(
      compile(`.self[dir="rtl"] { padding-left: 4px; }`).stylesheet(),
    ).toStrictEqual({
      s: [
        [
          "self",
          [{ s: [1, 2], d: [PADDING], aq: [["a", "dir", "=", "rtl", "i"]] }],
        ],
      ],
    });
  });

  test(":dir() composes with the other pseudo-classes on the element", () => {
    expect(
      compile(`.hover:dir(rtl):hover { padding-left: 4px; }`).stylesheet(),
    ).toStrictEqual({
      s: [["hover", [{ s: [1, 3], d: [PADDING], m: [RTL], p: { h: 1 } }]]],
    });
  });
});

describe("an ancestor compound", () => {
  test("a [dir] attribute on an ancestor asks whether any ancestor declares it", () => {
    expect(
      compile(`[dir="rtl"] .descendant { padding-left: 4px; }`).stylesheet(),
    ).toStrictEqual({
      s: [["descendant", [{ s: [1, 2], d: [PADDING], m: [ANCESTOR_RTL] }]]],
    });
  });

  test("a :dir() on an ancestor is the root's directionality or any ancestor's declaration", () => {
    expect(
      compile(`:dir(rtl) .descendant { padding-left: 4px; }`).stylesheet(),
    ).toStrictEqual({
      s: [
        [
          "descendant",
          [
            {
              s: [1, 2],
              d: [PADDING],
              m: [["|", [ROOT_RTL, ANCESTOR_RTL]]],
            },
          ],
        ],
      ],
    });
  });

  test("html:dir() is the root's directionality", () => {
    expect(
      compile(`html:dir(rtl) .descendant { padding-left: 4px; }`).stylesheet(),
    ).toStrictEqual({
      s: [["descendant", [{ s: [1, 2], d: [PADDING], m: [ROOT_RTL] }]]],
    });
  });

  test("html[dir] matches nothing, since the root's direction is the platform's and no attribute", () => {
    expect(
      compile(
        `html[dir="rtl"] .descendant { padding-left: 4px; }`,
      ).stylesheet(),
    ).toStrictEqual({});
  });

  test("a [dir] beside an ancestor class is that container's own prop", () => {
    expect(
      compile(`.group[dir="rtl"] .item { padding-left: 4px; }`).stylesheet(),
    ).toStrictEqual({
      s: [
        ["group", [{ s: [0], c: ["g:group"] }]],
        [
          "item",
          [
            {
              s: [1, 3],
              d: [PADDING],
              cq: [{ n: "g:group", a: [SELF_RTL] }],
            },
          ],
        ],
      ],
    });
  });

  test("a directionality the runtime cannot place on its ancestor matches nothing", () => {
    const names =
      compile(`
        .group:dir(rtl) .item { padding-left: 4px; }
        [dir="rtl"] .group .outer { padding-left: 4px; }
        .group [dir="rtl"] .inner { padding-left: 4px; }
        [dir="rtl"][data-state="on"] .both { padding-left: 4px; }
      `)
        .stylesheet()
        .s?.map(([name]) => name) ?? [];

    expect(names.filter((name) => name !== "group")).toStrictEqual([]);
  });
});

describe(":is() and :where()", () => {
  test("Tailwind's rtl: variant compiles each arm to what it asks", () => {
    expect(
      compile(
        `.tw:where(:dir(rtl), [dir="rtl"], [dir="rtl"] *) { padding-left: 4px; }`,
      ).stylesheet(),
    ).toStrictEqual({
      s: [
        [
          "tw",
          [
            { s: [1, 1], d: [PADDING], m: [RTL] },
            { s: [1, 1], d: [PADDING], aq: [SELF_RTL] },
            { s: [1, 1], d: [PADDING], m: [ANCESTOR_RTL] },
          ],
        ],
      ],
    });
  });

  test("a [dir] attribute inside :where() is the element's own prop, with :where()'s specificity", () => {
    expect(
      compile(`.where:where([dir="rtl"]) { padding-left: 4px; }`).stylesheet(),
    ).toStrictEqual({
      s: [["where", [{ s: [1, 1], d: [PADDING], aq: [SELF_RTL] }]]],
    });
  });

  test("each arm of :is() carries its own specificity", () => {
    expect(
      compile(
        `.is:is(:dir(rtl), [dir="rtl"], [dir="rtl"] *) { padding-left: 4px; }`,
      ).stylesheet(),
    ).toStrictEqual({
      s: [
        [
          "is",
          [
            { s: [1, 2], d: [PADDING], m: [RTL] },
            { s: [1, 2], d: [PADDING], aq: [SELF_RTL] },
            { s: [1, 2], d: [PADDING], m: [ANCESTOR_RTL] },
          ],
        ],
      ],
    });
  });

  test("an ancestor :dir() arm is the root's directionality or any ancestor's declaration", () => {
    expect(
      compile(`.where:where(:dir(rtl) *) { padding-left: 4px; }`).stylesheet(),
    ).toStrictEqual({
      s: [
        [
          "where",
          [
            {
              s: [1, 1],
              d: [PADDING],
              m: [["|", [ROOT_RTL, ANCESTOR_RTL]]],
            },
          ],
        ],
      ],
    });
  });

  test("a self [dir] arm with any value or operator is an attribute query on the element", () => {
    expect(
      compile(`
        .auto:where([dir="auto"]) { padding-left: 4px; }
        .present:where([dir]) { padding-left: 4px; }
      `).stylesheet(),
    ).toStrictEqual({
      s: [
        [
          "auto",
          [{ s: [1, 1], d: [PADDING], aq: [["a", "dir", "=", "auto", "i"]] }],
        ],
        ["present", [{ s: [1, 1], d: [PADDING], aq: [["a", "dir"]] }]],
      ],
    });
  });

  test("an arm asking more than a directionality matches nothing", () => {
    expect(
      compile(`
        .descendant:where([dir="rtl"] .other) { padding-left: 4px; }
        .compound:where(.other:dir(rtl)) { padding-left: 4px; }
        .child:where([dir="rtl"] > *) { padding-left: 4px; }
      `).stylesheet(),
    ).toStrictEqual({});
  });

  test("a directionality arm on an ancestor compound matches nothing", () => {
    expect(
      compile(
        `.group:where(:dir(rtl), [dir="rtl"]) .item { padding-left: 4px; }`,
      )
        .stylesheet()
        .s?.find(([name]) => name === "item"),
    ).toBeUndefined();
  });

  test("lightningcss flattens a one-argument :is(), so its [dir] is the element's own", () => {
    expect(
      compile(`.is:is([dir="rtl"]) { padding-left: 4px; }`).stylesheet(),
    ).toStrictEqual({
      s: [
        [
          "is",
          [{ s: [1, 2], d: [PADDING], aq: [["a", "dir", "=", "rtl", "i"]] }],
        ],
      ],
    });
  });

  test("arms that are not the same query stay separate rules", () => {
    expect(
      compile(
        `.mixed:is(:dir(rtl), .group) { padding-left: 4px; }`,
      ).stylesheet(),
    ).toStrictEqual({
      s: [
        [
          "mixed",
          [
            { s: [1, 2], d: [PADDING], m: [RTL] },
            { s: [1, 2], d: [PADDING], cq: [{ n: "g:group" }] },
          ],
        ],
        ["group", [{ s: [0], c: ["g:group"] }]],
      ],
    });
  });
});

describe("media queries", () => {
  test("the (dir) media feature is the same condition", () => {
    expect(
      compile(
        `@media (dir: rtl) { .media { padding-left: 4px; } }`,
      ).stylesheet(),
    ).toStrictEqual({
      s: [["media", [{ s: [2, 1], m: [RTL], d: [PADDING] }]]],
    });
  });

  test("a negated feature keeps its negation", () => {
    expect(
      compile(
        `@media not (dir: rtl) { .media { padding-left: 4px; } }`,
      ).stylesheet(),
    ).toStrictEqual({
      s: [["media", [{ s: [2, 1], m: [["!", RTL]], d: [PADDING] }]]],
    });
  });

  test("an author's own `and` is carried whole beside the dir condition", () => {
    expect(
      compile(`
        @media (min-width: 10px) and (prefers-color-scheme: dark) {
          .both:dir(rtl) { padding-left: 4px; }
        }
      `).stylesheet(),
    ).toStrictEqual({
      s: [
        [
          "both",
          [
            {
              s: [2, 2],
              m: [
                [
                  "&",
                  [
                    [">=", "width", 10],
                    ["=", "prefers-color-scheme", "dark"],
                  ],
                ],
                RTL,
              ],
              d: [PADDING],
            },
          ],
        ],
      ],
    });
  });

  test("a dir condition composes with a media query and a container query", () => {
    expect(
      compile(`
        @media (prefers-color-scheme: dark) {
          .group .dark:dir(rtl) { padding-left: 8px; }
        }
      `).stylesheet(),
    ).toStrictEqual({
      s: [
        ["group", [{ s: [0], c: ["g:group"] }]],
        [
          "dark",
          [
            {
              s: [2, 3],
              m: [["=", "prefers-color-scheme", "dark"], RTL],
              d: [{ paddingLeft: 8 }],
              cq: [{ n: "g:group" }],
            },
          ],
        ],
      ],
    });
  });
});

describe("an ancestor's [dir] value", () => {
  test("is read ASCII-case-insensitively, as HTML defines the attribute", () => {
    const lower = compile(
      `[dir="rtl"] .upper { padding-left: 4px; }`,
    ).stylesheet();

    expect(
      compile(`[dir="RTL"] .upper { padding-left: 4px; }`).stylesheet(),
    ).toStrictEqual(lower);
    expect(
      compile(`[dir="RTL" i] .upper { padding-left: 4px; }`).stylesheet(),
    ).toStrictEqual(lower);
  });

  test("the selector's own s flag is honoured, so only a lower-case value matches a declaration", () => {
    expect(
      compile(`[dir="RTL" s] .upper { padding-left: 4px; }`).stylesheet(),
    ).toStrictEqual({});
    expect(
      compile(`[dir="rtl" s] .lower { padding-left: 4px; }`).stylesheet(),
    ).toStrictEqual({
      s: [["lower", [{ s: [1, 2], d: [PADDING], m: [ANCESTOR_RTL] }]]],
    });
  });

  test("a value the engine cannot answer matches nothing", () => {
    expect(
      compile(`
        [dir="auto"] .auto { padding-left: 4px; }
        [dir] .present { padding-left: 4px; }
      `).stylesheet(),
    ).toStrictEqual({});
  });

  test("every operator but equality matches nothing, so a partial match never widens the rule", () => {
    expect(
      compile(`
        [dir^="r"] .prefix { padding-left: 4px; }
        [dir$="tl"] .suffix { padding-left: 4px; }
        [dir*="rtl"] .substring { padding-left: 4px; }
        [dir~="rtl"] .includes { padding-left: 4px; }
        [dir|="rtl"] .dash { padding-left: 4px; }
      `).stylesheet(),
    ).toStrictEqual({});
  });

  test("a negated :dir() is outside the builder's negation and matches nothing", () => {
    expect(
      compile(`.not:not(:dir(rtl)) { padding-left: 4px; }`).stylesheet(),
    ).toStrictEqual({});
  });

  test("an unanswerable ancestor arm emits no rule", () => {
    expect(
      compile(`
        .whereauto:where([dir="auto"] *) { padding-left: 4px; }
        .wherepresent:where([dir] *) { padding-left: 4px; }
        .whereop:where([dir^="r"] *) { padding-left: 4px; }
      `).stylesheet(),
    ).toStrictEqual({});
  });

  test("an unanswerable arm drops only its own rule, leaving its siblings", () => {
    expect(
      compile(
        `.mixedauto:is([dir="auto"] *, :dir(rtl)) { padding-left: 4px; }`,
      ).stylesheet(),
    ).toStrictEqual({
      s: [["mixedauto", [{ s: [1, 2], d: [PADDING], m: [RTL] }]]],
    });
  });
});

describe("determinism", () => {
  test("compiling the same stylesheet twice yields equal output", () => {
    const css = `
      .tw:where(:dir(rtl), [dir="rtl"], [dir="rtl"] *) { padding-left: 4px; }
      [dir="ltr"] .tw { padding-left: 8px; }
    `;

    expect(compile(css).stylesheet()).toStrictEqual(compile(css).stylesheet());
  });
});
