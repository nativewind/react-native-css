import type {
  Declaration,
  DeclarationBlock,
  StyleSheet,
  TokenOrValue,
} from "lightningcss";

import type { UniqueVarInfo } from "./compiler.types";
import { soleCSSWideKeyword } from "./css-wide-keywords";

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
            replaceDeclarationBlock(keyframe.declarations, vars) ??
            keyframe.declarations;

          return keyframe;
        });
        return rule;
      case "style":
        rule.value.declarations = replaceDeclarationBlock(
          rule.value.declarations,
          vars,
        );

        rule.value.rules = rule.value.rules?.flatMap((rule) => checkRule(rule));

        return rule;
      case "nested-declarations":
        rule.value.declarations =
          replaceDeclarationBlock(rule.value.declarations, vars) ?? {};
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
) {
  if (!block) return;

  block.declarations = block.declarations
    ?.map((decl) => {
      return replaceDeclaration(decl, vars);
    })
    .filter((d) => !!d);

  block.importantDeclarations = block.importantDeclarations
    ?.map((decl) => {
      return replaceDeclaration(decl, vars);
    })
    .filter((d) => !!d);

  return block;
}

function replaceDeclaration(
  declaration: Declaration,
  vars: Map<string, UniqueVarInfo>,
) {
  if (
    declaration.property !== "unparsed" &&
    declaration.property !== "custom"
  ) {
    return declaration;
  }

  if (declaration.property === "custom" && vars.has(declaration.value.name)) {
    return;
  }

  const value = readsGuaranteedInvalid(declaration.value.value, vars)
    ? undefined
    : declaration.value.value.flatMap((part) => flattenPart(part, vars));

  // css-variables-1 §3.1: a declaration a var() leaves without a value is invalid at computed-value time, as if its value were `unset`, and a custom property's is the guaranteed-invalid value
  if (
    value === undefined ||
    (declaration.property === "unparsed" && substitutesNothing(value))
  ) {
    declaration.value.value = [
      keywordToken(declaration.property === "custom" ? "initial" : "unset"),
    ];
    return declaration;
  }

  declaration.value.value = value;

  return declaration;
}

function substitutesNothing(parts: readonly TokenOrValue[]): boolean {
  return parts.every(
    (part) => part.type === "token" && part.value.type === "white-space",
  );
}

function readsGuaranteedInvalid(
  parts: readonly TokenOrValue[],
  vars: Map<string, UniqueVarInfo>,
): boolean {
  return parts.some((part) => {
    if (part.type === "var") {
      const varInfo = vars.get(part.value.name.ident);

      if (varInfo === undefined || varInfo.value !== undefined) {
        return false;
      }

      return part.value.fallback
        ? readsGuaranteedInvalid(part.value.fallback, vars)
        : true;
    } else if (part.type === "function") {
      return readsGuaranteedInvalid(part.value.arguments, vars);
    }

    return false;
  });
}

function keywordToken(keyword: "initial" | "unset"): TokenOrValue {
  return { type: "token", value: { type: "ident", value: keyword } };
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
  path = new Set<string>(),
) {
  if (path.has(name)) {
    // css-variables-1 §2.3: every variable in a cycle is the guaranteed-invalid value, which the runtime's cycle guard answers
    leaveCycleToRuntime(name, path, vars);
    return;
  }

  const varInfo = vars.get(name);

  if (!varInfo || varInfo.flat) {
    return;
  }

  const parts = varInfo.value;

  // Each variable the value reads is flattened before the value substitutes it, whichever was declared first
  path.add(name);
  for (const readName of readVariableNames(parts)) {
    flattenVar(readName, vars, path);
  }
  path.delete(name);

  if (!vars.has(name)) {
    return;
  }

  const keyword = soleCSSWideKeyword(parts)?.keyword;

  if (keyword !== undefined && keyword !== "initial") {
    // The parent's value, which only the runtime knows
    vars.delete(name);
    return;
  }

  // css-variables-1 §2.2, §3.1: `initial`, and a value that reads the guaranteed-invalid value, are the guaranteed-invalid value, which no var() substitutes
  const value =
    keyword === "initial" || readsGuaranteedInvalid(parts, vars)
      ? undefined
      : parts.flatMap((part) => flattenPart(part, vars));

  vars.set(name, { count: 1, flat: true, value });
}

function leaveCycleToRuntime(
  reentered: string,
  path: ReadonlySet<string>,
  vars: Map<string, UniqueVarInfo>,
) {
  let inCycle = false;

  for (const name of path) {
    inCycle ||= name === reentered;

    if (inCycle) {
      vars.delete(name);
    }
  }
}

// The names `flattenPart` substitutes: each var(), its fallback's, and those inside a function's arguments
function readVariableNames(
  parts: readonly TokenOrValue[],
  names = new Set<string>(),
): ReadonlySet<string> {
  for (const part of parts) {
    if (part.type === "var") {
      names.add(part.value.name.ident);
      readVariableNames(part.value.fallback ?? [], names);
    } else if (part.type === "function") {
      readVariableNames(part.value.arguments, names);
    }
  }

  return names;
}
