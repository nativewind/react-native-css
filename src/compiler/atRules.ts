import type {
  DeclarationBlock,
  ParsedComponent,
  Rule,
  TokenOrValue,
} from "lightningcss";

import type { StyleRuleMapping } from "./compiler.types";
import { toRNProperty } from "./selectors";
import { splitByDelimiter } from "./split-by-delimiter";
import type { StylesheetBuilder } from "./stylesheet";

export interface PropAtRule {
  type: "unknown";
  value: {
    name: "prop";
    prelude: Extract<TokenOrValue, { type: "token" }>[];
    block: Extract<TokenOrValue, { type: "token" }>[] | null;
  };
}

/***********************************************
 * @react-native                               *
 ***********************************************/

export interface ReactNativeAtRule {
  type: "custom";
  value: {
    name: "react-native";
    prelude: null | Extract<ParsedComponent, { type: "repeated" }>;
    body: {
      type: "declaration-list";
      value: Pick<DeclarationBlock, "declarations">;
    };
  };
}

export function maybeMutateReactNativeOptions(
  rule: Rule | ReactNativeAtRule,
  _builder: StylesheetBuilder,
) {
  if (rule.type !== "custom" || rule.value?.name !== "react-native") {
    return;
  }

  // TODO: Add inline options
}

/***********************************************
 * @nativeMapping                                       *
 ***********************************************/

function isNativeMappingAtRule(rule: Rule | PropAtRule): rule is PropAtRule {
  return rule.type === "unknown" && rule.value.name === "nativeMapping";
}

export function parsePropAtRule(rules?: (Rule | PropAtRule)[]) {
  // Include any default mapping here
  const mapping: StyleRuleMapping = {
    "caret-color": ["cursorColor"],
    "fill": ["fill"],
    "stroke": ["stroke"],
    "stroke-width": ["strokeWidth"],
    "-webkit-line-clamp": ["numberOfLines"],
    "-rn-ripple-color": ["android_ripple", "color"],
    "-rn-ripple-style": ["android_ripple", "borderless"],
    "-rn-ripple-radius": ["android_ripple", "radius"],
    "-rn-ripple-layer": ["android_ripple", "foreground"],
  };

  if (!rules) return mapping;

  for (const rule of rules) {
    if (!isNativeMappingAtRule(rule)) continue;

    if (rule.value.prelude.length > 0) {
      const prelude = rule.value.prelude.filter((item) => {
        return item.value.type !== "white-space";
      });

      nativeMappingAtRuleBlock(prelude, mapping);
    } else if (rule.value.block) {
      // Remove all whitespace tokens
      const blocks = rule.value.block.filter((item) => {
        return item.value.type !== "white-space";
      });

      // Separate each rule, delimited by a semicolon
      const blockRules = splitByDelimiter(blocks, (item) => {
        return item.value.type === "semicolon";
      });

      for (const block of blockRules) {
        nativeMappingAtRuleBlock(block, mapping);
      }
    }
  }

  return mapping;
}

function nativeMappingAtRuleBlock(
  token: Extract<TokenOrValue, { type: "token" }>[],
  mapping: StyleRuleMapping = {},
): StyleRuleMapping {
  let [from, to] = splitByDelimiter(token, (item) => {
    return item.value.type === "colon";
  });

  // @nativeMapping <to>; (has no from value)
  if (!to) {
    to = from;
    from = [
      {
        type: "token",
        value: { type: "ident", value: "*" },
      },
    ];
  }

  // We can only map from a single property
  if (!from || from.length !== 1 || !to) {
    return mapping;
  }

  const fromToken = from[0];
  if (!fromToken || fromToken.value.type !== "ident") {
    return mapping;
  }

  let value: string | string[] = to.flatMap((item, index) => {
    switch (item.value.type) {
      case "delim":
        return index === 0 && item.value.value === "&" ? ["&"] : [];
      case "ident":
        return item.value.value.split(".").map((part) => toRNProperty(part));
      default:
        return [];
    }
  });

  if (value.length === 2 && value[0] === "&" && value[1]) {
    value = value[1];
  }

  mapping[toRNProperty(fromToken.value.value)] = value;

  return mapping;
}
