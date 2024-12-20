import { versions } from "node:process";

import { debug } from "debug";
import {
  ContainerRule,
  MediaQuery as CSSMediaQuery,
  Declaration,
  DeclarationBlock,
  transform as lightningcss,
  MediaRule,
  ParsedComponent,
  Rule,
  SelectorList,
  TokenOrValue,
} from "lightningcss";

import { Specificity } from "../runtime/utils";
import { buildAddFn } from "./add";
import {
  CompilerCollection,
  CompilerOptions,
  ContainerQuery,
  MediaCondition,
  ReactNativeCssStyleSheet,
  SpecificityArray,
  StyleRule,
  StyleRuleMapping,
  StyleRuleSet,
} from "./compiler.types";
import { parseContainerCondition } from "./container-query";
import {
  AddWarningFn,
  parseDeclaration,
  ParseDeclarationOptions,
  ParserOptions,
} from "./declarations";
import { defaultFeatureFlags } from "./feature-flags";
import { extractKeyFrames } from "./keyframes";
import { parseMediaQuery } from "./media-query";
import { getSelectors, toRNProperty } from "./selectors";

type ReactNativeAtRule = {
  type: "custom";
  value: {
    name: "react-native";
    prelude: null | Extract<ParsedComponent, { type: "repeated" }>;
    body: {
      type: "declaration-list";
      value: DeclarationBlock & {
        importantDeclarations: never;
      };
    };
  };
};

/**
 * Converts a CSS file to a collection of style declarations that can be used with the StyleSheet API
 *
 * @param code - The CSS file contents
 * @param options - Compiler options
 * @returns A `ReactNativeCssStyleSheet` that can be passed to `StyleSheet.register` or used with a custom runtime
 */
export function compile(
  code: Buffer | string,
  { logger = debug("react-native-css"), ...options }: CompilerOptions = {},
): ReactNativeCssStyleSheet {
  const features = Object.assign({}, defaultFeatureFlags, options.features);

  logger(`Features ${JSON.stringify(features)}`);

  if (Number(versions.node.split(".")[0]) < 18) {
    throw new Error("react-native-css only supports NodeJS >18");
  }

  // These will by mutated by `extractRule`
  const collection: CompilerCollection = {
    darkMode: "dark",
    rules: new Map(),
    keyframes: new Map(),
    rootVariables: {},
    universalVariables: {},
    flags: {},
    appearanceOrder: 1,
    ...options,
    features,
    varUsageCount: new Map(),
  };

  logger(`Start lightningcss`);

  const onVarUsage = (token: TokenOrValue) => {
    if (token.type === "function") {
      token.value.arguments.forEach((token) => onVarUsage(token));
    } else if (token.type === "var") {
      const variable = token.value;
      const varName = variable.name.ident;
      collection.varUsageCount.set(
        varName,
        (collection.varUsageCount.get(varName) || 0) + 1,
      );

      if (variable.fallback) {
        const fallbackValues = variable.fallback;
        fallbackValues.forEach((varObj) => onVarUsage(varObj));
      }
    }
  };

  // Use the lightningcss library to traverse the CSS AST and extract style declarations and animations
  lightningcss({
    filename: "style.css", // This is ignored, but required
    code: typeof code === "string" ? new TextEncoder().encode(code) : code,
    visitor: {
      Declaration(decl) {
        // Track variable usage, we remove any unused variables
        if (decl.property !== "unparsed" && decl.property !== "custom") return;
        decl.value.value.forEach((varObj) => onVarUsage(varObj));
      },
      StyleSheetExit(sheet) {
        logger(`Found ${sheet.rules.length} rules to process`);

        for (const rule of sheet.rules) {
          // Extract the style declarations and animations from the current rule
          extractRule(rule, collection);
          // We have processed this rule, so now delete it from the AST
        }

        logger(`Exiting lightningcss`);
      },
    },
    customAtRules: {
      "react-native": {
        prelude: "<custom-ident>+",
        body: "declaration-list",
      },
    },
  });

  logger(`Found ${collection.rules.size} valid rules`);

  const ruleSets = new Map<string, StyleRuleSet>();
  for (const [name, styles] of collection.rules) {
    if (styles.length === 0) continue;

    const normal: StyleRule[] = [];
    const important: StyleRule[] = [];

    for (const style of styles) {
      if (style.s[Specificity.Important]) {
        important.push(style);
      } else {
        normal.push(style);
      }
    }

    const styleRuleSet: StyleRuleSet = important.length
      ? normal.length
        ? [normal, important]
        : [undefined, important]
      : [normal];

    ruleSets.set(name, styleRuleSet);
  }

  const stylesheetOptions: ReactNativeCssStyleSheet = {};

  if (Object.keys(collection.flags).length) {
    stylesheetOptions.f = collection.flags;
  }

  if (ruleSets.size) {
    stylesheetOptions.s = Array.from(ruleSets);
  }
  if (collection.keyframes.size) {
    stylesheetOptions.k = Array.from(collection.keyframes);
  }
  if (Object.keys(collection.rootVariables).length) {
    stylesheetOptions.vr = Object.entries(collection.rootVariables);
  }
  if (Object.keys(collection.universalVariables).length) {
    stylesheetOptions.vu = Object.entries(collection.universalVariables);
  }

  return stylesheetOptions;
}

