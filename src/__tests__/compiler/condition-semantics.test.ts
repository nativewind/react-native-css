import { act } from "@testing-library/react-native";
import type {
  ContainerCondition as CSSContainerCondition,
  MediaCondition as CSSMediaCondition,
  MediaFeatureValue as CSSMediaFeatureValue,
} from "lightningcss";
import {
  compile,
  type MediaCondition,
  type StyleRule,
} from "react-native-css/compiler";

import { parseContainerCondition } from "../../compiler/container-query";
import {
  canMatch,
  parseMediaQueryCondition,
  parseQueryFeature,
} from "../../compiler/media-query";
import { StylesheetBuilder } from "../../compiler/stylesheet";
import {
  DEFAULT_CONTAINER_NAME,
  testContainerQuery,
} from "../../native/conditions/container-query";
import { testMediaQuery } from "../../native/conditions/media-query";
import {
  containerLayoutFamily,
  dimensions,
  type Getter,
} from "../../native/reactivity";
import type { DeepReadonly } from "../../utilities/deep-readonly.types";

type CompiledConditions =
  | NonNullable<StyleRule["m"]>
  | NonNullable<StyleRule["cq"]>
  | "no rule";

// What each rule a prelude compiles .child to is conditioned on: a media query's conditions or a container query's
function compileChildConditions(
  prelude: string,
): readonly (StyleRule["m"] | StyleRule["cq"])[] {
  return (
    compile(`${prelude} { .child { color: red } }`).stylesheet().s ?? []
  ).flatMap(([className, rules]) =>
    className === "child" ? rules.map(({ m, cq }) => m ?? cq) : [],
  );
}

