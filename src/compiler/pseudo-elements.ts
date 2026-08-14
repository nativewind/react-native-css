import { isStyleFunction } from "../utilities";
import type { StyleDeclaration, StyleRule } from "./compiler.types";

// background-color, not color: in ::selection `color` is the selected TEXT, while
// selectionColor is the band painted behind it
export function modifyRuleForSelection(rule: StyleRule): StyleRule | undefined {
  if (!rule.d) {
    return;
  }

  rule.d = rule.d.flatMap((declaration): StyleDeclaration[] => {
    return modifyStyleDeclaration(
      declaration,
      "backgroundColor",
      "selectionColor",
    );
  });

  return rule;
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

  return rule;
}

// Map the one declaration the platform can express and drop the rest. A pseudo-element's
// declarations are scoped to it, so returning an unmapped one applies it to the real element
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

    return [];
  } else if (typeof declaration === "object") {
    const value = (declaration as Record<string, unknown>)[from];

    return value === undefined
      ? []
      : ([[value, [to]]] as unknown as StyleDeclaration[]);
  }

  return [];
}
