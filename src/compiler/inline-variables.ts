import type {
  Declaration,
  DeclarationBlock,
  StyleSheet,
  TokenOrValue,
} from "lightningcss";

import type { UniqueVarInfo } from "./compiler.types";

export function inlineVariables(
  stylesheet: StyleSheet,
  vars: Map<string, UniqueVarInfo>,
) {
  for (const [name, info] of [...vars]) {
    if (info.count !== 1) {
      vars.delete(name);
    } else {
      flattenVar(name, vars);
    }
  }

  // A custom property is scoped to the elements its declaring rule matches, and
  // a class selector cannot promise that a consuming rule matches the same
  // element. So a single-definition variable may only be folded into uses in the
  // SAME declaration block, and its declaration may only be removed when nothing
  // outside that block reads it — otherwise a descendant that legitimately
  // inherits the value at runtime finds it gone.
  const scope = collectVariableScope(stylesheet, vars);

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

function replaceDeclarationBlock(
  block: DeclarationBlock | undefined,
  vars: Map<string, UniqueVarInfo>,
  scope: VariableScope,
) {
  if (!block) return;

  // Only the variables this block itself declares are foldable into this
  // block's own uses.
  const foldable = new Map<string, UniqueVarInfo>();
  for (const name of scope.declaredBy.get(block) ?? []) {
    const info = vars.get(name);
    if (info) foldable.set(name, info);
  }

  block.declarations = block.declarations
    ?.map((decl) => {
      return replaceDeclaration(decl, foldable, scope);
    })
    .filter((d) => !!d);

  block.importantDeclarations = block.importantDeclarations
    ?.map((decl) => {
      return replaceDeclaration(decl, foldable, scope);
    })
    .filter((d) => !!d);

  return block;
}

function replaceDeclaration(
  declaration: Declaration,
  vars: Map<string, UniqueVarInfo>,
  scope: VariableScope,
) {
  if (
    declaration.property !== "unparsed" &&
    declaration.property !== "custom"
  ) {
    return declaration;
  }

  // The declaration is only removable once every use of it has been folded,
  // which is true exactly when nothing outside its own block reads it.
  if (
    declaration.property === "custom" &&
    vars.has(declaration.value.name) &&
    !scope.readOutsideDeclaringBlock.has(declaration.value.name)
  ) {
    return;
  }

  declaration.value.value = declaration.value.value.flatMap((part) => {
    return flattenPart(part, vars);
  });

  return declaration;
}

function flattenPart(
  part: TokenOrValue,
  vars: Map<string, UniqueVarInfo>,
): TokenOrValue | TokenOrValue[] {
  if (part.type === "var") {
    const varInfo = vars.get(part.value.name.ident);

    if (!varInfo) {
      part.value.fallback = part.value.fallback?.flatMap((arg) => {
        return flattenPart(arg, vars);
      });

      return part;
    } else if (varInfo.value === undefined) {
      const fallback = part.value.fallback?.flatMap((arg) => {
        return flattenPart(arg, vars);
      });

      return fallback ?? [];
    }

    return varInfo.value;
  } else if (part.type === "function") {
    part.value.arguments = part.value.arguments.flatMap((arg) => {
      return flattenPart(arg, vars);
    });
  }

  return part;
}

function flattenVar(
  name: string,
  vars: Map<string, UniqueVarInfo>,
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

  let varInfoValue = varInfo.value?.flatMap((part) => {
    if (part.type === "var") {
      const name = part.value.name.ident;

      flattenVar(name, vars, seen);

      const nestedVarInfo = vars.get(part.value.name.ident);
      if (nestedVarInfo?.value) {
        return nestedVarInfo.value;
      }
    }
    return flattenPart(part, vars);
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

/**
 * Which block declares each single-definition variable, and whether anything
 * outside that block reads it.
 *
 * Both halves are needed because they gate different things: the first decides
 * where a value may be folded, the second decides whether the declaration may be
 * removed. A variable declared in one block and read in another is foldable
 * nowhere and removable never — the runtime has to resolve it against the
 * element's own inherited scope, which is the only place that answer exists.
 */
interface VariableScope {
  readonly declaredBy: Map<DeclarationBlock, Set<string>>;
  readonly readOutsideDeclaringBlock: Set<string>;
}

/** Every `var(--name)` read in a token tree. */
function collectReads(part: TokenOrValue, into: Set<string>) {
  if (part.type === "var") {
    into.add(part.value.name.ident);
    for (const fallback of part.value.fallback ?? []) {
      collectReads(fallback, into);
    }
  } else if (part.type === "function") {
    for (const argument of part.value.arguments) {
      collectReads(argument, into);
    }
  } else if (part.type === "unresolved-color") {
    // A colour function's channels can carry var() reads too.
    for (const value of Object.values(part.value)) {
      if (Array.isArray(value)) {
        for (const entry of value) collectReads(entry as TokenOrValue, into);
      }
    }
  }
}

function collectVariableScope(
  stylesheet: StyleSheet,
  vars: Map<string, UniqueVarInfo>,
): VariableScope {
  const declaredBy = new Map<DeclarationBlock, Set<string>>();
  const declaringBlock = new Map<string, DeclarationBlock>();
  const readsByBlock = new Map<DeclarationBlock, Set<string>>();

  const visitBlock = (block: DeclarationBlock | undefined) => {
    if (!block) return;
    const declared = new Set<string>();
    const read = new Set<string>();
    for (const declaration of [
      ...(block.declarations ?? []),
      ...(block.importantDeclarations ?? []),
    ]) {
      if (declaration.property === "custom") {
        if (vars.has(declaration.value.name)) {
          declared.add(declaration.value.name);
          declaringBlock.set(declaration.value.name, block);
        }
        for (const part of declaration.value.value) collectReads(part, read);
      } else if (declaration.property === "unparsed") {
        for (const part of declaration.value.value) collectReads(part, read);
      }
    }
    declaredBy.set(block, declared);
    readsByBlock.set(block, read);
  };

  const visitRule = (rule: StyleSheet["rules"][number]): void => {
    switch (rule.type) {
      case "style":
        visitBlock(rule.value.declarations);
        for (const nested of rule.value.rules ?? []) {
          visitRule(nested);
        }
        return;
      case "nested-declarations":
        visitBlock(rule.value.declarations);
        return;
      case "keyframes":
        for (const keyframe of rule.value.keyframes) {
          visitBlock(keyframe.declarations);
        }
        return;
      case "media":
      case "supports":
      case "layer-block":
      case "container":
        for (const nested of rule.value.rules) {
          visitRule(nested);
        }
        return;
      default:
        return;
    }
  };

  for (const rule of stylesheet.rules) visitRule(rule);

  const readOutsideDeclaringBlock = new Set<string>();
  for (const [block, read] of readsByBlock) {
    for (const name of read) {
      if (vars.has(name) && declaringBlock.get(name) !== block) {
        readOutsideDeclaringBlock.add(name);
      }
    }
  }

  return { declaredBy, readOutsideDeclaringBlock };
}