// Each condition native/condition-semantics.test.tsx and container-rejection.test.tsx render, with what it compiles to
test.each<readonly [string, CompiledConditions]>([
  // A range pair compiles to its bounds and operators in source order
  ["@media (400px < width < 800px)", [["[]", "width", 400, "<", 800, "<"]]],
  ["@media (400px < width < 500px)", [["[]", "width", 400, "<", 500, "<"]]],
  ["@media (600px < width < 800px)", [["[]", "width", 600, "<", 800, "<"]]],
  ["@media (600px <= width < 800px)", [["[]", "width", 600, "<=", 800, "<"]]],
  ["@media (800px > width > 400px)", [["[]", "width", 800, ">", 400, ">"]]],
  ["@media (300px < height < 500px)", [["[]", "height", 300, "<", 500, "<"]]],
  [
    "@media not (400px < width < 800px)",
    [["!", ["[]", "width", 400, "<", 800, "<"]]],
  ],
  // MQ5 §3.1: a term the compiler cannot decide is unknown, and a condition no device can make true compiles to no rule
  ["@media (width > env(safe-area-inset-top))", "no rule"],
  ["@media not (width > env(safe-area-inset-top))", "no rule"],
  ["@media not (width: env(safe-area-inset-top))", "no rule"],
  [
    "@media (width: env(safe-area-inset-top)) or (width > 400px)",
    [["|", [["?"], [">", "width", 400]]]],
  ],
  [
    "@media not ((width: env(safe-area-inset-top)) and (width > 9999px))",
    [["!", ["&", [["?"], [">", "width", 9999]]]]],
  ],
  [
    "@media (width > env(safe-area-inset-top)), (width > 400px)",
    [[">", "width", 400]],
  ],
  [
    "@media not all and (width > 10vw)",
    [["!", [">", "width", [{}, "vw", 10, 1]]]],
  ],
  ["@media not (fictional-feature: 3)", [["!", ["=", "fictional-feature", 3]]]],
  ["@media (constructor: x)", [["=", "constructor", "x"]]],
  [
    "@media (fictional-thing) or (width > 400px)",
    [
      [
        "|",
        [
          ["!!", "fictional-thing"],
          [">", "width", 400],
        ],
      ],
    ],
  ],
  [
    "@media (width > 400px) and (fictional-thing)",
    [
      [
        "&",
        [
          [">", "width", 400],
          ["!!", "fictional-thing"],
        ],
      ],
    ],
  ],
  ["@media (orientation: bogus)", "no rule"],
  ["@media not (orientation: bogus)", "no rule"],
  ["@media not ((width > 100px) or (orientation: bogus))", "no rule"],
  ["@media not (hover: bogus)", "no rule"],
  ["@media not (prefers-color-scheme: bogus)", "no rule"],
  ["@media not (scripting: bogus)", "no rule"],
  ["@media not (update: bogus)", "no rule"],
  ["@media not (overflow-block: bogus)", "no rule"],
  ["@media not (overflow-inline: bogus)", "no rule"],
  ["@media not (scan: bogus)", "no rule"],
  ["@media not (color-gamut: bogus)", "no rule"],
  ["@media not (dynamic-range: bogus)", "no rule"],
  ["@media not (forced-colors: bogus)", "no rule"],
  ["@media not (inverted-colors: bogus)", "no rule"],
  ["@media not (prefers-contrast: bogus)", "no rule"],
  ["@media not (prefers-reduced-transparency: bogus)", "no rule"],
  // MQ5 §2.4.2: a feature in a boolean context
  ["@media (width)", [["!!", "width"]]],
  ["@media (orientation)", [["!!", "orientation"]]],
  ["@media (resolution)", [["!!", "resolution"]]],
  ["@media (hover)", [["!!", "hover"]]],
  ["@media (color)", [["!!", "color"]]],
  ["@media (scripting)", [["!!", "scripting"]]],
  ["@media (monochrome)", [["!!", "monochrome"]]],
  ["@media (grid)", [["!!", "grid"]]],
  ["@media not (monochrome)", [["!", ["!!", "monochrome"]]]],
  ["@media (color-index)", [["!!", "color-index"]]],
  ["@media (display-mode)", [["!!", "display-mode"]]],
  ["@media (dir)", [["!!", "dir"]]],
  // MQ4 §3: a media type, folded to lowercase
  ["@media IOS", [["=", "platform", "ios"]]],
  ["@media not IOS", [["!", ["=", "platform", "ios"]]]],
  // css-values-4 §4.1: a keyword, folded to lowercase
  ["@media (orientation: LANDSCAPE)", [["=", "orientation", "landscape"]]],
  [
    "@media not (orientation: LANDSCAPE)",
    [["!", ["=", "orientation", "landscape"]]],
  ],
  ["@media (orientation: PORTRAIT)", [["=", "orientation", "portrait"]]],
  [
    "@media not (orientation: PORTRAIT)",
    [["!", ["=", "orientation", "portrait"]]],
  ],
  // Features every React Native screen answers alike; an <mq-boolean> compiles to its integer (MQ4 §5.3)
  ["@media (min-color: 8)", [[">=", "color", 8]]],
  ["@media (min-color: 9)", [[">=", "color", 9]]],
  ["@media (monochrome: 0)", [["=", "monochrome", 0]]],
  ["@media (grid: 0)", [["=", "grid", 0]]],
  ["@media (grid: 1)", [["=", "grid", 1]]],
  ["@media (scripting: enabled)", [["=", "scripting", "enabled"]]],
  ["@media (update: fast)", [["=", "update", "fast"]]],
  ["@media (overflow-block)", [["!!", "overflow-block"]]],
  ["@media (overflow-block: scroll)", [["=", "overflow-block", "scroll"]]],
  [
    "@media not (overflow-block: paged)",
    [["!", ["=", "overflow-block", "paged"]]],
  ],
  ["@media (overflow-inline)", [["!!", "overflow-inline"]]],
  ["@media (overflow-inline: scroll)", [["=", "overflow-inline", "scroll"]]],
  [
    "@media not (overflow-inline: none)",
    [["!", ["=", "overflow-inline", "none"]]],
  ],
  ["@media (scan)", [["!!", "scan"]]],
  ["@media not (scan)", [["!", ["!!", "scan"]]]],
  ["@media (scan: progressive)", [["=", "scan", "progressive"]]],
  ["@media not (scan: progressive)", [["!", ["=", "scan", "progressive"]]]],
  ["@media not (scan: interlace)", [["!", ["=", "scan", "interlace"]]]],
  ["@media (color-gamut)", [["!!", "color-gamut"]]],
  ["@media (color-gamut: srgb)", [["=", "color-gamut", "srgb"]]],
  ["@media not (color-gamut: srgb)", [["!", ["=", "color-gamut", "srgb"]]]],
  ["@media (color-gamut: p3)", [["=", "color-gamut", "p3"]]],
  ["@media not (color-gamut: p3)", [["!", ["=", "color-gamut", "p3"]]]],
  [
    "@media not (color-gamut: rec2020)",
    [["!", ["=", "color-gamut", "rec2020"]]],
  ],
  ["@media (dynamic-range)", [["!!", "dynamic-range"]]],
  ["@media (dynamic-range: standard)", [["=", "dynamic-range", "standard"]]],
  ["@media (dynamic-range: high)", [["=", "dynamic-range", "high"]]],
  ["@media not (dynamic-range: high)", [["!", ["=", "dynamic-range", "high"]]]],
  ["@media (video-color-gamut)", [["!!", "video-color-gamut"]]],
  ["@media (video-color-gamut: srgb)", [["=", "video-color-gamut", "srgb"]]],
  [
    "@media not (video-color-gamut: p3)",
    [["!", ["=", "video-color-gamut", "p3"]]],
  ],
  ["@media (video-dynamic-range)", [["!!", "video-dynamic-range"]]],
  [
    "@media (video-dynamic-range: standard)",
    [["=", "video-dynamic-range", "standard"]],
  ],
  [
    "@media not (video-dynamic-range: high)",
    [["!", ["=", "video-dynamic-range", "high"]]],
  ],
  // -webkit-device-pixel-ratio is resolution in dppx
  ["@media (min-resolution: 2dppx)", [[">=", "resolution", 2]]],
  [
    "@media (-webkit-min-device-pixel-ratio: 2)",
    [[">=", "-webkit-device-pixel-ratio", 2]],
  ],
  [
    "@media (-webkit-device-pixel-ratio: 2)",
    [["=", "-webkit-device-pixel-ratio", 2]],
  ],
  [
    "@media (-webkit-min-device-pixel-ratio: 3)",
    [[">=", "-webkit-device-pixel-ratio", 3]],
  ],
  [
    "@media not (-webkit-min-device-pixel-ratio: 3)",
    [["<", "-webkit-device-pixel-ratio", 3]],
  ],
  // css-values-4 §7.4 excludes a negative resolution, while -webkit-device-pixel-ratio takes any number
  ["@media (min-resolution: -1dpi)", "no rule"],
  ["@media (max-resolution: -1dpi)", "no rule"],
  ["@media not (max-resolution: -1dpi)", "no rule"],
  ["@media (min-resolution: -1dpcm)", "no rule"],
  ["@media (resolution: -1dppx)", "no rule"],
  ["@media not (resolution: -1dppx)", "no rule"],
  ["@media (resolution > -1dppx)", "no rule"],
  ["@media not (resolution < -1x)", "no rule"],
  ["@media not (-1dppx < resolution < 1dppx)", "no rule"],
  [
    "@media (min-resolution: -1dppx) or (width > 400px)",
    [["|", [["?"], [">", "width", 400]]]],
  ],
  ["@media (min-resolution: 0dpi)", [[">=", "resolution", 0]]],
  ["@media (max-resolution: 0dpi)", [["<=", "resolution", 0]]],
  ["@media (min-resolution: -0dppx)", [[">=", "resolution", 0]]],
  [
    "@media (-webkit-min-device-pixel-ratio: -1)",
    [[">=", "-webkit-device-pixel-ratio", -1]],
  ],
  [
    "@media not (-webkit-max-device-pixel-ratio: -1)",
    [[">", "-webkit-device-pixel-ratio", -1]],
  ],
  // css-values-4 §5.7 excludes a negative ratio component, and -0 is zero
  ["@media (aspect-ratio: -2/-1)", "no rule"],
  ["@media (min-aspect-ratio: -1/2)", "no rule"],
  ["@media (max-aspect-ratio: 2/-1)", "no rule"],
  ["@media not (max-aspect-ratio: -1/2)", "no rule"],
  ["@media (aspect-ratio > -1)", "no rule"],
  ["@media not (-1 < aspect-ratio < 3)", "no rule"],
  [
    "@media (min-aspect-ratio: -1/2) or (min-width: 1px)",
    [["|", [["?"], [">=", "width", 1]]]],
  ],
  [
    "@media (max-aspect-ratio: 2/-1) or (min-width: 1px)",
    [["|", [["?"], [">=", "width", 1]]]],
  ],
  [
    "@media (min-aspect-ratio: -0/1) or (min-width: 1px)",
    [
      [
        "|",
        [
          [">=", "aspect-ratio", null],
          [">=", "width", 1],
        ],
      ],
    ],
  ],
  [
    "@media (aspect-ratio > -1) or (width > 0px)",
    [["|", [["?"], [">", "width", 0]]]],
  ],
  [
    "@media (width > 0px) or (aspect-ratio < 2/-1)",
    [["|", [[">", "width", 0], ["?"]]]],
  ],
  [
    "@media (aspect-ratio > -0) or (width > 0px)",
    [
      [
        "|",
        [
          [">", "aspect-ratio", null],
          [">", "width", 0],
        ],
      ],
    ],
  ],
  ["@media not (aspect-ratio < -1)", "no rule"],
  // A color scheme keyword, folded to lowercase
  ["@media (prefers-color-scheme)", [["!!", "prefers-color-scheme"]]],
  [
    "@media (prefers-color-scheme: dark)",
    [["=", "prefers-color-scheme", "dark"]],
  ],
  [
    "@media (prefers-color-scheme: light)",
    [["=", "prefers-color-scheme", "light"]],
  ],
  [
    "@media (prefers-color-scheme: DARK)",
    [["=", "prefers-color-scheme", "dark"]],
  ],
  [
    "@media (prefers-color-scheme: Light)",
    [["=", "prefers-color-scheme", "light"]],
  ],
  // A viewport length compiles to a descriptor the runtime resolves against the window
  ["@media not (width: 10vw)", [["!", ["=", "width", [{}, "vw", 10, 1]]]]],
  [
    "@media (width: 10vw) or (width > 0px)",
    [
      [
        "|",
        [
          ["=", "width", [{}, "vw", 10, 1]],
          [">", "width", 0],
        ],
      ],
    ],
  ],
  ["@media (width: 100vw)", [["=", "width", [{}, "vw", 100, 1]]]],
  ["@media not (width: 100vw)", [["!", ["=", "width", [{}, "vw", 100, 1]]]]],
  ["@media (width > 50vw)", [[">", "width", [{}, "vw", 50, 1]]]],
  ["@media (width < 50vw)", [["<", "width", [{}, "vw", 50, 1]]]],
  ["@media (height > 50vw)", [[">", "height", [{}, "vw", 50, 1]]]],
  ["@media (height < 50vw)", [["<", "height", [{}, "vw", 50, 1]]]],
  ["@media (min-height: 100vh)", [[">=", "height", [{}, "vh", 100, 1]]]],
  ["@media (max-height: 99vh)", [["<=", "height", [{}, "vh", 99, 1]]]],
  [
    "@media (50vw < width < 150vw)",
    [["[]", "width", [{}, "vw", 50, 1], "<", [{}, "vw", 150, 1], "<"]],
  ],
  [
    "@media not (50vw < width < 150vw)",
    [["!", ["[]", "width", [{}, "vw", 50, 1], "<", [{}, "vw", 150, 1], "<"]]],
  ],
  [
    "@media (150vw < width < 200vw)",
    [["[]", "width", [{}, "vw", 150, 1], "<", [{}, "vw", 200, 1], "<"]],
  ],
  // An em compiles to a descriptor the runtime does not resolve, alone or in a calc()
  ["@media not (width: 10em)", [["!", ["=", "width", [{}, "em", 10, 1]]]]],
  [
    "@media not (min-width: calc(10em + 1vw))",
    [
      [
        "<",
        "width",
        [
          {},
          "sum",
          [
            [{}, "em", 10, 1],
            [{}, "vw", 1, 1],
          ],
        ],
      ],
    ],
  ],
  [
    "@media (min-width: calc(10em + 1vw)) or (width > 0px)",
    [
      [
        "|",
        [
          [
            ">=",
            "width",
            [
              {},
              "sum",
              [
                [{}, "em", 10, 1],
                [{}, "vw", 1, 1],
              ],
            ],
          ],
          [">", "width", 0],
        ],
      ],
    ],
  ],
  // A range pair holding env() is unknown whatever its other bound; one holding an unresolved length keeps that bound as null
  ["@media not (env(safe-area-inset-top) < width < 800px)", "no rule"],
  ["@media not (400px < width < env(safe-area-inset-bottom))", "no rule"],
  [
    "@media not (env(safe-area-inset-top) < width < env(safe-area-inset-bottom))",
    "no rule",
  ],
  [
    "@media not ((env(safe-area-inset-top) < width < 800px) or (width < 0px))",
    "no rule",
  ],
  [
    "@media not (1ch < width < 800px)",
    [["!", ["[]", "width", null, "<", 800, "<"]]],
  ],
  // What a device reads after the JSON round trip: null for an unresolved operand, and a finite number for one past the largest float
  [
    "@media (width > env(safe-area-inset-top)) or (width > 400px)",
    [["|", [["?"], [">", "width", 400]]]],
  ],
  ["@media (min-width: 1e40px)", [[">=", "width", 9007199254740990]]],
  ["@media not (min-width: 1e40px)", [["<", "width", 9007199254740990]]],
  [
    "@media (-webkit-max-device-pixel-ratio: calc(NaN))",
    [["<=", "-webkit-device-pixel-ratio", 9007199254740991]],
  ],
  [
    "@media (-webkit-min-device-pixel-ratio: calc(NaN))",
    [[">=", "-webkit-device-pixel-ratio", 9007199254740991]],
  ],
  [
    "@media (width < calc(NaN * 1vw))",
    [["<", "width", [{}, "vw", 9007199254740990, 1]]],
  ],
  [
    "@container (width > 10ch) or (width > 100px)",
    [
      {
        m: [
          "|",
          [
            [">", "width", null],
            [">", "width", 100],
          ],
        ],
      },
    ],
  ],
  ["@container not (width > 10ch)", "no rule"],
  // MQ5 §7: the input features
  ["@media (hover: hover)", [["=", "hover", "hover"]]],
  ["@media (hover: none)", [["=", "hover", "none"]]],
  ["@media (any-hover: hover)", [["=", "any-hover", "hover"]]],
  ["@media (any-hover: none)", [["=", "any-hover", "none"]]],
  ["@media (pointer: fine)", [["=", "pointer", "fine"]]],
  ["@media (pointer: coarse)", [["=", "pointer", "coarse"]]],
  ["@media not (pointer: fine)", [["!", ["=", "pointer", "fine"]]]],
  ["@media (pointer)", [["!!", "pointer"]]],
  ["@media (any-pointer: fine)", [["=", "any-pointer", "fine"]]],
  ["@media (any-pointer: coarse)", [["=", "any-pointer", "coarse"]]],
  ["@media (any-pointer: none)", [["=", "any-pointer", "none"]]],
  ["@media (any-pointer)", [["!!", "any-pointer"]]],
  [
    "@media (hover: none) and (pointer: coarse)",
    [
      [
        "&",
        [
          ["=", "hover", "none"],
          ["=", "pointer", "coarse"],
        ],
      ],
    ],
  ],
  ["@media (pointer: none)", [["=", "pointer", "none"]]],
  // MQ5 §12.4: forced colors
  ["@media (forced-colors: none)", [["=", "forced-colors", "none"]]],
  [
    "@media not (forced-colors: active)",
    [["!", ["=", "forced-colors", "active"]]],
  ],
  ["@media (forced-colors: active)", [["=", "forced-colors", "active"]]],
  ["@media (forced-colors)", [["!!", "forced-colors"]]],
  ["@media not (forced-colors)", [["!", ["!!", "forced-colors"]]]],
  // css-values-4 §4.1: a keyword, folded to lowercase
  ["@media (orientation: portrait)", [["=", "orientation", "portrait"]]],
  ["@media (orientation: Landscape)", [["=", "orientation", "landscape"]]],
  // A container's range pair
  [
    "@container (300px < width < 500px)",
    [{ m: ["[]", "width", 300, "<", 500, "<"] }],
  ],
  [
    "@container (400px < width < 500px)",
    [{ m: ["[]", "width", 400, "<", 500, "<"] }],
  ],
  [
    "@container (500px > width > 300px)",
    [{ m: ["[]", "width", 500, ">", 300, ">"] }],
  ],
  [
    "@container (100px < height < 300px)",
    [{ m: ["[]", "height", 100, "<", 300, "<"] }],
  ],
  // CSS Conditional 5 §5.4: an unknown size feature, a keyword its feature does not take, a negative ratio component or env() selects no container
  ["@container (fictional-feature > 10px)", "no rule"],
  ["@container not (fictional-feature > 10px)", "no rule"],
  ["@container (fictional-feature > 10px) or (width > 0px)", "no rule"],
  ["@container (fictional-feature > 10px) or (width > 400px)", "no rule"],
  ["@container (width > env(safe-area-inset-top))", "no rule"],
  ["@container not (width > env(safe-area-inset-top))", "no rule"],
  [
    "@container (width > env(safe-area-inset-top)) or (width > 400px)",
    "no rule",
  ],
  ["@container (env(safe-area-inset-top) < width < 500px)", "no rule"],
  ["@container not (env(safe-area-inset-top) < width < 500px)", "no rule"],
  ["@container (orientation: bogus)", "no rule"],
  ["@container not (orientation: bogus)", "no rule"],
  ["@container (aspect-ratio: -2/-1)", "no rule"],
  ["@container (aspect-ratio > -1)", "no rule"],
  ["@container not (aspect-ratio < -1)", "no rule"],
  ["@container (aspect-ratio > -1) or (width > 0px)", "no rule"],
  ["@container (width > 0px) or (aspect-ratio < 2/-1)", "no rule"],
  [
    "@container (aspect-ratio > -0) or (width > 0px)",
    [
      {
        m: [
          "|",
          [
            [">", "aspect-ratio", null],
            [">", "width", 0],
          ],
        ],
      },
    ],
  ],
  ["@container (min-aspect-ratio: -1/2)", "no rule"],
  ["@container (max-aspect-ratio: 2/-1)", "no rule"],
  ["@container not (max-aspect-ratio: -1/2)", "no rule"],
  ["@container not (-1 < aspect-ratio < 3)", "no rule"],
  ["@container (min-aspect-ratio: -1/2) or (min-width: 1px)", "no rule"],
  ["@container (max-aspect-ratio: 2/-1) or (min-width: 1px)", "no rule"],
  [
    "@container (min-aspect-ratio: -0/1) or (min-width: 1px)",
    [
      {
        m: [
          "|",
          [
            [">=", "aspect-ratio", null],
            [">=", "width", 1],
          ],
        ],
      },
    ],
  ],
  // An em compiles to a descriptor the runtime does not resolve
  ["@container (width > 10em)", [{ m: [">", "width", [{}, "em", 10, 1]] }]],
  [
    "@container not (width > 10em)",
    [{ m: ["!", [">", "width", [{}, "em", 10, 1]]] }],
  ],
  [
    "@container (width > 10em) or (width > 0px)",
    [
      {
        m: [
          "|",
          [
            [">", "width", [{}, "em", 10, 1]],
            [">", "width", 0],
          ],
        ],
      },
    ],
  ],
  // A style() query compiles to an unknown term
  ["@container style(--foo: bar)", "no rule"],
  ["@container not style(--foo: bar)", "no rule"],
  ["@container style(--foo: bar) and (width > 400px)", "no rule"],
  [
    "@container style(--foo: bar) or (width > 400px)",
    [{ m: ["|", [["?"], [">", "width", 400]]] }],
  ],
  // A container feature in a boolean context
  ["@container (width)", [{ m: ["!!", "width"] }]],
  ["@container (orientation)", [{ m: ["!!", "orientation"] }]],
  ["@container (aspect-ratio)", [{ m: ["!!", "aspect-ratio"] }]],
  ["@container not (width)", [{ m: ["!", ["!!", "width"]] }]],
  // css-values-4 §4.1: a container keyword, folded to lowercase
  [
    "@container (orientation: LANDSCAPE)",
    [{ m: ["=", "orientation", "landscape"] }],
  ],
  [
    "@container not (orientation: LANDSCAPE)",
    [{ m: ["!", ["=", "orientation", "landscape"]] }],
  ],
  [
    "@container (orientation: Portrait)",
    [{ m: ["=", "orientation", "portrait"] }],
  ],
  // A viewport length in a container query compiles as in a media query
  ["@container (width > 50vw)", [{ m: [">", "width", [{}, "vw", 50, 1]] }]],
  ["@container (width < 50vw)", [{ m: ["<", "width", [{}, "vw", 50, 1]] }]],
  [
    "@container not (width > 50vw)",
    [{ m: ["!", [">", "width", [{}, "vw", 50, 1]]] }],
  ],
  ["@container (height > 50vh)", [{ m: [">", "height", [{}, "vh", 50, 1]] }]],
  ["@container (height >= 50vh)", [{ m: [">=", "height", [{}, "vh", 50, 1]] }]],
  [
    "@container (50vw < width < 100vw)",
    [{ m: ["[]", "width", [{}, "vw", 50, 1], "<", [{}, "vw", 100, 1], "<"] }],
  ],
  // #451's style() cases
  ["@container style(--theme: dark)", "no rule"],
  ["@container not style(--theme: dark)", "no rule"],
  ["@container (width > 100px) and style(--theme: dark)", "no rule"],
  ["@container style(--theme: dark) and (width > 100px)", "no rule"],
  ["@container style(--theme: dark) or style(--theme: light)", "no rule"],
  [
    "@container not ((width > 100px) and style(--theme: dark))",
    [{ m: ["!", ["&", [[">", "width", 100], ["?"]]]] }],
  ],
  [
    "@container (width > 100px) or style(--theme: dark)",
    [{ m: ["|", [[">", "width", 100], ["?"]]] }],
  ],
])("%s compiles to %j", (prelude, compiled) => {
  expect(compileChildConditions(prelude)).toStrictEqual(
    compiled === "no rule" ? [] : [compiled],
  );
});

