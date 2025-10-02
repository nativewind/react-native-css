// cSpell:ignore rcap,vmin,svmin,lvmin,dvmin,cqmin,vmax,svmax,lvmax,dvmax,cqmax,currentcolor,oklab,oklch,prophoto,squircle,oldstyle,nums

import Color from "colorjs.io";
import type {
  Angle,
  BorderSideWidth,
  BorderStyle,
  ColorOrAuto,
  CssColor,
  CustomProperty,
  Declaration,
  DimensionPercentageFor_LengthValue,
  EnvironmentVariable,
  FontSize,
  FontStyle,
  FontVariantCaps,
  FontWeight,
  GapValue,
  Gradient,
  GradientItemFor_DimensionPercentageFor_LengthValue,
  Length,
  LengthPercentageOrAuto,
  LengthValue,
  LineDirection,
  LineHeight,
  LineStyle,
  MaxSize,
  NumberOrPercentage,
  Scale,
  Size,
  Size2DFor_DimensionPercentageFor_LengthValue,
  Time,
  Token,
  TokenOrValue,
  Translate,
  UnresolvedColor,
} from "lightningcss";

import { isStyleFunction } from "../utilities";
import type {
  StyleDescriptor,
  StyleFunction,
  StyleRule,
} from "./compiler.types";
import { parseEasingFunction, parseIterationCount } from "./keyframes";
import { toRNProperty } from "./selectors";
import type { StylesheetBuilder } from "./stylesheet";

const CommaSeparator = Symbol("CommaSeparator");

type DeclarationType<P extends Declaration["property"]> = Extract<
  Declaration,
  { property: P }
>;

type Parser<T extends Declaration["property"] = Declaration["property"]> = (
  declaration: Extract<Declaration, { property: T }>,
  builder: StylesheetBuilder,
  propertyName: string,
  // eslint-disable-next-line @typescript-eslint/no-invalid-void-type
) => StyleDescriptor | void;

const propertyRename: Record<string, string> = {
  "background-image": "experimental_backgroundImage",
};

const unparsedRuntimeParsing = new Set([
  "animation",
  "border",
  "box-shadow",
  "line-height",
  "rotate",
  "scale",
  "text-shadow",
  "transform",
  "translate",
]);

const parsers: {
  [K in Declaration["property"]]?: Parser<K>;
} = {
  "align-content": parseAlignContent,
  "align-items": parseAlignItems,
  "align-self": parseAlignSelf,
  "animation": addAnimationValue,
  "animation-delay": addAnimationValue,
  "animation-direction": addAnimationValue,
  "animation-duration": addAnimationValue,
  "animation-fill-mode": addAnimationValue,
  "animation-iteration-count": addAnimationValue,
  "animation-name": addAnimationValue,
  "animation-play-state": addAnimationValue,
  "animation-timing-function": addAnimationValue,
  "aspect-ratio": parseAspectRatio,
  "backface-visibility": parseBackfaceVisibility,
  "background-color": parseColorDeclaration,
  "background-image": parseBackgroundImage,
  "block-size": parseSizeDeclaration,
  "border": parseBorder,
  "border-block": parseBorderBlock,
  "border-block-color": parseBorderColor,
  "border-block-end": parseBorderBlockEnd,
  "border-block-end-color": parseColorDeclaration,
  "border-block-end-width": parseBorderSideWidthDeclaration,
  "border-block-start": parseBorderBlockStart,
  "border-block-start-color": parseColorDeclaration,
  "border-block-start-style": parseBorderStyleDeclaration,
  "border-block-start-width": parseBorderSideWidthDeclaration,
  "border-block-style": parseBorderBlockStyle,
  "border-block-width": parseBorderBlockWidth,
  "border-bottom": parseBorderSide,
  "border-bottom-color": parseColorDeclaration,
  "border-bottom-left-radius": parseSize2DDimensionPercentageDeclaration,
  "border-bottom-right-radius": parseSize2DDimensionPercentageDeclaration,
  "border-bottom-style": parseBorderStyleDeclaration,
  "border-bottom-width": parseBorderSideWidthDeclaration,
  "border-color": parseBorderColor,
  "border-end-end-radius": parseSize2DDimensionPercentageDeclaration,
  "border-end-start-radius": parseSize2DDimensionPercentageDeclaration,
  "border-inline": parseBorderInline,
  "border-inline-color": parseBorderColor,
  "border-inline-end": parseBorderInlineEnd,
  "border-inline-end-color": parseColorDeclaration,
  "border-inline-end-style": parseBorderInlineStyle,
  "border-inline-end-width": parseBorderSideWidthDeclaration,
  "border-inline-start": parseBorderInlineStart,
  "border-inline-start-color": parseColorDeclaration,
  "border-inline-start-style": parseBorderInlineStyle,
  "border-inline-start-width": parseBorderSideWidthDeclaration,
  "border-inline-style": parseBorderInlineStyle,
  "border-inline-width": parseBorderInlineWidth,
  "border-left": parseBorderSide,
  "border-left-color": parseColorDeclaration,
  "border-left-style": parseBorderStyleDeclaration,
  "border-left-width": parseBorderSideWidthDeclaration,
  "border-radius": parseBorderRadius,
  "border-right": parseBorderSide,
  "border-right-color": parseColorDeclaration,
  "border-right-style": parseBorderStyleDeclaration,
  "border-right-width": parseBorderSideWidthDeclaration,
  "border-start-end-radius": parseSize2DDimensionPercentageDeclaration,
  "border-start-start-radius": parseSize2DDimensionPercentageDeclaration,
  "border-style": parseBorderStyleDeclaration,
  "border-top": parseBorderSide,
  "border-top-color": parseColorDeclaration,
  "border-top-left-radius": parseSize2DDimensionPercentageDeclaration,
  "border-top-right-radius": parseSize2DDimensionPercentageDeclaration,
  "border-top-style": parseBorderStyleDeclaration,
  "border-top-width": parseBorderSideWidthDeclaration,
  "border-width": parseBorderWidth,
  "bottom": parseSizeWithAutoDeclaration,
  "box-shadow": parseBoxShadow,
  "box-sizing": parseBoxSizing,
  "caret-color": parseColorOrAutoDeclaration,
  "color": parseFontColorDeclaration,
  "column-gap": parseGap,
  "container": parseContainer,
  "container-name": parseContainerName,
  "container-type": parseContainerType,
  "display": parseDisplay,
  "direction": parseDirection,
  "fill": parseSVGPaint,
  "filter": parseFilter,
  "flex": parseFlex,
  "flex-basis": parseLengthPercentageDeclaration,
  "flex-direction": ({ value }) => value,
  "flex-flow": parseFlexFlow,
  "flex-grow": ({ value }) => value,
  "flex-shrink": ({ value }) => value,
  "flex-wrap": ({ value }) => value,
  "font": parseFont,
  "font-family": parseFontFamily,
  "font-size": parseFontSizeDeclaration,
  "font-style": parseFontStyleDeclaration,
  "font-variant-caps": parseFontVariantCapsDeclaration,
  "font-weight": parseFontWeightDeclaration,
  "gap": parseGap,
  "height": parseSizeWithAutoDeclaration,
  "inline-size": parseSizeWithAutoDeclaration,
  "inset": parseInset,
  "inset-block": parseInsetBlock,
  "inset-block-end": parseLengthPercentageDeclaration,
  "inset-block-start": parseLengthPercentageDeclaration,
  "inset-inline": parseInsetInline,
  "inset-inline-end": parseLengthPercentageDeclaration,
  "inset-inline-start": parseLengthPercentageDeclaration,
  "justify-content": parseJustifyContent,
  "left": parseSizeWithAutoDeclaration,
  "letter-spacing": parseLetterSpacing,
  "line-height": parseLineHeightDeclaration,
  "margin": parseMargin,
  "margin-block": parseMarginBlock,
  "margin-block-end": parseLengthPercentageOrAutoDeclaration,
  "margin-block-start": parseLengthPercentageOrAutoDeclaration,
  "margin-bottom": parseSizeWithAutoDeclaration,
  "margin-inline": parseMarginInline,
  "margin-inline-end": parseLengthPercentageOrAutoDeclaration,
  "margin-inline-start": parseLengthPercentageOrAutoDeclaration,
  "margin-left": parseSizeWithAutoDeclaration,
  "margin-right": parseSizeWithAutoDeclaration,
  "margin-top": parseSizeWithAutoDeclaration,
  "max-block-size": parseSizeDeclaration,
  "max-height": parseSizeDeclaration,
  "max-inline-size": parseSizeDeclaration,
  "max-width": parseSizeDeclaration,
  "min-block-size": parseSizeDeclaration,
  "min-height": parseSizeDeclaration,
  "min-inline-size": parseSizeDeclaration,
  "min-width": parseSizeDeclaration,
  "opacity": ({ value }) => round(value),
  "outline-color": parseColorDeclaration,
  "outline-style": parseOutlineStyle,
  "outline-width": parseBorderSideWidthDeclaration,
  "overflow": parseOverflow,
  "padding": parsePadding,
  "padding-block": parsePaddingBlock,
  "padding-block-end": parseLengthPercentageDeclaration,
  "padding-block-start": parseLengthPercentageDeclaration,
  "padding-bottom": parseSizeDeclaration,
  "padding-inline": parsePaddingInline,
  "padding-inline-end": parseLengthPercentageDeclaration,
  "padding-inline-start": parseLengthPercentageDeclaration,
  "padding-left": parseSizeDeclaration,
  "padding-right": parseSizeDeclaration,
  "padding-top": parseSizeDeclaration,
  "position": parsePosition,
  "right": parseSizeWithAutoDeclaration,
  "rotate": parseRotate,
  "row-gap": parseGap,
  "scale": parseScale,
  "stroke": parseSVGPaint,
  "stroke-width": parseLengthDeclaration,
  "text-align": parseTextAlign,
  "text-decoration": parseTextDecoration,
  "text-decoration-color": parseColorDeclaration,
  "text-decoration-line": parseTextDecorationLineDeclaration,
  "text-decoration-style": parseTextDecorationStyle,
  "text-shadow": parseTextShadow,
  "text-transform": ({ value }) => value.case,
  "top": parseSizeWithAutoDeclaration,
  "transform": parseTransform,
  "transition": addTransitionValue,
  "transition-delay": addTransitionValue,
  "transition-duration": addTransitionValue,
  "transition-property": addTransitionValue,
  "transition-timing-function": addTransitionValue,
  "translate": parseTranslate,
  "user-select": parseUserSelect,
  "vertical-align": parseVerticalAlign,
  "visibility": parseVisibility,
  "width": parseSizeWithAutoDeclaration,
  "z-index": parseZIndex,
};

// This is missing LightningCSS types
(parsers as Record<string, Parser>)["pointer-events"] =
  parsePointerEvents as Parser;

const validProperties = new Set(Object.keys(parsers));

