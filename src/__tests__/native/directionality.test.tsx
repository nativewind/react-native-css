import { useEffect, type ReactElement } from "react";
import { I18nManager, type StyleProp, type ViewStyle } from "react-native";

import { render, screen } from "@testing-library/react-native";
import { compile } from "react-native-css/compiler";
import { Text } from "react-native-css/components/Text";
import { View } from "react-native-css/components/View";
import { registerCSS } from "react-native-css/jest";
import {
  resolveUaDirectionRule,
  type Directionality,
} from "react-native-css/native/conditions/directionality";
import { specificityCompareFn } from "react-native-css/utilities";

const originalIsRTL = Object.getOwnPropertyDescriptor(I18nManager, "isRTL");

afterEach(() => {
  if (originalIsRTL) {
    Object.defineProperty(I18nManager, "isRTL", originalIsRTL);
  }
});

const answerIsRTL = (isRTL: boolean) => {
  Object.defineProperty(I18nManager, "isRTL", {
    configurable: true,
    value: isRTL,
  });
};

/** Tailwind's `rtl:` / `ltr:` output, verbatim. */
const DIRECTION_CSS = `
  .paint:where(:dir(rtl), [dir="rtl"], [dir="rtl"] *) { color: red; }
  .paint:where(:dir(ltr), [dir="ltr"], [dir="ltr"] *) { color: blue; }
`;

const RTL = { color: "#f00" };
const LTR = { color: "#00f" };

interface Tree {
  name: string;
  ancestors: readonly (Directionality | undefined)[];
  own?: Directionality;
}

const TREES: readonly Tree[] = [
  { name: "x", ancestors: [] },
  { name: "rtl > x", ancestors: ["rtl"] },
  { name: "ltr > x", ancestors: ["ltr"] },
  { name: "rtl > ltr > x", ancestors: ["rtl", "ltr"] },
  { name: "ltr > rtl > x", ancestors: ["ltr", "rtl"] },
  { name: "rtl > x[ltr]", ancestors: ["rtl"], own: "ltr" },
  { name: "x[rtl]", ancestors: [], own: "rtl" },
  { name: "x[ltr]", ancestors: [], own: "ltr" },
  { name: "rtl > div > x", ancestors: ["rtl", undefined] },
];

// What Firefox 155 and WebKit 26.6 render over TREES, Y for a match: the platform's direction is the root's, carrying no dir
const BROWSER_MATCHES: readonly [
  selector: string,
  onLtrPlatform: string,
  onRtlPlatform: string,
][] = [
  [".x:dir(rtl)", ".Y..Y.Y.Y", "YY..Y.Y.Y"],
  [".x:dir(ltr)", "Y.YY.Y.Y.", "..YY.Y.Y."],
  ['.x[dir="rtl"]', "......Y..", "......Y.."],
  ['.x:where([dir="rtl"])', "......Y..", "......Y.."],
  ['[dir="rtl"] .x', ".Y.YYY..Y", ".Y.YYY..Y"],
  ['[dir="ltr"] .x', "..YYY....", "..YYY...."],
  ['.x:where([dir="rtl"] *)', ".Y.YYY..Y", ".Y.YYY..Y"],
  [":dir(rtl) .x", ".Y.YYY..Y", "YYYYYYYYY"],
  [":dir(ltr) .x", "YYYYYYYYY", "..YYY...."],
  [".x:where(:dir(rtl) *)", ".Y.YYY..Y", "YYYYYYYYY"],
  ['html[dir="rtl"] .x', ".........", "........."],
  ['html[dir="ltr"] .x', ".........", "........."],
  ["html:dir(rtl) .x", ".........", "YYYYYYYYY"],
  ["html:dir(ltr) .x", "YYYYYYYYY", "........."],
  ['[dir="RTL"] .x', ".Y.YYY..Y", ".Y.YYY..Y"],
  ['[dir="RTL" s] .x', ".........", "........."],
  ['[dir="rtl" s] .x', ".Y.YYY..Y", ".Y.YYY..Y"],
  ['.x:where(:dir(rtl), [dir="rtl"], [dir="rtl"] *)', ".Y.YYYY.Y", "YY.YYYY.Y"],
  ['.x:where(:dir(ltr), [dir="ltr"], [dir="ltr"] *)', "Y.YYYY.Y.", "..YYYY.Y."],
];

