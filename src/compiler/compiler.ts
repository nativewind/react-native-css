/* eslint-disable */
import { inspect } from "node:util";

import { debug } from "debug";
import {
  type ContainerRule,
  type MediaQuery as CSSMediaQuery,
  type CustomAtRules,
  type MediaRule,
  type Rule,
  type Visitor,
} from "lightningcss";

import { maybeMutateReactNativeOptions, parsePropAtRule } from "./atRules";
import type {
  CompilerOptions,
  ContainerQuery,
  StyleRuleMapping,
  UniqueVarInfo,
} from "./compiler.types";
import { parseContainerCondition } from "./container-query";
import { parseDeclaration, round } from "./declarations";
import { inlineVariables } from "./inline-variables";
import { extractKeyFrames } from "./keyframes";
import { lightningcssLoader } from "./lightningcss-loader";
import { parseMediaQuery } from "./media-query";
import { StylesheetBuilder } from "./stylesheet";
import { supportsConditionValid } from "./supports";

const defaultLogger = debug("react-native-css:compiler");

/**
 * Converts a CSS file to a collection of style declarations that can be used with the StyleSheet API
 *
 * @param code - The CSS file contents
 * @param options - Compiler options
 * @returns A `ReactNativeCssStyleSheet` that can be passed to `StyleSheet.register` or used with a custom runtime
 */
export function compile(code: Buffer | string, options: CompilerOptions = {}) {
  const { logger = defaultLogger } = options;

  const isLoggerEnabled =
    "enabled" in logger ? logger.enabled : Boolean(logger);

  const features = Object.assign({}, options.features);

  if (options.selectorPrefix && options.selectorPrefix.startsWith(".")) {
    options.selectorPrefix = options.selectorPrefix.slice(1);
  }

  logger(`Features ${JSON.stringify(features)}`);

  if (process.env.NODE_ENV !== "production") {
    if (defaultLogger.enabled) {
      defaultLogger(code.toString());
    }
  }

  const builder = new StylesheetBuilder(options);

  const { lightningcss, Features } = lightningcssLoader();

  logger(`Lightningcss first pass`);

  /**
   * Use the lightningcss library to traverse the CSS AST and extract style declarations and animations
   *
   * devongovett on Aug 20, 2023
   * > calc simplification happens during the initial parse phase, which is before custom visitors run. Currently there is not an additional simplification pass done after transforms, resulting in the output you see here.
   * https://github.com/parcel-bundler/lightningcss/issues/554#issuecomment-1685143494
   *
   * Due to the above issue, we run lightningcss twice
   */

  const vars = new Map<string, UniqueVarInfo>();

  const firstPassVisitor: Visitor<CustomAtRules> = {};

  if (options.inlineRem !== false) {
    firstPassVisitor.Length = (length) => {
      if (length.unit !== "rem" || options.inlineRem === false) {
        return length;
      }

      return {
        unit: "px",
        value: round(length.value * (options.inlineRem ?? 14)),
      };
    };
  }

  if (options.inlineVariables !== false) {
    const exclusionList: string[] = options.inlineVariables?.exclude ?? [];

    firstPassVisitor.Declaration = (decl) => {
      if (
        decl.property === "custom" &&
        decl.value.name.startsWith("--") &&
        !exclusionList.includes(decl.value.name)
      ) {
        const entry = vars.get(decl.value.name) ?? {
          count: 0,
          value: [
            ...decl.value.value,
            { type: "token", value: { type: "white-space", value: " " } },
          ],
        };
        entry.count++;
        vars.set(decl.value.name, entry);
      }
    };
    firstPassVisitor.StyleSheetExit = (sheet) => {
      return inlineVariables(sheet, vars);
    };
  }

  const { code: firstPass } = lightningcss({
    code: typeof code === "string" ? new TextEncoder().encode(code) : code,
    include: Features.DoublePositionGradients | Features.ColorFunction,
    exclude: Features.VendorPrefixes,
    visitor: firstPassVisitor,
    filename: options.filename ?? "style.css",
    projectRoot: options.projectRoot ?? process.cwd(),
  });

  if (isLoggerEnabled) {
    const MAX_LOG_SIZE = 100 * 1024; // 100KB
    if (firstPass.length <= MAX_LOG_SIZE) {
      logger(firstPass.toString());
    } else {
      logger(
        `firstPass buffer too large to log in full (${firstPass.length} bytes). Preview: ` +
          firstPass.subarray(0, 1024).toString() +
          "...",
      );
    }
  }

  logger(`Lightningcss second pass`);

  const customAtRules: CustomAtRules = {
    "react-native": {
      body: "declaration-list",
    },
  };

  const visitor: Visitor<typeof customAtRules> = {
    Rule(rule) {
      maybeMutateReactNativeOptions(rule, builder);
      return rule;
    },
    StyleSheetExit(sheet) {
      if (isLoggerEnabled) {
        logger(`Found ${sheet.rules.length} rules to process`);
        logger(
          inspect(sheet.rules, { depth: null, colors: true, compact: false }),
        );
      }

      for (const rule of sheet.rules) {
        // Extract the style declarations and animations from the current rule
        extractRule(rule, builder);
        // We have processed this rule, so now delete it from the AST
      }

      logger(`Exiting lightningcss`);
      return sheet;
    },
  };

  lightningcss({
    code: firstPass,
    visitor,
    filename: options.filename ?? "style.css",
    projectRoot: options.projectRoot ?? process.cwd(),
  });

  return {
    stylesheet: () => builder.getNativeStyleSheet(),
    warnings: () => builder.getWarnings(),
  };
}

/**
 * Extracts style declarations and animations from a given CSS rule, based on its type.
 */