export function parseDeclaration(
  declaration: Declaration,
  builder: StylesheetBuilder,
) {
  if ("vendorPrefix" in declaration && declaration.vendorPrefix.length) {
    return;
  }

  if (
    "value" in declaration &&
    typeof declaration.value === "object" &&
    "vendorPrefix" in declaration.value &&
    Array.isArray(declaration.value.vendorPrefix) &&
    declaration.value.vendorPrefix.length
  ) {
    return;
  }

  if (declaration.property === "unparsed") {
    parseUnparsedDeclaration(declaration, builder);
  } else if (declaration.property === "custom") {
    parseCustomDeclaration(declaration, builder);
  } else {
    parseWithParser(declaration, builder);
  }
}

function parseWithParser(declaration: Declaration, builder: StylesheetBuilder) {
  if (declaration.property in parsers) {
    const parser = parsers[declaration.property] as Parser;

    builder.descriptorProperty = declaration.property;

    builder.setWarningProperty(declaration.property);
    const value = parser(declaration, builder, declaration.property);

    if (value !== undefined) {
      builder.addDescriptor(
        propertyRename[declaration.property] ?? declaration.property,
        value,
      );
    }
  } else {
    builder.addWarning("property", declaration.property);
  }
}

function parseInsetBlock(
  { value }: DeclarationType<"inset-block">,
  builder: StylesheetBuilder,
) {
  builder.addShorthand("inset-block", {
    "inset-block-start": parseLengthPercentageOrAuto(value.blockStart, builder),
    "inset-block-end": parseLengthPercentageOrAuto(value.blockEnd, builder),
  });
}

function parseInsetInline(
  { value }: DeclarationType<"inset-inline">,
  builder: StylesheetBuilder,
) {
  builder.addShorthand("inset-inline", {
    "inset-block-start": parseLengthPercentageOrAuto(
      value.inlineStart,
      builder,
    ),
    "inset-block-end": parseLengthPercentageOrAuto(value.inlineEnd, builder),
  });
}

function parseInset(
  { value }: DeclarationType<"inset">,
  builder: StylesheetBuilder,
) {
  builder.addShorthand("inset", {
    top: parseLengthPercentageOrAuto(value.top, builder),
    bottom: parseLengthPercentageOrAuto(value.bottom, builder),
    left: parseLengthPercentageOrAuto(value.left, builder),
    right: parseLengthPercentageOrAuto(value.right, builder),
  });
}

function parseBorderRadius(
  { value }: DeclarationType<"border-radius">,
  builder: StylesheetBuilder,
) {
  builder.addShorthand("border-radius", {
    "border-bottom-left-radius": parseSize2DDimensionPercentage(
      value.bottomLeft,
      builder,
    ),
    "border-bottom-right-radius": parseSize2DDimensionPercentage(
      value.bottomRight,
      builder,
    ),
    "border-top-left-radius": parseSize2DDimensionPercentage(
      value.topLeft,
      builder,
    ),
    "border-top-right-radius": parseSize2DDimensionPercentage(
      value.topRight,
      builder,
    ),
  });
}

function parseBorderColor(
  declaration: DeclarationType<
    "border-color" | "border-block-color" | "border-inline-color"
  >,
  builder: StylesheetBuilder,
) {
  if (declaration.property === "border-color") {
    builder.addShorthand("border-color", {
      "border-top-color": parseColor(declaration.value.top, builder),
      "border-bottom-color": parseColor(declaration.value.bottom, builder),
      "border-left-color": parseColor(declaration.value.left, builder),
      "border-right-color": parseColor(declaration.value.right, builder),
    });
  } else {
    const start = parseColor(declaration.value.start, builder);
    const end = parseColor(declaration.value.end, builder);

    if (start === end) {
      builder.addDescriptor(declaration.property, start);
    } else if (declaration.property === "border-block-color") {
      builder.addDescriptor("border-top-color", start);
      builder.addDescriptor("border-bottom-color", end);
    } else {
      builder.addDescriptor("border-left-color", start);
      builder.addDescriptor("border-right-color", end);
    }
  }
}

function parseBorderWidth(
  { value }: DeclarationType<"border-width">,
  builder: StylesheetBuilder,
) {
  builder.addShorthand("border-width", {
    "border-top-width": parseBorderSideWidth(value.top, builder),
    "border-bottom-width": parseBorderSideWidth(value.bottom, builder),
    "border-left-width": parseBorderSideWidth(value.left, builder),
    "border-right-width": parseBorderSideWidth(value.right, builder),
  });
}

function parseBorder(
  { value }: DeclarationType<"border">,
  builder: StylesheetBuilder,
) {
  builder.addShorthand("border", {
    "border-width": parseBorderSideWidth(value.width, builder),
    "border-style": parseBorderStyle(value.style, builder),
    "border-color": parseColor(value.color, builder),
  });
}

function parseBorderSide(
  {
    value,
    property,
  }: DeclarationType<
    "border-top" | "border-bottom" | "border-left" | "border-right"
  >,
  builder: StylesheetBuilder,
) {
  builder.addDescriptor(property + "-color", parseColor(value.color, builder));
  builder.addDescriptor(
    property + "-width",
    parseBorderSideWidth(value.width, builder),
  );
}

function parseBorderBlock(
  { value }: DeclarationType<"border-block">,
  builder: StylesheetBuilder,
) {
  builder.addDescriptor("border-block-color", parseColor(value.color, builder));
  builder.addDescriptor(
    "border-block-width",
    parseBorderSideWidth(value.width, builder),
  );
  builder.addDescriptor(
    "border-block-style",
    parseBorderStyle(value.style, builder),
  );
}

function parseBorderBlockStart(
  { value }: DeclarationType<"border-block-start">,
  builder: StylesheetBuilder,
) {
  builder.addDescriptor(
    "border-block-start-color",
    parseColor(value.color, builder),
  );
  builder.addDescriptor(
    "border-block-start-width",
    parseBorderSideWidth(value.width, builder),
  );
}

function parseBorderBlockEnd(
  { value }: DeclarationType<"border-block-end">,
  builder: StylesheetBuilder,
) {
  builder.addDescriptor(
    "border-block-end-color",
    parseColor(value.color, builder),
  );
  builder.addDescriptor(
    "border-block-end-width",
    parseBorderSideWidth(value.width, builder),
  );
}

function parseBorderInline(
  { value }: DeclarationType<"border-inline">,
  builder: StylesheetBuilder,
) {
  builder.addDescriptor(
    "border-inline-color",
    parseColor(value.color, builder),
  );
  builder.addDescriptor(
    "border-inline-width",
    parseBorderSideWidth(value.width, builder),
  );
  builder.addDescriptor(
    "border-inline-style",
    parseBorderStyle(value.style, builder),
  );
}

function parseBorderInlineStart(
  { value }: DeclarationType<"border-inline-start">,
  builder: StylesheetBuilder,
) {
  builder.addDescriptor(
    "border-inline-start-color",
    parseColor(value.color, builder),
  );
  builder.addDescriptor(
    "border-inline-start-width",
    parseBorderSideWidth(value.width, builder),
  );
  builder.addDescriptor(
    "border-inline-start-style",
    parseBorderStyle(value.style, builder),
  );
}

function parseBorderInlineEnd(
  { value }: DeclarationType<"border-inline-end">,
  builder: StylesheetBuilder,
) {
  builder.addDescriptor(
    "border-inline-end-color",
    parseColor(value.color, builder),
  );
  builder.addDescriptor(
    "border-inline-end-width",
    parseBorderSideWidth(value.width, builder),
  );
  builder.addDescriptor(
    "border-inline-end-style",
    parseBorderStyle(value.style, builder),
  );
}

export function parseBorderInlineWidth(
  declaration: DeclarationType<"border-inline-width">,
  builder: StylesheetBuilder,
) {
  builder.addDescriptor(
    "border-inline-width",
    parseBorderSideWidth(declaration.value.start, builder),
  );
}

export function parseBorderInlineStyle(
  declaration: DeclarationType<
    | "border-inline-style"
    | "border-inline-start-style"
    | "border-inline-end-style"
  >,
  builder: StylesheetBuilder,
) {
  if (typeof declaration.value === "string") {
    builder.addDescriptor(
      declaration.property,
      parseBorderStyle(declaration.value, builder),
    );
  } else if (declaration.value.start === declaration.value.end) {
    builder.addDescriptor(
      declaration.property,
      parseBorderStyle(declaration.value.start, builder),
    );
  } else {
    builder.addDescriptor(
      "border-inline-start-style",
      parseBorderStyle(declaration.value.start, builder),
    );
    builder.addDescriptor(
      "border-inline-end-style",
      parseBorderStyle(declaration.value.end, builder),
    );
  }
}

function parseFlexFlow(
  { value }: DeclarationType<"flex-flow">,
  builder: StylesheetBuilder,
) {
  builder.addDescriptor("flexWrap", value.wrap);
  builder.addDescriptor("flexDirection", value.direction);
}

function parseFlex(
  { value }: DeclarationType<"flex">,
  builder: StylesheetBuilder,
) {
  builder.addDescriptor("flex-grow", value.grow);
  builder.addDescriptor("flex-shrink", value.shrink);
  builder.addDescriptor(
    "flex-basis",
    parseLengthPercentageOrAuto(value.basis, builder),
  );
}

function parseMargin(
  { value }: DeclarationType<"margin">,
  builder: StylesheetBuilder,
) {
  builder.addShorthand("margin", {
    "margin-top": parseSize(value.top, builder, { allowAuto: true }),
    "margin-bottom": parseSize(value.bottom, builder, { allowAuto: true }),
    "margin-left": parseSize(value.left, builder, { allowAuto: true }),
    "margin-right": parseSize(value.right, builder, { allowAuto: true }),
  });
}

function parseMarginBlock(
  { value }: DeclarationType<"margin-block">,
  builder: StylesheetBuilder,
) {
  builder.addShorthand("margin-block", {
    "margin-block-start": parseLengthPercentageOrAuto(
      value.blockStart,
      builder,
      { allowAuto: true },
    ),
    "margin-block-end": parseLengthPercentageOrAuto(value.blockEnd, builder, {
      allowAuto: true,
    }),
  });
}

function parseMarginInline(
  { value }: DeclarationType<"margin-inline">,
  builder: StylesheetBuilder,
) {
  builder.addShorthand("margin-inline", {
    "margin-inline-start": parseLengthPercentageOrAuto(
      value.inlineStart,
      builder,
      { allowAuto: true },
    ),
    "margin-inline-end": parseLengthPercentageOrAuto(value.inlineEnd, builder, {
      allowAuto: true,
    }),
  });
}

function parsePadding(
  { value }: DeclarationType<"padding">,
  builder: StylesheetBuilder,
) {
  builder.addShorthand("padding", {
    "padding-top": parseSize(value.top, builder),
    "padding-bottom": parseSize(value.bottom, builder),
    "padding-left": parseSize(value.left, builder),
    "padding-right": parseSize(value.right, builder),
  });
}

