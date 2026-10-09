import type {
  Declaration,
  DeclarationBlock,
  Rule,
  Selector,
  StyleSheet,
  TokenOrValue,
} from "lightningcss";

import type { UniqueVarInfo } from "./compiler.types";
import { supportsConditionValid } from "./supports";

// A custom property is scoped to the elements its rule matches (css-variables-1 §2), so a value folds only where every matching element provably holds it
export function inlineVariables(
  stylesheet: StyleSheet,
  exclude: readonly string[],
) {
  const scope = collectVariableScope(stylesheet, exclude);

  for (const name of [...scope.vars.keys()]) {
    flattenVar(name, scope);
  }

  forEachDeclarationBlock(stylesheet.rules, (block) => {
    foldDeclarationBlock(block, scope);
  });

  const reads = collectRuntimeReads(stylesheet.rules, scope);

  forEachDeclarationBlock(stylesheet.rules, (block) => {
    removeUnreadDeclarations(block, scope, reads);
  });

  return stylesheet;
}

interface VariableScope {
  readonly vars: Map<string, UniqueVarInfo>;
  readonly declaringBlocks: Map<string, DeclarationBlock>;
  readonly universalNames: Set<string>;
}

// Every matching element holds the property when its declaration is universal and unconditional, or when the reference shares its block
function canFold(
  name: string,
  block: DeclarationBlock | undefined,
  scope: VariableScope,
) {
  return (
    scope.universalNames.has(name) ||
    (block !== undefined && scope.declaringBlocks.get(name) === block)
  );
}

function forEachDeclarationBlock(
  rules: Rule[],
  visit: (block: DeclarationBlock) => void,
): void {
  for (const rule of rules) {
    switch (rule.type) {
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
      case "keyframes":
        for (const keyframe of rule.value.keyframes) {
          visit(keyframe.declarations);
        }
        break;
      case "style":
        if (rule.value.declarations) {
          visit(rule.value.declarations);
        }
        forEachDeclarationBlock(rule.value.rules ?? [], visit);
        break;
      case "nested-declarations":
        visit(rule.value.declarations);
        break;
      case "media":
      case "supports":
      case "layer-block":
      case "container":
        forEachDeclarationBlock(rule.value.rules, visit);
        break;
    }
  }
}

function declarationsOf(block: DeclarationBlock): Declaration[] {
  return [
    ...(block.declarations ?? []),
    ...(block.importantDeclarations ?? []),
  ];
}

function foldDeclarationBlock(block: DeclarationBlock, scope: VariableScope) {
  for (const declaration of declarationsOf(block)) {
    if (
      declaration.property === "unparsed" ||
      declaration.property === "custom"
    ) {
      declaration.value.value = declaration.value.value.flatMap((part) => {
        return flattenPart(part, scope, block);
      });
    }
  }
}

function collectRuntimeReads(rules: Rule[], scope: VariableScope) {
  const reads = new Set<string>();
  const readsOfCandidates = new Map<string, string[]>();
  const pending: string[] = [];

  const read = (name: string) => {
    if (!reads.has(name)) {
      reads.add(name);
      pending.push(name);
    }
  };

  forEachDeclarationBlock(rules, (block) => {
    for (const declaration of declarationsOf(block)) {
      if (declaration.property === "custom") {
        const { name, value } = declaration.value;

        // A candidate's own value is read only while something reads the candidate
        if (scope.vars.has(name)) {
          const names = readsOfCandidates.get(name) ?? [];
          forEachReadName(value, (readName) => names.push(readName));
          readsOfCandidates.set(name, names);
        } else {
          forEachReadName(value, read);
        }
      } else if (declaration.property === "unparsed") {
        forEachReadName(declaration.value.value, read);
      }
    }
  });

  for (let name = pending.pop(); name !== undefined; name = pending.pop()) {
    for (const readName of readsOfCandidates.get(name) ?? []) {
      read(readName);
    }
  }

  return reads;
}

