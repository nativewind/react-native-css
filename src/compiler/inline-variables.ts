import type {
  Declaration,
  DeclarationBlock,
  Rule,
  Selector,
  StyleSheet,
  TokenOrValue,
} from "lightningcss";

import type { UniqueVarInfo } from "./compiler.types";

// A custom property is scoped to the elements its rule matches (css-variables-1 §2), so a value folds only where every matching element provably holds it
export function inlineVariables(
  stylesheet: StyleSheet,
  vars: Map<string, UniqueVarInfo>,
) {
  // Which of two declarations wins depends on the element, and pruning before flattening keeps the fold independent of declaration order
  for (const [name, info] of [...vars]) {
    if (info.count !== 1) {
      vars.delete(name);
    }
  }

  const scope = collectVariableScope(stylesheet, vars);

  for (const name of [...vars.keys()]) {
    flattenVar(name, vars, scope);
  }

  stylesheet.rules = stylesheet.rules.map(function checkRule(rule) {
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
        return rule;

      case "media":
        rule.value.rules = rule.value.rules.map((rule) => checkRule(rule));
        return rule;
      case "keyframes":
        rule.value.keyframes = rule.value.keyframes.map((keyframe) => {
          keyframe.declarations =
            replaceDeclarationBlock(keyframe.declarations, vars, scope) ??
            keyframe.declarations;

          return keyframe;
        });
        return rule;
      case "style":
        rule.value.declarations = replaceDeclarationBlock(
          rule.value.declarations,
          vars,
          scope,
        );

        rule.value.rules = rule.value.rules?.flatMap((rule) => checkRule(rule));

        return rule;
      case "nested-declarations":
        rule.value.declarations =
          replaceDeclarationBlock(rule.value.declarations, vars, scope) ?? {};
        return rule;
      case "supports":
        rule.value.rules = rule.value.rules.flatMap((rule) => checkRule(rule));
        return rule;
      case "layer-block":
        rule.value.rules = rule.value.rules.flatMap((rule) => checkRule(rule));
        return rule;
      case "container":
        rule.value.rules = rule.value.rules.flatMap((rule) => checkRule(rule));
        return rule;
    }
  });

  return stylesheet;
}