function parsePaddingBlock(
  { value }: DeclarationType<"padding-block">,
  builder: StylesheetBuilder,
) {
  builder.addShorthand("padding-block", {
    "padding-block-start": parseLengthPercentageOrAuto(
      value.blockStart,
      builder,
    ),
    "padding-block-end": parseLengthPercentageOrAuto(value.blockEnd, builder),
  });
}

function parsePaddingInline(
  { value }: DeclarationType<"padding-inline">,
  builder: StylesheetBuilder,
) {
  builder.addShorthand("padding-inline", {
    "padding-inline-start": parseLengthPercentageOrAuto(
      value.inlineStart,
      builder,
    ),
    "padding-inline-end": parseLengthPercentageOrAuto(value.inlineEnd, builder),
  });
}

function parseFont(
  { value }: DeclarationType<"font">,
  builder: StylesheetBuilder,
) {
  builder.addDescriptor("font-family", value.family[0]);
  builder.addDescriptor(
    "line-height",
    parseLineHeight(value.lineHeight, builder),
  );
  builder.addDescriptor("font-size", parseFontSize(value.size, builder));
  builder.addDescriptor("font-style", parseFontStyle(value.style, builder));
  builder.addDescriptor(
    "font-variant-caps",
    parseFontVariantCaps(value.variantCaps, builder),
  );
  builder.addDescriptor("font-weight", parseFontWeight(value.weight, builder));
}

function parseTransform(
  { value }: DeclarationType<"transform">,
  builder: StylesheetBuilder,
) {
  builder.addDescriptor("transform", [
    {},
    "transform",
    value.flatMap((t): StyleDescriptor[] => {
      switch (t.type) {
        case "perspective":
          return [[{}, "perspective", parseLength(t.value, builder)]];
        case "translate":
          return [
            [
              {},
              "translateX",
              parseLengthOrCoercePercentageToRuntime(t.value[0], builder),
            ],
            [
              [
                {},
                "translateY",
                parseLengthOrCoercePercentageToRuntime(t.value[1], builder),
              ],
            ],
          ];
        case "translateX":
          return [
            [
              {},
              "translateX",
              parseLengthOrCoercePercentageToRuntime(t.value, builder),
            ],
          ];
        case "translateY":
          return [
            [
              {},
              "translateY",
              parseLengthOrCoercePercentageToRuntime(t.value, builder),
            ],
          ];
        case "rotate":
          return [[{}, "rotate", parseAngle(t.value, builder)]];
        case "rotateX":
          return [[{}, "rotateX", parseAngle(t.value, builder)]];
        case "rotateY":
          return [[{}, "rotateY", parseAngle(t.value, builder)]];
        case "rotateZ":
          return [[{}, "rotateZ", parseAngle(t.value, builder)]];
        case "scale":
          return [
            [{}, "scaleX", parseLength(t.value[0], builder)],
            [{}, "scaleY", parseLength(t.value[1], builder)],
          ];
        case "scaleX":
          return [[{}, "scaleX", parseLength(t.value, builder)]];
        case "scaleY":
          return [[{}, "scaleY", parseLength(t.value, builder)]];
        case "skew":
          return [
            [{}, "skewX", parseAngle(t.value[0], builder)],
            [{}, "skewY", parseAngle(t.value[1], builder)],
          ];
        case "skewX":
          return [[{}, "skewX", parseAngle(t.value, builder)]];
        case "skewY":
          return [[{}, "skewY", parseAngle(t.value, builder)]];
        case "translateZ":
        case "translate3d":
        case "scaleZ":
        case "scale3d":
        case "rotate3d":
        case "matrix":
        case "matrix3d":
          return [[]];
      }
    }),
  ]);
  return;
}

function parseTranslate(
  { value }: DeclarationType<"translate">,
  builder: StylesheetBuilder,
) {
  builder.addDescriptor("translateX", [
    {},
    "translateX",
    parseTranslateProp(value, "x", builder),
  ]);
  builder.addDescriptor("translateY", [
    {},
    "translateY",
    parseTranslateProp(value, "y", builder),
  ]);
}

function parseRotate(
  { value }: DeclarationType<"rotate">,
  builder: StylesheetBuilder,
) {
  if (value.x) {
    builder.addDescriptor("rotateX", [
      {},
      "rotateX",
      parseAngle(value.angle, builder),
    ]);
  }

  if (value.y) {
    builder.addDescriptor("rotateY", [
      {},
      "rotateY",
      parseAngle(value.angle, builder),
    ]);
  }

  if (value.z) {
    builder.addDescriptor("rotateZ", [
      {},
      "rotateZ",
      parseAngle(value.angle, builder),
    ]);
  }
}

function parseScale(
  { value }: DeclarationType<"scale">,
  builder: StylesheetBuilder,
) {
  builder.addDescriptor("scaleX", [
    {},
    "scaleX",
    parseScaleValue(value, "x", builder),
  ]);
  builder.addDescriptor("scaleY", [
    {},
    "scaleY",
    parseScaleValue(value, "y", builder),
  ]);
}

export function parseScaleValue(
  translate: Scale,
  prop: keyof Extract<Scale, object>,
  builder: StylesheetBuilder,
): StyleDescriptor {
  if (translate === "none") {
    return 0;
  }

  return parseLength(translate[prop], builder);
}

function parseLetterSpacing(
  { value }: DeclarationType<"letter-spacing">,
  builder: StylesheetBuilder,
) {
  if (value.type === "normal") {
    return;
  }

  return parseLength(value.value, builder);
}

function parseTextDecoration(
  { value }: DeclarationType<"text-decoration">,
  builder: StylesheetBuilder,
) {
  builder.addDescriptor(
    "text-decoration-color",
    parseColor(value.color, builder),
  );
  builder.addDescriptor(
    "text-decoration-line",
    parseTextDecorationLine(value.line, builder),
  );
}

function parseZIndex(
  { value }: DeclarationType<"z-index">,
  builder: StylesheetBuilder,
): StyleDescriptor {
  if (value.type === "integer") {
    return parseLength(value.value, builder);
  } else {
    builder.addWarning("value", value.type);
    return;
  }
}

function parseContainerType(
  _declaration: DeclarationType<"container-type">,
  builder: StylesheetBuilder,
) {
  builder.addContainer(["___default___"]);
  return;
}

function parseContainerName(
  { value }: DeclarationType<"container-name">,
  builder: StylesheetBuilder,
) {
  builder.addContainer(value.type === "none" ? false : value.value);
  return;
}

function parseContainer(
  { value }: DeclarationType<"container">,
  builder: StylesheetBuilder,
) {
  builder.addContainer(value.name.type === "none" ? false : value.name.value);
  return;
}

export function parseUnparsedDeclaration(
  declaration: Extract<Declaration, { property: "unparsed" }>,
  builder: StylesheetBuilder,
) {
  let property = declaration.value.propertyId.property;

  if (!(property in parsers)) {
    builder.addWarning("property", property);
    return;
  }

  builder.setWarningProperty(property);

  /**
   * React Native doesn't support all the logical properties
   */
  const rename = propertyRename[property];
  if (rename) {
    property = rename;
  }

  /**
   * Unparsed shorthand properties need to be parsed at runtime
   */
  builder.descriptorProperty = property;

  if (unparsedRuntimeParsing.has(property)) {
    const args = parseUnparsed(declaration.value.value, builder, property);

    if (property === "animation") {
      builder.addDescriptor("animation", [{}, property, args]);
    } else {
      builder.addDescriptor(property, [{}, toRNProperty(property), args, 1]);
    }
  } else {
    const value = parseUnparsed(declaration.value.value, builder, property);

    builder.addDescriptor(property, value);

    if (property === "font-size") {
      builder.addDescriptor("--__rn-css-em", value);
    }

    if (property === "color") {
      if (
        !isStyleFunction(value) ||
        value[1] !== "var" ||
        value[2] !== "-css-color"
      ) {
        builder.addDescriptor("--__rn-css-color", value);
      }
    }
  }
}

export function parseCustomDeclaration(
  declaration: Extract<Declaration, { property: "custom" }>,
  builder: StylesheetBuilder,
) {
  const property = declaration.value.name;

  if (property === "-webkit-line-clamp") {
    builder.addDescriptor(
      property,
      parseUnparsed(declaration.value.value, builder, property),
    );
  } else if (property === "-rn-ripple-style") {
    if (
      parseUnparsed(declaration.value.value, builder, property) === "borderless"
    ) {
      builder.addDescriptor(property, true);
    }
  } else if (property === "-rn-ripple-layer") {
    if (
      parseUnparsed(declaration.value.value, builder, property) === "foreground"
    ) {
      builder.addDescriptor(property, true);
    }
  } else if (property === "object-fit") {
    // https://github.com/parcel-bundler/lightningcss/issues/1046
    parseObjectFit(declaration.value, builder);
  } else if (property === "object-position") {
    // https://github.com/parcel-bundler/lightningcss/issues/1047
    parseObjectPosition(declaration.value, builder);
  } else if (property === "outline-offset") {
    // https://github.com/parcel-bundler/lightningcss/issues/1048
    builder.addDescriptor(
      property,
      parseUnparsed(declaration.value.value, builder, property),
    );
  } else if (property === "corner-shape") {
    parseCornerShape(declaration.value, builder);
  } else if (
    validProperties.has(property) ||
    property.startsWith("--") ||
    property.startsWith("-rn-")
  ) {
    builder.addDescriptor(
      property,
      parseUnparsed(declaration.value.value, builder, property),
    );
  } else {
    builder.addWarning("property", declaration.value.name);
  }
}

export function reduceParseUnparsed(
  tokenOrValues: TokenOrValue[],
  builder: StylesheetBuilder,
  property: string,
  allowAuto: boolean,
): StyleDescriptor {
  const result = tokenOrValues
    .map((tokenOrValue) =>
      parseUnparsed(tokenOrValue, builder, property, allowAuto),
    )
    .filter((v) => v !== undefined);

  if (result.length === 0) {
    return undefined;
  }

  let currentGroup: StyleDescriptor = [];
  let groups: StyleDescriptor[] = [currentGroup];

  for (const value of result) {
    if ((value as unknown) === CommaSeparator) {
      currentGroup = [];
      groups.push(currentGroup);
    } else {
      currentGroup.push(value);
    }
  }

  // Groups are the tokens grouped together by comma location
  // If a group only has 1 item, it shouldn't be an array
  groups = groups.flatMap((group): StyleDescriptor[] => {
    if (!Array.isArray(group)) {
      return [];
    }

    if (group.length === 0) {
      return [];
    } else if (group.length === 1) {
      const first = group[0];

      if (first === undefined) {
        return [];
      } else {
        return [first];
      }
    } else if (
      // This is a special case for <ratio> values
      group.includes("/") &&
      group.every((item) =>
        typeof item === "string" && item === "/"
          ? item
          : typeof item === "number",
      )
    ) {
      // eslint-disable-next-line @typescript-eslint/no-base-to-string
      return [group.join(" ")];
    } else {
      return [group];
    }
  });

  return groups.length === 1 ? groups[0] : groups;
}