function forEachReadName(
  parts: TokenOrValue[],
  visit: (name: string) => void,
): void {
  for (const part of parts) {
    switch (part.type) {
      case "var":
        visit(part.value.name.ident);
        forEachReadName(part.value.fallback ?? [], visit);
        break;
      case "env":
        forEachReadName(part.value.fallback ?? [], visit);
        break;
      case "function":
        forEachReadName(part.value.arguments, visit);
        break;
      case "unresolved-color":
        switch (part.value.type) {
          case "rgb":
          case "hsl":
            forEachReadName(part.value.alpha, visit);
            break;
          case "light-dark":
            forEachReadName(part.value.light, visit);
            forEachReadName(part.value.dark, visit);
            break;
          default:
            part.value satisfies never;
        }
        break;
      default:
        break;
    }
  }
}

function removeUnreadDeclarations(
  block: DeclarationBlock,
  scope: VariableScope,
  reads: Set<string>,
) {
  const isKept = (declaration: Declaration) => {
    return (
      declaration.property !== "custom" ||
      !scope.vars.has(declaration.value.name) ||
      reads.has(declaration.value.name)
    );
  };

  block.declarations = block.declarations?.filter(isKept);
  block.importantDeclarations = block.importantDeclarations?.filter(isKept);
}

function flattenPart(
  part: TokenOrValue,
  scope: VariableScope,
  block: DeclarationBlock | undefined,
): TokenOrValue | TokenOrValue[] {
  if (part.type === "var") {
    const name = part.value.name.ident;
    const varInfo = scope.vars.get(name);

    if (!varInfo || !canFold(name, block, scope)) {
      part.value.fallback = part.value.fallback?.flatMap((arg) => {
        return flattenPart(arg, scope, block);
      });

      return part;
    } else if (varInfo.value === undefined) {
      const fallback = part.value.fallback?.flatMap((arg) => {
        return flattenPart(arg, scope, block);
      });

      return fallback ?? [];
    }

    return varInfo.value;
  } else if (part.type === "function") {
    part.value.arguments = part.value.arguments.flatMap((arg) => {
      return flattenPart(arg, scope, block);
    });
  }

  return part;
}

function flattenVar(
  name: string,
  scope: VariableScope,
  seen = new Set<string>(),
) {
  if (seen.has(name)) {
    scope.vars.delete(name);
  }

  seen.add(name);

  let varInfo = scope.vars.get(name);

  if (!varInfo || varInfo.flat) {
    return;
  }

  // A value is substituted only into its declaring block, so a var() inside it folds on that block's terms
  const declaringBlock = scope.declaringBlocks.get(name);

  let varInfoValue = varInfo.value?.flatMap((part) => {
    if (part.type === "var") {
      const nestedName = part.value.name.ident;

      flattenVar(nestedName, scope, seen);

      if (canFold(nestedName, declaringBlock, scope)) {
        const nestedVarInfo = scope.vars.get(nestedName);
        if (nestedVarInfo?.value) {
          return nestedVarInfo.value;
        }
      }
    }
    return flattenPart(part, scope, declaringBlock);
  });

  // If the variable is shorthand for "initial", substitute it for undefined
  if (
    varInfoValue?.length === 2 &&
    varInfoValue[0]?.type === "token" &&
    varInfoValue[0].value.type === "ident" &&
    varInfoValue[0].value.value === "initial" &&
    varInfoValue[1]?.type === "token" &&
    varInfoValue[1].value.type === "white-space"
  ) {
    varInfoValue = undefined;
  }

  varInfo = {
    flat: true,
    value: varInfoValue,
  };

  scope.vars.set(name, varInfo);
}

type Reach = "every-element" | "inherited-from-root" | "matched-elements";

interface RuleScope {
  readonly reach: Reach;
  readonly conditional: boolean;
}

interface CustomDeclaration {
  readonly block: DeclarationBlock;
  readonly reach: Reach;
  readonly value: TokenOrValue[];
}

const DOCUMENT_SCOPE: RuleScope = {
  reach: "matched-elements",
  conditional: false,
};

// Separates a value spliced between tokens, as the source's own whitespace did
const VALUE_SEPARATOR: TokenOrValue = {
  type: "token",
  value: { type: "white-space", value: " " },
};

