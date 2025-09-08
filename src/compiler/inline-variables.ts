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