// Zero, and below, inside and above the bounds 400 and 800 the terms compare against
const SIZES = [0, 300, 600, 900] as const;

const get: Getter = (observable) => observable.get();

interface ConditionRuntime {
  readonly resize: (width: number, height: number) => void;
  readonly matches: (condition: MediaCondition) => boolean;
}

const CONTAINER_KEY = {};

const ON_A_SCREEN: ConditionRuntime = {
  resize: (width, height) => {
    act(() => {
      dimensions.set({ ...dimensions.get(), width, height });
    });
  },
  matches: (condition) => testMediaQuery([condition], get),
};

const IN_A_CONTAINER: ConditionRuntime = {
  resize: (width, height) => {
    act(() => {
      containerLayoutFamily(CONTAINER_KEY).set({ x: 0, y: 0, width, height });
    });
  },
  matches: (condition) =>
    testContainerQuery(
      { m: condition },
      { [DEFAULT_CONTAINER_NAME]: { key: CONTAINER_KEY, props: {} } },
      [],
      get,
    ),
};

// The terms the compiler emits on one feature: three a size decides, and four holding an unknown term or an unresolved operand
function termsOn(feature: "width" | "height"): readonly MediaCondition[] {
  return [
    [">", feature, 400],
    ["!!", feature],
    ["[]", feature, 400, "<", 800, "<"],
    ["?"],
    [">", feature, null],
    ["[]", feature, null, "<", 800, "<"],
    ["[]", feature, 400, "<", null, "<"],
  ];
}