const renderTree = ({ ancestors, own }: Tree): ReactElement =>
  ancestors.reduceRight<ReactElement>(
    (child, dir) => <View dir={dir}>{child}</View>,
    <View testID="x" className="x" dir={own} />,
  );

test.each(
  BROWSER_MATCHES.flatMap(([selector, onLtrPlatform, onRtlPlatform]) =>
    TREES.flatMap((tree, index) => [
      [selector, tree.name, false, onLtrPlatform[index] === "Y", tree] as const,
      [selector, tree.name, true, onRtlPlatform[index] === "Y", tree] as const,
    ]),
  ),
)(
  "%s over %s with isRTL=%s matches: %s",
  (selector, _treeName, isRTL, matches, tree) => {
    answerIsRTL(isRTL);
    registerCSS(`.x { width: 1px; } ${selector} { width: 2px; }`);

    render(renderTree(tree));

    expect(screen.getByTestId("x")).toHaveStyle({ width: matches ? 2 : 1 });
  },
);

test("every browser row answers every tree", () => {
  expect(TREES.length).toBeGreaterThan(0);
  expect(BROWSER_MATCHES.length).toBeGreaterThan(0);
  for (const [, onLtrPlatform, onRtlPlatform] of BROWSER_MATCHES) {
    expect([onLtrPlatform.length, onRtlPlatform.length]).toStrictEqual([
      TREES.length,
      TREES.length,
    ]);
  }
});

test("an element declaring dir=rtl matches :dir(rtl) and not :dir(ltr)", () => {
  registerCSS(DIRECTION_CSS);

  render(<View testID="subject" dir="rtl" className="paint" />);

  expect(screen.getByTestId("subject")).toHaveStyle(RTL);
  expect(screen.getByTestId("subject")).not.toHaveStyle(LTR);
});

test("an element with no declaration above it reads the platform's direction", () => {
  registerCSS(DIRECTION_CSS);

  render(<View testID="subject" className="paint" />);

  expect(screen.getByTestId("subject")).toHaveStyle(LTR);
  expect(screen.getByTestId("subject")).not.toHaveStyle(RTL);
});

test("on a right-to-left platform an undeclared element reads rtl", () => {
  registerCSS(DIRECTION_CSS);
  answerIsRTL(true);

  render(<View testID="subject" className="paint" />);

  expect(screen.getByTestId("subject")).toHaveStyle(RTL);
  expect(screen.getByTestId("subject")).not.toHaveStyle(LTR);
});

test("directionality is inherited from the closest declaring ancestor", () => {
  registerCSS(DIRECTION_CSS);

  render(
    <View dir="rtl">
      <View>
        <View testID="descendant" className="paint" />
      </View>
    </View>,
  );

  expect(screen.getByTestId("descendant")).toHaveStyle(RTL);
  expect(screen.getByTestId("descendant")).not.toHaveStyle(LTR);
});

test("a nested declaration overrides its ancestor for its own subtree", () => {
  registerCSS(DIRECTION_CSS);

  render(
    <View dir="rtl">
      <View testID="outer" className="paint" />
      <View dir="ltr">
        <View testID="inner" className="paint" />
      </View>
    </View>,
  );

  expect(screen.getByTestId("outer")).toHaveStyle(RTL);
  expect(screen.getByTestId("inner")).toHaveStyle(LTR);
  expect(screen.getByTestId("inner")).not.toHaveStyle(RTL);
});

test("a declaration overrides the platform's direction for its subtree", () => {
  registerCSS(DIRECTION_CSS);
  answerIsRTL(true);

  render(
    <>
      <View testID="undeclared" className="paint" />
      <View dir="ltr">
        <View testID="declared" className="paint" />
      </View>
    </>,
  );

  expect(screen.getByTestId("undeclared")).toHaveStyle(RTL);
  expect(screen.getByTestId("declared")).toHaveStyle(LTR);
  expect(screen.getByTestId("declared")).not.toHaveStyle(RTL);
});

