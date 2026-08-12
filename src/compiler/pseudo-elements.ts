import { isStyleFunction } from "../utilities";
import type { StyleDeclaration, StyleRule } from "./compiler.types";

/**
 * `::selection` maps `background-color` onto React Native's `selectionColor`.
 *
 * `background-color` rather than `color`, because they are opposites here: in
 * CSS, `color` inside `::selection` is the colour of the selected TEXT, while
 * React Native's `selectionColor` is the band painted BEHIND it. Mapping
 * `color` renders a stylesheet asking for white selected text as a white band,
 * leaving the text it meant to lighten sitting on top of it.
 */
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

/**
 * Map the ONE declaration the target platform can express, and DROP the rest.
 *
 * Dropping is the whole point. A pseudo-element's declarations are scoped to
 * the pseudo-element, so returning an unmapped one unchanged applies it to the
 * real element — `::selection { background-color: blue }` tinted the whole
 * control rather than the selection. `[]` is the correct answer for something
 * React Native has no prop for: not applying it is strictly better than
 * applying it somewhere else.
 */
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