function withNegation(condition: MediaCondition): readonly MediaCondition[] {
  return [condition, ["!", condition]];
}

function joinedBothWays(
  left: MediaCondition,
  right: MediaCondition,
): readonly MediaCondition[] {
  return [
    ["&", [left, right]],
    ["|", [left, right]],
  ];
}

const CONDITIONS: readonly MediaCondition[] = [
  ...termsOn("width").flatMap(withNegation),
  ...termsOn("width").flatMap((first) =>
    termsOn("height").flatMap((second) =>
      withNegation(first).flatMap((left) =>
        withNegation(second).flatMap((right) =>
          joinedBothWays(left, right).flatMap(withNegation),
        ),
      ),
    ),
  ),
];

// The compiler drops a rule only where the runtime's three-valued evaluation (MQ5 §3.1) answers true at no size; no two terms read the same feature, so the sizes give every combination of the terms' answers
test.each([
  ["a media query", ON_A_SCREEN],
  ["a container query", IN_A_CONTAINER],
] as const)(
  "over terms on different features, %s and its negation each compile to a rule exactly when a size can make it true",
  (_, runtime) => {
    const trueAtSomeSize = new Set<MediaCondition>();
    const falseAtSomeSize = new Set<MediaCondition>();

    for (const width of SIZES) {
      for (const height of SIZES) {
        runtime.resize(width, height);

        for (const condition of CONDITIONS) {
          if (runtime.matches(condition)) {
            trueAtSomeSize.add(condition);
          }
          if (runtime.matches(["!", condition])) {
            falseAtSomeSize.add(condition);
          }
        }
      }
    }

    const disagreements = CONDITIONS.filter(
      (condition) =>
        canMatch(condition) !== trueAtSomeSize.has(condition) ||
        canMatch(["!", condition]) !== falseAtSomeSize.has(condition),
    );

    expect(disagreements).toStrictEqual([]);
  },
);

