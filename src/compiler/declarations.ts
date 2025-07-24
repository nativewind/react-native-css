/* eslint-disable */

import type { Declaration } from "lightningcss";

import { emVariableName } from "../runtime/native/styles/constants";
import type { StyleDescriptor } from "./compiler.types";
import type { StylesheetBuilder } from "./stylesheet";
import {
  addAnimationValue,
  addTransitionValue,
  parseAlignContent,
  parseAlignItems,
  parseAlignSelf,
  parseAngle,
  parseAspectRatio,
  parseBorderSideWidth,
  parseBorderStyle,
  parseBoxShadow,
  parseColor,
  parseColorOrAuto,
  parseDeclarationCustom,
  parseDeclarationUnparsed,
  parseDimensionPercentageFor_LengthValue,
  parseDisplay,
  parseFontFamily,
  parseFontSize,
  parseFontStyle,
  parseFontVariantCaps,
  parseFontWeight,
  parseGap,
  parseJustifyContent,
  parseLength,
  parseLengthOrCoercePercentageToRuntime,
  parseLengthPercentageOrAuto,
  parseLineHeight,
  parseOverflow,
  parseScale,
  parseSize,
  parseSVGPaint,
  parseTextAlign,
  parseTextDecorationLine,
  parseTextDecorationStyle,
  parseTextShadow,
  parseTime,
  parseTranslate,
  parseUserSelect,
  parseVerticalAlign,
} from "./custom";
import { isValid } from "./valid";

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
    return parseDeclarationUnparsed(declaration, builder);
  } else if (declaration.property === "custom") {
    return parseDeclarationCustom(declaration, builder);
  }

  if (!isValid(declaration)) {
    return builder.addWarning(
      "property",
      (declaration as Declaration).property,
    );
  }

  switch (declaration.property) {
    case "background-color":
      return builder.addDescriptor(
        declaration.property,
        parseColor(declaration.value, builder),
      );
    case "opacity":
      return builder.addDescriptor(declaration.property, declaration.value);
    case "color":
      return builder.addDescriptor(
        declaration.property,
        parseColor(declaration.value, builder),
      );
    case "display":
      return builder.addDescriptor(
        declaration.property,
        parseDisplay(declaration.value, builder),
      );
    case "width":
      return builder.addDescriptor(
        declaration.property,
        parseSize(declaration.value, builder),
      );
    case "height":
      return builder.addDescriptor(
        declaration.property,
        parseSize(declaration.value, builder),
      );
    case "min-width":
      return builder.addDescriptor(
        declaration.property,
        parseSize(declaration.value, builder),
      );
    case "min-height":
      return builder.addDescriptor(
        declaration.property,
        parseSize(declaration.value, builder),
      );
    case "max-width":
      return builder.addDescriptor(
        declaration.property,
        parseSize(declaration.value, builder),
      );
    case "max-height":
      return builder.addDescriptor(
        declaration.property,
        parseSize(declaration.value, builder),
      );
    case "block-size":
      return builder.addDescriptor(
        "width",
        parseSize(declaration.value, builder),
      );
    case "inline-size":
      return builder.addDescriptor(
        "height",
        parseSize(declaration.value, builder),
      );
    case "min-block-size":
      return builder.addDescriptor(
        "min-width",
        parseSize(declaration.value, builder),
      );
    case "min-inline-size":
      return builder.addDescriptor(
        "min-height",
        parseSize(declaration.value, builder),
      );
    case "max-block-size":
      return builder.addDescriptor(
        "max-width",
        parseSize(declaration.value, builder),
      );
    case "max-inline-size":
      return builder.addDescriptor(
        "max-height",
        parseSize(declaration.value, builder),
      );
    case "overflow":
      return builder.addDescriptor(
        declaration.property,
        parseOverflow(declaration.value.x, builder),
      );
    case "position":
      const value: any = (declaration as any).value.type;
      if (value === "absolute" || value === "relative") {
        return builder.addDescriptor(declaration.property, value);
      } else {
        builder.addWarning("value", value);
      }
      return;
    case "top":
      return builder.addDescriptor(
        declaration.property,
        parseSize(declaration.value, builder),
      );
    case "bottom":
      return builder.addDescriptor(
        declaration.property,
        parseSize(declaration.value, builder),
      );
    case "left":
      return builder.addDescriptor(
        declaration.property,
        parseSize(declaration.value, builder),
      );
    case "right":
      return builder.addDescriptor(
        declaration.property,
        parseSize(declaration.value, builder),
      );
    case "inset-block-start":
      return builder.addDescriptor(
        declaration.property,
        parseLengthPercentageOrAuto(declaration.value, builder),
      );
    case "inset-block-end":
      return builder.addDescriptor(
        declaration.property,
        parseLengthPercentageOrAuto(declaration.value, builder),
      );
    case "inset-inline-start":
      return builder.addDescriptor(
        declaration.property,
        parseLengthPercentageOrAuto(declaration.value, builder),
      );
    case "inset-inline-end":
      return builder.addDescriptor(
        declaration.property,
        parseLengthPercentageOrAuto(declaration.value, builder),
      );
    case "inset-block":
      return builder.addShorthand("inset-block", {
        "inset-block-start": parseLengthPercentageOrAuto(
          declaration.value.blockStart,
          builder,
        ),
        "inset-block-end": parseLengthPercentageOrAuto(
          declaration.value.blockEnd,
          builder,
        ),
      });
    case "inset-inline":
      return builder.addShorthand("inset-inline", {
        "inset-block-start": parseLengthPercentageOrAuto(
          declaration.value.inlineStart,
          builder,
        ),
        "inset-block-end": parseLengthPercentageOrAuto(
          declaration.value.inlineEnd,
          builder,
        ),
      });
    case "inset":
      builder.addShorthand("inset", {
        top: parseLengthPercentageOrAuto(declaration.value.top, builder),
        bottom: parseLengthPercentageOrAuto(declaration.value.bottom, builder),
        left: parseLengthPercentageOrAuto(declaration.value.left, builder),
        right: parseLengthPercentageOrAuto(declaration.value.right, builder),
      });
      return;
    case "border-top-color":
      return builder.addDescriptor(
        declaration.property,
        parseColor(declaration.value, builder),
      );
    case "border-top-color":
      return builder.addDescriptor(
        declaration.property,
        parseColor(declaration.value, builder),
      );
    case "border-bottom-color":
      return builder.addDescriptor(
        declaration.property,
        parseColor(declaration.value, builder),
      );
    case "border-left-color":
      return builder.addDescriptor(
        declaration.property,
        parseColor(declaration.value, builder),
      );
    case "border-right-color":
      return builder.addDescriptor(
        declaration.property,
        parseColor(declaration.value, builder),
      );
    case "border-block-start-color":
      return builder.addDescriptor(
        "border-top-color",
        parseColor(declaration.value, builder),
      );
    case "border-block-end-color":
      return builder.addDescriptor(
        "border-bottom-color",
        parseColor(declaration.value, builder),
      );
    case "border-inline-start-color":
      return builder.addDescriptor(
        "border-left-color",
        parseColor(declaration.value, builder),
      );
    case "border-inline-end-color":
      return builder.addDescriptor(
        "border-right-color",
        parseColor(declaration.value, builder),
      );
    case "border-top-width":
      return builder.addDescriptor(
        declaration.property,
        parseBorderSideWidth(declaration.value, builder),
      );
    case "border-bottom-width":
      return builder.addDescriptor(
        declaration.property,
        parseBorderSideWidth(declaration.value, builder),
      );
    case "border-left-width":
      return builder.addDescriptor(
        declaration.property,
        parseBorderSideWidth(declaration.value, builder),
      );
    case "border-right-width":
      return builder.addDescriptor(
        declaration.property,
        parseBorderSideWidth(declaration.value, builder),
      );
    case "border-block-start-width":
      return builder.addDescriptor(
        "border-top-width",
        parseBorderSideWidth(declaration.value, builder),
      );
    case "border-block-end-width":
      return builder.addDescriptor(
        "border-bottom-width",
        parseBorderSideWidth(declaration.value, builder),
      );
    case "border-inline-start-width":
      return builder.addDescriptor(
        "border-left-width",
        parseBorderSideWidth(declaration.value, builder),
      );
    case "border-inline-end-width":
      return builder.addDescriptor(
        "border-right-width",
        parseBorderSideWidth(declaration.value, builder),
      );
    case "border-top-left-radius":
      return builder.addDescriptor(
        declaration.property,
        parseLength(declaration.value[0], builder),
      );
    case "border-top-right-radius":
      return builder.addDescriptor(
        declaration.property,
        parseLength(declaration.value[0], builder),
      );
    case "border-bottom-left-radius":
      return builder.addDescriptor(
        declaration.property,
        parseLength(declaration.value[0], builder),
      );
    case "border-bottom-right-radius":
      return builder.addDescriptor(
        declaration.property,
        parseLength(declaration.value[0], builder),
      );
    case "border-start-start-radius":
      return builder.addDescriptor(
        declaration.property,
        parseLength(declaration.value[0], builder),
      );
    case "border-start-end-radius":
      return builder.addDescriptor(
        declaration.property,
        parseLength(declaration.value[0], builder),
      );
    case "border-end-start-radius":
      return builder.addDescriptor(
        declaration.property,
        parseLength(declaration.value[0], builder),
      );
    case "border-end-end-radius":
      return builder.addDescriptor(
        declaration.property,
        parseLength(declaration.value[0], builder),
      );
    case "border-radius":
      builder.addShorthand("border-radius", {
        "border-bottom-left-radius": parseLength(
          declaration.value.bottomLeft[0],
          builder,
        ),
        "border-bottom-right-radius": parseLength(
          declaration.value.bottomRight[0],
          builder,
        ),
        "border-top-left-radius": parseLength(
          declaration.value.topLeft[0],
          builder,
        ),
        "border-top-right-radius": parseLength(
          declaration.value.topRight[0],
          builder,
        ),
      });
      return;
    case "border-color":
      builder.addShorthand("border-color", {
        "border-top-color": parseColor(declaration.value.top, builder),
        "border-bottom-color": parseColor(declaration.value.bottom, builder),
        "border-left-color": parseColor(declaration.value.left, builder),
        "border-right-color": parseColor(declaration.value.right, builder),
      });
      return;
    case "border-style":
      return builder.addDescriptor(
        declaration.property,
        parseBorderStyle(declaration.value, builder),
      );
    case "border-width":
      builder.addShorthand("border-width", {
        "border-top-width": parseBorderSideWidth(
          declaration.value.top,
          builder,
        ),
        "border-bottom-width": parseBorderSideWidth(
          declaration.value.bottom,
          builder,
        ),
        "border-left-width": parseBorderSideWidth(
          declaration.value.left,
          builder,
        ),
        "border-right-width": parseBorderSideWidth(
          declaration.value.right,
          builder,
        ),
      });
      return;
    case "border-block-color":
      builder.addDescriptor(
        "border-top-color",
        parseColor(declaration.value.start, builder),
      );
      builder.addDescriptor(
        "border-bottom-color",
        parseColor(declaration.value.end, builder),
      );
      return;
    case "border-block-width":
      builder.addDescriptor(
        "border-top-width",
        parseBorderSideWidth(declaration.value.start, builder),
      );
      builder.addDescriptor(
        "border-bottom-width",
        parseBorderSideWidth(declaration.value.end, builder),
      );
      return;
    case "border-inline-color":
      builder.addDescriptor(
        "border-left-color",
        parseColor(declaration.value.start, builder),
      );
      builder.addDescriptor(
        "border-right-color",
        parseColor(declaration.value.end, builder),
      );
      return;
    case "border-inline-width":
      builder.addDescriptor(
        "border-left-width",
        parseBorderSideWidth(declaration.value.start, builder),
      );
      builder.addDescriptor(
        "border-right-width",
        parseBorderSideWidth(declaration.value.end, builder),
      );
      return;
    case "border":
      builder.addShorthand("border", {
        "border-width": parseBorderSideWidth(declaration.value.width, builder),
        "border-style": parseBorderStyle(declaration.value.style, builder),
        "border-color": parseColor(declaration.value.color, builder),
      });
      return;
    case "border-top":
      builder.addDescriptor(
        declaration.property + "-color",
        parseColor(declaration.value.color, builder),
      );
      builder.addDescriptor(
        declaration.property + "-width",
        parseBorderSideWidth(declaration.value.width, builder),
      );
      return;
    case "border-bottom":
      builder.addDescriptor(
        declaration.property + "-color",
        parseColor(declaration.value.color, builder),
      );
      builder.addDescriptor(
        declaration.property + "-width",
        parseBorderSideWidth(declaration.value.width, builder),
      );
      return;
    case "border-left":
      builder.addDescriptor(
        declaration.property + "-color",
        parseColor(declaration.value.color, builder),
      );
      builder.addDescriptor(
        declaration.property + "-width",
        parseBorderSideWidth(declaration.value.width, builder),
      );
      return;
    case "border-right":
      builder.addDescriptor(
        declaration.property + "-color",
        parseColor(declaration.value.color, builder),
      );
      builder.addDescriptor(
        declaration.property + "-width",
        parseBorderSideWidth(declaration.value.width, builder),
      );
      return;
    case "border-block":
      builder.addDescriptor(
        "border-top-color",
        parseColor(declaration.value.color, builder),
      );
      builder.addDescriptor(
        "border-bottom-color",
        parseColor(declaration.value.color, builder),
      );
      builder.addDescriptor(
        "border-top-width",
        parseBorderSideWidth(declaration.value.width, builder),
      );
      builder.addDescriptor(
        "border-bottom-width",
        parseBorderSideWidth(declaration.value.width, builder),
      );
      return;
    case "border-block-start":
      builder.addDescriptor(
        "border-top-color",
        parseColor(declaration.value.color, builder),
      );
      builder.addDescriptor(
        "border-top-width",
        parseBorderSideWidth(declaration.value.width, builder),
      );
      return;
    case "border-block-end":
      builder.addDescriptor(
        "border-bottom-color",
        parseColor(declaration.value.color, builder),
      );
      builder.addDescriptor(
        "border-bottom-width",
        parseBorderSideWidth(declaration.value.width, builder),
      );
      return;
    case "border-inline":
      builder.addDescriptor(
        "border-left-color",
        parseColor(declaration.value.color, builder),
      );
      builder.addDescriptor(
        "border-right-color",
        parseColor(declaration.value.color, builder),
      );
      builder.addDescriptor(
        "border-left-width",
        parseBorderSideWidth(declaration.value.width, builder),
      );
      builder.addDescriptor(
        "border-right-width",
        parseBorderSideWidth(declaration.value.width, builder),
      );
      return;
    case "border-inline-start":
      builder.addDescriptor(
        "border-left-color",
        parseColor(declaration.value.color, builder),
      );
      builder.addDescriptor(
        "border-left-width",
        parseBorderSideWidth(declaration.value.width, builder),
      );
      return;
    case "border-inline-end":
      builder.addDescriptor(
        "border-right-color",
        parseColor(declaration.value.color, builder),
      );
      builder.addDescriptor(
        "border-right-width",
        parseBorderSideWidth(declaration.value.width, builder),
      );
      return;
    case "flex-direction":
      return builder.addDescriptor(declaration.property, declaration.value);
    case "flex-wrap":
      return builder.addDescriptor(declaration.property, declaration.value);
    case "flex-flow":
      builder.addDescriptor("flexWrap", declaration.value.wrap);
      builder.addDescriptor("flexDirection", declaration.value.direction);
      break;
    case "flex-grow":
      return builder.addDescriptor(declaration.property, declaration.value);
    case "flex-shrink":
      return builder.addDescriptor(declaration.property, declaration.value);
    case "flex-basis":
      return builder.addDescriptor(
        declaration.property,
        parseLengthPercentageOrAuto(declaration.value, builder),
      );
    case "flex":
      builder.addDescriptor("flex-grow", declaration.value.grow);
      builder.addDescriptor("flex-shrink", declaration.value.shrink);
      builder.addDescriptor(
        "flex-basis",
        parseLengthPercentageOrAuto(declaration.value.basis, builder),
      );
      break;
    case "align-content":
      return builder.addDescriptor(
        declaration.property,
        parseAlignContent(declaration.value, builder),
      );
    case "justify-content":
      return builder.addDescriptor(
        declaration.property,
        parseJustifyContent(declaration.value, builder),
      );
    case "align-self":
      return builder.addDescriptor(
        declaration.property,
        parseAlignSelf(declaration.value, builder),
      );
    case "align-items":
      return builder.addDescriptor(
        declaration.property,
        parseAlignItems(declaration.value, builder),
      );
    case "row-gap":
      return builder.addDescriptor(
        "row-gap",
        parseGap(declaration.value, builder),
      );
    case "column-gap":
      return builder.addDescriptor(
        "column-gap",
        parseGap(declaration.value, builder),
      );
    case "gap":
      builder.addDescriptor(
        "row-gap",
        parseGap(declaration.value.row, builder),
      );
      builder.addDescriptor(
        "column-gap",
        parseGap(declaration.value.column, builder),
      );
      return;
    case "margin":
      builder.addShorthand("margin", {
        "margin-top": parseSize(declaration.value.top, builder, {
          allowAuto: true,
        }),
        "margin-bottom": parseSize(declaration.value.bottom, builder, {
          allowAuto: true,
        }),
        "margin-left": parseSize(declaration.value.left, builder, {
          allowAuto: true,
        }),
        "margin-right": parseSize(declaration.value.right, builder, {
          allowAuto: true,
        }),
      });
      return;
    case "margin-top":
      return builder.addDescriptor(
        declaration.property,
        parseSize(declaration.value, builder, {
          allowAuto: true,
        }),
      );
    case "margin-bottom":
      return builder.addDescriptor(
        declaration.property,
        parseSize(declaration.value, builder, {
          allowAuto: true,
        }),
      );
    case "margin-left":
      return builder.addDescriptor(
        declaration.property,
        parseSize(declaration.value, builder, {
          allowAuto: true,
        }),
      );
    case "margin-right":
      return builder.addDescriptor(
        declaration.property,
        parseSize(declaration.value, builder, {
          allowAuto: true,
        }),
      );
    case "margin-block-start":
      return builder.addDescriptor(
        "margin-start",
        parseLengthPercentageOrAuto(declaration.value, builder, {
          allowAuto: true,
        }),
      );
    case "margin-block-end":
      return builder.addDescriptor(
        "margin-end",
        parseLengthPercentageOrAuto(declaration.value, builder, {
          allowAuto: true,
        }),
      );
    case "margin-inline-start":
      return builder.addDescriptor(
        "margin-start",
        parseLengthPercentageOrAuto(declaration.value, builder, {
          allowAuto: true,
        }),
      );
    case "margin-inline-end":
      return builder.addDescriptor(
        "margin-end",
        parseLengthPercentageOrAuto(declaration.value, builder, {
          allowAuto: true,
        }),
      );
    case "margin-block":
      builder.addShorthand("margin-block", {
        "margin-start": parseLengthPercentageOrAuto(
          declaration.value.blockStart,
          builder,
        ),
        "margin-end": parseLengthPercentageOrAuto(
          declaration.value.blockEnd,
          builder,
        ),
      });
      return;
    case "margin-inline":
      builder.addShorthand("margin-inline", {
        "margin-start": parseLengthPercentageOrAuto(
          declaration.value.inlineStart,
          builder,
        ),
        "margin-end": parseLengthPercentageOrAuto(
          declaration.value.inlineEnd,
          builder,
        ),
      });
      return;
    case "padding":
      builder.addShorthand("padding", {
        "padding-top": parseSize(declaration.value.top, builder),
        "padding-left": parseSize(declaration.value.left, builder),
        "padding-right": parseSize(declaration.value.right, builder),
        "padding-bottom": parseSize(declaration.value.bottom, builder),
      });
      break;
    case "padding-top":
      return builder.addDescriptor(
        declaration.property,
        parseSize(declaration.value, builder),
      );
    case "padding-bottom":
      return builder.addDescriptor(
        declaration.property,
        parseSize(declaration.value, builder),
      );
    case "padding-left":
      return builder.addDescriptor(
        declaration.property,
        parseSize(declaration.value, builder),
      );
    case "padding-right":
      return builder.addDescriptor(
        declaration.property,
        parseSize(declaration.value, builder),
      );
    case "padding-block-start":
      return builder.addDescriptor(
        "padding-start",
        parseLengthPercentageOrAuto(declaration.value, builder),
      );
    case "padding-block-end":
      return builder.addDescriptor(
        "padding-end",
        parseLengthPercentageOrAuto(declaration.value, builder),
      );
    case "padding-inline-start":
      return builder.addDescriptor(
        "padding-start",
        parseLengthPercentageOrAuto(declaration.value, builder),
      );
    case "padding-inline-end":
      return builder.addDescriptor(
        "padding-end",
        parseLengthPercentageOrAuto(declaration.value, builder),
      );
    case "padding-block":
      builder.addShorthand("padding-block", {
        "padding-start": parseLengthPercentageOrAuto(
          declaration.value.blockStart,
          builder,
        ),
        "padding-end": parseLengthPercentageOrAuto(
          declaration.value.blockEnd,
          builder,
        ),
      });
      return;
    case "padding-inline":
      builder.addShorthand("padding-inline", {
        "padding-start": parseLengthPercentageOrAuto(
          declaration.value.inlineStart,
          builder,
        ),
        "padding-end": parseLengthPercentageOrAuto(
          declaration.value.inlineEnd,
          builder,
        ),
      });
      return;
    case "font-weight":
      return builder.addDescriptor(
        declaration.property,
        parseFontWeight(declaration.value, builder),
      );
    case "font-size": {
      builder.addDescriptor(
        declaration.property,
        parseFontSize(declaration.value, builder),
      );

      builder.addDescriptor(
        `--${emVariableName}`,
        parseFontSize(declaration.value, builder),
      );
      return;
    }
    case "font-family":
      return builder.addDescriptor(
        declaration.property,
        parseFontFamily(declaration.value),
      );
    case "font-style":
      return builder.addDescriptor(
        declaration.property,
        parseFontStyle(declaration.value, builder),
      );
    case "font-variant-caps":
      return builder.addDescriptor(
        declaration.property,
        parseFontVariantCaps(declaration.value, builder),
      );
    case "line-height":
      return builder.addDescriptor(
        declaration.property,
        parseLineHeight(declaration.value, builder),
      );
    case "font":
      builder.addDescriptor(
        declaration.property + "-family",
        parseFontFamily(declaration.value.family),
      );
      builder.addDescriptor(
        "line-height",
        parseLineHeight(declaration.value.lineHeight, builder),
      );
      builder.addDescriptor(
        declaration.property + "-size",
        parseFontSize(declaration.value.size, builder),
      );
      builder.addDescriptor(
        declaration.property + "-style",
        parseFontStyle(declaration.value.style, builder),
      );
      builder.addDescriptor(
        declaration.property + "-variant",
        parseFontVariantCaps(declaration.value.variantCaps, builder),
      );
      builder.addDescriptor(
        declaration.property + "-weight",
        parseFontWeight(declaration.value.weight, builder),
      );
      return;
    case "vertical-align":
      return builder.addDescriptor(
        declaration.property,
        parseVerticalAlign(declaration.value, builder),
      );
    case "transition":
    case "transition-delay":
    case "transition-duration":
    case "transition-property":
    case "transition-timing-function":
      return addTransitionValue(declaration, builder);
    case "animation-duration":
      return builder.addDescriptor(
        "animationDuration",
        declaration.value.map((t) => parseTime(t)),
      );
    case "animation-timing-function":
    case "animation-iteration-count":
    case "animation-name":
    case "animation-delay":
    case "animation-direction":
    case "animation-play-state":
    case "animation-fill-mode":
    case "animation":
      return addAnimationValue(declaration, builder);
    case "transform": {
      builder.addDescriptor("transform", [
        {},
        "@transform",
        declaration.value.flatMap((t): StyleDescriptor[] => {
          switch (t.type) {
            case "perspective":
              return [[{}, "@perspective", [parseLength(t.value, builder)]]];
            case "translate":
              return [
                [
                  {},
                  "@translateX",
                  [parseLengthOrCoercePercentageToRuntime(t.value[0], builder)],
                ],
                [
                  [
                    {},
                    "@translateY",
                    [
                      parseLengthOrCoercePercentageToRuntime(
                        t.value[1],
                        builder,
                      ),
                    ],
                  ],
                ],
              ];
            case "translateX":
              return [
                [
                  {},
                  "@translateX",
                  [parseLengthOrCoercePercentageToRuntime(t.value, builder)],
                ],
              ];
            case "translateY":
              return [
                [
                  {},
                  "@translateY",
                  [parseLengthOrCoercePercentageToRuntime(t.value, builder)],
                ],
              ];
            case "rotate":
              return [[{}, "@rotate", [parseAngle(t.value, builder)]]];
            case "rotateX":
              return [[{}, "@rotateX", [parseAngle(t.value, builder)]]];
            case "rotateY":
              return [[{}, "@rotateY", [parseAngle(t.value, builder)]]];
            case "rotateZ":
              return [[{}, "@rotateZ", [parseAngle(t.value, builder)]]];
            case "scale":
              return [
                [{}, "@scaleX", [parseLength(t.value[0], builder)]],
                [{}, "@scaleY", [parseLength(t.value[0], builder)]],
              ];
            case "scaleX":
              return [[{}, "scaleX", [parseLength(t.value, builder)]]];
            case "scaleY":
              return [[{}, "scaleY", [parseLength(t.value, builder)]]];
            case "skew":
              return [
                [{}, "skewX", [parseAngle(t.value[0], builder)]],
                [{}, "skewY", [parseAngle(t.value[0], builder)]],
              ];
            case "skewX":
              return [[{}, "skewX", [parseAngle(t.value, builder)]]];
            case "skewY":
              return [[{}, "skewY", [parseAngle(t.value, builder)]]];
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
    case "translate":
      builder.addDescriptor("translateX", [
        {},
        "translateX",
        [parseTranslate(declaration.value, "x", builder)],
      ]);
      builder.addDescriptor("translateY", [
        {},
        "translateX",
        [parseTranslate(declaration.value, "y", builder)],
      ]);
      return;
    case "rotate":
      builder.addDescriptor("rotateX", [
        {},
        "rotateX",
        [parseAngle(declaration.value.x, builder)],
      ]);
      builder.addDescriptor("rotateY", [
        {},
        "rotateY",
        [parseAngle(declaration.value.y, builder)],
      ]);
      builder.addDescriptor("rotateZ", [
        {},
        "rotateZ",
        [parseAngle(declaration.value.z, builder)],
      ]);
      return;
    case "scale":
      builder.addDescriptor("scaleX", [
        {},
        "scaleX",
        [parseScale(declaration.value, "x", builder)],
      ]);
      builder.addDescriptor("scaleY", [
        {},
        "scaleY",
        [parseScale(declaration.value, "y", builder)],
      ]);
      return;
    case "text-transform":
      return builder.addDescriptor(
        declaration.property,
        declaration.value.case,
      );
    case "letter-spacing":
      if (declaration.value.type !== "normal") {
        return builder.addDescriptor(
          declaration.property,
          parseLength(declaration.value.value, builder),
        );
      }
      return;
    case "text-decoration-line":
      return builder.addDescriptor(
        declaration.property,
        parseTextDecorationLine(declaration.value, builder),
      );
    case "text-decoration-color":
      return builder.addDescriptor(
        declaration.property,
        parseColor(declaration.value, builder),
      );
    case "text-decoration":
      builder.addDescriptor(
        "text-decoration-color",
        parseColor(declaration.value.color, builder),
      );
      builder.addDescriptor(
        "text-decoration-line",
        parseTextDecorationLine(declaration.value.line, builder),
      );
      return;
    case "text-shadow":
      return parseTextShadow(declaration.value, builder);
    case "z-index":
      if (declaration.value.type === "integer") {
        builder.addDescriptor(
          declaration.property,
          parseLength(declaration.value.value, builder),
        );
      } else {
        builder.addWarning("value", declaration.value.type);
      }
      return;
    case "container-type":
      return;
    case "container-name":
      return builder.addContainer(
        declaration.value.type === "none" ? false : declaration.value.value,
      );
    case "container":
      return builder.addContainer(
        declaration.value.name.type === "none"
          ? false
          : declaration.value.name.value,
      );
    case "text-decoration-style":
      return builder.addDescriptor(
        declaration.property,
        parseTextDecorationStyle(declaration.value, builder),
      );
    case "text-align":
      return builder.addDescriptor(
        declaration.property,
        parseTextAlign(declaration.value, builder),
      );
    case "box-shadow": {
      return parseBoxShadow(declaration.value, builder);
    }
    case "aspect-ratio": {
      return builder.addDescriptor(
        declaration.property,
        parseAspectRatio(declaration.value),
      );
    }
    case "user-select": {
      return builder.addDescriptor(
        declaration.property,
        parseUserSelect(declaration.value, builder),
      );
    }
    case "fill": {
      return builder.addDescriptor(
        declaration.property,
        parseSVGPaint(declaration.value, builder),
      );
    }
    case "stroke": {
      return builder.addDescriptor(
        declaration.property,
        parseSVGPaint(declaration.value, builder),
      );
    }
    case "stroke-width": {
      return builder.addDescriptor(
        declaration.property,
        parseDimensionPercentageFor_LengthValue(declaration.value, builder),
      );
    }
    case "caret-color": {
      return builder.addDescriptor(
        declaration.property,
        parseColorOrAuto(declaration.value, builder),
      );
    }
    default: {
      /**
       * This is used to know when lightningcss has added a new property and we need to add it to the
       * switch.
       *
       * If your build fails here, its because you have a newer version of lightningcss installed.
       */
      declaration satisfies never;
    }
  }
}
