/* eslint-disable */
// cSpell:ignore rcap,vmin,svmin,lvmin,dvmin,cqmin,vmax,svmax,lvmax,dvmax,cqmax,currentcolor,oklab,oklch,prophoto

import type {
  AlignContent,
  AlignItems,
  AlignSelf,
  Angle,
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
  PropertyId,
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

import Color from "colorjs.io";

import { emVariableName } from "../runtime/native/styles/constants";
import { isStyleDescriptorArray } from "../runtime/utils/style-value";
import type { AddFn } from "./add";
import type {
  FeatureFlagRecord,
  StyleDescriptor,
  StyleFunction,
} from "./compiler.types";
import { parseEasingFunction, parseIterationCount } from "./keyframes";
import { toRNProperty } from "./selectors";

const propertyRename: Record<string, string> = {
  "margin-inline-start": "margin-start",
  "margin-inline-end": "margin-end",
  "padding-inline-start": "padding-start",
  "padding-inline-end": "padding-end",
};

const validProperties = [
  "align-content",
  "align-items",
  "align-self",
  "animation",
  "animation-delay",
  "animation-direction",
  "animation-duration",
  "animation-fill-mode",
  "animation-iteration-count",
  "animation-name",
  "animation-play-state",
  "animation-timing-function",
  "aspect-ratio",
  "background-color",
  "block-size",
  "border",
  "border-block",
  "border-block-color",
  "border-block-end",
  "border-block-end-color",
  "border-block-end-width",
  "border-block-start",
  "border-block-start-color",
  "border-block-start-width",
  "border-block-width",
  "border-bottom",
  "border-bottom-color",
  "border-bottom-left-radius",
  "border-bottom-right-radius",
  "border-bottom-width",
  "border-color",
  "border-end-end-radius",
  "border-end-start-radius",
  "border-inline",
  "border-inline-color",
  "border-inline-end",
  "border-inline-end-color",
  "border-inline-end-width",
  "border-inline-start",
  "border-inline-start-color",
  "border-inline-start-width",
  "border-inline-width",
  "border-left",
  "border-left-color",
  "border-left-width",
  "border-radius",
  "border-right",
  "border-right-color",
  "border-right-width",
  "border-start-end-radius",
  "border-start-start-radius",
  "border-style",
  "border-top",
  "border-top-color",
  "border-top-left-radius",
  "border-top-right-radius",
  "border-top-width",
  "border-width",
  "bottom",
  "box-shadow",
  "caret-color",
  "color",
  "column-gap",
  "container",
  "container-name",
  "container-type",
  "display",
  "fill",
  "flex",
  "flex-basis",
  "flex-direction",
  "flex-flow",
  "flex-grow",
  "flex-shrink",
  "flex-wrap",
  "font",
  "font-family",
  "font-size",
  "font-style",
  "font-variant-caps",
  "font-weight",
  "gap",
  "height",
  "inline-size",
  "inset",
  "inset-block",
  "inset-block-end",
  "inset-block-start",
  "inset-inline",
  "inset-inline-end",
  "inset-inline-start",
  "justify-content",
  "left",
  "letter-spacing",
  "line-height",
  "margin",
  "margin-block",
  "margin-block-end",
  "margin-block-start",
  "margin-bottom",
  "margin-inline",
  "margin-inline-end",
  "margin-inline-start",
  "margin-left",
  "margin-right",
  "margin-top",
  "max-block-size",
  "max-height",
  "max-inline-size",
  "max-width",
  "min-block-size",
  "min-height",
  "min-inline-size",
  "min-width",
  "opacity",
  "overflow",
  "padding",
  "padding-block",
  "padding-block-end",
  "padding-block-start",
  "padding-bottom",
  "padding-inline",
  "padding-inline-end",
  "padding-inline-start",
  "padding-left",
  "padding-right",
  "padding-top",
  "pointer-events",
  "position",
  "right",
  "rotate",
  "row-gap",
  "scale",
  "stroke",
  "stroke-width",
  "text-align",
  "text-decoration",
  "text-decoration-color",
  "text-decoration-line",
  "text-decoration-style",
  "text-shadow",
  "text-transform",
  "top",
  "transform",
  "transition",
  "transition-delay",
  "transition-duration",
  "transition-property",
  "transition-timing-function",
  "translate",
  "user-select",
  "vertical-align",
  "width",
  "z-index",
] as const;

const validPropertiesLoose = new Set<string>(validProperties);

export interface ParseDeclarationOptions {
  inlineRem?: number | false;
  features?: FeatureFlagRecord;
  allowAuto?: boolean;
  hexColors?: boolean;
  colorPrecision?: number;
}

export interface ParserOptions extends ParseDeclarationOptions {
  add: AddFn;
  addWarning: AddWarningShort;
}

declare function AddWarning(type: "property", property: string): undefined;
declare function AddWarning(type: "function", name: string): undefined;
declare function AddWarning(
  type: "value",
  property: string,
  value: any,
): undefined;
export type AddWarningFn = typeof AddWarning;

declare function AddWarningShort(type: "property", value: never): undefined;
declare function AddWarningShort(type: "value", value: any): undefined;
declare function AddWarningShort(type: "function", name: any): undefined;
type AddWarningShort = typeof AddWarningShort;

export function parseDeclaration(
  declaration: Declaration,
  options: ParseDeclarationOptions,
  add: AddFn,
  addWarning: AddWarningFn,
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
    return parseDeclarationUnparsed(declaration, options, add, addWarning);
  } else if (declaration.property === "custom") {
    return parseDeclarationCustom(declaration, options, add, addWarning);
  }

  if (!isValid(declaration)) {
    return addWarning("property", declaration.property);
  }

  const parseOptions: ParserOptions = {
    ...options,
    add,
    addWarning(value: any) {
      return addWarning("value", declaration.property, value);
    },
  };

  function handleStyleShorthand(
    name: string,
    options: Record<string, StyleDescriptor>,
  ) {
    if (allEqual(...Object.values(options))) {
      return add("style", name, Object.values(options)[0]);
    } else {
      for (const [name, value] of Object.entries(options)) {
        add("style", name, value);
      }
    }
  }

  switch (declaration.property) {
    case "background-color":
      return add(
        "style",
        declaration.property,
        parseColor(declaration.value, parseOptions),
      );
    case "opacity":
      return add("style", declaration.property, declaration.value);
    case "color":
      return add(
        "style",
        declaration.property,
        parseColor(declaration.value, parseOptions),
      );
    case "display":
      return add(
        "style",
        declaration.property,
        parseDisplay(declaration.value, parseOptions),
      );
    case "width":
      return add(
        "style",
        declaration.property,
        parseSize(declaration.value, parseOptions),
      );
    case "height":
      return add(
        "style",
        declaration.property,
        parseSize(declaration.value, parseOptions),
      );
    case "min-width":
      return add(
        "style",
        declaration.property,
        parseSize(declaration.value, parseOptions),
      );
    case "min-height":
      return add(
        "style",
        declaration.property,
        parseSize(declaration.value, parseOptions),
      );
    case "max-width":
      return add(
        "style",
        declaration.property,
        parseSize(declaration.value, parseOptions),
      );
    case "max-height":
      return add(
        "style",
        declaration.property,
        parseSize(declaration.value, parseOptions),
      );
    case "block-size":
      return add("style", "width", parseSize(declaration.value, parseOptions));
    case "inline-size":
      return add("style", "height", parseSize(declaration.value, parseOptions));
    case "min-block-size":
      return add(
        "style",
        "min-width",
        parseSize(declaration.value, parseOptions),
      );
    case "min-inline-size":
      return add(
        "style",
        "min-height",
        parseSize(declaration.value, parseOptions),
      );
    case "max-block-size":
      return add(
        "style",
        "max-width",
        parseSize(declaration.value, parseOptions),
      );
    case "max-inline-size":
      return add(
        "style",
        "max-height",
        parseSize(declaration.value, parseOptions),
      );
    case "overflow":
      return add(
        "style",
        declaration.property,
        parseOverflow(declaration.value.x, parseOptions),
      );
    case "position":
      const value: any = (declaration as any).value.type;
      if (value === "absolute" || value === "relative") {
        return add("style", declaration.property, value);
      } else {
        parseOptions.addWarning("value", value);
      }
      return;
    case "top":
      return add(
        "style",
        declaration.property,
        parseSize(declaration.value, parseOptions),
      );
    case "bottom":
      return add(
        "style",
        declaration.property,
        parseSize(declaration.value, parseOptions),
      );
    case "left":
      return add(
        "style",
        declaration.property,
        parseSize(declaration.value, parseOptions),
      );
    case "right":
      return add(
        "style",
        declaration.property,
        parseSize(declaration.value, parseOptions),
      );
    case "inset-block-start":
      return add(
        "style",
        declaration.property,
        parseLengthPercentageOrAuto(declaration.value, parseOptions),
      );
    case "inset-block-end":
      return add(
        "style",
        declaration.property,
        parseLengthPercentageOrAuto(declaration.value, parseOptions),
      );
    case "inset-inline-start":
      return add(
        "style",
        declaration.property,
        parseLengthPercentageOrAuto(declaration.value, parseOptions),
      );
    case "inset-inline-end":
      return add(
        "style",
        declaration.property,
        parseLengthPercentageOrAuto(declaration.value, parseOptions),
      );
    case "inset-block":
      return handleStyleShorthand("inset-block", {
        "inset-block-start": parseLengthPercentageOrAuto(
          declaration.value.blockStart,
          parseOptions,
        ),
        "inset-block-end": parseLengthPercentageOrAuto(
          declaration.value.blockEnd,
          parseOptions,
        ),
      });
    case "inset-inline":
      return handleStyleShorthand("inset-inline", {
        "inset-block-start": parseLengthPercentageOrAuto(
          declaration.value.inlineStart,
          parseOptions,
        ),
        "inset-block-end": parseLengthPercentageOrAuto(
          declaration.value.inlineEnd,
          parseOptions,
        ),
      });
    case "inset":
      handleStyleShorthand("inset", {
        top: parseLengthPercentageOrAuto(declaration.value.top, {
          ...parseOptions,
          addWarning: buildAddWarning(addWarning, "top"),
        }),
        bottom: parseLengthPercentageOrAuto(declaration.value.bottom, {
          ...parseOptions,
          addWarning: buildAddWarning(addWarning, "bottom"),
        }),
        left: parseLengthPercentageOrAuto(declaration.value.left, {
          ...parseOptions,
          addWarning: buildAddWarning(addWarning, "left"),
        }),
        right: parseLengthPercentageOrAuto(declaration.value.right, {
          ...parseOptions,
          addWarning: buildAddWarning(addWarning, "right"),
        }),
      });
      return;
    case "border-top-color":
      return add(
        "style",
        declaration.property,
        parseColor(declaration.value, parseOptions),
      );
    case "border-bottom-color":
      return add(
        "style",
        declaration.property,
        parseColor(declaration.value, parseOptions),
      );
    case "border-left-color":
      return add(
        "style",
        declaration.property,
        parseColor(declaration.value, parseOptions),
      );
    case "border-right-color":
      return add(
        "style",
        declaration.property,
        parseColor(declaration.value, parseOptions),
      );
    case "border-block-start-color":
      return add(
        "style",
        "border-top-color",
        parseColor(declaration.value, parseOptions),
      );
    case "border-block-end-color":
      return add(
        "style",
        "border-bottom-color",
        parseColor(declaration.value, parseOptions),
      );
    case "border-inline-start-color":
      return add(
        "style",
        "border-left-color",
        parseColor(declaration.value, parseOptions),
      );
    case "border-inline-end-color":
      return add(
        "style",
        "border-right-color",
        parseColor(declaration.value, parseOptions),
      );
    case "border-top-width":
      return add(
        "style",
        declaration.property,
        parseBorderSideWidth(declaration.value, parseOptions),
      );
    case "border-bottom-width":
      return add(
        "style",
        declaration.property,
        parseBorderSideWidth(declaration.value, parseOptions),
      );
    case "border-left-width":
      return add(
        "style",
        declaration.property,
        parseBorderSideWidth(declaration.value, parseOptions),
      );
    case "border-right-width":
      return add(
        "style",
        declaration.property,
        parseBorderSideWidth(declaration.value, parseOptions),
      );
    case "border-block-start-width":
      return add(
        "style",
        "border-top-width",
        parseBorderSideWidth(declaration.value, parseOptions),
      );
    case "border-block-end-width":
      return add(
        "style",
        "border-bottom-width",
        parseBorderSideWidth(declaration.value, parseOptions),
      );
    case "border-inline-start-width":
      return add(
        "style",
        "border-left-width",
        parseBorderSideWidth(declaration.value, parseOptions),
      );
    case "border-inline-end-width":
      return add(
        "style",
        "border-right-width",
        parseBorderSideWidth(declaration.value, parseOptions),
      );
    case "border-top-left-radius":
      return add(
        "style",
        declaration.property,
        parseLength(declaration.value[0], parseOptions),
      );
    case "border-top-right-radius":
      return add(
        "style",
        declaration.property,
        parseLength(declaration.value[0], parseOptions),
      );
    case "border-bottom-left-radius":
      return add(
        "style",
        declaration.property,
        parseLength(declaration.value[0], parseOptions),
      );
    case "border-bottom-right-radius":
      return add(
        "style",
        declaration.property,
        parseLength(declaration.value[0], parseOptions),
      );
    case "border-start-start-radius":
      return add(
        "style",
        declaration.property,
        parseLength(declaration.value[0], parseOptions),
      );
    case "border-start-end-radius":
      return add(
        "style",
        declaration.property,
        parseLength(declaration.value[0], parseOptions),
      );
    case "border-end-start-radius":
      return add(
        "style",
        declaration.property,
        parseLength(declaration.value[0], parseOptions),
      );
    case "border-end-end-radius":
      return add(
        "style",
        declaration.property,
        parseLength(declaration.value[0], parseOptions),
      );
    case "border-radius":
      handleStyleShorthand("border-radius", {
        "border-bottom-left-radius": parseLength(
          declaration.value.bottomLeft[0],
          parseOptions,
        ),
        "border-bottom-right-radius": parseLength(
          declaration.value.bottomRight[0],
          parseOptions,
        ),
        "border-top-left-radius": parseLength(
          declaration.value.topLeft[0],
          parseOptions,
        ),
        "border-top-right-radius": parseLength(
          declaration.value.topRight[0],
          parseOptions,
        ),
      });
      return;
    case "border-color":
      handleStyleShorthand("border-color", {
        "border-top-color": parseColor(declaration.value.top, {
          ...parseOptions,
          addWarning: buildAddWarning(addWarning, "border-top-color"),
        }),
        "border-bottom-color": parseColor(declaration.value.bottom, {
          ...parseOptions,
          addWarning: buildAddWarning(addWarning, "border-bottom-color"),
        }),
        "border-left-color": parseColor(declaration.value.left, {
          ...parseOptions,
          addWarning: buildAddWarning(addWarning, "border-left-color"),
        }),
        "border-right-color": parseColor(declaration.value.right, {
          ...parseOptions,
          addWarning: buildAddWarning(addWarning, "border-right-color"),
        }),
      });
      return;
    case "border-style":
      return add(
        "style",
        declaration.property,
        parseBorderStyle(declaration.value, parseOptions),
      );
    case "border-width":
      handleStyleShorthand("border-width", {
        "border-top-width": parseBorderSideWidth(
          declaration.value.top,
          parseOptions,
        ),
        "border-bottom-width": parseBorderSideWidth(
          declaration.value.bottom,
          parseOptions,
        ),
        "border-left-width": parseBorderSideWidth(
          declaration.value.left,
          parseOptions,
        ),
        "border-right-width": parseBorderSideWidth(
          declaration.value.right,
          parseOptions,
        ),
      });
      return;
    case "border-block-color":
      add(
        "style",
        "border-top-color",
        parseColor(declaration.value.start, parseOptions),
      );
      add(
        "style",
        "border-bottom-color",
        parseColor(declaration.value.end, parseOptions),
      );
      return;
    case "border-block-width":
      add(
        "style",
        "border-top-width",
        parseBorderSideWidth(declaration.value.start, parseOptions),
      );
      add(
        "style",
        "border-bottom-width",
        parseBorderSideWidth(declaration.value.end, parseOptions),
      );
      return;
    case "border-inline-color":
      add(
        "style",
        "border-left-color",
        parseColor(declaration.value.start, parseOptions),
      );
      add(
        "style",
        "border-right-color",
        parseColor(declaration.value.end, parseOptions),
      );
      return;
    case "border-inline-width":
      add(
        "style",
        "border-left-width",
        parseBorderSideWidth(declaration.value.start, parseOptions),
      );
      add(
        "style",
        "border-right-width",
        parseBorderSideWidth(declaration.value.end, parseOptions),
      );
      return;
    case "border":
      handleStyleShorthand("border", {
        "border-width": parseBorderSideWidth(
          declaration.value.width,
          parseOptions,
        ),
        "border-style": parseBorderStyle(declaration.value.style, parseOptions),
      });
      return;
    case "border-top":
      add(
        "style",
        declaration.property + "-color",
        parseColor(declaration.value.color, parseOptions),
      );
      add(
        "style",
        declaration.property + "-width",
        parseBorderSideWidth(declaration.value.width, parseOptions),
      );
      return;
    case "border-bottom":
      add(
        "style",
        declaration.property + "-color",
        parseColor(declaration.value.color, parseOptions),
      );
      add(
        "style",
        declaration.property + "-width",
        parseBorderSideWidth(declaration.value.width, parseOptions),
      );
      return;
    case "border-left":
      add(
        "style",
        declaration.property + "-color",
        parseColor(declaration.value.color, parseOptions),
      );
      add(
        "style",
        declaration.property + "-width",
        parseBorderSideWidth(declaration.value.width, parseOptions),
      );
      return;
    case "border-right":
      add(
        "style",
        declaration.property + "-color",
        parseColor(declaration.value.color, parseOptions),
      );
      add(
        "style",
        declaration.property + "-width",
        parseBorderSideWidth(declaration.value.width, parseOptions),
      );
      return;
    case "border-block":
      add(
        "style",
        "border-top-color",
        parseColor(declaration.value.color, parseOptions),
      );
      add(
        "style",
        "border-bottom-color",
        parseColor(declaration.value.color, parseOptions),
      );
      add(
        "style",
        "border-top-width",
        parseBorderSideWidth(declaration.value.width, parseOptions),
      );
      add(
        "style",
        "border-bottom-width",
        parseBorderSideWidth(declaration.value.width, parseOptions),
      );
      return;
    case "border-block-start":
      add(
        "style",
        "border-top-color",
        parseColor(declaration.value.color, parseOptions),
      );
      add(
        "style",
        "border-top-width",
        parseBorderSideWidth(declaration.value.width, parseOptions),
      );
      return;
    case "border-block-end":
      add(
        "style",
        "border-bottom-color",
        parseColor(declaration.value.color, parseOptions),
      );
      add(
        "style",
        "border-bottom-width",
        parseBorderSideWidth(declaration.value.width, parseOptions),
      );
      return;
    case "border-inline":
      add(
        "style",
        "border-left-color",
        parseColor(declaration.value.color, parseOptions),
      );
      add(
        "style",
        "border-right-color",
        parseColor(declaration.value.color, parseOptions),
      );
      add(
        "style",
        "border-left-width",
        parseBorderSideWidth(declaration.value.width, parseOptions),
      );
      add(
        "style",
        "border-right-width",
        parseBorderSideWidth(declaration.value.width, parseOptions),
      );
      return;
    case "border-inline-start":
      add(
        "style",
        "border-left-color",
        parseColor(declaration.value.color, parseOptions),
      );
      add(
        "style",
        "border-left-width",
        parseBorderSideWidth(declaration.value.width, parseOptions),
      );
      return;
    case "border-inline-end":
      add(
        "style",
        "border-right-color",
        parseColor(declaration.value.color, parseOptions),
      );
      add(
        "style",
        "border-right-width",
        parseBorderSideWidth(declaration.value.width, parseOptions),
      );
      return;
    case "flex-direction":
      return add("style", declaration.property, declaration.value);
    case "flex-wrap":
      return add("style", declaration.property, declaration.value);
    case "flex-flow":
      add("style", "flexWrap", declaration.value.wrap);
      add("style", "flexDirection", declaration.value.direction);
      break;
    case "flex-grow":
      return add("style", declaration.property, declaration.value);
    case "flex-shrink":
      return add("style", declaration.property, declaration.value);
    case "flex-basis":
      return add(
        "style",
        declaration.property,
        parseLengthPercentageOrAuto(declaration.value, parseOptions),
      );
    case "flex":
      add("style", "flex-grow", declaration.value.grow);
      add("style", "flex-shrink", declaration.value.shrink);
      add(
        "style",
        "flex-basis",
        parseLengthPercentageOrAuto(declaration.value.basis, parseOptions),
      );
      break;
    case "align-content":
      return add(
        "style",
        declaration.property,
        parseAlignContent(declaration.value, parseOptions),
      );
    case "justify-content":
      return add(
        "style",
        declaration.property,
        parseJustifyContent(declaration.value, parseOptions),
      );
    case "align-self":
      return add(
        "style",
        declaration.property,
        parseAlignSelf(declaration.value, parseOptions),
      );
    case "align-items":
      return add(
        "style",
        declaration.property,
        parseAlignItems(declaration.value, parseOptions),
      );
    case "row-gap":
      return add("style", "row-gap", parseGap(declaration.value, parseOptions));
    case "column-gap":
      return add(
        "style",
        "column-gap",
        parseGap(declaration.value, parseOptions),
      );
    case "gap":
      add("style", "row-gap", parseGap(declaration.value.row, parseOptions));
      add(
        "style",
        "column-gap",
        parseGap(declaration.value.column, parseOptions),
      );
      return;
    case "margin":
      handleStyleShorthand("margin", {
        "margin-top": parseSize(declaration.value.top, parseOptions, {
          allowAuto: true,
        }),
        "margin-bottom": parseSize(declaration.value.bottom, parseOptions, {
          allowAuto: true,
        }),
        "margin-left": parseSize(declaration.value.left, parseOptions, {
          allowAuto: true,
        }),
        "margin-right": parseSize(declaration.value.right, parseOptions, {
          allowAuto: true,
        }),
      });
      return;
    case "margin-top":
      return add(
        "style",
        declaration.property,
        parseSize(declaration.value, parseOptions, {
          allowAuto: true,
        }),
      );
    case "margin-bottom":
      return add(
        "style",
        declaration.property,
        parseSize(declaration.value, parseOptions, {
          allowAuto: true,
        }),
      );
    case "margin-left":
      return add(
        "style",
        declaration.property,
        parseSize(declaration.value, parseOptions, {
          allowAuto: true,
        }),
      );
    case "margin-right":
      return add(
        "style",
        declaration.property,
        parseSize(declaration.value, parseOptions, {
          allowAuto: true,
        }),
      );
    case "margin-block-start":
      return add(
        "style",
        "margin-start",
        parseLengthPercentageOrAuto(declaration.value, parseOptions, {
          allowAuto: true,
        }),
      );
    case "margin-block-end":
      return add(
        "style",
        "margin-end",
        parseLengthPercentageOrAuto(declaration.value, parseOptions, {
          allowAuto: true,
        }),
      );
    case "margin-inline-start":
      return add(
        "style",
        "margin-start",
        parseLengthPercentageOrAuto(declaration.value, parseOptions, {
          allowAuto: true,
        }),
      );
    case "margin-inline-end":
      return add(
        "style",
        "margin-end",
        parseLengthPercentageOrAuto(declaration.value, parseOptions, {
          allowAuto: true,
        }),
      );
    case "margin-block":
      handleStyleShorthand("margin-block", {
        "margin-start": parseLengthPercentageOrAuto(
          declaration.value.blockStart,
          parseOptions,
        ),
        "margin-end": parseLengthPercentageOrAuto(
          declaration.value.blockEnd,
          parseOptions,
        ),
      });
      return;
    case "margin-inline":
      handleStyleShorthand("margin-inline", {
        "margin-start": parseLengthPercentageOrAuto(
          declaration.value.inlineStart,
          parseOptions,
        ),
        "margin-end": parseLengthPercentageOrAuto(
          declaration.value.inlineEnd,
          parseOptions,
        ),
      });
      return;
    case "padding":
      handleStyleShorthand("padding", {
        "padding-top": parseSize(declaration.value.top, parseOptions),
        "padding-left": parseSize(declaration.value.left, parseOptions),
        "padding-right": parseSize(declaration.value.right, parseOptions),
        "padding-bottom": parseSize(declaration.value.bottom, parseOptions),
      });
      break;
    case "padding-top":
      return add(
        "style",
        declaration.property,
        parseSize(declaration.value, parseOptions),
      );
    case "padding-bottom":
      return add(
        "style",
        declaration.property,
        parseSize(declaration.value, parseOptions),
      );
    case "padding-left":
      return add(
        "style",
        declaration.property,
        parseSize(declaration.value, parseOptions),
      );
    case "padding-right":
      return add(
        "style",
        declaration.property,
        parseSize(declaration.value, parseOptions),
      );
    case "padding-block-start":
      return add(
        "style",
        "padding-start",
        parseLengthPercentageOrAuto(declaration.value, parseOptions),
      );
    case "padding-block-end":
      return add(
        "style",
        "padding-end",
        parseLengthPercentageOrAuto(declaration.value, parseOptions),
      );
    case "padding-inline-start":
      return add(
        "style",
        "padding-start",
        parseLengthPercentageOrAuto(declaration.value, parseOptions),
      );
    case "padding-inline-end":
      return add(
        "style",
        "padding-end",
        parseLengthPercentageOrAuto(declaration.value, parseOptions),
      );
    case "padding-block":
      handleStyleShorthand("padding-block", {
        "padding-start": parseLengthPercentageOrAuto(
          declaration.value.blockStart,
          parseOptions,
        ),
        "padding-end": parseLengthPercentageOrAuto(
          declaration.value.blockEnd,
          parseOptions,
        ),
      });
      return;
    case "padding-inline":
      handleStyleShorthand("padding-inline", {
        "padding-start": parseLengthPercentageOrAuto(
          declaration.value.inlineStart,
          parseOptions,
        ),
        "padding-end": parseLengthPercentageOrAuto(
          declaration.value.inlineEnd,
          parseOptions,
        ),
      });
      return;
    case "font-weight":
      return add(
        "style",
        declaration.property,
        parseFontWeight(declaration.value, parseOptions),
      );
    case "font-size": {
      add(
        "style",
        declaration.property,
        parseFontSize(declaration.value, parseOptions),
      );

      add(
        "style",
        `--${emVariableName}`,
        parseFontSize(declaration.value, parseOptions),
      );
      return;
    }
    case "font-family":
      return add(
        "style",
        declaration.property,
        parseFontFamily(declaration.value),
      );
    case "font-style":
      return add(
        "style",
        declaration.property,
        parseFontStyle(declaration.value, parseOptions),
      );
    case "font-variant-caps":
      return add(
        "style",
        declaration.property,
        parseFontVariantCaps(declaration.value, parseOptions),
      );
    case "line-height":
      return add(
        "style",
        declaration.property,
        parseLineHeight(declaration.value, parseOptions),
      );
    case "font":
      add(
        "style",
        declaration.property + "-family",
        parseFontFamily(declaration.value.family),
      );
      add(
        "style",
        "line-height",
        parseLineHeight(declaration.value.lineHeight, parseOptions),
      );
      add(
        "style",
        declaration.property + "-size",
        parseFontSize(declaration.value.size, parseOptions),
      );
      add(
        "style",
        declaration.property + "-style",
        parseFontStyle(declaration.value.style, parseOptions),
      );
      add(
        "style",
        declaration.property + "-variant",
        parseFontVariantCaps(declaration.value.variantCaps, parseOptions),
      );
      add(
        "style",
        declaration.property + "-weight",
        parseFontWeight(declaration.value.weight, parseOptions),
      );
      return;
    case "vertical-align":
      return add(
        "style",
        declaration.property,
        parseVerticalAlign(declaration.value, parseOptions),
      );
    case "transition-property":
    case "transition-duration":
    case "transition-delay":
    case "transition-timing-function":
    case "transition":
      return addTransitionValue(declaration, parseOptions);
    case "animation-duration":
      return add(
        "animation",
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
      return addAnimationValue(declaration, parseOptions);
    case "transform": {
      add("style", "transform", [
        {},
        "@transform",
        declaration.value.flatMap((t): StyleDescriptor[] => {
          switch (t.type) {
            case "perspective":
              return [
                [{}, "@perspective", [parseLength(t.value, parseOptions)]],
              ];
            case "translate":
              return [
                [
                  {},
                  "@translateX",
                  [
                    parseLengthOrCoercePercentageToRuntime(
                      t.value[0],
                      parseOptions,
                    ),
                  ],
                ],
                [
                  [
                    {},
                    "@translateY",
                    [
                      parseLengthOrCoercePercentageToRuntime(
                        t.value[1],
                        parseOptions,
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
                  [
                    parseLengthOrCoercePercentageToRuntime(
                      t.value,
                      parseOptions,
                    ),
                  ],
                ],
              ];
            case "translateY":
              return [
                [
                  {},
                  "@translateY",
                  [
                    parseLengthOrCoercePercentageToRuntime(
                      t.value,
                      parseOptions,
                    ),
                  ],
                ],
              ];
            case "rotate":
              return [[{}, "@rotate", [parseAngle(t.value, parseOptions)]]];
            case "rotateX":
              return [[{}, "@rotateX", [parseAngle(t.value, parseOptions)]]];
            case "rotateY":
              return [[{}, "@rotateY", [parseAngle(t.value, parseOptions)]]];
            case "rotateZ":
              return [[{}, "@rotateZ", [parseAngle(t.value, parseOptions)]]];
            case "scale":
              return [
                [{}, "@scaleX", [parseLength(t.value[0], parseOptions)]],
                [{}, "@scaleY", [parseLength(t.value[0], parseOptions)]],
              ];
            case "scaleX":
              return [[{}, "scaleX", [parseLength(t.value, parseOptions)]]];
            case "scaleY":
              return [[{}, "scaleY", [parseLength(t.value, parseOptions)]]];
            case "skew":
              return [
                [{}, "skewX", [parseAngle(t.value[0], parseOptions)]],
                [{}, "skewY", [parseAngle(t.value[0], parseOptions)]],
              ];
            case "skewX":
              return [[{}, "skewX", [parseAngle(t.value, parseOptions)]]];
            case "skewY":
              return [[{}, "skewY", [parseAngle(t.value, parseOptions)]]];
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
      add("style", "translateX", [
        {},
        "translateX",
        [parseTranslate(declaration.value, "x", parseOptions)],
      ]);
      add("style", "translateY", [
        {},
        "translateX",
        [parseTranslate(declaration.value, "y", parseOptions)],
      ]);
      return;
    case "rotate":
      add("style", "rotateX", [
        {},
        "rotateX",
        [parseAngle(declaration.value.x, parseOptions)],
      ]);
      add("style", "rotateY", [
        {},
        "rotateY",
        [parseAngle(declaration.value.y, parseOptions)],
      ]);
      add("style", "rotateZ", [
        {},
        "rotateZ",
        [parseAngle(declaration.value.z, parseOptions)],
      ]);
      return;
    case "scale":
      add("style", "scaleX", [
        {},
        "scaleX",
        [parseScale(declaration.value, "x", parseOptions)],
      ]);
      add("style", "scaleY", [
        {},
        "scaleY",
        [parseScale(declaration.value, "y", parseOptions)],
      ]);
      return;
    case "text-transform":
      return add("style", declaration.property, declaration.value.case);
    case "letter-spacing":
      if (declaration.value.type !== "normal") {
        return add(
          "style",
          declaration.property,
          parseLength(declaration.value.value, parseOptions),
        );
      }
      return;
    case "text-decoration-line":
      return add(
        "style",
        declaration.property,
        parseTextDecorationLine(declaration.value, parseOptions),
      );
    case "text-decoration-color":
      return add(
        "style",
        declaration.property,
        parseColor(declaration.value, parseOptions),
      );
    case "text-decoration":
      add(
        "style",
        "text-decoration-color",
        parseColor(declaration.value.color, parseOptions),
      );
      add(
        "style",
        "text-decoration-line",
        parseTextDecorationLine(declaration.value.line, parseOptions),
      );
      return;
    case "text-shadow":
      return parseTextShadow(add, declaration.value, parseOptions);
    case "z-index":
      if (declaration.value.type === "integer") {
        add(
          "style",
          declaration.property,
          parseLength(declaration.value.value, parseOptions),
        );
      } else {
        parseOptions.addWarning("value", declaration.value.type);
      }
      return;
    case "container-type":
      return;
    case "container-name":
      return add(
        "container",
        declaration.property,
        declaration.value.type === "none" ? false : declaration.value.value,
      );
    case "container":
      return add(
        "container",
        "container-name",
        declaration.value.name.type === "none"
          ? false
          : declaration.value.name.value,
      );
    case "text-decoration-style":
      return add(
        "style",
        declaration.property,
        parseTextDecorationStyle(declaration.value, parseOptions),
      );
    case "text-align":
      return add(
        "style",
        declaration.property,
        parseTextAlign(declaration.value, parseOptions),
      );
    case "box-shadow": {
      return parseBoxShadow(declaration.value, parseOptions);
    }
    case "aspect-ratio": {
      return add(
        "style",
        declaration.property,
        parseAspectRatio(declaration.value),
      );
    }
    case "user-select": {
      return add(
        "style",
        declaration.property,
        parseUserSelect(declaration.value, parseOptions),
      );
    }
    case "fill": {
      return add(
        "style",
        declaration.property,
        parseSVGPaint(declaration.value, parseOptions),
      );
    }
    case "stroke": {
      return add(
        "style",
        declaration.property,
        parseSVGPaint(declaration.value, parseOptions),
      );
    }
    case "stroke-width": {
      return add(
        "style",
        declaration.property,
        parseDimensionPercentageFor_LengthValue(
          declaration.value,
          parseOptions,
        ),
      );
    }
    case "caret-color": {
      return add(
        "style",
        declaration.property,
        parseColorOrAuto(declaration.value, parseOptions),
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

function buildAddWarning(
  addWarning: AddWarningFn,
  property: string,
): AddWarningShort {
  return function (type, value) {
    if (type === "property") {
      return addWarning(type, property);
    } else if (type === "value") {
      return addWarning(type, property, value);
    }
  };
}

function parseDeclarationUnparsed(
  declaration: Extract<Declaration, { property: "unparsed" }>,
  options: ParseDeclarationOptions,
  add: AddFn,
  addWarning: AddWarningFn,
) {
  let property = declaration.value.propertyId.property;

  if (!isValid(declaration.value.propertyId)) {
    return addWarning("property", property);
  }

  const parseOptions: ParserOptions = {
    ...options,
    add,
    addWarning: buildAddWarning(addWarning, property),
  };

  /**
   * React Native doesn't support all the logical properties
   */
  if (propertyRename[declaration.value.propertyId.property]) {
    property = propertyRename[declaration.value.propertyId.property]!;
  }

  /**
   * Unparsed shorthand properties need to be parsed at runtime
   */
  if (runtimeShorthands.has(property)) {
    let args = parseUnparsed(declaration.value.value, parseOptions);
    if (!isStyleDescriptorArray(args)) {
      args = [args];
    }

    if (property === "animation") {
      return add("style", "animation", [
        {},
        `@${toRNProperty(property)}`,
        args,
      ]);
    } else {
      return add("style", property, [
        {},
        `@${toRNProperty(property)}`,
        args,
        1,
      ]);
    }
  }

  return add(
    "style",
    property,
    parseUnparsed(declaration.value.value, parseOptions),
  );
}

function parseDeclarationCustom(
  declaration: Extract<Declaration, { property: "custom" }>,
  options: ParseDeclarationOptions,
  add: AddFn,
  addWarning: AddWarningFn,
) {
  const parseOptions: ParserOptions = {
    ...options,
    add,
    addWarning(type, value) {
      if (type === "property") {
        return addWarning(type, property);
      } else if (type === "value") {
        return addWarning(type, property, value);
      }
    },
  };

  let property = declaration.value.name;
  if (
    validPropertiesLoose.has(property) ||
    property.startsWith("--") ||
    property.startsWith("-rn-")
  ) {
    return add(
      "style",
      property,
      parseUnparsed(declaration.value.value, {
        ...parseOptions,
        allowAuto: allowAuto.has(property),
      }),
    );
  } else {
    return addWarning("property", declaration.value.name);
  }
}

function isValid<T extends Declaration | PropertyId>(
  declaration: T,
): declaration is Extract<T, { property: (typeof validProperties)[number] }> {
  return validPropertiesLoose.has(declaration.property);
}

function reduceParseUnparsed(
  tokenOrValues: TokenOrValue[],
  options: ParserOptions,
): StyleDescriptor[] | undefined {
  const result = tokenOrValues
    .map((tokenOrValue) => parseUnparsed(tokenOrValue, options))
    .filter((v) => v !== undefined);

  if (result.length === 0) {
    return undefined;
  } else {
    return result;
  }
}

function unparsedFunction(
  token: Extract<TokenOrValue, { type: "function" }>,
  options: ParserOptions,
): StyleFunction {
  const args = reduceParseUnparsed(token.value.arguments, options);
  return [{}, token.value.name, args];
}

/**
 * When the CSS cannot be parsed (often due to a runtime condition like a CSS variable)
 * This function best efforts parsing it into a function that we can evaluate at runtime
 */
function parseUnparsed(
  tokenOrValue:
    | TokenOrValue
    | TokenOrValue[]
    | string
    | number
    | undefined
    | null,
  options: ParserOptions,
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
    const args = reduceParseUnparsed(tokenOrValue, options);
    if (!args) return;
    if (args.length === 1) return args[0];
    return args;
  }

  switch (tokenOrValue.type) {
    case "unresolved-color": {
      return parseUnresolvedColor(tokenOrValue.value, options);
    }
    case "var": {
      const args: StyleDescriptor[] = [tokenOrValue.value.name.ident.slice(2)];
      const fallback = parseUnparsed(tokenOrValue.value.fallback, options);
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
          return unparsedFunction(tokenOrValue, options);
        case "platformColor":
        case "getPixelSizeForLayoutSize":
        case "roundToNearestPixel":
        case "pixelScale":
        case "fontScale":
        case "shadow":
        case "rgb":
        case "rgba":
        case "hsl":
        case "hsla":
          return unparsedFunction(tokenOrValue, options);
        case "hairlineWidth":
          return [{}, tokenOrValue.value.name, []];
        case "platformSelect":
        case "fontScaleSelect":
        case "pixelScaleSelect":
          return parseRNRuntimeSpecificsFunction(
            tokenOrValue.value.name,
            tokenOrValue.value.arguments,
            options,
          );
        case "calc":
        case "max":
        case "min":
        case "clamp":
          return parseCalcFn(
            tokenOrValue.value.name,
            tokenOrValue.value.arguments,
            options,
          );
        default: {
          options.addWarning("function", tokenOrValue.value.name);
          return;
        }
      }
    }
    case "length":
      return parseLength(tokenOrValue.value, options);
    case "angle":
      return parseAngle(tokenOrValue.value, options);
    case "token":
      switch (tokenOrValue.value.type) {
        case "string":
        case "number":
        case "ident": {
          const value = tokenOrValue.value.value;
          if (typeof value === "string") {
            if (!options.allowAuto && value === "auto") {
              return options.addWarning("value", value);
            }

            if (value === "inherit") {
              return options.addWarning("value", value);
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
          options.addWarning("value", tokenOrValue.value.value);
          return;
        case "percentage":
          return `${round(tokenOrValue.value.value * 100)}%`;
        case "dimension":
          return parseDimension(tokenOrValue.value, options);
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
      return parseColor(tokenOrValue.value, options);
    case "env":
      return parseEnv(tokenOrValue.value, options);
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
  options: ParserOptions,
): StyleDescriptor {
  const { inlineRem = 14 } = options;

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
        options.addWarning("value", `${length.value}${length.unit}`);
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
        return parseLength(length.value, options);
      }
    }
  }

  return;
}

function parseAngle(angle: Angle | number, options: ParserOptions) {
  if (typeof angle === "number") {
    return `${angle}deg`;
  }

  switch (angle.type) {
    case "deg":
    case "rad":
      return `${angle.value}${angle.type}`;
    default:
      options.addWarning("value", angle.value);
      return undefined;
  }
}

function parseSize(
  size: Size | MaxSize,
  options: ParserOptions,
  { allowAuto = false } = {},
) {
  switch (size.type) {
    case "length-percentage":
      return parseLength(size.value, options);
    case "none":
      return size.type;
    case "auto":
      if (allowAuto) {
        return size.type;
      } else {
        options.addWarning("value", size.type);
        return undefined;
      }
    case "min-content":
    case "max-content":
    case "fit-content":
    case "fit-content-function":
    case "stretch":
    case "contain":
      options.addWarning("value", size.type);
      return undefined;
    default: {
      size satisfies never;
    }
  }

  return;
}

function parseColorOrAuto(color: ColorOrAuto, options: ParserOptions) {
  if (color.type === "auto") {
    options.addWarning("value", `Invalid color value ${color.type}`);
    return;
  } else {
    return parseColor(color.value, options);
  }
}

function parseColor(cssColor: CssColor, options: ParserOptions) {
  if (typeof cssColor === "string") {
    if (namedColors.has(cssColor)) {
      return cssColor;
    }
    return;
  }

  let color: Color | undefined;

  switch (cssColor.type) {
    case "currentcolor":
      options.addWarning("value", cssColor.type);
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

  if (options.hexColors === false || options.colorPrecision) {
    return color?.toString({ precision: options.colorPrecision ?? 3 });
  } else {
    return color?.toString({ format: "hex" });
  }
}

function parseLengthPercentageOrAuto(
  lengthPercentageOrAuto: LengthPercentageOrAuto,
  options: ParserOptions,
  { allowAuto = false } = {},
) {
  switch (lengthPercentageOrAuto.type) {
    case "auto":
      if (allowAuto) {
        return lengthPercentageOrAuto.type;
      } else {
        options.addWarning("value", lengthPercentageOrAuto.type);
        return undefined;
      }
    case "length-percentage":
      return parseLength(lengthPercentageOrAuto.value, options);
    default: {
      lengthPercentageOrAuto satisfies never;
    }
  }

  return;
}

function parseJustifyContent(
  justifyContent: JustifyContent,
  options: ParserOptions,
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
    options.addWarning("value", value);
    return;
  }

  return value;
}

function parseAlignContent(alignContent: AlignContent, options: ParserOptions) {
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
    options.addWarning("value", value);
    return;
  }

  return value;
}

function parseAlignItems(alignItems: AlignItems, options: ParserOptions) {
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
    options.addWarning("value", value);
    return;
  }

  return value;
}

function parseAlignSelf(alignSelf: AlignSelf, options: ParserOptions) {
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
    options.addWarning("value", value);
    return;
  }

  return value;
}

function parseFontWeight(fontWeight: FontWeight, options: ParserOptions) {
  switch (fontWeight.type) {
    case "absolute":
      if (fontWeight.value.type === "weight") {
        return fontWeight.value.value.toString();
      } else {
        return fontWeight.value.type;
      }
    case "bolder":
    case "lighter":
      options.addWarning("value", fontWeight.type);
      return;
    default: {
      fontWeight satisfies never;
    }
  }

  return;
}

function parseTextShadow(
  add: AddFn,
  [textShadow]: TextShadow[],
  options: ParserOptions,
) {
  if (!textShadow) {
    return;
  }
  add("style", "textShadowColor", parseColor(textShadow.color, options));
  add(
    "style",
    "textShadowOffset.width",
    parseLength(textShadow.xOffset, options),
  );
  add(
    "style",
    "textShadowOffset.height",
    parseLength(textShadow.yOffset, options),
  );
  add("style", "textShadowRadius", parseLength(textShadow.blur, options));
}

function parseTextDecorationStyle(
  textDecorationStyle: TextDecorationStyle,
  options: ParserOptions,
) {
  const allowed = new Set(["solid", "double", "dotted", "dashed"]);

  if (allowed.has(textDecorationStyle)) {
    return textDecorationStyle;
  }

  options.addWarning("value", textDecorationStyle);
  return undefined;
}

function parseTextDecorationLine(
  textDecorationLine: TextDecorationLine,
  options: ParserOptions,
) {
  if (!Array.isArray(textDecorationLine)) {
    if (textDecorationLine === "none") {
      return textDecorationLine;
    }
    options.addWarning("value", textDecorationLine);
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

  options.addWarning("value", textDecorationLine.join(" "));
  return undefined;
}

function parseOverflow(overflow: OverflowKeyword, options: ParserOptions) {
  const allowed = new Set(["visible", "hidden"]);

  if (allowed.has(overflow)) {
    return overflow;
  }

  options.addWarning("value", overflow);
  return undefined;
}

function parseBorderStyle(
  borderStyle: BorderStyle | LineStyle,
  options: ParserOptions,
) {
  const allowed = new Set(["solid", "dotted", "dashed"]);

  if (typeof borderStyle === "string") {
    if (allowed.has(borderStyle)) {
      return borderStyle;
    } else {
      options.addWarning("value", borderStyle);
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

  options.addWarning("value", borderStyle.top);

  return undefined;
}

function parseBorderSideWidth(
  borderSideWidth: BorderSideWidth,
  options: ParserOptions,
) {
  if (borderSideWidth.type === "length") {
    return parseLength(borderSideWidth.value, options);
  }

  options.addWarning("value", borderSideWidth.type);
  return undefined;
}

function parseVerticalAlign(
  verticalAlign: VerticalAlign,
  options: ParserOptions,
) {
  if (verticalAlign.type === "length") {
    return undefined;
  }

  const allowed = new Set(["auto", "top", "bottom", "middle"]);

  if (allowed.has(verticalAlign.value)) {
    return verticalAlign.value;
  }

  options.addWarning("value", verticalAlign.value);
  return undefined;
}

function parseFontFamily(fontFamily: FontFamily[]) {
  // React Native only allows one font family - better hope this is the right one :)
  return fontFamily[0];
}

function parseLineHeight(
  lineHeight: LineHeight,
  options: ParserOptions,
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
          return parseLength(length, options);
        case "percentage":
        case "calc":
          options.addWarning("value", length.value);
          return undefined;
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

function parseFontSize(fontSize: FontSize, options: ParserOptions) {
  switch (fontSize.type) {
    case "length":
      return parseLength(fontSize.value, options);
    case "absolute":
    case "relative":
      options.addWarning("value", fontSize.value);
      return undefined;
    default: {
      fontSize satisfies never;
    }
  }

  return;
}

function parseFontStyle(fontStyle: FontStyle, options: ParserOptions) {
  switch (fontStyle.type) {
    case "normal":
    case "italic":
      return fontStyle.type;
    case "oblique":
      options.addWarning("value", fontStyle.type);
      return undefined;
    default: {
      fontStyle satisfies never;
    }
  }

  return;
}

function parseFontVariantCaps(
  fontVariantCaps: FontVariantCaps,
  options: ParserOptions,
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

  options.addWarning("value", fontVariantCaps);
  return undefined;
}

function parseLengthOrCoercePercentageToRuntime(
  value: Length | DimensionPercentageFor_LengthValue | NumberOrPercentage,
  options: ParserOptions,
): StyleDescriptor {
  return parseLength(value, options);
}

function parseGap(value: GapValue, options: ParserOptions) {
  if (value.type === "normal") {
    options.addWarning("value", value.type);
    return;
  }

  return parseLength(value.value, options);
}

function parseRNRuntimeSpecificsFunction(
  name: string,
  args: TokenOrValue[],
  options: ParserOptions,
): StyleDescriptor {
  let key: string | undefined;
  const runtimeArgs: Record<string, StyleDescriptor> = {};

  for (const token of args) {
    if (!key) {
      if (
        token.type === "token" &&
        (token.value.type === "ident" || token.value.type === "number")
      ) {
        key = token.value.value.toString();
        continue;
      }
    } else {
      if (token.type !== "token") {
        const value = parseUnparsed(token, options);
        if (value === undefined) {
          return;
        }
        runtimeArgs[key] = value;
        key = undefined;
      } else {
        switch (token.value.type) {
          case "string":
          case "number":
          case "ident": {
            if (key) {
              runtimeArgs[key] = parseUnparsed(token, options);
              key = undefined;
              continue;
            } else {
              return;
            }
          }
          case "delim":
          case "comma":
            continue;
          case "function":
          case "at-keyword":
          case "hash":
          case "id-hash":
          case "unquoted-url":
          case "percentage":
          case "dimension":
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
            return undefined;
        }
      }
    }
  }

  return [{}, name, Object.entries(runtimeArgs)];
}

function parseTextAlign(textAlign: TextAlign, options: ParserOptions) {
  const allowed = new Set(["auto", "left", "right", "center", "justify"]);
  if (allowed.has(textAlign)) {
    return textAlign;
  }

  options.addWarning("value", textAlign);
  return undefined;
}

function parseBoxShadow(boxShadows: BoxShadow[], options: ParserOptions) {
  if (boxShadows.length > 1) {
    options.addWarning("value", "multiple box shadows");
    return;
  }

  const boxShadow = boxShadows[0];

  if (!boxShadow) {
    return;
  }

  options.add("style", "shadowColor", parseColor(boxShadow.color, options));
  options.add("style", "shadowRadius", parseLength(boxShadow.spread, options));
  // options.add("style",
  //   ["shadowOffsetWidth"],
  //   parseLength(boxShadow.xOffset, options, ["", ""),
  // );
  // options.add("style",
  //   ["shadowOffset", "height"],
  //   parseLength(boxShadow.yOffset, options),
  // );
}

function parseDisplay(display: Display, options: ParserOptions) {
  if (display.type === "keyword") {
    if (display.value === "none") {
      return display.value;
    } else {
      return options.addWarning("value", display.value);
    }
  } else if (display.type === "pair") {
    if (display.outside === "block") {
      switch (display.inside.type) {
        case "flow":
          if (display.isListItem) {
            return options.addWarning("value", "list-item");
          } else {
            return options.addWarning("value", "block");
          }
        case "flow-root":
          return options.addWarning("value", "flow-root");
        case "table":
          return options.addWarning("value", display.inside.type);
        case "flex":
          return display.inside.type;
        case "box":
        case "grid":
        case "ruby":
          return options.addWarning("value", display.inside.type);
      }
    } else {
      switch (display.inside.type) {
        case "flow":
          return options.addWarning("value", "inline");
        case "flow-root":
          return options.addWarning("value", "inline-block");
        case "table":
          return options.addWarning("value", "inline-table");
        case "flex":
          return options.addWarning("value", "inline-flex");
        case "box":
        case "grid":
          return options.addWarning("value", "inline-grid");
        case "ruby":
          return options.addWarning("value", display.inside.type);
      }
    }
  }

  return;
}

function parseAspectRatio(
  // This is missing types
  aspectRatio: any,
): StyleDescriptor {
  if (aspectRatio.auto) {
    return "auto";
  } else {
    if (aspectRatio.ratio[0] === aspectRatio.ratio[1]) {
      return 1;
    } else {
      return aspectRatio.ratio.join(" / ");
    }
  }
}

function parseDimension(
  { unit, value }: Extract<Token, { type: "dimension" }>,
  options: ParserOptions,
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
      return options.addWarning("value", `${value}${unit}`);
    }
  }
}

function parseUserSelect(value: UserSelect, options: ParserOptions) {
  const allowed = ["auto", "text", "none", "contain", "all"];
  if (allowed.includes(value)) {
    return value;
  } else {
    return options.addWarning("value", value);
  }
}

function parseSVGPaint(value: SVGPaint, options: ParserOptions) {
  if (value.type === "none") {
    return "transparent";
  } else if (value.type === "color") {
    return parseColor(value.value, options);
  }

  return;
}

function round(number: number) {
  return Math.round((number + Number.EPSILON) * 100) / 100;
}

function parseDimensionPercentageFor_LengthValue(
  value: DimensionPercentageFor_LengthValue,
  options: ParserOptions,
) {
  if (value.type === "calc") {
    return undefined;
  } else if (value.type === "percentage") {
    return `${value.value}%`;
  } else {
    return parseLength(value.value, options);
  }
}

const allowAuto = new Set(["pointer-events"]);

function parseEnv(
  value: EnvironmentVariable,
  options: ParserOptions,
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
              parseUnparsed(value.fallback, options),
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
  options: ParserOptions,
): StyleDescriptor {
  const args = parseCalcArguments(tokens, options);
  if (args) {
    return [{}, name, args];
  }

  return;
}

function parseCalcArguments([...args]: TokenOrValue[], options: ParserOptions) {
  const parsed: StyleDescriptor[] = [];

  let mode: "number" | "percentage" | undefined;

  for (const [currentIndex, arg] of args.entries()) {
    switch (arg.type) {
      case "env": {
        parsed.push(parseEnv(arg.value, options));
        break;
      }
      case "var":
      case "function":
      case "unresolved-color": {
        const value = parseUnparsed(arg, options);

        if (value === undefined) {
          return undefined;
        }

        parsed.push(value);
        break;
      }
      case "length": {
        const value = parseLength(arg.value, options);

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
            if (!mode) mode = "percentage";
            if (mode !== "percentage") return;
            parsed.push(`${arg.value.value * 100}%`);
            break;
          case "number": {
            if (!mode) mode = "number";
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

            parsed.push(parseCalcFn("calc", innerCalcArgs, options));

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
  options: ParserOptions,
): StyleDescriptor {
  if (translate === "none") {
    return 0;
  }

  return parseLength(translate[prop], options);
}

export function parseScale(
  translate: Scale,
  prop: keyof Extract<Scale, object>,
  options: ParserOptions,
): StyleDescriptor {
  if (translate === "none") {
    return 0;
  }

  return parseLength(translate[prop], options);
}

export function parseUnresolvedColor(
  color: UnresolvedColor,
  options: ParserOptions,
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
          parseUnparsed(color.alpha, options),
        ],
      ];
    case "hsl":
      return [
        {},
        color.type,
        [color.h, color.s, color.l, parseUnparsed(color.alpha, options)],
      ];
    case "light-dark":
      return undefined;
    default:
      color satisfies never;
  }

  return;
}

function allEqual(...params: unknown[]) {
  return params.every((param, index, array) => {
    return index === 0 ? true : equal(array[0], param);
  });
}
function equal(a: unknown, b: unknown) {
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

function parseTime(time: Time) {
  return time.type === "milliseconds" ? time.value : time.value * 1000;
}

function addTransitionValue(
  declaration: Extract<
    Declaration,
    { property: `transition${string}` | "transition" }
  >,
  options: ParserOptions,
) {
  switch (declaration.property) {
    case "transition":
      const grouped: Record<string, any[]> = {};

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
          } as any,
          options,
        );
      }
      break;
    case "transition-property": {
      return options.add(
        "transition",
        declaration.property,
        declaration.value.map((v) => v.property),
      );
    }
    case "transition-duration":
      return options.add(
        "transition",
        declaration.property,
        declaration.value.map((t) => parseTime(t)),
      );
    case "transition-delay":
      return options.add(
        "transition",
        declaration.property,
        declaration.value.map((t) => parseTime(t)),
      );
    case "transition-timing-function":
      return options.add(
        "transition",
        declaration.property,
        parseEasingFunction(declaration.value) as any,
      );
  }
}

function addAnimationValue(
  declaration: Extract<
    Declaration,
    { property: `animation${string}` | "animation" }
  >,
  options: ParserOptions,
) {
  switch (declaration.property) {
    case "animation": {
      const grouped: Record<string, any[]> = {};

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
          } as any,
          options,
        );
      }
      break;
    }
    case "animation-delay": {
      options.add(
        "animation",
        declaration.property,
        declaration.value.map((t) => parseTime(t)),
      );
      break;
    }
    case "animation-direction": {
      options.add("animation", declaration.property, declaration.value);
      break;
    }
    case "animation-duration": {
      options.add(
        "animation",
        declaration.property,
        declaration.value.map((t) => parseTime(t)),
      );
      break;
    }
    case "animation-fill-mode": {
      options.add("animation", declaration.property, declaration.value);
      break;
    }
    case "animation-iteration-count": {
      options.add(
        "animation",
        declaration.property,
        parseIterationCount(declaration.value),
      );
      break;
    }
    case "animation-name": {
      options.add(
        "animation",
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
      options.add("animation", declaration.property, declaration.value);
      break;
    }
    case "animation-timing-function": {
      options.add(
        "animation",
        declaration.property,
        parseEasingFunction(declaration.value) as any,
      );
      break;
    }
  }
}

function kebabCase(str: string) {
  return str.replace(
    /[A-Z]+(?![a-z])|[A-Z]/g,
    ($, ofs) => (ofs ? "-" : "") + $.toLowerCase(),
  );
}

const runtimeShorthands = new Set(["animation", "text-shadow", "transform"]);

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
