import { postProcessStyleFunction } from "../utilities";
import type {
  PseudoElement,
  StyleDeclaration,
  StyleRule,
} from "./compiler.types";

/**
 * The one declaration each pseudo-element can express on the host component, and the React
 * Native prop it becomes. `::selection { color }` is the selected text, while selectionColor
 * is the band behind it, so ::selection maps background-color
 */
const pseudoElementProp = {
  selection: ["backgroundColor", "selectionColor"],
  placeholder: ["color", "placeholderTextColor"],
} as const satisfies Record<PseudoElement, readonly [string, string]>;

/**
 * What scoping does with each StyleRule field: a `carried` field is kept as it is, a `rebuilt`
 * field is recomputed for the pseudo-element, and a `dropped` field never reaches the host.
 * Typed over every StyleRule field, so a new one fails to compile until it is classified
 */
export const pseudoElementFieldPolicy = {
  s: "carried",
  m: "carried",
  p: "carried",
  cq: "carried",
  aq: "carried",
  v: "carried",
  d: "rebuilt",
  dv: "rebuilt",
  pe: "rebuilt",
  c: "dropped",
  a: "dropped",
  target: "dropped",
} as const satisfies Record<keyof StyleRule, "carried" | "rebuilt" | "dropped">;

export interface ScopedRule {
  /** The rule to register, or undefined when the pseudo-element is left with nothing */
  rule: StyleRule | undefined;
  /** What the pseudo-element cannot express, in declaration order */
  dropped: string[];
}

/**
 * Rebuild a rule as the pseudo-element's own: the one declaration it can express and the
 * variables it declares, under the selector's own conditions. Anything else would style the
 * host element
 */
export function scopeRuleToPseudoElement(
  rule: StyleRule,
  pseudoElement: PseudoElement,
): ScopedRule {
  const [from, to] = pseudoElementProp[pseudoElement];

  const declarations: StyleDeclaration[] = [];
  const dropped: string[] = [];

  for (const declaration of rule.d ?? []) {
    scopeDeclaration(declaration, from, to, declarations, dropped);
  }

  // container-name, container-type and the container shorthand all record only the name
  if (rule.c?.length) {
    dropped.push("container");
  }

  if (!declarations.length && !rule.v?.length) {
    return { rule: undefined, dropped };
  }

  const scoped: StyleRule = { s: rule.s, pe: pseudoElement };

  if (declarations.length) scoped.d = declarations;
  if (rule.v?.length) scoped.v = rule.v;
  if (rule.m) scoped.m = rule.m;
  if (rule.p) scoped.p = rule.p;
  if (rule.cq) scoped.cq = rule.cq;
  if (rule.aq) scoped.aq = rule.aq;

  if (declarations.some(usesVariables)) {
    scoped.dv = 1;
  }

  return { rule: scoped, dropped };
}

function scopeDeclaration(
  declaration: StyleDeclaration,
  from: string,
  to: string,
  declarations: StyleDeclaration[],
  dropped: string[],
): void {
  if (Array.isArray(declaration)) {
    const property = toPropertyName(declaration[1]);

    if (property !== from) {
      dropped.push(property);
      return;
    }

    declarations.push(
      declaration.length === 3
        ? [declaration[0], [to], declaration[2]]
        : [declaration[0], [to]],
    );

    return;
  }

  for (const [property, value] of Object.entries(declaration)) {
    if (property === from) {
      declarations.push([value, [to]]);
    } else {
      dropped.push(property);
    }
  }
}

/**
 * The React Native property a declaration writes, spelled the way the runtime reads it: a
 * leading `&` routes the path to the top level and `[n]` is an index
 */
function toPropertyName(path: string | string[]): string {
  if (!Array.isArray(path)) {
    return path;
  }

  return path.reduce((name, segment, index) => {
    if (index === 0 && segment === "&") {
      return name;
    }

    if (segment.startsWith("[")) {
      return `${name}${segment}`;
    }

    return name ? `${name}.${segment}` : segment;
  }, "");
}

function usesVariables(declaration: StyleDeclaration): boolean {
  return (
    Array.isArray(declaration) && postProcessStyleFunction(declaration[0])[1]
  );
}