type ExtractableRules = Rule | ReactNativeAtRule;

/**
 * Extracts style declarations and animations from a given CSS rule, based on its type.
 *
 * @param {Rule} rule - The CSS rule to extract style declarations and animations from.
 * @param {CompilerCollection} collection - Options for the extraction process, including maps for storing extracted data.
 * @param {CssToReactNativeRuntimeOptions} parseOptions - Options for parsing the CSS code, such as grouping related rules together.
 */
function extractRule(
  rule: ExtractableRules,
  collection: CompilerCollection,
  partialStyle: Partial<StyleRule> = {},
) {
  // Check the rule's type to determine which extraction function to call
  switch (rule.type) {
    case "keyframes": {
      // If the rule is a keyframe animation, extract it with the `extractKeyFrames` function
      extractKeyFrames(rule.value, collection);
      break;
    }
    case "container": {
      // If the rule is a container, extract it with the `extractedContainer` function
      extractedContainer(rule.value, collection);
      break;
    }
    case "media": {
      // If the rule is a media query, extract it with the `extractMedia` function
      extractMedia(rule.value, collection);
      break;
    }
    case "style": {
      // If the rule is a style declaration, extract it with the `getExtractedStyle` function and store it in the `declarations` map
      if (rule.value.declarations) {
        for (const style of getExtractedStyles(
          rule.value.declarations,
          collection,
          parseReactNativeStyleAtRule(rule.value.rules),
        )) {
          setStyleForSelectorList(
            { ...partialStyle, ...style },
            rule.value.selectors,
            collection,
          );
        }
        collection.appearanceOrder++;
      }
      break;
    }
    case "custom": {
      if (isReactNativeAtRule(rule)) {
        extractReactNativeOptions(rule, collection);
      }
    }
  }
}

function isReactNativeAtRule(
  rule: ExtractableRules,
): rule is ReactNativeAtRule {
  return rule.type === "custom" && rule.value?.name === "react-native";
}

function extractReactNativeOptions(
  rule: ReactNativeAtRule,
  collection: CompilerCollection,
) {
  const { declarations } = rule.value.body.value;
  if (!declarations) return;

  for (const declaration of declarations) {
    if (declaration.property !== "custom") continue;

    switch (declaration.value.name) {
      case "preserve-variables": {
        declaration.value.value.forEach((token) => {
          if (token.type !== "dashed-ident") {
            return;
          }
          collection.varUsageCount.set(token.value, 1);
        });
        break;
      }
      default:
        break;
    }
  }
}

/**
 * @rn-move is a custom at-rule that allows you to move a style property to a different prop/location
 * Its a placeholder concept until we improve the LightningCSS parsing
 */