interface VariableScope {
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

function replaceDeclarationBlock(
  block: DeclarationBlock | undefined,
  vars: Map<string, UniqueVarInfo>,
  scope: VariableScope,
) {
  if (!block) return;

  block.declarations = block.declarations
    ?.map((decl) => {
      return replaceDeclaration(decl, vars, block, scope);
    })
    .filter((d) => !!d);

  block.importantDeclarations = block.importantDeclarations
    ?.map((decl) => {
      return replaceDeclaration(decl, vars, block, scope);
    })
    .filter((d) => !!d);

  return block;
}

function replaceDeclaration(
  declaration: Declaration,
  vars: Map<string, UniqueVarInfo>,
  block: DeclarationBlock,
  scope: VariableScope,
) {
  if (
    declaration.property !== "unparsed" &&
    declaration.property !== "custom"
  ) {
    return declaration;
  }

  // A block-scoped declaration stays for descendants, including ones a separately compiled stylesheet styles
  if (
    declaration.property === "custom" &&
    vars.has(declaration.value.name) &&
    scope.universalNames.has(declaration.value.name)
  ) {
    return;
  }

  declaration.value.value = declaration.value.value.flatMap((part) => {
    return flattenPart(part, vars, block, scope);
  });

  return declaration;
}

function flattenPart(
  part: TokenOrValue,
  vars: Map<string, UniqueVarInfo>,
  block: DeclarationBlock | undefined,
  scope: VariableScope,
): TokenOrValue | TokenOrValue[] {
  if (part.type === "var") {
    const name = part.value.name.ident;
    const varInfo = vars.get(name);

    if (!varInfo || !canFold(name, block, scope)) {
      part.value.fallback = part.value.fallback?.flatMap((arg) => {
        return flattenPart(arg, vars, block, scope);
      });

      return part;
    } else if (varInfo.value === undefined) {
      const fallback = part.value.fallback?.flatMap((arg) => {
        return flattenPart(arg, vars, block, scope);
      });

      return fallback ?? [];
    }

    return varInfo.value;
  } else if (part.type === "function") {
    part.value.arguments = part.value.arguments.flatMap((arg) => {
      return flattenPart(arg, vars, block, scope);
    });
  }

  return part;
}

function flattenVar(
  name: string,
  vars: Map<string, UniqueVarInfo>,
  scope: VariableScope,
  seen = new Set<string>(),
) {
  if (seen.has(name)) {
    vars.delete(name);
  }

  seen.add(name);

  let varInfo = vars.get(name);

  if (!varInfo || varInfo.flat) {
    return;
  }

  // A value is substituted only into its declaring block, so a var() inside it folds on that block's terms
  const declaringBlock = scope.declaringBlocks.get(name);

  let varInfoValue = varInfo.value?.flatMap((part) => {
    if (part.type === "var") {
      const nestedName = part.value.name.ident;

      flattenVar(nestedName, vars, scope, seen);

      if (canFold(nestedName, declaringBlock, scope)) {
        const nestedVarInfo = vars.get(nestedName);
        if (nestedVarInfo?.value) {
          return nestedVarInfo.value;
        }
      }
    }
    return flattenPart(part, vars, declaringBlock, scope);
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
    count: 1,
    flat: true,
    value: varInfoValue,
  };

  vars.set(name, varInfo);
}

interface RuleScope {
  /** Every element matches the enclosing selector. */
  readonly universal: boolean;
  /** Enclosed by a query whose result this pass does not know. */
  readonly conditional: boolean;
}

const ROOT_SCOPE: RuleScope = { universal: false, conditional: false };

function collectVariableScope(
  stylesheet: StyleSheet,
  vars: Map<string, UniqueVarInfo>,
): VariableScope {
  const scope: VariableScope = {
    declaringBlocks: new Map(),
    universalNames: new Set(),
  };

  // A property registered with inherits: false reaches only the element that declares it (css-properties-values-api-1)
  const notInherited = new Set<string>();
  for (const rule of stylesheet.rules) {
    if (rule.type === "property" && !rule.value.inherits) {
      notInherited.add(rule.value.name);
    }
  }

  const annotateBlock = (
    block: DeclarationBlock | undefined,
    ruleScope: RuleScope,
  ) => {
    if (!block) return;

    const universal = ruleScope.universal && !ruleScope.conditional;

    for (const declaration of [
      ...(block.declarations ?? []),
      ...(block.importantDeclarations ?? []),
    ]) {
      if (declaration.property !== "custom") continue;

      const { name } = declaration.value;
      if (!vars.has(name)) continue;

      scope.declaringBlocks.set(name, block);
      if (universal && !notInherited.has(name)) {
        scope.universalNames.add(name);
      }
    }
  };

  const annotateRule = (rule: Rule, ruleScope: RuleScope): void => {
    switch (rule.type) {
      case "style": {
        const nested: RuleScope = {
          ...ruleScope,
          universal: isUniversalScope(rule.value.selectors, ruleScope),
        };
        annotateBlock(rule.value.declarations, nested);
        for (const child of rule.value.rules ?? []) {
          annotateRule(child, nested);
        }
        return;
      }
      case "nested-declarations":
        // The enclosing style rule's own declarations, so they carry its scope.
        annotateBlock(rule.value.declarations, ruleScope);
        return;
      case "keyframes":
        // A keyframe's block folds only into itself; @keyframes never sits inside a style rule
        for (const keyframe of rule.value.keyframes) {
          annotateBlock(keyframe.declarations, ruleScope);
        }
        return;
      case "media":
      case "supports":
      case "container":
        // A query decides elsewhere whether these rules apply, so nothing inside one is unconditional
        for (const child of rule.value.rules) {
          annotateRule(child, {
            universal: false,
            conditional: true,
          });
        }
        return;
      case "layer-block":
        for (const child of rule.value.rules) {
          annotateRule(child, ruleScope);
        }
        return;
      default:
        return;
    }
  };

  for (const rule of stylesheet.rules) annotateRule(rule, ROOT_SCOPE);

  return scope;
}

// One universal selector is enough (Tailwind emits `:root, :host`), and a nested rule is universal only where its parent is
function isUniversalScope(selectors: Selector[], ruleScope: RuleScope) {
  return selectors.some((selector) => {
    const meaningful = selector.filter(
      (component) => component.type !== "nesting",
    );

    if (meaningful.length === 0) {
      return ruleScope.universal;
    }

    if (meaningful.length !== 1) {
      // A compound or combined selector, such as `:root .theme`, matches less than the whole document
      return false;
    }

    const [component] = meaningful;

    switch (component?.type) {
      case "universal":
        return true;
      case "type":
        // Every element descends from html, and no other element name can be relied on
        return component.name === "html";
      case "pseudo-class":
        return component.kind === "root" || component.kind === "host";
      default:
        return false;
    }
  });
}