export function unparsedFunction(
  token: Extract<TokenOrValue, { type: "function" }>,
  builder: StylesheetBuilder,
  property: string,
  allowAuto: boolean,
): StyleFunction {
  return [
    {},
    toRNProperty(token.value.name),
    reduceParseUnparsed(token.value.arguments, builder, property, allowAuto),
  ];
}

/**
 * When the CSS cannot be parsed (often due to a runtime condition like a CSS variable)
 * This export function best efforts parsing it into a export function that we can evaluate at runtime
 */
export function parseUnparsed(
  tokenOrValue:
    | TokenOrValue
    | TokenOrValue[]
    | string
    | number
    | undefined
    | null,
  builder: StylesheetBuilder,
  property: string,
  allowAuto = allowAutoProperties.has(property),
): StyleDescriptor {
  if (tokenOrValue === undefined || tokenOrValue === null) {
    return;
  }

  if (typeof tokenOrValue === "string") {
    if (tokenOrValue === "true") {
      return true;
    } else if (tokenOrValue === "false") {
      return false;
    } else if (tokenOrValue === "currentcolor") {
      return [{}, "var", "__rn-css-color"] as const;
    } else {
      return tokenOrValue;
    }
  }

  if (typeof tokenOrValue === "number") {
    return round(tokenOrValue);
  }

  if (Array.isArray(tokenOrValue)) {
    const args = reduceParseUnparsed(
      tokenOrValue,
      builder,
      property,
      allowAuto,
    );
    if (!args) return;
    if (Array.isArray(args) && args.length === 1) {
      return args[0];
    } else if (
      (property === "filter" || property === "transform") &&
      isStyleFunction(args)
    ) {
      return [args];
    } else {
      return args;
    }
  }

  switch (tokenOrValue.type) {
    case "unresolved-color": {
      return parseUnresolvedColor(
        tokenOrValue.value,
        builder,
        property,
        allowAuto,
      );
    }
    case "var": {
      let args: StyleDescriptor = tokenOrValue.value.name.ident.slice(2);
      const fallback = parseUnparsed(
        tokenOrValue.value.fallback,
        builder,
        property,
        allowAuto,
      );
      if (fallback !== undefined) {
        args = [args, fallback];
      }

      return [{}, "var", args, 1];
    }
    case "function": {
      switch (tokenOrValue.value.name) {
        case "blur":
        case "brightness":
        case "contrast":
        case "cubic-bezier":
        case "drop-shadow":
        case "fontScale":
        case "getPixelSizeForLayoutSize":
        case "grayscale":
        case "hsl":
        case "hsla":
        case "hue-rotate":
        case "invert":
        case "opacity":
        case "pixelScale":
        case "platformColor":
        case "rgb":
        case "rgba":
        case "rotate":
        case "rotateX":
        case "rotateY":
        case "roundToNearestPixel":
        case "saturate":
        case "scale":
        case "scaleX":
        case "scaleY":
        case "sepia":
        case "shadow":
        case "skewX":
        case "skewY":
        case "steps":
        case "translate":
        case "translateX":
        case "translateY":
          return unparsedFunction(tokenOrValue, builder, property, allowAuto);
        case "linear-gradient":
        case "radial-gradient":
          // These are special as React Native requires the '-' in their name
          return [
            {},
            tokenOrValue.value.name,
            reduceParseUnparsed(
              tokenOrValue.value.arguments,
              builder,
              property,
              allowAuto,
            ),
          ];
        case "hairlineWidth":
          return [{}, tokenOrValue.value.name, []];
        case "calc":
        case "max":
        case "min":
        case "clamp":
          return parseCalcFn(
            tokenOrValue.value.name,
            tokenOrValue.value.arguments,
            builder,
            property,
          );
        case "color-mix":
          return parseColorMix(tokenOrValue.value.arguments, builder, property);
        default: {
          builder.addWarning("value", `${tokenOrValue.value.name}()`);
          return;
        }
      }
    }
    case "length":
      return parseLength(tokenOrValue.value, builder);
    case "angle":
      return parseAngle(tokenOrValue.value, builder);
    case "token":
      switch (tokenOrValue.value.type) {
        case "string":
        case "ident": {
          const value = tokenOrValue.value.value;
          if (!allowAuto && value === "auto") {
            builder.addWarning("value", value);
            return;
          }

          if (value === "inherit" || value === "initial") {
            builder.addWarning("value", value);
            return;
          } else if (value === "currentcolor") {
            return [{}, "var", "__rn-css-color"] as const;
          }

          if (value === "true") {
            return true;
          } else if (value === "false") {
            return false;
          } else if (value === "infinity") {
            return Number.MAX_SAFE_INTEGER;
          } else {
            return value;
          }
        }
        case "number": {
          return round(tokenOrValue.value.value);
        }
        case "function":
          builder.addWarning("value", tokenOrValue.value.value);
          return;
        case "percentage":
          return `${round(tokenOrValue.value.value * 100)}%`;
        case "dimension":
          return parseDimension(tokenOrValue.value, builder);
        case "comma":
          return CommaSeparator as unknown as StyleDescriptor;
        case "delim": {
          if (tokenOrValue.value.value === "/") {
            return tokenOrValue.value.value;
          }
          return;
        }
        case "at-keyword":
        case "hash":
        case "id-hash":
        case "unquoted-url":
        case "white-space":
        case "comment":
        case "colon":
        case "semicolon":
        case "include-match":
        case "dash-match":
        case "prefix-match":
        case "suffix-match":
        case "substring-match":
        case "cdo":
        case "cdc":
        case "parenthesis-block":
        case "square-bracket-block":
        case "curly-bracket-block":
        case "bad-url":
        case "bad-string":
        case "close-parenthesis":
        case "close-square-bracket":
        case "close-curly-bracket":
          return;
        default: {
          tokenOrValue.value satisfies never;
          return;
        }
      }
    case "color":
      return parseColor(tokenOrValue.value, builder);
    case "env":
      return parseEnv(tokenOrValue.value, builder);
    case "time":
      return parseTime(tokenOrValue.value);
    case "url":
    case "resolution":
    case "dashed-ident":
    case "animation-name":
      return;
    default: {
      tokenOrValue satisfies never;
    }
  }

  return;
}

export function parseLengthDeclaration(
  declaration: {
    value:
      | number
      | Length
      | DimensionPercentageFor_LengthValue
      | NumberOrPercentage
      | LengthValue;
  },
  builder: StylesheetBuilder,
) {
  return parseLength(declaration.value, builder);
}

export function parseLength(
  length:
    | number
    | Length
    | DimensionPercentageFor_LengthValue
    | NumberOrPercentage
    | LengthValue,
  builder: StylesheetBuilder,
): StyleDescriptor {
  const { inlineRem = 14 } = builder.getOptions();

  if (typeof length === "number") {
    return round(length);
  }

  if ("unit" in length) {
    switch (length.unit) {
      case "px": {
        if (length.value === Infinity) {
          return Number.MAX_SAFE_INTEGER;
        } else if (length.value === -Infinity) {
          return Number.MIN_SAFE_INTEGER;
        } else {
          // Normalize large values to safe integers, e.g. `calc(infinity * 1px)`
          const value = Math.max(
            Math.min(length.value, Number.MAX_SAFE_INTEGER),
            Number.MIN_SAFE_INTEGER,
          );
          return round(value);
        }
      }
      case "rem":
        if (typeof inlineRem === "number") {
          return length.value * inlineRem;
        } else {
          return [{}, "rem", round(length.value)];
        }
      case "vw":
      case "vh":
      case "em":
        return [{}, length.unit, round(length.value), 1];
      case "in":
      case "cm":
      case "mm":
      case "q":
      case "pt":
      case "pc":
      case "ex":
      case "rex":
      case "ch":
      case "rch":
      case "cap":
      case "rcap":
      case "ic":
      case "ric":
      case "lh":
      case "rlh":
      case "lvw":
      case "svw":
      case "dvw":
      case "cqw":
      case "lvh":
      case "svh":
      case "dvh":
      case "cqh":
      case "vi":
      case "svi":
      case "lvi":
      case "dvi":
      case "cqi":
      case "vb":
      case "svb":
      case "lvb":
      case "dvb":
      case "cqb":
      case "vmin":
      case "svmin":
      case "lvmin":
      case "dvmin":
      case "cqmin":
      case "vmax":
      case "svmax":
      case "lvmax":
      case "dvmax":
      case "cqmax":
        builder.addWarning("value", `${length.value}${length.unit}`);
        return undefined;
      default: {
        length.unit satisfies never;
      }
    }
  } else {
    switch (length.type) {
      case "calc": {
        // TODO: Add the calc polyfill
        return undefined;
      }
      case "number": {
        return round(length.value);
      }
      case "percentage": {
        return `${round(length.value * 100)}%`;
      }
      case "dimension":
      case "value": {
        return parseLength(length.value, builder);
      }
    }
  }

  return;
}

export function parseAngle(angle: Angle | number, builder: StylesheetBuilder) {
  if (typeof angle === "number") {
    return `${angle}deg`;
  }

  switch (angle.type) {
    case "deg":
    case "rad":
      return `${angle.value}${angle.type}`;
    default:
      builder.addWarning("value", `${angle.value} ${angle.type}`);
      return undefined;
  }
}

export function parseSizeDeclaration(
  declaration: { value: Size | MaxSize },
  builder: StylesheetBuilder,
) {
  return parseSize(declaration.value, builder);
}

export function parseSizeWithAutoDeclaration(
  declaration: { value: Size | MaxSize },
  builder: StylesheetBuilder,
) {
  return parseSize(declaration.value, builder, { allowAuto: true });
}

export function parsePointerEvents(
  { value }: { value: string },
  builder: StylesheetBuilder,
) {
  switch (value) {
    case "none":
    case "box-none":
    case "box-only":
    case "auto":
      return value;
    case "visible":
    case "visiblePainted":
    case "visibleFill":
    case "visibleStroke":
    case "painted":
    case "fill":
    case "stroke":
      builder.addWarning("value", value);
  }

  return;
}

export function parseSize(
  size: Size | MaxSize,
  builder: StylesheetBuilder,
  options?: { allowAuto?: boolean },
): StyleDescriptor;
export function parseSize(
  size: Size | MaxSize,
  builder: StylesheetBuilder,
  property: string,
  options?: { allowAuto?: boolean },
): StyleDescriptor;
export function parseSize(
  size: Size | MaxSize,
  builder: StylesheetBuilder,
  options?: string | { allowAuto?: boolean },
  { allowAuto = false } = {},
) {
  allowAuto =
    (typeof options === "object" ? options.allowAuto : allowAuto) ?? false;

  switch (size.type) {
    case "length-percentage":
      return parseLength(size.value, builder);
    case "none":
      return size.type;
    case "auto":
      if (allowAuto) {
        return size.type;
      } else {
        builder.addWarning("value", size.type);
        return undefined;
      }
    case "min-content":
    case "max-content":
    case "fit-content":
    case "fit-content-function":
    case "stretch":
    case "contain":
      builder.addWarning("value", size.type);
      return undefined;
    default: {
      size satisfies never;
    }
  }

  return;
}