function collectVariableScope(
  stylesheet: StyleSheet,
  exclude: readonly string[],
): VariableScope {
  const declared = new Map<string, CustomDeclaration[]>();
  const notInherited = new Set<string>();
  const initialValues = new Map<string, TokenOrValue[]>();

  const annotateBlock = (block: DeclarationBlock, ruleScope: RuleScope) => {
    for (const declaration of declarationsOf(block)) {
      if (declaration.property !== "custom") continue;

      const { name, value } = declaration.value;
      if (!name.startsWith("--") || exclude.includes(name)) continue;

      const declarations = declared.get(name) ?? [];
      declarations.push({
        block,
        reach: ruleScope.conditional ? "matched-elements" : ruleScope.reach,
        value,
      });
      declared.set(name, declarations);
    }
  };

  const annotateRule = (rule: Rule, ruleScope: RuleScope): void => {
    switch (rule.type) {
      case "style": {
        const nested: RuleScope = {
          ...ruleScope,
          reach: selectorReach(rule.value.selectors, ruleScope),
        };
        if (rule.value.declarations) {
          annotateBlock(rule.value.declarations, nested);
        }
        for (const child of rule.value.rules ?? []) {
          annotateRule(child, nested);
        }
        return;
      }
      case "nested-declarations":
        annotateBlock(rule.value.declarations, ruleScope);
        return;
      case "keyframes":
        for (const keyframe of rule.value.keyframes) {
          annotateBlock(keyframe.declarations, {
            ...ruleScope,
            reach: "matched-elements",
          });
        }
        return;
      case "media":
      case "container":
        for (const child of rule.value.rules) {
          annotateRule(child, {
            reach: "matched-elements",
            conditional: true,
          });
        }
        return;
      case "supports":
        // The compiler keeps or drops an @supports block at build time, so its declarations apply unconditionally or not at all
        if (supportsConditionValid(rule.value.condition)) {
          for (const child of rule.value.rules) {
            annotateRule(child, ruleScope);
          }
        }
        return;
      case "layer-block":
        for (const child of rule.value.rules) {
          annotateRule(child, ruleScope);
        }
        return;
      case "property":
        if (!rule.value.inherits) {
          notInherited.add(rule.value.name);
        }
        if (
          rule.value.initialValue?.type === "token-list" &&
          !ruleScope.conditional
        ) {
          initialValues.set(rule.value.name, rule.value.initialValue.value);
        }
        return;
      default:
        return;
    }
  };

  for (const rule of stylesheet.rules) annotateRule(rule, DOCUMENT_SCOPE);

  const scope: VariableScope = {
    vars: new Map(),
    declaringBlocks: new Map(),
    universalNames: new Set(),
  };

  for (const [name, declarations] of declared) {
    // Which of two declarations wins depends on the element
    const [declaration, ...others] = declarations;
    if (!declaration || others.length > 0) continue;

    scope.vars.set(name, { value: [...declaration.value, VALUE_SEPARATOR] });
    scope.declaringBlocks.set(name, declaration.block);

    if (
      declaration.reach === "every-element" ||
      (declaration.reach === "inherited-from-root" && !notInherited.has(name))
    ) {
      scope.universalNames.add(name);
    }
  }

  // An element no declaration reaches holds the registered initial value (css-properties-values-api-1 §2.3)
  for (const [name, initialValue] of initialValues) {
    if (declared.has(name) || exclude.includes(name)) continue;

    scope.vars.set(name, { value: [...initialValue, VALUE_SEPARATOR] });
    scope.universalNames.add(name);
  }

  return scope;
}

// A `*` in the list declares on every element, and a nested rule reaches only as far as its parent
function selectorReach(selectors: Selector[], ruleScope: RuleScope): Reach {
  const reaches = selectors.map((selector): Reach => {
    const meaningful = selector.filter(
      (component) => component.type !== "nesting",
    );

    if (meaningful.length === 0) {
      return ruleScope.reach;
    }

    if (meaningful.length !== 1) {
      // A compound or combined selector, such as `:root .theme`, matches less than the whole document
      return "matched-elements";
    }

    const [component] = meaningful;

    switch (component?.type) {
      case "universal":
        return "every-element";
      case "type":
        // Every element descends from html, and no other element name can be relied on
        return component.name === "html"
          ? "inherited-from-root"
          : "matched-elements";
      case "pseudo-class":
        return component.kind === "root" || component.kind === "host"
          ? "inherited-from-root"
          : "matched-elements";
      default:
        return "matched-elements";
    }
  });

  if (reaches.includes("every-element")) return "every-element";
  if (reaches.includes("inherited-from-root")) return "inherited-from-root";
  return "matched-elements";
}