test("an ancestor [dir] selector matches when any ancestor declares it", () => {
  registerCSS(`[dir="rtl"] .paint { color: red; }`);

  render(
    <>
      <View dir="rtl">
        <View testID="under-rtl" className="paint" />
      </View>
      <View dir="rtl">
        <View dir="ltr">
          <View testID="under-nested-ltr" className="paint" />
        </View>
      </View>
      <View dir="rtl">
        <View testID="declaring-ltr" dir="ltr" className="paint" />
      </View>
      <View testID="declaring-rtl" dir="rtl" className="paint" />
      <View testID="undeclared" className="paint" />
    </>,
  );

  expect(screen.getByTestId("under-rtl")).toHaveStyle(RTL);
  expect(screen.getByTestId("under-nested-ltr")).toHaveStyle(RTL);
  expect(screen.getByTestId("declaring-ltr")).toHaveStyle(RTL);
  expect(screen.getByTestId("declaring-rtl")).not.toHaveStyle(RTL);
  expect(screen.getByTestId("undeclared")).not.toHaveStyle(RTL);
});

test("the platform's direction is the root's directionality, not a declaration", () => {
  answerIsRTL(true);
  registerCSS(`
    [dir="rtl"] .declared { color: red; }
    :dir(rtl) .directional { color: red; }
    html:dir(rtl) .root { color: red; }
  `);

  render(
    <View dir="ltr">
      <View testID="declared" className="declared" />
      <View testID="directional" className="directional" />
      <View testID="root" className="root" />
    </View>,
  );

  expect(screen.getByTestId("declared")).not.toHaveStyle(RTL);
  expect(screen.getByTestId("directional")).toHaveStyle(RTL);
  expect(screen.getByTestId("root")).toHaveStyle(RTL);
});

test("an ancestor :dir() matches when any ancestor, the root included, has the directionality", () => {
  registerCSS(`
    :dir(ltr) .from-root { color: blue; }
    :dir(rtl) .from-outer { color: red; }
  `);

  render(
    <View dir="rtl">
      <View testID="from-root" className="from-root" />
      <View dir="ltr">
        <View testID="from-outer" className="from-outer" />
      </View>
    </View>,
  );

  expect(screen.getByTestId("from-root")).toHaveStyle(LTR);
  expect(screen.getByTestId("from-outer")).toHaveStyle(RTL);
});

test("each of Tailwind's arms answers its own question, so rtl: reaches into an ltr island", () => {
  registerCSS(`
    .rtl-variant:where(:dir(rtl), [dir="rtl"], [dir="rtl"] *) { color: red; }
    .ltr-variant:where(:dir(ltr), [dir="ltr"], [dir="ltr"] *) { color: blue; }
  `);

  render(
    <View dir="rtl">
      <View dir="ltr">
        <View testID="island" className="rtl-variant" />
      </View>
      <View testID="rtl-only" className="ltr-variant" />
    </View>,
  );

  expect(screen.getByTestId("island")).toHaveStyle(RTL);
  expect(screen.getByTestId("rtl-only")).not.toHaveStyle(LTR);
});

test("a [dir] on the element itself reads its own prop, never an inherited direction", () => {
  registerCSS(`
    .own[dir="rtl"] { color: red; }
    .where:where([dir="rtl"]) { color: red; }
  `);

  render(
    <View dir="rtl">
      <View testID="inherits-own" className="own" />
      <View testID="inherits-where" className="where" />
      <View testID="declares-own" dir="rtl" className="own" />
      <View testID="declares-where" dir="rtl" className="where" />
    </View>,
  );

  expect(screen.getByTestId("inherits-own")).not.toHaveStyle(RTL);
  expect(screen.getByTestId("inherits-where")).not.toHaveStyle(RTL);
  expect(screen.getByTestId("declares-own")).toHaveStyle(RTL);
  expect(screen.getByTestId("declares-where")).toHaveStyle(RTL);
});

test("the @media (dir) spelling answers the same way as :dir()", () => {
  registerCSS(`
    @media (dir: rtl) { .paint { color: red; } }
    @media (dir: ltr) { .paint { color: blue; } }
  `);

  render(
    <>
      <View testID="rtl" dir="rtl" className="paint" />
      <View testID="ltr" dir="ltr" className="paint" />
    </>,
  );

  expect(screen.getByTestId("rtl")).toHaveStyle(RTL);
  expect(screen.getByTestId("ltr")).toHaveStyle(LTR);
});

test("a declaring element takes the UA stylesheet's direction rule", () => {
  registerCSS(".paint { color: red; }");

  render(
    <>
      <View testID="rtl" dir="rtl" className="paint" />
      <View testID="ltr" dir="ltr" className="paint" />
      <View testID="undeclared" className="paint" />
    </>,
  );

  expect(screen.getByTestId("rtl")).toHaveStyle({
    direction: "rtl",
    writingDirection: "rtl",
  });
  expect(screen.getByTestId("ltr")).toHaveStyle({
    direction: "ltr",
    writingDirection: "ltr",
  });
  expect(screen.getByTestId("undeclared").props.style).toStrictEqual({
    color: "#f00",
  });
});

