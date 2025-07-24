// cSpell:ignore rcap,vmin,svmin,lvmin,dvmin,cqmin,vmax,svmax,lvmax,dvmax,cqmax,currentcolor,oklab,oklch,prophoto

import Color from "colorjs.io";
import { isStyleDescriptorArray } from "../runtime/utils";
import type { StyleDescriptor, StyleFunction } from "./compiler.types";
import { toRNProperty } from "./selectors";
import type { StylesheetBuilder } from "./stylesheet";

import type {
  AlignContent,
  AlignItems,
  AlignSelf,
  Angle,
  AspectRatio,
  BorderSideWidth,
  BorderStyle,
  BoxShadow,
  ColorOrAuto,
  CssColor,
  Declaration,
  DimensionPercentageFor_LengthValue,
  Display,
  EnvironmentVariable,
  FontFamily,
  FontSize,
  FontStyle,
  FontVariantCaps,
  FontWeight,
  GapValue,
  JustifyContent,
  Length,
  LengthPercentageOrAuto,
  LengthValue,
  LineHeight,
  LineStyle,
  MaxSize,
  NumberOrPercentage,
  OverflowKeyword,
  Scale,
  Size,
  SVGPaint,
  TextAlign,
  TextDecorationLine,
  TextDecorationStyle,
  TextShadow,
  Time,
  Token,
  TokenOrValue,
  Translate,
  UnresolvedColor,
  UserSelect,
  VerticalAlign,
} from "lightningcss";
import { parseEasingFunction, parseIterationCount } from "./keyframes";
import { isValid, validProperties } from "./valid";

const propertyRename: Record<string, string> = {
  "margin-inline-start": "margin-start",
  "margin-inline-end": "margin-end",
  "padding-inline-start": "padding-start",
  "padding-inline-end": "padding-end",
};

export function parseDeclarationUnparsed(
  declaration: Extract<Declaration, { property: "unparsed" }>,
  builder: StylesheetBuilder,
) {
  let property = declaration.value.propertyId.property;

  if (!isValid(declaration.value.propertyId)) {
    builder.addWarning("property", property);
    return;
  }

  /**
   * React Native doesn't support all the logical properties
   */
  const rename = propertyRename[declaration.value.propertyId.property];
  if (rename) {
    property = rename;
  }

  /**
   * Unparsed shorthand properties need to be parsed at runtime
   */
  if (runtimeShorthands.has(property)) {
    let args = parseUnparsed(declaration.value.value, builder);
    if (!isStyleDescriptorArray(args)) {
      args = [args];
    }

    if (property === "animation") {
      builder.addDescriptor("animation", [
        {},
        `@${toRNProperty(property)}`,
        args,
      ]);
    } else {
      builder.addDescriptor(property, [
        {},
        `@${toRNProperty(property)}`,
        args,
        1,
      ]);
    }
  } else {
    builder.addDescriptor(
      property,
      parseUnparsed(declaration.value.value, builder),
    );
  }
}

export function parseDeclarationCustom(
  declaration: Extract<Declaration, { property: "custom" }>,
  builder: StylesheetBuilder,
) {
  const property = declaration.value.name;
  if (
    validProperties.has(property) ||
    property.startsWith("--") ||
    property.startsWith("-rn-")
  ) {
    builder.addDescriptor(
      property,
      parseUnparsed(declaration.value.value, builder, allowAuto.has(property)),
    );
  } else {
    builder.addWarning("property", declaration.value.name);
  }
}

export function reduceParseUnparsed(
  tokenOrValues: TokenOrValue[],
  builder: StylesheetBuilder,
): StyleDescriptor[] | undefined {
  const result = tokenOrValues
    .map((tokenOrValue) => parseUnparsed(tokenOrValue, builder))
    .filter((v) => v !== undefined);

  if (result.length === 0) {
    return undefined;
  } else {
    return result;
  }
}