// JSON writes Infinity and NaN as null, which a device would read as unresolved, so a number operand past the largest number compiles to the largest safe integer, and NaN to 0 (css-values-4 §10.9.1)
test.each([
  [Infinity, Number.MAX_SAFE_INTEGER],
  [-Infinity, Number.MIN_SAFE_INTEGER],
  [Number.NaN, 0],
])("a number operand of %p compiles to %p", (value, operand) => {
  expect(
    parseQueryFeature(
      {
        type: "range",
        name: "-webkit-device-pixel-ratio",
        operator: "less-than-equal",
        value: { type: "number", value },
      },
      new StylesheetBuilder({}),
    ),
  ).toStrictEqual(["<=", "-webkit-device-pixel-ratio", operand]);
});

// A feature takes only the value its syntax gives it; lightningcss's error recovery passes a value of another type through, which Chromium, Firefox and WebKit leave unknown
test.each<readonly [string, DeepReadonly<CSSMediaFeatureValue>]>([
  ["scan", { type: "number", value: 0 }],
  ["overflow-block", { type: "integer", value: 0 }],
  [
    "orientation",
    {
      type: "length",
      value: { type: "value", value: { unit: "px", value: 10 } },
    },
  ],
  ["hover", { type: "boolean", value: true }],
  ["width", { type: "ident", value: "auto" }],
  [
    "color",
    {
      type: "length",
      value: { type: "value", value: { unit: "px", value: 2 } },
    },
  ],
  ["grid", { type: "number", value: 2 }],
  ["display-mode", { type: "number", value: 0 }],
  [
    "resolution",
    {
      type: "length",
      value: { type: "value", value: { unit: "px", value: 10 } },
    },
  ],
  ["aspect-ratio", { type: "ident", value: "landscape" }],
  [
    "-webkit-device-pixel-ratio",
    { type: "resolution", value: { type: "dppx", value: 2 } },
  ],
])("%s holding %j is outside its syntax", (name, value) => {
  expect(
    parseQueryFeature(
      { type: "plain", name, value },
      new StylesheetBuilder({}),
    ),
  ).toBeUndefined();
});