test("an author direction declaration outranks the UA rule and leaves the directionality untouched", () => {
  registerCSS(`
    .paint:where(:dir(rtl), [dir="rtl"], [dir="rtl"] *) { color: red; }
    .author { direction: ltr; }
  `);

  render(<View testID="subject" dir="rtl" className="paint author" />);

  expect(screen.getByTestId("subject")).toHaveStyle({
    color: "#f00",
    direction: "ltr",
  });
});

test("a dir value outside the enumeration is not a declaration", () => {
  registerCSS(DIRECTION_CSS);

  render(
    <View dir="rtl">
      {/* Outside the prop's type on purpose; the runtime is what is under test. */}
      <View
        testID="subject"
        dir={"sideways" as unknown as "ltr"}
        className="paint"
      />
    </View>,
  );

  expect(screen.getByTestId("subject")).toHaveStyle(RTL);
  expect(screen.getByTestId("subject")).not.toHaveStyle({ direction: "ltr" });
});

test("dir=auto is not a declaration — the component holding the text resolves it", () => {
  registerCSS(DIRECTION_CSS);

  render(
    <View dir="rtl">
      {/* `auto` is outside the prop's type on purpose; the runtime is what is under test. */}
      <View
        testID="subject"
        dir={"auto" as unknown as "ltr"}
        className="paint"
      />
    </View>,
  );

  expect(screen.getByTestId("subject")).toHaveStyle(RTL);
  expect(screen.getByTestId("subject")).not.toHaveStyle({ direction: "rtl" });
});

test("a declaring element carrying inline variables still publishes its directionality", () => {
  registerCSS(`
    ${DIRECTION_CSS}
    .marker { color: var(--marker); }
  `);

  // The inline-variable object `vars()` builds, spelled through the registered symbol it is keyed on.
  const inlineVariables = {
    [Symbol.for("react-native-css.var")]: "inline",
    marker: "green",
  } as unknown as StyleProp<ViewStyle>;

  render(
    <View dir="rtl">
      <View
        testID="declaring"
        dir="ltr"
        className="marker"
        style={inlineVariables}
      >
        <View testID="descendant" className="paint" />
      </View>
    </View>,
  );

  expect(screen.getByTestId("declaring")).toHaveStyle({ color: "green" });
  expect(screen.getByTestId("descendant")).toHaveStyle(LTR);
  expect(screen.getByTestId("descendant")).not.toHaveStyle(RTL);
});

test("a changed dir prop re-derives the element and its descendants", () => {
  registerCSS(DIRECTION_CSS);

  const tree = (dir: "ltr" | "rtl") => (
    <View dir={dir}>
      <View>
        <View testID="descendant" className="paint" />
      </View>
    </View>
  );

  const { rerender } = render(tree("rtl"));
  expect(screen.getByTestId("descendant")).toHaveStyle(RTL);

  rerender(tree("ltr"));
  expect(screen.getByTestId("descendant")).toHaveStyle(LTR);
  expect(screen.getByTestId("descendant")).not.toHaveStyle(RTL);
});

test("a removed declaration falls back to what the element would have had without it", () => {
  registerCSS(DIRECTION_CSS);

  const tree = (dir: "rtl" | undefined) => (
    <View dir={dir}>
      <View testID="descendant" className="paint" />
    </View>
  );

  const { rerender } = render(tree("rtl"));
  expect(screen.getByTestId("descendant")).toHaveStyle(RTL);

  rerender(tree(undefined));
  expect(screen.getByTestId("descendant")).toHaveStyle(LTR);
  expect(screen.getByTestId("descendant")).not.toHaveStyle(RTL);
});

test("a dir that comes or goes keeps the element's children mounted", () => {
  registerCSS(DIRECTION_CSS);

  let mounts = 0;
  const Descendant = () => {
    useEffect(() => {
      mounts += 1;
    }, []);
    return <View testID="descendant" className="paint" />;
  };
  const tree = (dir: "rtl" | undefined) => (
    <View dir={dir}>
      <Descendant />
    </View>
  );

  const { rerender } = render(tree(undefined));
  rerender(tree("rtl"));
  expect(screen.getByTestId("descendant")).toHaveStyle(RTL);

  rerender(tree(undefined));
  expect(screen.getByTestId("descendant")).toHaveStyle(LTR);
  expect(mounts).toBe(1);
});