export function parseColorOrAutoDeclaration(
  { value }: { value: ColorOrAuto },
  builder: StylesheetBuilder,
) {
  if (value.type === "auto") {
    builder.addWarning("value", `Invalid color value ${value.type}`);
    return;
  } else {
    return parseColor(value.value, builder);
  }
}

export function parseFontColorDeclaration(
  declaration: Extract<Declaration, { value: CssColor }>,
  builder: StylesheetBuilder,
) {
  parseColorDeclaration(declaration, builder);

  if (
    typeof declaration.value !== "object" ||
    declaration.value.type !== "currentcolor"
  ) {
    builder.addDescriptor(
      "--__rn-css-color",
      parseColor(declaration.value, builder),
    );
  }
}

export function parseColorDeclaration(
  declaration: Extract<Declaration, { value: CssColor }>,
  builder: StylesheetBuilder,
) {
  builder.addDescriptor(
    declaration.property,
    parseColor(declaration.value, builder),
  );
}

export function parseColor(cssColor: CssColor, builder: StylesheetBuilder) {
  if (typeof cssColor === "string") {
    if (namedColors.has(cssColor)) {
      return cssColor;
    }
    return;
  }

  let color: Color | undefined;

  const { hexColors = true, colorPrecision } = builder.getOptions();

  switch (cssColor.type) {
    case "currentcolor":
      return [{}, "var", "__rn-css-color"] as const;
    case "light-dark": {
      const extraRule: StyleRule = {
        s: [],
        m: [["=", "prefers-color-scheme", "dark"]],
      };

      builder.addUnnamedDescriptor(
        parseColor(cssColor.dark, builder),
        false,
        extraRule,
      );
      builder.addExtraRule(extraRule);
      return parseColor(cssColor.light, builder);
    }
    case "rgb": {
      color = new Color({
        space: "sRGB",
        coords: [cssColor.r / 255, cssColor.g / 255, cssColor.b / 255],
        alpha: cssColor.alpha,
      });
      break;
    }
    case "hsl":
      color = new Color({
        space: cssColor.type,
        coords: [cssColor.h, cssColor.s, cssColor.l],
        alpha: cssColor.alpha,
      });
      break;
    case "hwb":
      color = new Color({
        space: cssColor.type,
        coords: [cssColor.h, cssColor.w, cssColor.b],
        alpha: cssColor.alpha,
      });
      break;
    case "lab":
      color = new Color({
        space: cssColor.type,
        coords: [cssColor.l, cssColor.a, cssColor.b],
        alpha: cssColor.alpha,
      });
      break;
    case "lch":
      color = new Color({
        space: cssColor.type,
        coords: [cssColor.l, cssColor.c, cssColor.h],
        alpha: cssColor.alpha,
      });
      break;
    case "oklab":
      color = new Color({
        space: cssColor.type,
        coords: [cssColor.l, cssColor.a, cssColor.b],
        alpha: cssColor.alpha,
      });
      break;
    case "oklch":
      color = new Color({
        space: cssColor.type,
        coords: [cssColor.l, cssColor.c, cssColor.h],
        alpha: cssColor.alpha,
      });
      break;
    case "srgb":
      color = new Color({
        space: cssColor.type,
        coords: [cssColor.r, cssColor.g, cssColor.b],
        alpha: cssColor.alpha,
      });
      break;
    case "srgb-linear":
      color = new Color({
        space: cssColor.type,
        coords: [cssColor.r, cssColor.g, cssColor.b],
        alpha: cssColor.alpha,
      });
      break;
    case "display-p3":
      color = new Color({
        space: "p3",
        coords: [cssColor.r, cssColor.g, cssColor.b],
        alpha: cssColor.alpha,
      });
      break;
    case "a98-rgb":
      color = new Color({
        space: "a98rgb",
        coords: [cssColor.r, cssColor.g, cssColor.b],
        alpha: cssColor.alpha,
      });
      break;
    case "prophoto-rgb":
      color = new Color({
        space: "prophoto",
        coords: [cssColor.r, cssColor.g, cssColor.b],
        alpha: cssColor.alpha,
      });
      break;
    case "rec2020":
      color = new Color({
        space: cssColor.type,
        coords: [cssColor.r, cssColor.g, cssColor.b],
        alpha: cssColor.alpha,
      });
      break;
    case "xyz-d50":
      color = new Color({
        space: cssColor.type,
        coords: [cssColor.x, cssColor.y, cssColor.z],
        alpha: cssColor.alpha,
      });
      break;
    case "xyz-d65":
      color = new Color({
        space: cssColor.type,
        coords: [cssColor.x, cssColor.y, cssColor.z],
        alpha: cssColor.alpha,
      });
      break;
    default: {
      cssColor satisfies never;
    }
  }

  if (!hexColors || colorPrecision) {
    return color?.toString({ precision: colorPrecision ?? 3 });
  } else {
    return color?.toString({ format: "hex" });
  }
}

export function parseLengthPercentageDeclaration(
  value: { value: LengthPercentageOrAuto },
  builder: StylesheetBuilder,
) {
  return parseLengthPercentageOrAuto(value.value, builder);
}

export function parseLengthPercentageOrAutoDeclaration(
  value: { value: LengthPercentageOrAuto },
  builder: StylesheetBuilder,
) {
  return parseLengthPercentageOrAuto(value.value, builder, { allowAuto: true });
}

export function parseLengthPercentageOrAuto(
  lengthPercentageOrAuto: LengthPercentageOrAuto,
  builder: StylesheetBuilder,
  { allowAuto = false } = {},
) {
  switch (lengthPercentageOrAuto.type) {
    case "auto":
      if (allowAuto) {
        return lengthPercentageOrAuto.type;
      } else {
        builder.addWarning("value", lengthPercentageOrAuto.type);
        return undefined;
      }
    case "length-percentage":
      return parseLength(lengthPercentageOrAuto.value, builder);
    default: {
      lengthPercentageOrAuto satisfies never;
    }
  }

  return;
}

export function parseJustifyContent(
  declaration: DeclarationType<"justify-content">,
  builder: StylesheetBuilder,
) {
  const allowed = new Set([
    "flex-start",
    "flex-end",
    "center",
    "space-between",
    "space-around",
    "space-evenly",
  ]);

  let value: string | undefined;

  switch (declaration.value.type) {
    case "normal":
    case "left":
    case "right":
      value = declaration.value.type;
      break;
    case "content-distribution":
    case "content-position":
      value = declaration.value.value;
      break;
    default: {
      declaration.value satisfies never;
    }
  }

  if (value && !allowed.has(value)) {
    builder.addWarning("value", value);
    return;
  }

  return value;
}

export function parseAlignContent(
  declaration: DeclarationType<"align-content">,
  builder: StylesheetBuilder,
) {
  const allowed = new Set([
    "flex-start",
    "flex-end",
    "center",
    "stretch",
    "space-between",
    "space-around",
    "space-evenly",
  ]);

  let value: string | undefined;

  switch (declaration.value.type) {
    case "normal":
    case "baseline-position":
      value = declaration.value.type;
      break;
    case "content-distribution":
    case "content-position":
      value = declaration.value.value;
      break;
    default: {
      declaration.value satisfies never;
    }
  }

  if (value && !allowed.has(value)) {
    builder.addWarning("value", value);
    return;
  }

  return value;
}

export function parseAlignItems(
  alignItems: DeclarationType<"align-items">,
  builder: StylesheetBuilder,
) {
  const allowed = new Set([
    "auto",
    "flex-start",
    "flex-end",
    "center",
    "stretch",
    "baseline",
  ]);

  let value: string | undefined;

  switch (alignItems.value.type) {
    case "normal":
      value = "auto";
      break;
    case "stretch":
      value = alignItems.value.type;
      break;
    case "baseline-position":
      value = "baseline";
      break;
    case "self-position":
      value = alignItems.value.value;
      break;
    default: {
      alignItems.value satisfies never;
    }
  }

  if (value && !allowed.has(value)) {
    builder.addWarning("value", value);
    return;
  }

  return value;
}

export function parseAlignSelf(
  alignSelf: DeclarationType<"align-self">,
  builder: StylesheetBuilder,
) {
  const allowed = new Set([
    "auto",
    "flex-start",
    "flex-end",
    "center",
    "stretch",
    "baseline",
  ]);

  let value: string | undefined;

  switch (alignSelf.value.type) {
    case "normal":
    case "auto":
      value = "auto";
      break;
    case "stretch":
      value = alignSelf.value.type;
      break;
    case "baseline-position":
      value = "baseline";
      break;
    case "self-position":
      value = alignSelf.value.value;
      break;
    default: {
      alignSelf.value satisfies never;
    }
  }

  if (value && !allowed.has(value)) {
    builder.addWarning("value", value);
    return;
  }

  return value;
}

export function parseFontWeightDeclaration(
  declaration: DeclarationType<"font-weight">,
  builder: StylesheetBuilder,
) {
  return parseFontWeight(declaration.value, builder);
}

export function parseFontWeight(
  fontWeight: FontWeight,
  builder: StylesheetBuilder,
) {
  switch (fontWeight.type) {
    case "absolute":
      if (fontWeight.value.type === "weight") {
        return fontWeight.value.value;
      } else {
        return fontWeight.value.type;
      }
    case "bolder":
    case "lighter":
      builder.addWarning("value", fontWeight.type);
      return;
    default: {
      fontWeight satisfies never;
    }
  }

  return;
}

export function parseTextShadow(
  declaration: DeclarationType<"text-shadow">,
  builder: StylesheetBuilder,
) {
  const [textShadow] = declaration.value;

  if (!textShadow) {
    return;
  }
  builder.addDescriptor(
    "textShadowColor",
    parseColor(textShadow.color, builder),
  );
  builder.addDescriptor(
    "&.textShadowOffset.width",
    parseLength(textShadow.xOffset, builder),
  );
  builder.addDescriptor(
    "&.textShadowOffset.height",
    parseLength(textShadow.yOffset, builder),
  );
  builder.addDescriptor(
    "textShadowRadius",
    parseLength(textShadow.blur, builder),
  );
}

export function parseTextDecorationStyle(
  declaration: DeclarationType<"text-decoration-style">,
  builder: StylesheetBuilder,
) {
  const allowed = new Set(["solid", "double", "dotted", "dashed"]);

  if (allowed.has(declaration.value)) {
    return declaration.value;
  }

  builder.addWarning("value", declaration.value);
  return;
}

