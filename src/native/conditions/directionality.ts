// An element's directionality is HTML's dir, which :dir() matches and descendants inherit (Selectors 4 §7.1); auto would need the element's text, so it is not a value here
import { I18nManager } from "react-native";

import type { StyleRule } from "react-native-css/compiler";
import { uaSpecificity } from "react-native-css/utilities";

import type { VariableContextValue } from "../reactivity";

export type Directionality = "ltr" | "rtl";

const DECLARED_DIRECTIONS = ["ltr", "rtl", "ltr rtl", "rtl ltr"] as const;

/** The directions declared on an element and its ancestors, the nearest first */
export type DeclaredDirections = (typeof DECLARED_DIRECTIONS)[number];

export interface ElementDirectionality {
  readonly declared: Directionality | undefined;
  readonly inherited: DeclaredDirections | undefined;
}

export const DECLARED_DIRECTIONS_VARIABLE = "__rn-css-declared-directions";

export const NO_DECLARATIONS: ElementDirectionality = {
  declared: undefined,
  inherited: undefined,
};

const DECLARATIONS: Record<
  DeclaredDirections,
  readonly [Directionality, ...Directionality[]]
> = {
  "ltr": ["ltr"],
  "rtl": ["rtl"],
  "ltr rtl": ["ltr", "rtl"],
  "rtl ltr": ["rtl", "ltr"],
};

const BENEATH_THE_OPPOSITE: Record<Directionality, DeclaredDirections> = {
  ltr: "ltr rtl",
  rtl: "rtl ltr",
};

// The user-agent rule [dir] { direction } (HTML §15.3.5), with writingDirection as its text twin
const UA_DIRECTION_RULES: Record<Directionality, StyleRule> = {
  ltr: { s: uaSpecificity, d: [{ direction: "ltr", writingDirection: "ltr" }] },
  rtl: { s: uaSpecificity, d: [{ direction: "rtl", writingDirection: "rtl" }] },
};

// React Native has no document element: the platform's layout direction is the root's directionality, and no element's dir
export function resolveRootDirectionality(): Directionality {
  return I18nManager.isRTL ? "rtl" : "ltr";
}

export function resolveDeclaredDirectionality(
  value: unknown,
): Directionality | undefined {
  return value === "ltr" || value === "rtl" ? value : undefined;
}

export function resolveInheritedDirections(
  inheritedVariables: VariableContextValue,
): DeclaredDirections | undefined {
  const value = inheritedVariables[DECLARED_DIRECTIONS_VARIABLE];
  return DECLARED_DIRECTIONS.find((directions) => directions === value);
}

export function resolveDirectionality({
  declared,
  inherited,
}: ElementDirectionality): Directionality {
  return (
    declared ??
    (inherited === undefined
      ? resolveRootDirectionality()
      : DECLARATIONS[inherited][0])
  );
}

export function isDeclaredByAncestor(
  { inherited }: ElementDirectionality,
  direction: Directionality,
): boolean {
  return inherited !== undefined && DECLARATIONS[inherited].includes(direction);
}

export function resolvePublishedDirections(
  declared: Directionality,
  inherited: DeclaredDirections | undefined,
): DeclaredDirections {
  const isOppositeDeclaredAbove =
    inherited !== undefined &&
    DECLARATIONS[inherited].some((direction) => direction !== declared);
  return isOppositeDeclaredAbove ? BENEATH_THE_OPPOSITE[declared] : declared;
}

export function resolveUaDirectionRule(
  directionality: Directionality,
): StyleRule {
  return UA_DIRECTION_RULES[directionality];
}