// lightningcss prints a NaN calculation as an overflowing number, so a viewport length's percentage can arrive as infinity, which JSON writes as null
test("a viewport length past the largest number compiles to an operand JSON carries", () => {
  const compiled = parseQueryFeature(
    {
      type: "range",
      name: "width",
      operator: "less-than",
      value: {
        type: "length",
        value: { type: "value", value: { unit: "vw", value: Infinity } },
      },
    },
    new StylesheetBuilder({}),
  );

  expect(compiled).toStrictEqual([
    "<",
    "width",
    [{}, "vw", 9007199254740990, 1],
  ]);
  expect(JSON.parse(JSON.stringify(compiled))).toStrictEqual(compiled);
});

test("a resolution operand past the largest number compiles to the largest safe integer", () => {
  expect(
    parseQueryFeature(
      {
        type: "range",
        name: "resolution",
        operator: "greater-than-equal",
        value: { type: "resolution", value: { type: "dppx", value: Infinity } },
      },
      new StylesheetBuilder({}),
    ),
  ).toStrictEqual([">=", "resolution", Number.MAX_SAFE_INTEGER]);
});

// lightningcss 1.33's error recovery emits <general-enclosed> as a condition the 1.30 types do not list, which MQ5 §3.1 leaves unknown
const UNLISTED_CONDITIONS = [
  ["condition", { type: "unknown", value: [] }],
  ["operator", { type: "operation", operator: "xor", conditions: [] }],
] as const;

test.each(UNLISTED_CONDITIONS)(
  "a media %s lightningcss's types do not list compiles to an unknown term",
  (_, unlisted) => {
    const condition: unknown = unlisted;

    expect(
      parseMediaQueryCondition(
        condition as CSSMediaCondition,
        new StylesheetBuilder({}),
      ),
    ).toStrictEqual(["?"]);
  },
);

test.each(UNLISTED_CONDITIONS)(
  "a container %s lightningcss's types do not list selects no container",
  (_, unlisted) => {
    const condition: unknown = unlisted;

    expect(
      parseContainerCondition(
        condition as CSSContainerCondition,
        new StylesheetBuilder({}),
      ),
    ).toBeUndefined();
  },
);