export function parseTextDecorationLineDeclaration(
  declaration: DeclarationType<"text-decoration-line">,
  builder: StylesheetBuilder,
) {
  return parseTextDecorationLine(declaration.value, builder);
}

export function parseTextDecorationLine(
  value: DeclarationType<"text-decoration-line">["value"],
  builder: StylesheetBuilder,
) {
  if (!Array.isArray(value)) {
    if (value === "none") {
      return value;
    }
    builder.addWarning("value", value);
    return;
  }

  const set = new Set(value);

  if (set.has("underline")) {
    if (set.has("line-through")) {
      return "underline line-through";
    } else {
      return "underline";
    }
  } else if (set.has("line-through")) {
    return "line-through";
  }

  builder.addWarning("value", value.join(" "));
  return undefined;
}

export function parsePosition(
  { value }: DeclarationType<"position">,
  builder: StylesheetBuilder,
) {
  if (
    value.type === "absolute" ||
    value.type === "relative" ||
    value.type === "static"
  ) {
    return value.type;
  }

  builder.addWarning("value", value.type);
  return;
}

export function parseOverflow(
  { value }: DeclarationType<"overflow">,
  builder: StylesheetBuilder,
) {
  const allowed = new Set(["visible", "hidden"]);

  if (allowed.has(value.x)) {
    return value.x;
  }

  builder.addWarning("value", value.x);
  return undefined;
}

export function parseBorderStyleDeclaration(
  declaration: Extract<
    DeclarationType<Declaration["property"]>,
    { value: LineStyle | BorderStyle }
  >,
  builder: StylesheetBuilder,
) {
  return parseBorderStyle(declaration.value, builder);
}

export function parseBorderStyle(
  value: BorderStyle | LineStyle,
  builder: StylesheetBuilder,
) {
  const allowed = new Set(["solid", "dotted", "dashed"]);

  if (typeof value === "string") {
    if (allowed.has(value)) {
      return value;
    } else {
      builder.addWarning("value", value);
      return undefined;
    }
  } else if (
    value.top === value.bottom &&
    value.top === value.left &&
    value.top === value.right &&
    allowed.has(value.top)
  ) {
    return value.top;
  }

  builder.addWarning("value", value.top);

  return undefined;
}

export function parseBorderBlockWidth(
  declaration: DeclarationType<"border-block-width">,
  builder: StylesheetBuilder,
) {
  const start = parseBorderSideWidth(declaration.value.start, builder);
  const end = parseBorderSideWidth(declaration.value.end, builder);

  if (start === end) {
    builder.addDescriptor("border-block-width", start);
  } else {
    builder.addDescriptor("border-block-start-width", start);
    builder.addDescriptor("border-block-end-width", end);
  }
}

function parseBorderBlockStyle(
  declaration: DeclarationType<"border-block-style">,
  builder: StylesheetBuilder,
) {
  const start = parseBorderStyle(declaration.value.start, builder);
  const end = parseBorderStyle(declaration.value.end, builder);

  if (start == end) {
    builder.addDescriptor("border-block-style", start);
  } else {
    builder.addDescriptor("border-block-start-style", start);
    builder.addDescriptor("border-block-end-style", end);
  }
}

export function parseBorderSideWidthDeclaration(
  declaration: Extract<Declaration, { value: BorderSideWidth }>,
  builder: StylesheetBuilder,
) {
  builder.addDescriptor(
    declaration.property,
    parseBorderSideWidth(declaration.value, builder),
  );
}

export function parseBorderSideWidth(
  value: BorderSideWidth,
  builder: StylesheetBuilder,
) {
  if (value.type === "length") {
    return parseLength(value.value, builder);
  }

  builder.addWarning("value", value.type);
  return undefined;
}

export function parseVerticalAlign(
  { value }: DeclarationType<"vertical-align">,
  builder: StylesheetBuilder,
) {
  if (value.type === "length") {
    return undefined;
  }

  const allowed = new Set(["auto", "top", "bottom", "middle"]);

  if (allowed.has(value.value)) {
    return value.value;
  }

  builder.addWarning("value", value.value);
  return undefined;
}

function parseFontFamily({ value }: DeclarationType<"font-family">) {
  // React Native only allows one font family - better hope this is the right one :)
  return value[0];
}

export function parseLineHeightDeclaration(
  declaration: DeclarationType<"line-height">,
  builder: StylesheetBuilder,
) {
  builder.addDescriptor("line-height", [
    {},
    "lineHeight",
    [parseLineHeight(declaration.value, builder)],
    1,
  ]);
}

export function parseLineHeight(
  value: LineHeight,
  builder: StylesheetBuilder,
): StyleDescriptor {
  switch (value.type) {
    case "normal":
      return undefined;
    case "number":
      return [{}, "em", [value.value], 1];
    case "length": {
      const length = value.value;

      switch (length.type) {
        case "dimension":
          return parseLength(length, builder);
        case "percentage":
        case "calc":
          builder.addWarning(
            "style",
            "line-height",
            typeof length.value === "number"
              ? length.value
              : JSON.stringify(length.value),
          );
          return;
        default: {
          length satisfies never;
        }
      }

      return;
    }
    default: {
      value satisfies never;
    }
  }

  return;
}

export function parseFontSizeDeclaration(
  declaration: DeclarationType<"font-size">,
  builder: StylesheetBuilder,
) {
  const fontSize = parseFontSize(declaration.value, builder);
  builder.addDescriptor("fontSize", fontSize);
  builder.addDescriptor("--__rn-css-em", fontSize);
}

export function parseFontSize(value: FontSize, builder: StylesheetBuilder) {
  switch (value.type) {
    case "length":
      return parseLength(value.value, builder);
    case "absolute":
    case "relative":
      builder.addWarning("value", value.value);
      return undefined;
    default: {
      value satisfies never;
    }
  }

  return;
}

export function parseFontStyleDeclaration(
  declaration: DeclarationType<"font-style">,
  builder: StylesheetBuilder,
) {
  return parseFontStyle(declaration.value, builder);
}

export function parseFontStyle(value: FontStyle, builder: StylesheetBuilder) {
  switch (value.type) {
    case "normal":
    case "italic":
      return value.type;
    case "oblique":
      builder.addWarning("value", value.type);
      return undefined;
    default: {
      value satisfies never;
    }
  }

  return;
}

export function parseFontVariantCapsDeclaration(
  declaration: DeclarationType<"font-variant-caps">,
  builder: StylesheetBuilder,
) {
  return parseFontVariantCaps(declaration.value, builder);
}

export function parseFontVariantCaps(
  value: FontVariantCaps,
  builder: StylesheetBuilder,
) {
  const allowed = new Set([
    "small-caps",
    "oldstyle-nums",
    "lining-nums",
    "tabular-nums",
    "proportional-nums",
  ]);
  if (allowed.has(value)) {
    return value;
  }

  builder.addWarning("value", value);
  return undefined;
}

export function parseLengthOrCoercePercentageToRuntime(
  value: Length | DimensionPercentageFor_LengthValue | NumberOrPercentage,
  builder: StylesheetBuilder,
): StyleDescriptor {
  return parseLength(value, builder);
}

export function parseGap(
  declaration: DeclarationType<"gap" | "column-gap" | "row-gap">,
  builder: StylesheetBuilder,
) {
  if ("column" in declaration.value) {
    const row = parseGapValue(declaration.value.row, builder);
    const column = parseGapValue(declaration.value.column, builder);

    if (row !== column) {
      builder.addDescriptor("row-gap", row);
      builder.addDescriptor("column-gap", column);
    } else {
      builder.addDescriptor("gap", row);
    }
  } else if (declaration.value.type === "normal") {
    builder.addWarning("value", declaration.value.type);
  } else {
    return parseLength(declaration.value.value, builder);
  }

  return;
}

function parseGapValue(
  value: GapValue,
  builder: StylesheetBuilder,
): StyleDescriptor {
  if (value.type === "normal") {
    return;
  } else {
    return parseLength(value.value, builder);
  }
}

export function parseTextAlign(
  { value }: DeclarationType<"text-align">,
  builder: StylesheetBuilder,
) {
  const allowed = new Set(["auto", "left", "right", "center", "justify"]);
  if (allowed.has(value)) {
    return value;
  }

  builder.addWarning("value", value);
  return undefined;
}

export function parseBoxShadow(
  { value }: DeclarationType<"box-shadow">,
  builder: StylesheetBuilder,
) {
  for (const [index, shadow] of value.entries()) {
    builder.addDescriptor(
      `&.boxShadow.[${index}].color`,
      parseColor(shadow.color, builder),
    );
    builder.addDescriptor(
      `&.boxShadow.[${index}].offsetX`,
      parseLength(shadow.xOffset, builder),
    );
    builder.addDescriptor(
      `&.boxShadow.[${index}].offsetY`,
      parseLength(shadow.yOffset, builder),
    );
    builder.addDescriptor(
      `&.boxShadow.[${index}].blurRadius`,
      parseLength(shadow.blur, builder),
    );
    builder.addDescriptor(
      `&.boxShadow.[${index}].spreadDistance`,
      parseLength(shadow.spread, builder),
    );
    builder.addDescriptor(
      `&.boxShadow.[${index}].inset`,
      shadow.inset ? true : undefined,
    );
  }
}

export function parseBoxSizing(
  declaration: DeclarationType<"box-sizing">,
  builder: StylesheetBuilder,
) {
  if (["border-box", "content-box"].includes(declaration.value)) {
    return declaration.value;
  }

  builder.addWarning("value", declaration.value);
  return undefined;
}

export function parseDisplay(
  { value }: DeclarationType<"display">,
  builder: StylesheetBuilder,
) {
  if (value.type === "keyword") {
    if (value.value === "none" || value.value === "contents") {
      return value.value;
    } else {
      builder.addWarning("value", value.value);
      return;
    }
  } else {
    if (value.outside === "block") {
      switch (value.inside.type) {
        case "flow":
          if (value.isListItem) {
            builder.addWarning("value", "list-item");
          } else {
            builder.addWarning("value", "block");
          }
          return;
        case "flex":
          return value.inside.type;
        case "flow-root":
        case "table":
        case "box":
        case "grid":
        case "ruby":
          builder.addWarning("value", value.inside.type);
          return;
      }
    } else {
      switch (value.inside.type) {
        case "flow":
          builder.addWarning("value", "inline");
          return;
        case "flow-root":
          builder.addWarning("value", "inline-block");
          return;
        case "table":
          builder.addWarning("value", "inline-table");
          return;
        case "flex":
          builder.addWarning("value", "inline-flex");
          return;
        case "box":
        case "grid":
          builder.addWarning("value", "inline-grid");
          return;
        case "ruby":
          builder.addWarning("value", value.inside.type);
          return;
      }
    }
  }
}

export function parseDirection(
  declaration: DeclarationType<"direction">,
  builder: StylesheetBuilder,
) {
  if (["ltr", "rtl"].includes(declaration.value)) {
    builder.addDescriptor("direction", declaration.value);
    builder.addDescriptor("--__rn-css-direction", declaration.value);
  }

  builder.addWarning("value", declaration.value);
  return;
}

