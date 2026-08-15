import { postProcessStyleFunction } from "../utilities";
import type { StyleDeclaration, StyleRule } from "./compiler.types";

/**
 * The one declaration each pseudo-element can express on the host component, and the
 * React Native prop it becomes.
 *
 * ::selection maps background-color, not color: in CSS `::selection { color }` is the
 * selected TEXT, while selectionColor is the band painted behind it
 */
const pseudoElementProp = {
  selection: ["backgroundColor", "selectionColor"],
  placeholder: ["color", "placeholderTextColor"],
} as const satisfies Record<string, readonly [string, string]>;

export type PseudoElement = keyof typeof pseudoElementProp;

const pseudoElements: PseudoElement[] = Object.keys(pseudoElementProp).filter(
  (key): key is PseudoElement => key in pseudoElementProp,
);

/**
 * What scoping does with each StyleRule field. A `selector` field describes which elements
 * the rule matches and is carried over; a `rebuilt` field is recomputed from the declarations
 * that survive; a `dropped` field belongs to the pseudo-element and never reaches the host.
 *
 * `satisfies` makes this total over StyleRule, so a new field fails to compile until it is
 * classified. That is what stops the next declaration-derived field escaping the
 * pseudo-element the way `v`, `c`, `dv` and `a` did while only `d` was rewritten
 */
export const pseudoElementFieldPolicy = {
  s: "selector",
  m: "selector",
  p: "selector",
  cq: "selector",
  aq: "selector",
  d: "rebuilt",
  dv: "rebuilt",
  v: "dropped",
  c: "dropped",
  a: "dropped",
  target: "dropped",
} as const satisfies Record<
  keyof StyleRule,
  "selector" | "rebuilt" | "dropped"
>;

export interface ScopedRule {
  /** The rule to register, or undefined when no declaration survived the scoping */
  rule: StyleRule | undefined;
  /** What the pseudo-element cannot express, in declaration order */
  dropped: string[];
}

export function getPseudoElement(
  pseudoElementQuery: string[],
): PseudoElement | undefined {
  for (const pseudoElement of pseudoElements) {
    if (pseudoElementQuery.includes(pseudoElement)) {
      return pseudoElement;
    }
  }

  return undefined;
}

/**
 * Rebuild a rule so it carries only what the pseudo-element can express: the one mapped
 * declaration, under the selector's own conditions. Every other declaration is the
 * pseudo-element's own and would paint the host element if it were carried over
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

  // `c` and `v` are the fields an authored declaration reaches without passing through `d`.
  // Every `c` entry comes from container-name, container-type or the container shorthand, so
  // the report names the family rather than picking one of the three. `v` is not reported at
  // all: it holds the compiler's own --__rn-css-* mirrors of a `d` declaration already
  // reported here alongside any authored custom property, so a `--x` written inside a
  // pseudo-element is dropped silently. `a` is only ever set beside the `d` entry that set
  // it, so it is already reported through that entry
  if (rule.c?.length) {
    dropped.push("container");
  }

  if (!declarations.length) {
    return { rule: undefined, dropped };
  }

  const scoped: StyleRule = { s: rule.s, d: declarations };

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
 * The React Native property a declaration writes, spelled the way the runtime reads it. A
 * leading `&` marks a path written at the top level rather than nested under its first
 * segment, so it is routing rather than part of the name, and a `[n]` segment is an index
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
