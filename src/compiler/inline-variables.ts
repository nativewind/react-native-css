import type {
  Declaration,
  DeclarationBlock,
  Rule,
  Selector,
  StyleSheet,
  TokenOrValue,
} from "lightningcss";

import type { UniqueVarInfo } from "./compiler.types";

/**
 * Folds a custom property that the stylesheet declares exactly once into the
 * `var()` references that read it, so the runtime never has to resolve it.
 *
 * Folding a value into a rule ASSERTS that every element the rule matches holds
 * that value. A single declaration is not enough to know that — a custom
 * property is scoped to the elements its declaring rule matches, and a class
 * selector cannot promise that a consuming rule matches the same element:
 *
 *     .parent { --x: 10px } .child { width: var(--x) }
 *
 * An element carrying only `.child` has no `--x` at all, so `width: 10px` is
 * wrong for it. `canFold` names the two cases where the assertion IS provable.
 */
export function inlineVariables(
  stylesheet: StyleSheet,
  vars: Map<string, UniqueVarInfo>,
) {
  // A second declaration is a cascade this pass cannot resolve — which of the
  // two wins depends on the element — so only a property declared exactly once
  // is a candidate at all. Pruning happens BEFORE anything is flattened,
  // because a value being flattened reads this same map: leaving a
  // multi-declaration variable in it until its own turn came round made the
  // fold depend on the order the properties happened to be written in.
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

/**
 * Where each single-definition custom property is declared, and whether that
 * place is one every element inherits from.
 *
 * The two halves answer different questions. `declaringBlocks` decides whether
 * a reference sits in the same block as the declaration; `universalNames`
 * decides whether the declaration reaches every element regardless.
 */
interface VariableScope {
  readonly declaringBlocks: Map<string, DeclarationBlock>;
  readonly universalNames: Set<string>;
}

/**
 * Whether the value of `name` may be folded into a `var()` written in `block`.
 *
 * Two cases are provable, and either is enough:
 *
 * - the declaration is in a universal, unconditional scope, so every element
 *   holds the property whatever else it matches; or
 * - the reference is in the block that declares it, so any element the rule
 *   matches holds the property by matching that rule. Whether the rule applies
 *   at all does not matter: a query that switches the declaration off switches
 *   the reference off with it.
 *
 * Neither holds across two rules, which is why `.a { --x: red }` with
 * `.b { color: var(--x) }` is left to the runtime.
 */
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

  // A universal declaration has been folded into every reference there is, so
  // nothing is left to read it. A block-scoped one is KEPT: it was folded only
  // into its own block, and a descendant still inherits it at runtime —
  // including a descendant styled by a stylesheet compiled separately, which
  // this pass cannot see and must not assume away.
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

  // A value is flattened FOR the block that declares it, because that is the
  // only block it is ever substituted into. A `var()` inside it is therefore
  // held to the same terms as every other reference written in that block —
  // otherwise `.a { --x: var(--y) }` quietly takes `.b`'s `--y` and carries it
  // to elements that never matched `.b`.
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

/** Where a declaration block sits, as the annotating walk descends. */
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

  // A property registered with `inherits: false` is NOT inherited, so a
  // universal declaration of it reaches only the element it is written on —
  // every descendant sees the registered initial value instead. Recording it
  // before the walk keeps `:root { --x: 20px }` from being read as universal.
  const notInherited = new Set<string>();
  // Top level only, which is the whole of the compiler's `@property` support:
  // an `@property` nested in an at-rule registers no initial value either, so
  // there is nothing there for this to disagree with.
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
        // `@keyframes` is only ever reached at the top level or inside an
        // at-rule, never inside a style rule, so the scope it carries is
        // already non-universal. A keyframe declares animation values rather
        // than a scope another rule can rely on, but its own block still folds
        // into itself.
        for (const keyframe of rule.value.keyframes) {
          annotateBlock(keyframe.declarations, ruleScope);
        }
        return;
      case "media":
      case "supports":
      case "container":
        // Whether these rules apply at all is decided elsewhere — at runtime
        // for a media or container query, at build time for `@supports` — so a
        // declaration inside one is never unconditional, however universal its
        // selector.
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

/**
 * Whether a selector list names a scope every element inherits from.
 *
 * ONE such selector is enough, so the list is tested with `some`: `:root, :host`
 * — the shape Tailwind emits for its theme — is universal because `:root` is,
 * whatever `:host` matches.
 *
 * A nested rule is universal only if both it and the rule it is nested in are,
 * because its selectors are relative to that parent. A nested selector that is
 * nothing but `&` adds no constraint of its own and takes the parent's answer.
 */
function isUniversalScope(selectors: Selector[], ruleScope: RuleScope) {
  return selectors.some((selector) => {
    const meaningful = selector.filter(
      (component) => component.type !== "nesting",
    );

    if (meaningful.length === 0) {
      return ruleScope.universal;
    }

    if (meaningful.length !== 1) {
      // Anything compound or combined is narrower than the whole document:
      // `:root .theme` matches only descendants of an element with that class.
      return false;
    }

    const [component] = meaningful;

    switch (component?.type) {
      case "universal":
        return true;
      case "type":
        // Every element descends from `html`. No other element name can be
        // relied on, and none of them compile to a rule here anyway.
        return component.name === "html";
      case "pseudo-class":
        return component.kind === "root" || component.kind === "host";
      default:
        return false;
    }
  });
}