function extractRule(
  rule: Rule,
  builder: StylesheetBuilder,
  mapping: StyleRuleMapping = {},
) {
  // Check the rule's type to determine which extraction function to call
  switch (rule.type) {
    case "keyframes": {
      // If the rule is a keyframe animation, extract it with the `extractKeyFrames` function
      extractKeyFrames(rule.value, builder);
      break;
    }
    case "container": {
      // If the rule is a container, extract it with the `extractedContainer` function
      extractContainer(rule.value, builder, mapping);
      break;
    }
    case "media": {
      // If the rule is a media query, extract it with the `extractMedia` function
      extractMedia(rule.value, builder, mapping);
      break;
    }
    case "nested-declarations": {
      const value = rule.value;

      const declarationBlock = value.declarations;
      if (declarationBlock) {
        if (declarationBlock.declarations?.length) {
          builder.newNestedRule({ mapping });
          for (const declaration of declarationBlock.declarations) {
            parseDeclaration(declaration, builder);
          }
          builder.applyRuleToSelectors();
        }

        if (declarationBlock.importantDeclarations?.length) {
          builder.newNestedRule({ mapping, important: true });
          for (const declaration of declarationBlock.importantDeclarations) {
            parseDeclaration(declaration, builder);
          }
          builder.applyRuleToSelectors();
        }
      }
      break;
    }
    case "style": {
      const value = rule.value;

      const declarationBlock = value.declarations;
      mapping = { ...mapping, ...parsePropAtRule(value.rules) };

      // If the rule is a style declaration, extract it with the `getExtractedStyle` function and store it in the `declarations` map
      builder = builder.fork("style", value.selectors);

      if (declarationBlock) {
        if (declarationBlock.declarations?.length) {
          builder.newRule(mapping);
          for (const declaration of declarationBlock.declarations) {
            parseDeclaration(declaration, builder);
          }
          builder.applyRuleToSelectors();
        }

        if (declarationBlock.importantDeclarations?.length) {
          builder.newRule(mapping, { important: true });
          for (const declaration of declarationBlock.importantDeclarations) {
            parseDeclaration(declaration, builder);
          }
          builder.applyRuleToSelectors();
        }
      }

      if (value.rules) {
        for (const nestedRule of value.rules) {
          extractRule(nestedRule, builder, mapping);
        }
      }

      break;
    }
    case "layer-block":
      for (const layerRule of rule.value.rules) {
        extractRule(layerRule, builder, mapping);
      }
      break;
    case "supports":
      if (supportsConditionValid(rule.value.condition)) {
        for (const layerRule of rule.value.rules) {
          extractRule(layerRule, builder, mapping);
        }
      }
      break;
    case "custom":
    case "font-face":
    case "font-palette-values":
    case "font-feature-values":
    case "namespace":
    case "layer-statement":
    case "property":
    case "view-transition":
    case "ignored":
    case "unknown":
    case "import":
    case "page":
    case "counter-style":
    case "moz-document":
    case "nesting":
    case "viewport":
    case "custom-media":
    case "scope":
    case "starting-style":
      break;
  }
}

/**
 * This function takes in a MediaRule object, an CompilerCollection object and a CssToReactNativeRuntimeOptions object,
 * and returns an array of MediaQuery objects representing styles extracted from screen media queries.
 *
 * @param mediaRule - The MediaRule object containing the media query and its rules.
 * @param collection - The CompilerCollection object to use when extracting styles.
 * @param parseOptions - The CssToReactNativeRuntimeOptions object to use when parsing styles.
 *
 * @returns undefined if no screen media queries are found in the mediaRule, else it returns the extracted styles.
 */
function extractMedia(
  mediaRule: MediaRule,
  builder: StylesheetBuilder,
  mapping: StyleRuleMapping,
) {
  builder = builder.fork("media");

  // Initialize an empty array to store screen media queries
  const media: CSSMediaQuery[] = [];

  // Iterate over all media queries in the mediaRule
  for (const mediaQuery of mediaRule.query.mediaQueries) {
    if (
      // If this is only a media query
      (mediaQuery.mediaType === "print" && mediaQuery.qualifier !== "not") ||
      // If this is a @media not print {}
      // We can only do this if there are no conditions, as @media not print and (min-width: 100px) could be valid
      (mediaQuery.mediaType !== "print" &&
        mediaQuery.qualifier === "not" &&
        mediaQuery.condition === null)
    ) {
      continue;
    }

    media.push(mediaQuery);
  }

  if (media.length === 0) {
    return;
  }

  for (const m of media) {
    parseMediaQuery(m, builder);
  }

  // Iterate over all rules in the mediaRule and extract their styles using the updated CompilerCollection
  for (const rule of mediaRule.rules) {
    extractRule(rule, builder, mapping);
  }
}

/**
 * @param containerRule - The ContainerRule object containing the container query and its rules.
 * @param collection - The CompilerCollection object to use when extracting styles.
 * @param parseOptions - The CssToReactNativeRuntimeOptions object to use when parsing styles.
 */
function extractContainer(
  containerRule: ContainerRule,
  builder: StylesheetBuilder,
  mapping: StyleRuleMapping,
) {
  builder = builder.fork("container");

  // Iterate over all rules inside the containerRule and extract their styles using the updated CompilerCollection
  const query: ContainerQuery = {
    m: parseContainerCondition(containerRule.condition, builder),
  };

  if (containerRule.name) {
    query.n = `c:${containerRule.name}`;
  }

  builder.addContainerQuery(query);

  for (const rule of containerRule.rules) {
    extractRule(rule, builder, mapping);
  }
}