export function parseAspectRatio({
  value,
}: DeclarationType<"aspect-ratio">): StyleDescriptor {
  if (!value.ratio) {
    return;
  } else if (value.auto) {
    return "auto";
  } else {
    const [width, height] = value.ratio;
    if (width === height) {
      return 1;
    } else {
      return `${width}/${height}`;
    }
  }
}

export function parseBackfaceVisibility(
  { value }: DeclarationType<"backface-visibility">,
  builder: StylesheetBuilder,
): StyleDescriptor {
  if (["visible", "hidden"].includes(value)) {
    return value;
  } else {
    builder.addWarning("value", value);
    return;
  }
}

export function parseDimension(
  { unit, value }: Extract<Token, { type: "dimension" }>,
  builder: StylesheetBuilder,
): StyleDescriptor {
  switch (unit) {
    case "px":
      if (value === Infinity) {
        return 9999;
      } else {
        return value;
      }
    case "%":
      return `${value}%`;
    case "rnh":
    case "rnw":
      return [{}, unit, [value / 100], 1];
    default: {
      builder.addWarning("value", `${value}${unit}`);
      return;
    }
  }
}

export function parseUserSelect(
  { value }: DeclarationType<"user-select">,
  builder: StylesheetBuilder,
) {
  const allowed = ["auto", "text", "none", "contain", "all"];
  if (allowed.includes(value)) {
    return value;
  } else {
    builder.addWarning("value", value);
    return;
  }
}

export function parseSVGPaint(
  { value, property }: DeclarationType<"fill" | "stroke">,
  builder: StylesheetBuilder,
) {
  let parsedValue: StyleDescriptor | undefined;

  if (value.type === "none") {
    parsedValue = "transparent";
  } else if (value.type === "color") {
    parsedValue = parseColor(value.value, builder);
  } else {
    return;
  }

  builder.addDescriptor(property, parsedValue);
}

export function round(number: number) {
  return Math.round((number + Number.EPSILON) * 10000) / 10000;
}

export function parseDimensionPercentageFor_LengthValue(
  value: DimensionPercentageFor_LengthValue,
  builder: StylesheetBuilder,
) {
  if (value.type === "calc") {
    return undefined;
  } else if (value.type === "percentage") {
    return `${value.value}%`;
  } else {
    return parseLength(value.value, builder);
  }
}

const allowAutoProperties = new Set(["pointer-events"]);

export function parseEnv(
  value: EnvironmentVariable,
  builder: StylesheetBuilder,
): StyleFunction | undefined {
  switch (value.name.type) {
    case "ua":
      switch (value.name.value) {
        case "safe-area-inset-top":
        case "safe-area-inset-right":
        case "safe-area-inset-bottom":
        case "safe-area-inset-left": {
          const fallback = parseUnparsed(
            value.fallback,
            builder,
            value.name.value,
          );

          return fallback
            ? [{}, "var", [`react-native-css-${value.name.value}`, fallback], 1]
            : [{}, "var", [`react-native-css-${value.name.value}`], 1];
        }
        case "viewport-segment-width":
        case "viewport-segment-height":
        case "viewport-segment-top":
        case "viewport-segment-left":
        case "viewport-segment-bottom":
        case "viewport-segment-right":
      }
      break;
    case "custom":
    case "unknown":
  }

  return;
}

export function parseCalcFn(
  name: string,
  tokens: TokenOrValue[],
  builder: StylesheetBuilder,
  property: string,
): StyleDescriptor {
  const args = parseCalcArguments(tokens, builder, property);
  if (args) {
    return [{}, name, args];
  }

  return;
}

export function parseColorMix(
  tokens: TokenOrValue[],
  builder: StylesheetBuilder,
  property: string,
): StyleDescriptor {
  const [inToken, whitespace, colorSpace, comma, ...rest] = tokens;
  if (
    typeof inToken !== "object" ||
    inToken.type !== "token" ||
    inToken.value.type !== "ident" ||
    inToken.value.value !== "in"
  ) {
    return;
  }

  if (
    typeof whitespace !== "object" ||
    whitespace.type !== "token" ||
    whitespace.value.type !== "white-space"
  ) {
    return;
  }

  if (
    typeof comma !== "object" ||
    comma.type !== "token" ||
    comma.value.type !== "comma"
  ) {
    return;
  }

  const colorSpaceArg = parseUnparsed(colorSpace, builder, property);
  if (typeof colorSpaceArg !== "string") {
    return;
  }

  let nextToken = rest.shift();

  const leftColorArg = parseUnparsed(nextToken, builder, property);

  if (!leftColorArg) {
    return;
  }

  nextToken = rest.shift();

  let leftColorPercentage: StyleDescriptor | undefined;
  if (nextToken?.type !== "token" || nextToken.value.type !== "comma") {
    leftColorPercentage = parseUnparsed(nextToken, builder, property);
    nextToken = rest.shift();
  }

  if (
    typeof nextToken !== "object" ||
    nextToken.type !== "token" ||
    nextToken.value.type !== "comma"
  ) {
    return;
  }

  nextToken = rest.shift();

  const rightColorArg = parseUnparsed(nextToken, builder, property);

  if (rightColorArg === "transparent") {
    // Ignore the rest, treat as single color with alpha
    return [{}, "colorMix", [colorSpaceArg, leftColorArg, leftColorPercentage]];
  }

  nextToken = rest.shift();
  let rightColorPercentage: StyleDescriptor | undefined;
  if (nextToken?.type !== "token" || nextToken.value.type !== "comma") {
    rightColorPercentage = parseUnparsed(nextToken, builder, property);
    nextToken = rest.shift();
  }

  // We should have expired all tokens now
  if (nextToken) {
    return;
  }

  return [
    {},
    "colorMix",
    [
      colorSpaceArg,
      leftColorArg,
      leftColorPercentage,
      rightColorArg,
      rightColorPercentage,
    ],
  ];
}

export function parseCalcArguments(
  [...args]: TokenOrValue[],
  builder: StylesheetBuilder,
  property: string,
) {
  const parsed: StyleDescriptor[] = [];

  for (const arg of args) {
    switch (arg.type) {
      case "env": {
        parsed.push(parseEnv(arg.value, builder));
        break;
      }
      case "var":
      case "function":
      case "unresolved-color": {
        const value = parseUnparsed(arg, builder, property);

        if (value === undefined) {
          return undefined;
        }

        parsed.push(value);
        break;
      }
      case "length": {
        const value = parseLength(arg.value, builder);
        if (value !== undefined) {
          parsed.push(value);
        }
        break;
      }
      case "color":
      case "url":
      case "angle":
      case "time":
      case "resolution":
      case "dashed-ident":
        break;
      case "token":
        switch (arg.value.type) {
          case "delim":
            switch (arg.value.value) {
              case "+":
              case "-":
              case "*":
              case "/":
                parsed.push(arg.value.value);
                break;
            }
            break;
          case "percentage":
            parsed.push(`${round(arg.value.value * 100)}%`);
            break;
          case "number": {
            parsed.push(round(arg.value.value));
            break;
          }
          case "parenthesis-block": {
            parsed.push("(");
            break;
          }
          case "close-parenthesis":
            parsed.push(")");
            break;
          case "string":
          case "function":
          case "ident":
          case "at-keyword":
          case "hash":
          case "id-hash":
          case "unquoted-url":
          case "dimension":
          case "white-space":
          case "comment":
          case "colon":
          case "semicolon":
          case "comma":
          case "include-match":
          case "dash-match":
          case "prefix-match":
          case "suffix-match":
          case "substring-match":
          case "cdo":
          case "cdc":
          case "square-bracket-block":
          case "curly-bracket-block":
          case "bad-url":
          case "bad-string":
          case "close-square-bracket":
          case "close-curly-bracket":
        }
    }
  }

  return parsed;
}

export function parseTranslateProp(
  value: Translate,
  prop: keyof Extract<Translate, object>,
  builder: StylesheetBuilder,
): StyleDescriptor {
  if (value === "none") {
    return 0;
  }

  return parseLength(value[prop], builder);
}

export function parseUnresolvedColor(
  color: UnresolvedColor,
  builder: StylesheetBuilder,
  property: string,
  allowAuto: boolean,
): StyleDescriptor {
  switch (color.type) {
    case "rgb":
      return [
        {},
        "rgba",
        [
          round(color.r * 255),
          round(color.g * 255),
          round(color.b * 255),
          parseUnparsed(color.alpha, builder, property),
        ],
      ];
    case "hsl":
      return [
        {},
        color.type,
        [
          color.h,
          color.s,
          color.l,
          parseUnparsed(color.alpha, builder, property),
        ],
      ];
    case "light-dark": {
      const extraRule = builder.extendRule({
        m: [["=", "prefers-color-scheme", "dark"]],
      });
      builder.addUnnamedDescriptor(
        reduceParseUnparsed(color.dark, builder, property, allowAuto),
        false,
        extraRule,
      );
      builder.addExtraRule(extraRule);
      return reduceParseUnparsed(color.light, builder, property, allowAuto);
    }
    default:
      color satisfies never;
  }

  return;
}

export function allEqual(...params: unknown[]) {
  return params.every((param, index, array) => {
    return index === 0 ? true : equal(array[0], param);
  });
}
export function equal(a: unknown, b: unknown) {
  if (a === b) return true;
  if (typeof a !== typeof b) return false;
  if (a === null || b === null) return false;
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      if (!equal(a[i], b[i])) return false;
    }
    return true;
  }
  if (typeof a === "object" && typeof b === "object") {
    if (Object.keys(a).length !== Object.keys(b).length) return false;
    for (const key in a) {
      if (
        !equal(
          (a as Record<string, unknown>)[key],
          (b as Record<string, unknown>)[key],
        )
      )
        return false;
    }
    return true;
  }

  return false;
}

export function parseTime(time: Time) {
  return round(time.type === "milliseconds" ? time.value : time.value * 1000);
}

export function parseSize2DDimensionPercentageDeclaration(
  declaration: { value: Size2DFor_DimensionPercentageFor_LengthValue },
  builder: StylesheetBuilder,
) {
  return parseSize2DDimensionPercentage(declaration.value, builder);
}

export function parseSize2DDimensionPercentage(
  value: Size2DFor_DimensionPercentageFor_LengthValue,
  builder: StylesheetBuilder,
) {
  return parseLength(value[0], builder);
}