function parseReactNativeStyleAtRule<D, M>(
  rules?: (Rule | ReactNativeAtRule)[],
) {
  const mapping: StyleRuleMapping = {};

  if (!rules) return mapping;

  for (const rule of rules) {
    if (!isReactNativeAtRule(rule)) continue;
    if (!rule.value.prelude) continue;

    if (rule.value.prelude.value.components[0].value !== "rename") {
      continue;
    }

    const { declarations } = rule.value.body.value;

    if (!declarations) continue;

    for (const declaration of declarations) {
      if (declaration.property !== "custom") continue;

      let values: string[] = [];

      for (const [index, value] of declaration.value.value.entries()) {
        if (value.type !== "token") {
          values = [];
          break;
        }

        const token = value.value;

        if (token.type === "delim") {
          // Ignore the dot
          if (token.value === ".") {
            continue;
          }

          if (token.value === "^" && index === 0) {
            continue;
          }

          // Any other delim is invalid
          values = [];
          break;
        }

        if (token.type !== "ident") {
          // Only ident is allowed
          values = [];
          break;
        }

        if (index === 0) {
          values.push("style");
        }

        values.push(toRNProperty(token.value));
      }

      if (values.length > 0) {
        mapping[toRNProperty(declaration.value.name)] = values;
      }
    }
  }

  return mapping;
}

// function extractCSSInteropFlag(
//   rule: CSSInteropAtRule,
//   collection: CompilerCollection,
// ) {
//   if (rule.value.prelude.value.components[0].value !== "set") {
//     return;
//   }
//   const [_, name, type, ...other] = rule.value.prelude.value.components.map(
//     (c) => c.value,
//   );

//   if (name === "darkMode") {
//     let value: string | undefined;

//     if (other.length === 0 || other[0] === "media") {
//       collection.darkMode = ["media"];
//     } else {
//       value = other[0];

//       if (value.startsWith(".")) {
//         value = value.slice(1);
//         collection.darkMode = ["class", value];
//       } else if (value.startsWith("[")) {
//         collection.darkMode = ["attribute", value];
//       } else if (value === "dark") {
//         collection.darkMode = ["class", value];
//       }
//     }
//     collection.flags.darkMode = `${type} ${value}`.trim();
//   } else {
//     const value = other.length === 0 ? "true" : other;
//     collection.flags[name] = value;
//   }
// }

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
function extractMedia(mediaRule: MediaRule, collection: CompilerCollection) {
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

  const options: ParserOptions = {
    add: () => {},
    addWarning: () => {},
  };

  const m = media
    .map((m) => parseMediaQuery(m, options))
    .filter((m): m is MediaCondition => m !== undefined);

  // Iterate over all rules in the mediaRule and extract their styles using the updated CompilerCollection
  for (const rule of mediaRule.rules) {
    extractRule(rule, collection, { m });
  }
}

/**
 * @param containerRule - The ContainerRule object containing the container query and its rules.
 * @param collection - The CompilerCollection object to use when extracting styles.
 * @param parseOptions - The CssToReactNativeRuntimeOptions object to use when parsing styles.
 */
function extractedContainer(
  containerRule: ContainerRule,
  collection: CompilerCollection,
) {
  const options: ParserOptions = {
    add: () => {},
    addWarning: () => {},
  };

  // Iterate over all rules inside the containerRule and extract their styles using the updated CompilerCollection
  for (const rule of containerRule.rules) {
    const query: ContainerQuery = {
      m: parseContainerCondition(containerRule.condition, options),
    };

    if (containerRule.name) {
      query.n = containerRule.name;
    }

    extractRule(rule, collection, { cq: [query] });
  }
}

/**
 * @param style - The ExtractedStyle object to use when setting styles.
 * @param selectorList - The SelectorList object containing the selectors to use when setting styles.
 * @param declarations - The declarations object to use when adding declarations.
 */
