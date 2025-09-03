import type { Declaration, DeclarationBlock, StyleSheet } from "lightningcss";

import type { UniqueVarInfo } from "./compiler.types";

export function inlineVariables(
  stylesheet: StyleSheet,
  vars: Map<string, UniqueVarInfo>,
) {
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
        return rule;
      case "style":
        rule.value.declarations = replaceDeclarationBlock(
          rule.value.declarations,
          vars,
        );
        return rule;
      case "nested-declarations":
      case "supports":
      case "layer-block":
      case "container":
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
    if (part.type === "var") {
      const varInfo = vars.get(part.value.name.ident);

      if (!varInfo) {
        return part;
      }

      return varInfo.value;
    }
    return part;
  });

  return declaration;
}