export function addTransitionValue(
  declaration: Extract<
    Declaration,
    { property: `transition${string}` | "transition" }
  >,
  builder: StylesheetBuilder,
) {
  switch (declaration.property) {
    case "transition": {
      const grouped: Record<string, unknown[]> = {};

      for (const animation of declaration.value) {
        for (const [key, value] of Object.entries(animation)) {
          grouped[key] ??= [];
          grouped[key].push(value);
        }
      }

      for (const [property, value] of Object.entries(grouped)) {
        addTransitionValue(
          {
            property: `transition-${kebabCase(property)}`,
            value,
          } as Extract<
            Declaration,
            { property: `transition${string}` | "transition" }
          >,
          builder,
        );
      }
      break;
    }
    case "transition-property": {
      builder.addDescriptor(
        declaration.property,
        declaration.value
          .map((v) => v.property)
          .filter(
            (v) =>
              (v in parsers && !["visibility"].includes(v)) ||
              v === "all" ||
              v === "none",
          )
          .map((v) => toRNProperty(v)),
      );
      return;
    }
    case "transition-duration":
      builder.addDescriptor(
        declaration.property,
        declaration.value.map((t) => parseTime(t)),
      );
      return;
    case "transition-delay":
      builder.addDescriptor(
        declaration.property,
        declaration.value.map((t) => parseTime(t)),
      );
      return;
    case "transition-timing-function":
      builder.addDescriptor(
        declaration.property,
        parseEasingFunction(declaration.value),
      );
      return;
  }
}

export function addAnimationValue(
  declaration: Extract<
    Declaration,
    { property: `animation${string}` | "animation" }
  >,
  builder: StylesheetBuilder,
) {
  switch (declaration.property) {
    case "animation": {
      const grouped: Record<string, unknown[]> = {};

      for (const animation of declaration.value) {
        for (const [key, value] of Object.entries(animation)) {
          grouped[key] ??= [];
          grouped[key].push(value);
        }
      }

      for (const [property, value] of Object.entries(grouped)) {
        addAnimationValue(
          {
            property: `animation-${kebabCase(property)}`,
            value,
          } as Extract<
            Declaration,
            { property: `animation${string}` | "animation" }
          >,
          builder,
        );
      }
      break;
    }
    case "animation-delay": {
      builder.addDescriptor(
        declaration.property,
        declaration.value.map((t) => parseTime(t)),
      );
      break;
    }
    case "animation-direction": {
      builder.addDescriptor(declaration.property, declaration.value);
      break;
    }
    case "animation-duration": {
      builder.addDescriptor(
        declaration.property,
        declaration.value.map((t) => parseTime(t)),
      );
      break;
    }
    case "animation-fill-mode": {
      builder.addDescriptor(declaration.property, declaration.value);
      break;
    }
    case "animation-iteration-count": {
      builder.addDescriptor(
        declaration.property,
        parseIterationCount(declaration.value),
      );
      break;
    }
    case "animation-name": {
      builder.addDescriptor(
        declaration.property,
        declaration.value.map((v) =>
          v.type === "none"
            ? "none"
            : ([{}, "animationName", [v.value], 1] as StyleDescriptor),
        ),
      );
      break;
    }
    case "animation-play-state": {
      builder.addDescriptor(declaration.property, declaration.value);
      break;
    }
    case "animation-timing-function": {
      builder.addDescriptor(
        declaration.property,
        parseEasingFunction(declaration.value),
      );
      break;
    }
  }
}

export function kebabCase(str: string) {
  return str.replace(
    /[A-Z]+(?![a-z])|[A-Z]/g,
    ($, ofs) => (ofs ? "-" : "") + $.toLowerCase(),
  );
}

function parseBackgroundImage(
  declaration: DeclarationType<"background-image">,
  builder: StylesheetBuilder,
) {
  builder.addDescriptor(
    "experimental_backgroundImage",
    declaration.value.flatMap((image): StyleDescriptor[] => {
      switch (image.type) {
        case "gradient": {
          const gradient = parseGradient(image.value, builder);
          return gradient ? [gradient] : [];
        }
        case "none":
          return ["none"];
      }

      return [];
    }),
  );
  return;
}

function parseGradient(
  gradient: Gradient,
  builder: StylesheetBuilder,
): StyleDescriptor {
  switch (gradient.type) {
    case "linear": {
      return [
        {},
        "linear-gradient",
        [
          parseLineDirection(gradient.direction, builder),
          ...gradient.items.map((item) => parseGradientItem(item, builder)),
        ],
      ];
    }
  }

  return;
}

function parseLineDirection(
  lineDirection: LineDirection,
  builder: StylesheetBuilder,
): StyleDescriptor {
  switch (lineDirection.type) {
    case "corner":
      return `to ${lineDirection.horizontal} ${lineDirection.vertical}`;
    case "horizontal":
    case "vertical":
      return `to ${lineDirection.value}`;
    case "angle":
      return parseAngle(lineDirection.value, builder);
    default: {
      lineDirection satisfies never;
    }
  }

  return;
}

function parseGradientItem(
  item: GradientItemFor_DimensionPercentageFor_LengthValue,
  builder: StylesheetBuilder,
): StyleDescriptor {
  switch (item.type) {
    case "color-stop": {
      const args: StyleDescriptor[] = [parseColor(item.color, builder)];
      if (item.position) {
        args.push(parseLength(item.position, builder));
      }

      return [{}, "@colorStop", args, 1];
    }
    case "hint":
      return parseLength(item.value, builder);
  }
}

function parseObjectFit(
  declaration: CustomProperty,
  builder: StylesheetBuilder,
) {
  builder.addMapping({
    "object-fit": ["contentFit"],
  });
  builder.addDescriptor(
    "object-fit",
    parseUnparsed(declaration.value, builder, "object-fit"),
  );
}

function parseObjectPosition(
  declaration: CustomProperty,
  builder: StylesheetBuilder,
) {
  builder.addMapping({
    "object-position": ["contentPosition"],
  });
  builder.addDescriptor("object-position", [
    {},
    "join",
    [parseUnparsed(declaration.value, builder, "object-position"), " "],
  ]);
}

function parseCornerShape(
  declaration: CustomProperty,
  builder: StylesheetBuilder,
) {
  const shape = parseUnparsed(declaration.value, builder, "corner-shape");

  if (shape === "round") {
    builder.addDescriptor("borderCurve", "circular");
  } else if (shape === "squircle") {
    builder.addDescriptor("borderCurve", "continuous");
  }
}

function parseVisibility(
  declaration: DeclarationType<"visibility">,
  builder: StylesheetBuilder,
) {
  if (declaration.value === "visible") {
    builder.addDescriptor("opacity", 1);
  } else if (declaration.value === "hidden") {
    builder.addDescriptor("opacity", 0);
  } else {
    builder.addWarning("value", declaration.value);
  }
}

function parseOutlineStyle(
  declaration: DeclarationType<"outline-style">,
  builder: StylesheetBuilder,
) {
  const allowed = ["solid", "dotted", "dashed"];

  if (
    declaration.value.type !== "auto" &&
    allowed.includes(declaration.value.value)
  ) {
    builder.addDescriptor("outlineStyle", declaration.value.value);
  } else {
    builder.addWarning(
      "value",
      declaration.value.type === "auto" ? "auto" : declaration.value.value,
    );
  }
}

function parseFilter(
  declaration: DeclarationType<"filter">,
  builder: StylesheetBuilder,
) {
  if (declaration.value.type === "none") {
    return "unset";
  }

  return declaration.value.value
    .map((value) => {
      switch (value.type) {
        case "opacity":
        case "blur":
        case "brightness":
        case "contrast":
        case "grayscale":
        case "invert":
        case "saturate":
        case "sepia":
          return {
            [value.type]: parseLength(value.value, builder),
          } as unknown as StyleDescriptor;
        case "hue-rotate":
          return {
            [value.type]: parseAngle(value.value, builder),
          } as unknown as StyleDescriptor;
        case "drop-shadow":
          return [
            {},
            toRNProperty(value.type),
            [
              parseLength(value.value.xOffset, builder),
              parseLength(value.value.yOffset, builder),
              parseLength(value.value.blur, builder),
              parseColor(value.value.color, builder),
            ],
          ] as unknown as StyleDescriptor;
        case "url":
          return;
      }
    })
    .filter((value) => value !== undefined);
}

const namedColors = new Set([
  "aliceblue",
  "antiquewhite",
  "aqua",
  "aquamarine",
  "azure",
  "beige",
  "bisque",
  "black",
  "blanchedalmond",
  "blue",
  "blueviolet",
  "brown",
  "burlywood",
  "cadetblue",
  "chartreuse",
  "chocolate",
  "coral",
  "cornflowerblue",
  "cornsilk",
  "crimson",
  "cyan",
  "darkblue",
  "darkcyan",
  "darkgoldenrod",
  "darkgray",
  "darkgreen",
  "darkgrey",
  "darkkhaki",
  "darkmagenta",
  "darkolivegreen",
  "darkorange",
  "darkorchid",
  "darkred",
  "darksalmon",
  "darkseagreen",
  "darkslateblue",
  "darkslategrey",
  "darkturquoise",
  "darkviolet",
  "deeppink",
  "deepskyblue",
  "dimgray",
  "dimgrey",
  "dodgerblue",
  "firebrick",
  "floralwhite",
  "forestgreen",
  "fuchsia",
  "gainsboro",
  "ghostwhite",
  "gold",
  "goldenrod",
  "gray",
  "green",
  "greenyellow",
  "grey",
  "honeydew",
  "hotpink",
  "indianred",
  "indigo",
  "ivory",
  "khaki",
  "lavender",
  "lavenderblush",
  "lawngreen",
  "lemonchiffon",
  "lightblue",
  "lightcoral",
  "lightcyan",
  "lightgoldenrodyellow",
  "lightgray",
  "lightgreen",
  "lightgrey",
  "lightpink",
  "lightsalmon",
  "lightseagreen",
  "lightskyblue",
  "lightslategrey",
  "lightsteelblue",
  "lightyellow",
  "lime",
  "limegreen",
  "linen",
  "magenta",
  "maroon",
  "mediumaquamarine",
  "mediumblue",
  "mediumorchid",
  "mediumpurple",
  "mediumseagreen",
  "mediumslateblue",
  "mediumspringgreen",
  "mediumturquoise",
  "mediumvioletred",
  "midnightblue",
  "mintcream",
  "mistyrose",
  "moccasin",
  "navajowhite",
  "navy",
  "oldlace",
  "olive",
  "olivedrab",
  "orange",
  "orangered",
  "orchid",
  "palegoldenrod",
  "palegreen",
  "paleturquoise",
  "palevioletred",
  "papayawhip",
  "peachpuff",
  "peru",
  "pink",
  "plum",
  "powderblue",
  "purple",
  "rebeccapurple",
  "red",
  "rosybrown",
  "royalblue",
  "saddlebrown",
  "salmon",
  "sandybrown",
  "seagreen",
  "seashell",
  "sienna",
  "silver",
  "skyblue",
  "slateblue",
  "slategray",
  "snow",
  "springgreen",
  "steelblue",
  "tan",
  "teal",
  "thistle",
  "tomato",
  "turquoise",
  "violet",
  "wheat",
  "white",
  "whitesmoke",
  "yellow",
  "yellowgreen",
]);