function setStyleForSelectorList(
  extractedStyle: StyleRule,
  selectorList: SelectorList,
  collection: CompilerCollection,
) {
  const { rules: declarations } = collection;

  const selectors = getSelectors(extractedStyle, selectorList, collection);

  if (
    !(
      extractedStyle.d ||
      extractedStyle.a ||
      extractedStyle.v ||
      extractedStyle.t
    )
  ) {
    return;
  }

  for (const selector of selectors) {
    const style: StyleRule = { ...extractedStyle };

    if (
      selector.type === "rootVariables" || // :root
      selector.type === "universalVariables" // *
    ) {
      const fontSizeValue = style.d?.reverse().find((value) => {
        return typeof value === "object" && "fontSize" in value;
      })?.[0];

      if (
        typeof collection.inlineRem !== "number" &&
        fontSizeValue &&
        typeof fontSizeValue === "object" &&
        "fontSize" in fontSizeValue &&
        typeof fontSizeValue["fontSize"] === "number"
      ) {
        collection.rem = fontSizeValue["fontSize"];
        if (collection.inlineRem === undefined) {
          collection.inlineRem = collection.rem;
        }
      }

      if (!style.v) {
        continue;
      }

      const { type, subtype } = selector;
      collection[type] ??= {};
      for (const [name, value] of style.v) {
        collection[type] ??= {};
        collection[type][name] ??= [undefined];
        if (subtype === "light") {
          collection[type][name][0] = value;
        } else {
          collection[type][name][1] = value;
        }
      }
      continue;
    } else if (selector.type === "className") {
      const specificity: SpecificityArray = [];

      if (selector.classNames.length === 0) {
        continue;
      }

      for (let index = 0; index < 5; index++) {
        const value =
          (extractedStyle.s[index] ?? 0) + (selector.specificity[index] ?? 0);
        if (value) {
          specificity[index] = value;
        }
      }

      const primarySelector = selector.classNames.pop()!;

      for (const [group, conditions] of selector.classNames) {
        // Add the conditions to the declarations object
        addDeclaration(declarations, group, {
          s: specificity,
          c: [`g:${group}`],
        });

        primarySelector[1] ??= {};
        primarySelector[1].cq ??= [];

        const containerQuery: ContainerQuery = {
          n: `g:${group}`,
        };

        if (conditions) {
          if (conditions.m?.length) {
            containerQuery.m = conditions.m[0];
          }

          if (conditions.aq) {
            containerQuery.a = conditions.aq;
          }

          if (conditions.p) {
            containerQuery.p = conditions.p;
          }
        }

        primarySelector[1].cq.push(containerQuery);
      }

      const rule: StyleRule = {
        ...style,
        s: specificity,
      };

      const conditions = primarySelector[1];

      if (conditions) {
        if (conditions.cq) {
          rule.cq ??= [];
          rule.cq.push(...conditions.cq);
        }

        if (conditions.m) {
          rule.m ??= [];
          rule.m.push(...conditions.m);
        }

        if (conditions.p) {
          rule.p = Object.assign({}, rule.p, conditions.p);
        }

        if (conditions.aq) {
          rule.aq ??= [];
          rule.aq.push(...conditions.aq);
        }
      }

      addDeclaration(declarations, primarySelector[0], rule);
    }
  }
}

function addDeclaration(
  declarations: CompilerCollection["rules"],
  className: string,
  style: StyleRule,
) {
  const existing = declarations.get(className);
  if (existing) {
    existing.push(style);
  } else {
    declarations.set(className, [style]);
  }
}

function getExtractedStyles(
  declarationBlock: DeclarationBlock<Declaration>,
  collection: CompilerCollection,
  mapping: StyleRuleMapping = {},
): StyleRule[] {
  const extractedStyles = [];

  const specificity: SpecificityArray = [];
  specificity[Specificity.Order] = collection.appearanceOrder;

  if (declarationBlock.declarations && declarationBlock.declarations.length) {
    extractedStyles.push(
      declarationsToStyle(
        declarationBlock.declarations,
        collection,
        specificity,
        mapping,
      ),
    );
  }

  if (
    declarationBlock.importantDeclarations &&
    declarationBlock.importantDeclarations.length
  ) {
    specificity[Specificity.Important] = 1;
    extractedStyles.push(
      declarationsToStyle(
        declarationBlock.importantDeclarations,
        collection,
        specificity,
        mapping,
      ),
    );
  }

  return extractedStyles;
}

function declarationsToStyle(
  declarations: Declaration[],
  collection: CompilerCollection,
  specificity: SpecificityArray,
  mapping: StyleRuleMapping,
): StyleRule {
  const extractedStyle: StyleRule = {
    s: [...specificity],
  };

  const parseDeclarationOptions: ParseDeclarationOptions = {
    ...collection,
  };

  const addWarning: AddWarningFn = (type, value) => {
    // TODO
  };

  const addFn = buildAddFn(extractedStyle, collection, mapping);

  for (const declaration of declarations) {
    parseDeclaration(declaration, parseDeclarationOptions, addFn, addWarning);
  }

  return extractedStyle;
}
