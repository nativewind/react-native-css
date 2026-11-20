import { compile } from "react-native-css/compiler";

const RED = { color: "#f00" } as const;
const INHERITED_COLOR = [["__rn-css-color", "#f00"]] as const;

function rulesFor(css: string, className = "subject") {
  return compile(css)
    .stylesheet()
    .s?.find(([name]) => name === className)?.[1];
}

describe("an ancestor identified by a condition alone", () => {
  test("an attribute compiles to a container query carrying it", () => {
    expect(
      rulesFor(`[data-state="on"] .subject { color: red; }`),
    ).toStrictEqual([
      {
        s: [1, 2],
        d: [RED],
        v: INHERITED_COLOR,
        cq: [{ a: [["d", "state", "=", "on"]] }],
      },
    ]);
  });

  test("an attribute with no operation compiles to a presence query", () => {
    expect(rulesFor(`[aria-busy] .subject { color: red; }`)).toStrictEqual([
      {
        s: [1, 2],
        d: [RED],
        v: INHERITED_COLOR,
        cq: [{ a: [["a", "aria-busy"]] }],
      },
    ]);
  });

  test("every pseudo-class the builder answers compiles to a container query", () => {
    expect(rulesFor(`:hover .subject { color: red; }`)).toStrictEqual([
      { s: [1, 2], d: [RED], v: INHERITED_COLOR, cq: [{ p: { h: 1 } }] },
    ]);
    expect(rulesFor(`:active .subject { color: red; }`)).toStrictEqual([
      { s: [1, 2], d: [RED], v: INHERITED_COLOR, cq: [{ p: { a: 1 } }] },
    ]);
    expect(rulesFor(`:focus .subject { color: red; }`)).toStrictEqual([
      { s: [1, 2], d: [RED], v: INHERITED_COLOR, cq: [{ p: { f: 1 } }] },
    ]);
    expect(rulesFor(`:disabled .subject { color: red; }`)).toStrictEqual([
      {
        s: [1, 2],
        d: [RED],
        v: INHERITED_COLOR,
        cq: [{ a: [["a", "disabled"]] }],
      },
    ]);
    expect(rulesFor(`:empty .subject { color: red; }`)).toStrictEqual([
      {
        s: [1, 2],
        d: [RED],
        v: INHERITED_COLOR,
        cq: [{ a: [["a", "children", "!"]] }],
      },
    ]);
  });

  test("the descendant combinator compiles to what the :where() spelling of it already did", () => {
    const combinator = rulesFor(`[data-state="on"] .subject { color: red; }`);
    const isWhere = rulesFor(
      `.subject:where([data-state="on"] *) { color: red; }`,
    );

    expect(combinator?.[0]?.cq).toStrictEqual(isWhere?.[0]?.cq);
  });

  test("each conditioned ancestor in a chain contributes its own query", () => {
    expect(
      rulesFor(`[data-state="on"] [aria-busy] .subject { color: red; }`),
    ).toStrictEqual([
      {
        s: [1, 3],
        d: [RED],
        v: INHERITED_COLOR,
        cq: [{ a: [["d", "state", "=", "on"]] }, { a: [["a", "aria-busy"]] }],
      },
    ]);
  });
});

describe("a named ancestor is unchanged", () => {
  test("its conditions still land on the query its class names", () => {
    expect(
      rulesFor(`.group[data-state="on"] .subject { color: red; }`),
    ).toStrictEqual([
      {
        s: [1, 3],
        d: [RED],
        v: INHERITED_COLOR,
        cq: [{ a: [["d", "state", "=", "on"]], n: "g:group" }],
      },
    ]);
  });

  test("a compound naming several classes still yields ONE query", () => {
    expect(rulesFor(`.a.b .subject { color: red; }`)).toStrictEqual([
      { s: [1, 3], d: [RED], v: INHERITED_COLOR, cq: [{ n: "g:b.a" }] },
    ]);
  });

  test("a named and a classless ancestor each keep their own query", () => {
    expect(
      rulesFor(`.group [data-state="on"] .subject { color: red; }`),
    ).toStrictEqual([
      {
        s: [1, 3],
        d: [RED],
        v: INHERITED_COLOR,
        cq: [{ n: "g:group" }, { a: [["d", "state", "=", "on"]] }],
      },
    ]);
  });
});

describe("what is not an ancestor query", () => {
  test("a condition on the SUBJECT stays on the rule", () => {
    expect(rulesFor(`.subject[data-state="on"] { color: red; }`)).toStrictEqual(
      [
        {
          s: [1, 2],
          d: [RED],
          v: INHERITED_COLOR,
          aq: [["d", "state", "=", "on"]],
        },
      ],
    );
    expect(rulesFor(`.subject:hover { color: red; }`)).toStrictEqual([
      { s: [1, 2], d: [RED], v: INHERITED_COLOR, p: { h: 1 } },
    ]);
  });

  test("an unconditioned ancestor contributes nothing to compile", () => {
    expect(rulesFor(`div .subject { color: red; }`)).toStrictEqual(undefined);
  });

  test("a compound on ONE element is the subject's, not an ancestor's", () => {
    expect(rulesFor(`[data-state="on"].subject { color: red; }`)).toStrictEqual(
      [
        {
          s: [1, 2],
          d: [RED],
          v: INHERITED_COLOR,
          aq: [["d", "state", "=", "on"]],
        },
      ],
    );
  });

  test("a combinator the builder does not answer drops the rule rather than widening it", () => {
    expect(
      rulesFor(`[data-state="on"] > .subject { color: red; }`),
    ).toStrictEqual(undefined);
    expect(rulesFor(`:hover > .subject { color: red; }`)).toStrictEqual(
      undefined,
    );
  });
});

describe("determinism", () => {
  test("compiling the same stylesheet twice yields equal output", () => {
    const css = `
      [data-state="on"] .subject { color: red; }
      .group:hover [aria-busy] .subject { color: blue; }
    `;

    expect(compile(css).stylesheet()).toStrictEqual(compile(css).stylesheet());
  });
});
