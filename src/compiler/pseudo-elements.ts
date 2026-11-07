import { INHERITED_COLOR_VARIABLE, isStyleFunction } from "../utilities";
import type { StyleDeclaration, StyleRule } from "./compiler.types";

export function modifyRuleForSelection(rule: StyleRule): StyleRule | undefined {
  if (!rule.d) {
    return;
  }

  rule.d = rule.d.flatMap((declaration): StyleDeclaration[] => {
    return modifyStyleDeclaration(declaration, "color", "selectionColor");
  });

  return withoutInheritedColor(rule);
}

export function modifyRuleForPlaceholder(
  rule: StyleRule,
): StyleRule | undefined {
  if (!rule.d) {
    return;
  }

  rule.d = rule.d.flatMap((declaration): StyleDeclaration[] => {
    return modifyStyleDeclaration(declaration, "color", "placeholderTextColor");
  });

  return withoutInheritedColor(rule);
}

// A pseudo-element's colour is its own, so the element and its subtree keep theirs
function withoutInheritedColor(rule: StyleRule): StyleRule {
  const variables = rule.v?.filter(
    ([name]) => name !== INHERITED_COLOR_VARIABLE,
  );

  if (variables?.length) {
    rule.v = variables;
  } else {
    delete rule.v;
  }

  return rule;
}

function modifyStyleDeclaration(
  declaration: StyleDeclaration,
  from: string,
  to: string,
): StyleDeclaration[] {
  if (Array.isArray(declaration)) {
    if (isStyleFunction(declaration) && declaration[2] === from) {
      declaration = [...declaration] as StyleDeclaration;
      declaration[2] = [to];
      return [declaration];
    } else if (declaration[1] === from) {
      declaration = [...declaration] as StyleDeclaration;
      declaration[1] = [to];
      return [declaration];
    }
  } else if (typeof declaration === "object") {
    const { color: selectionColor, ...rest } = declaration;

    if (selectionColor) {
      return [rest, [selectionColor, [to]]] as StyleDeclaration[];
    }
  }

  return [declaration];
}