test("a Text declares its directionality the same way, and takes the text-side UA rule", () => {
  registerCSS(DIRECTION_CSS);

  render(
    <Text testID="subject" dir="rtl" className="paint">
      مرحبا
    </Text>,
  );

  expect(screen.getByTestId("subject")).toHaveStyle({
    ...RTL,
    writingDirection: "rtl",
  });
  expect(screen.getByTestId("subject")).not.toHaveStyle(LTR);
});

test("a declaration reaches descendants only — a sibling reads the platform's direction", () => {
  registerCSS(DIRECTION_CSS);

  render(
    <View>
      <View dir="rtl">
        <View testID="descendant" className="paint" />
      </View>
      <View testID="sibling" className="paint" />
    </View>,
  );

  expect(screen.getByTestId("descendant")).toHaveStyle(RTL);
  expect(screen.getByTestId("sibling")).toHaveStyle(LTR);
  expect(screen.getByTestId("sibling")).not.toHaveStyle(RTL);
});

test("the UA rule lands on the declaring element alone; a descendant inherits the directionality, not the style", () => {
  registerCSS(".paint { color: red; }");

  render(
    <View testID="declaring" dir="rtl" className="paint">
      <View testID="descendant" className="paint" />
    </View>,
  );

  expect(screen.getByTestId("declaring")).toHaveStyle({ direction: "rtl" });
  expect(screen.getByTestId("descendant").props.style).toStrictEqual({
    color: "#f00",
  });
});

test("every media-condition operator threads the element's directionality", () => {
  registerCSS(`
    @media not (dir: rtl) { .negated { color: red; } }
    @media (dir: rtl) and (platform: ios) { .conjoined { color: red; } }
    @media (dir: ltr) or (dir: rtl) { .either { color: red; } }
  `);

  render(
    <>
      <View testID="negated-rtl" dir="rtl" className="negated" />
      <View testID="negated-ltr" dir="ltr" className="negated" />
      <View testID="conjoined-rtl" dir="rtl" className="conjoined" />
      <View testID="conjoined-ltr" dir="ltr" className="conjoined" />
      <View testID="either" dir="rtl" className="either" />
    </>,
  );

  expect(screen.getByTestId("negated-rtl")).not.toHaveStyle(RTL);
  expect(screen.getByTestId("negated-ltr")).toHaveStyle(RTL);
  expect(screen.getByTestId("conjoined-rtl")).toHaveStyle(RTL);
  expect(screen.getByTestId("conjoined-ltr")).not.toHaveStyle(RTL);
  expect(screen.getByTestId("either")).toHaveStyle(RTL);
});

test("a :root declaration belongs to no element and reads the platform's direction", () => {
  answerIsRTL(true);
  registerCSS(`
    :root { --marker: blue; }
    @media (dir: rtl) { :root { --marker: red; } }
    .marker { color: var(--marker); }
  `);

  render(
    <View dir="ltr">
      <View testID="subject" className="marker" />
    </View>,
  );

  expect(screen.getByTestId("subject")).toHaveStyle({ color: "red" });
});

test("rendering the same tree twice yields the same styles", () => {
  registerCSS(DIRECTION_CSS);

  const tree = (
    <View dir="rtl">
      <View testID="descendant" className="paint" />
    </View>
  );

  const { rerender } = render(tree);
  const first = screen.getByTestId("descendant").props.style;

  rerender(tree);

  expect(screen.getByTestId("descendant").props.style).toStrictEqual(first);
  expect(screen.getByTestId("descendant")).toHaveStyle(RTL);
});

test("the UA rule sorts beneath an author rule of equal specificity", () => {
  const containerMarker = compile(`.child:is(.group *) { color: red; }`)
    .stylesheet()
    .s?.find(([name]) => name === "group")?.[1][0];
  const uaRule = resolveUaDirectionRule("rtl");

  const rules = [containerMarker, uaRule].filter((rule) => rule !== undefined);

  expect(containerMarker?.s).toStrictEqual([0]);
  expect(rules.sort(specificityCompareFn)).toStrictEqual([
    uaRule,
    containerMarker,
  ]);
});