export function unparsedFunction(
  token: Extract<TokenOrValue, { type: "function" }>,
  builder: StylesheetBuilder,
): StyleFunction {
  const args = reduceParseUnparsed(token.value.arguments, builder);
  return [{}, token.value.name, args];
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
  allowAuto = false,
): StyleDescriptor {
  if (tokenOrValue === undefined || tokenOrValue === null) {
    return;
  }

  if (typeof tokenOrValue === "string") {
    if (tokenOrValue === "true") {
      return true;
    } else if (tokenOrValue === "false") {
      return false;
    } else {
      return tokenOrValue;
    }
  }

  if (typeof tokenOrValue === "number") {
    return round(tokenOrValue);
  }

  if (Array.isArray(tokenOrValue)) {
    const args = reduceParseUnparsed(tokenOrValue, builder);
    if (!args) return;
    if (args.length === 1) return args[0];
    return args;
  }

  switch (tokenOrValue.type) {
    case "unresolved-color": {
      return parseUnresolvedColor(tokenOrValue.value, builder);
    }
    case "var": {
      const args: StyleDescriptor[] = [tokenOrValue.value.name.ident.slice(2)];
      const fallback = parseUnparsed(tokenOrValue.value.fallback, builder);
      if (fallback !== undefined) {
        args.push(fallback);
      }

      return [{}, "var", args, 1];
    }
    case "function": {
      switch (tokenOrValue.value.name) {
        case "translate":
        case "rotate":
        case "rotateX":
        case "rotateY":
        case "skewX":
        case "skewY":
        case "scale":
        case "scaleX":
        case "scaleY":
        case "translateX":
        case "translateY":
          tokenOrValue.value.name = `@${tokenOrValue.value.name}`;
          return unparsedFunction(tokenOrValue, builder);
        case "platformColor":
        case "pixelSizeForLayoutSize":
        case "roundToNearestPixel":
        case "pixelScale":
        case "fontScale":
        case "shadow":
        case "rgb":
        case "rgba":
        case "hsl":
        case "hsla":
          return unparsedFunction(tokenOrValue, builder);
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
          );
        default: {
          builder.addWarning("function", tokenOrValue.value.name);
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
        case "number":
        case "ident": {
          const value = tokenOrValue.value.value;
          if (typeof value === "string") {
            if (!allowAuto && value === "auto") {
              builder.addWarning("value", value);
              return;
            }

            if (value === "inherit") {
              builder.addWarning("value", value);
              return;
            }

            if (value === "true") {
              return true;
            } else if (value === "false") {
              return false;
            } else {
              return value;
            }
          } else {
            return value;
          }
        }
        case "function":
          builder.addWarning("value", tokenOrValue.value.value);
          return;
        case "percentage":
          return `${round(tokenOrValue.value.value * 100)}%`;
        case "dimension":
          return parseDimension(tokenOrValue.value, builder);
        case "at-keyword":
        case "hash":
        case "id-hash":
        case "unquoted-url":
        case "delim":
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
    return length;
  }

  if ("unit" in length) {
    switch (length.unit) {
      case "px":
        return length.value;
      case "rem":
        if (typeof inlineRem === "number") {
          return length.value * inlineRem;
        } else {
          return [{}, "rem", [length.value]];
        }
      case "vw":
      case "vh":
      case "em":
        return [{}, length.unit, [length.value], 1];
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
      builder.addWarning("value", angle.value);
      return undefined;
  }
}

export function parseSize(
  size: Size | MaxSize,
  builder: StylesheetBuilder,
  { allowAuto = false } = {},
) {
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

export function parseColorOrAuto(
  color: ColorOrAuto,
  builder: StylesheetBuilder,
) {
  if (color.type === "auto") {
    builder.addWarning("value", `Invalid color value ${color.type}`);
    return;
  } else {
    return parseColor(color.value, builder);
  }
}

export function parseColor(cssColor: CssColor, builder: StylesheetBuilder) {
  if (typeof cssColor === "string") {
    if (namedColors.has(cssColor)) {
      return cssColor;
    }
    return;
  }

  let color: Color | undefined;

  const { hexColors = true, colorPrecision = 3 } = builder.getOptions();

  switch (cssColor.type) {
    case "currentcolor":
      builder.addWarning("value", cssColor.type);
      return;
    case "light-dark":
      // TODO: Handle light-dark colors
      return;
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

  if (hexColors || colorPrecision) {
    return color?.toString({ precision: colorPrecision });
  } else {
    return color?.toString({ format: "hex" });
  }
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
  justifyContent: JustifyContent,
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

  switch (justifyContent.type) {
    case "normal":
    case "left":
    case "right":
      value = justifyContent.type;
      break;
    case "content-distribution":
    case "content-position":
      value = justifyContent.value;
      break;
    default: {
      justifyContent satisfies never;
    }
  }

  if (value && !allowed.has(value)) {
    builder.addWarning("value", value);
    return;
  }

  return value;
}

export function parseAlignContent(
  alignContent: AlignContent,
  builder: StylesheetBuilder,
) {
  const allowed = new Set([
    "flex-start",
    "flex-end",
    "center",
    "stretch",
    "space-between",
    "space-around",
  ]);

  let value: string | undefined;

  switch (alignContent.type) {
    case "normal":
    case "baseline-position":
      value = alignContent.type;
      break;
    case "content-distribution":
    case "content-position":
      value = alignContent.value;
      break;
    default: {
      alignContent satisfies never;
    }
  }

  if (value && !allowed.has(value)) {
    builder.addWarning("value", value);
    return;
  }

  return value;
}

export function parseAlignItems(
  alignItems: AlignItems,
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

  switch (alignItems.type) {
    case "normal":
      value = "auto";
      break;
    case "stretch":
      value = alignItems.type;
      break;
    case "baseline-position":
      value = "baseline";
      break;
    case "self-position":
      value = alignItems.value;
      break;
    default: {
      alignItems satisfies never;
    }
  }

  if (value && !allowed.has(value)) {
    builder.addWarning("value", value);
    return;
  }

  return value;
}

export function parseAlignSelf(
  alignSelf: AlignSelf,
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

  switch (alignSelf.type) {
    case "normal":
    case "auto":
      value = "auto";
      break;
    case "stretch":
      value = alignSelf.type;
      break;
    case "baseline-position":
      value = "baseline";
      break;
    case "self-position":
      value = alignSelf.value;
      break;
    default: {
      alignSelf satisfies never;
    }
  }

  if (value && !allowed.has(value)) {
    builder.addWarning("value", value);
    return;
  }

  return value;
}

export function parseFontWeight(
  fontWeight: FontWeight,
  builder: StylesheetBuilder,
) {
  switch (fontWeight.type) {
    case "absolute":
      if (fontWeight.value.type === "weight") {
        return fontWeight.value.value.toString();
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
  [textShadow]: TextShadow[],
  builder: StylesheetBuilder,
) {
  if (!textShadow) {
    return;
  }
  builder.addDescriptor(
    "textShadowColor",
    parseColor(textShadow.color, builder),
  );
  builder.addDescriptor(
    "textShadowOffset.width",
    parseLength(textShadow.xOffset, builder),
  );
  builder.addDescriptor(
    "textShadowOffset.height",
    parseLength(textShadow.yOffset, builder),
  );
  builder.addDescriptor(
    "textShadowRadius",
    parseLength(textShadow.blur, builder),
  );
}

export function parseTextDecorationStyle(
  textDecorationStyle: TextDecorationStyle,
  builder: StylesheetBuilder,
) {
  const allowed = new Set(["solid", "double", "dotted", "dashed"]);

  if (allowed.has(textDecorationStyle)) {
    return textDecorationStyle;
  }

  builder.addWarning("value", textDecorationStyle);
  return;
}

export function parseTextDecorationLine(
  textDecorationLine: TextDecorationLine,
  builder: StylesheetBuilder,
) {
  if (!Array.isArray(textDecorationLine)) {
    if (textDecorationLine === "none") {
      return textDecorationLine;
    }
    builder.addWarning("value", textDecorationLine);
    return;
  }

  const set = new Set(textDecorationLine);

  if (set.has("underline")) {
    if (set.has("line-through")) {
      return "underline line-through";
    } else {
      return "underline";
    }
  } else if (set.has("line-through")) {
    return "line-through";
  }

  builder.addWarning("value", textDecorationLine.join(" "));
  return undefined;
}

export function parseOverflow(
  overflow: OverflowKeyword,
  builder: StylesheetBuilder,
) {
  const allowed = new Set(["visible", "hidden"]);

  if (allowed.has(overflow)) {
    return overflow;
  }

  builder.addWarning("value", overflow);
  return undefined;
}

export function parseBorderStyle(
  borderStyle: BorderStyle | LineStyle,
  builder: StylesheetBuilder,
) {
  const allowed = new Set(["solid", "dotted", "dashed"]);

  if (typeof borderStyle === "string") {
    if (allowed.has(borderStyle)) {
      return borderStyle;
    } else {
      builder.addWarning("value", borderStyle);
      return undefined;
    }
  } else if (
    borderStyle.top === borderStyle.bottom &&
    borderStyle.top === borderStyle.left &&
    borderStyle.top === borderStyle.right &&
    allowed.has(borderStyle.top)
  ) {
    return borderStyle.top;
  }

  builder.addWarning("value", borderStyle.top);

  return undefined;
}

export function parseBorderSideWidth(
  borderSideWidth: BorderSideWidth,
  builder: StylesheetBuilder,
) {
  if (borderSideWidth.type === "length") {
    return parseLength(borderSideWidth.value, builder);
  }

  builder.addWarning("value", borderSideWidth.type);
  return undefined;
}

export function parseVerticalAlign(
  verticalAlign: VerticalAlign,
  builder: StylesheetBuilder,
) {
  if (verticalAlign.type === "length") {
    return undefined;
  }

  const allowed = new Set(["auto", "top", "bottom", "middle"]);

  if (allowed.has(verticalAlign.value)) {
    return verticalAlign.value;
  }

  builder.addWarning("value", verticalAlign.value);
  return undefined;
}

export function parseFontFamily(fontFamily: FontFamily[]) {
  // React Native only allows one font family - better hope this is the right one :)
  return fontFamily[0];
}

export function parseLineHeight(
  lineHeight: LineHeight,
  builder: StylesheetBuilder,
): StyleDescriptor {
  switch (lineHeight.type) {
    case "normal":
      return undefined;
    case "number":
      return [{}, "em", [lineHeight.value], 1];
    case "length": {
      const length = lineHeight.value;

      switch (length.type) {
        case "dimension":
          return parseLength(length, builder);
        case "percentage":
        case "calc":
          builder.addWarning(
            "value",
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
      lineHeight satisfies never;
    }
  }

  return;
}

export function parseFontSize(fontSize: FontSize, builder: StylesheetBuilder) {
  switch (fontSize.type) {
    case "length":
      return parseLength(fontSize.value, builder);
    case "absolute":
    case "relative":
      builder.addWarning("value", fontSize.value);
      return undefined;
    default: {
      fontSize satisfies never;
    }
  }

  return;
}

export function parseFontStyle(
  fontStyle: FontStyle,
  builder: StylesheetBuilder,
) {
  switch (fontStyle.type) {
    case "normal":
    case "italic":
      return fontStyle.type;
    case "oblique":
      builder.addWarning("value", fontStyle.type);
      return undefined;
    default: {
      fontStyle satisfies never;
    }
  }

  return;
}

export function parseFontVariantCaps(
  fontVariantCaps: FontVariantCaps,
  builder: StylesheetBuilder,
) {
  const allowed = new Set([
    "small-caps",
    "oldstyle-nums",
    "lining-nums",
    "tabular-nums",
    "proportional-nums",
  ]);
  if (allowed.has(fontVariantCaps)) {
    return fontVariantCaps;
  }

  builder.addWarning("value", fontVariantCaps);
  return undefined;
}

export function parseLengthOrCoercePercentageToRuntime(
  value: Length | DimensionPercentageFor_LengthValue | NumberOrPercentage,
  builder: StylesheetBuilder,
): StyleDescriptor {
  return parseLength(value, builder);
}

export function parseGap(value: GapValue, builder: StylesheetBuilder) {
  if (value.type === "normal") {
    builder.addWarning("value", value.type);
    return;
  }

  return parseLength(value.value, builder);
}

export function parseTextAlign(
  textAlign: TextAlign,
  builder: StylesheetBuilder,
) {
  const allowed = new Set(["auto", "left", "right", "center", "justify"]);
  if (allowed.has(textAlign)) {
    return textAlign;
  }

  builder.addWarning("value", textAlign);
  return undefined;
}

export function parseBoxShadow(
  boxShadows: BoxShadow[],
  builder: StylesheetBuilder,
) {
  if (boxShadows.length > 1) {
    builder.addWarning("value", "multiple box shadows");
    return;
  }

  const boxShadow = boxShadows[0];

  if (!boxShadow) {
    return;
  }

  builder.addDescriptor("shadowColor", parseColor(boxShadow.color, builder));
  builder.addDescriptor("shadowRadius", parseLength(boxShadow.spread, builder));
  // builder.addDescriptor("style",
  //   ["shadowOffsetWidth"],
  //   parseLength(boxShadow.xOffset, options, ["", ""),
  // );
  // builder.addDescriptor("style",
  //   ["shadowOffset", "height"],
  //   parseLength(boxShadow.yOffset, builder),
  // );
}

export function parseDisplay(display: Display, builder: StylesheetBuilder) {
  if (display.type === "keyword") {
    if (display.value === "none") {
      return display.value;
    } else {
      builder.addWarning("value", display.value);
      return;
    }
  } else {
    if (display.outside === "block") {
      switch (display.inside.type) {
        case "flow":
          if (display.isListItem) {
            builder.addWarning("value", "list-item");
          } else {
            builder.addWarning("value", "block");
          }
          return;
        case "flex":
          return display.inside.type;
        case "flow-root":
        case "table":
        case "box":
        case "grid":
        case "ruby":
          builder.addWarning("value", display.inside.type);
          return;
      }
    } else {
      switch (display.inside.type) {
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
          builder.addWarning("value", display.inside.type);
          return;
      }
    }
  }
}

export function parseAspectRatio(aspectRatio: AspectRatio): StyleDescriptor {
  if (!aspectRatio.ratio) {
    return;
  } else if (aspectRatio.auto) {
    return "auto";
  } else {
    const [width, height] = aspectRatio.ratio;
    if (width === height) {
      return 1;
    } else {
      return `${width}/${height}`;
    }
  }
}

export function parseDimension(
  { unit, value }: Extract<Token, { type: "dimension" }>,
  builder: StylesheetBuilder,
): StyleDescriptor {
  switch (unit) {
    case "px":
      return value;
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

export function parseUserSelect(value: UserSelect, builder: StylesheetBuilder) {
  const allowed = ["auto", "text", "none", "contain", "all"];
  if (allowed.includes(value)) {
    return value;
  } else {
    builder.addWarning("value", value);
    return;
  }
}

export function parseSVGPaint(value: SVGPaint, builder: StylesheetBuilder) {
  if (value.type === "none") {
    return "transparent";
  } else if (value.type === "color") {
    return parseColor(value.value, builder);
  }

  return;
}

export function round(number: number) {
  return Math.round((number + Number.EPSILON) * 100) / 100;
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

const allowAuto = new Set(["pointer-events"]);

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
        case "safe-area-inset-left":
          return [
            {},
            "var",
            [
              `--react-native-css-${value.name.value}`,
              parseUnparsed(value.fallback, builder),
            ],
            1,
          ];
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
): StyleDescriptor {
  const args = parseCalcArguments(tokens, builder);
  if (args) {
    return [{}, name, args];
  }

  return;
}

export function parseCalcArguments(
  [...args]: TokenOrValue[],
  builder: StylesheetBuilder,
) {
  const parsed: StyleDescriptor[] = [];

  let mode: "number" | "percentage" | undefined;

  for (const [currentIndex, arg] of args.entries()) {
    switch (arg.type) {
      case "env": {
        parsed.push(parseEnv(arg.value, builder));
        break;
      }
      case "var":
      case "function":
      case "unresolved-color": {
        const value = parseUnparsed(arg, builder);

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
            mode ??= "percentage";
            if (mode !== "percentage") return;
            parsed.push(`${arg.value.value * 100}%`);
            break;
          case "number": {
            mode ??= "number";
            if (mode !== "number") return;
            parsed.push(arg.value.value);
            break;
          }
          case "parenthesis-block": {
            /**
             * If we have a parenthesis block, we just treat it as a nested calc function
             * Because there could be multiple parenthesis blocks, this is recursive
             */
            let closeParenthesisIndex = -1;
            for (let index = args.length - 1; index > 0; index--) {
              // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
              const value = args[index]!;
              if (
                value.type === "token" &&
                value.value.type === "close-parenthesis"
              ) {
                closeParenthesisIndex = index;
                break;
              }
            }

            if (closeParenthesisIndex === -1) {
              return;
            }

            const innerCalcArgs = args
              // Extract the inner calcArgs including the parenthesis. This mutates args
              .splice(currentIndex, closeParenthesisIndex - currentIndex + 1)
              // Then drop the surrounding parenthesis
              .slice(1, -1);

            parsed.push(parseCalcFn("calc", innerCalcArgs, builder));

            break;
          }
          case "close-parenthesis":
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

export function parseTranslate(
  translate: Translate,
  prop: keyof Extract<Translate, object>,
  builder: StylesheetBuilder,
): StyleDescriptor {
  if (translate === "none") {
    return 0;
  }

  return parseLength(translate[prop], builder);
}

export function parseScale(
  translate: Scale,
  prop: keyof Extract<Scale, object>,
  builder: StylesheetBuilder,
): StyleDescriptor {
  if (translate === "none") {
    return 0;
  }

  return parseLength(translate[prop], builder);
}

export function parseUnresolvedColor(
  color: UnresolvedColor,
  builder: StylesheetBuilder,
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
          parseUnparsed(color.alpha, builder),
        ],
      ];
    case "hsl":
      return [
        {},
        color.type,
        [color.h, color.s, color.l, parseUnparsed(color.alpha, builder)],
      ];
    case "light-dark":
      return undefined;
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
  return time.type === "milliseconds" ? time.value : time.value * 1000;
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
        declaration.value.map((v) => v.property),
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

const runtimeShorthands = new Set([
  "animation",
  "text-shadow",
  "transform",
  "border",
]);

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
