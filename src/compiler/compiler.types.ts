/* eslint-disable */
import type { Debugger } from "debug";
import type {
  MediaFeatureNameFor_MediaFeatureId,
  TokenOrValue,
} from "lightningcss";

import { VAR_SYMBOL } from "../native/reactivity";

export interface CompilerOptions {
  filename?: string;
  projectRoot?: string;
  inlineRem?: number | false;
  inlineVariables?: false | InlineVariableOptions;
  selectorPrefix?: string;
  stylesheetOrder?: number;
  features?: FeatureFlagRecord;
  logger?: (message: string) => void | Debugger;
  hexColors?: boolean;
  colorPrecision?: number;
}

export interface InlineVariableOptions {
  exclude?: `--${string}`[];
}

/**
 * A `react-native-css` StyleSheet
 */
export interface ReactNativeCssStyleSheet {
  /** Feature flags */
  f?: FeatureFlagRecord;
  /** rem */
  r?: number;
  /** StyleRuleSets */
  s?: (readonly [string, StyleRuleSet])[];
  /** KeyFrames */
  k?: Animation[];
  /** Root Variables */
  vr?: RootVariables;
  /** Universal Variables */
  vu?: RootVariables;
}

/********************************    Styles    ********************************/

/**
 * The JS representation of a style object
 *
 * This CSS rule is a single StyleRuleSet, made up of multiple StyleRules
 *
 * ```css
 * .my-class {
 *   color: red;
 * }
 * ```
 * Properties are split into normal and important properties, and then split
 * into different StyleRules depending on their specificity, conditions, etc
 */
export type StyleRuleSet = StyleRule[];

export interface StyleRule {
  /** Specificity */
  s: SpecificityArray;
  /** Declarations */
  d?: StyleDeclaration[];
  /** Variables */
  v?: VariableDescriptor[];
  /** Named Containers */
  c?: string[];

  /** Declarations use variables */
  dv?: number;

  // Target override
  target?: string | string[] | false;

  /**
   * Conditionals
   */

  /** MediaQuery */
  m?: MediaCondition[];
  /** PseudoClassesQuery */
  p?: PseudoClassesQuery;
  /** Container Query */
  cq?: ContainerQuery[];
  /** Attribute Conditions */
  aq?: AttributeQuery[];

  /**
   * Animations and Transitions
   */

  /** Animations */
  a?: boolean;
}

export type StyleDeclaration =
  /** This is a static style object */
  | Record<string, StyleDescriptor>
  /** A style that needs to be set  */
  | [StyleDescriptor, string | string[]]
  /** A value that can only be computed at runtime, and only after styles have been calculated */
  | [StyleDescriptor, string | string[], 1];

export type StyleDescriptor =
  | string
  | number
  | boolean
  | undefined
  | StyleFunction
  | StyleDescriptor[];

export type StyleFunction =
  | [
      Record<never, never>,
      string, // string
    ]
  | readonly [
      Record<never, never>,
      string, // string
    ]
  | [
      Record<never, never>,
      string, // string
      StyleDescriptor, // arguments
    ]
  | readonly [
      Record<never, never>,
      string, // string
      StyleDescriptor, // arguments
    ]
  | [
      Record<never, never>,
      string, // string
      StyleDescriptor, // arguments
      1, // Should process after styles have been calculated
    ]
  | readonly [
      Record<never, never>,
      string, // string
      StyleDescriptor, // arguments
      1, // Should process after styles have been calculated
    ];

/******************************    Variables    *******************************/

export type VariableDescriptor = [string, StyleDescriptor];
export type VariableRecord = Record<string, VariableValue[]>;
export type VariableValue =
  | [StyleDescriptor]
  | [StyleDescriptor, MediaCondition[]];

export type RootVariables = [string, VariableValue[]][];

export type InlineVariable = {
  [VAR_SYMBOL]: "inline";
  [key: string]: unknown | undefined;
};

export type UniqueVarInfo = {
  count: number;
  value: TokenOrValue[] | undefined;
  flat?: true;
};

/******************************   Animations  ******************************/

export type Animation = [string, AnimationKeyframes[]];
export type AnimationRecord = Record<string, AnimationKeyframes[]>;
export type AnimationKeyframes = [string | number, StyleDeclaration[]];

/******************************    Conditions    ******************************/

export type MediaCondition =
  // Boolean
  | ["!!", MediaFeatureNameFor_MediaFeatureId]
  // Not
  | ["!", MediaCondition]
  // And
  | ["&", MediaCondition[]]
  // Or
  | ["|", MediaCondition[]]
  // Comparison
  | [
      MediaFeatureComparison,
      MediaFeatureNameFor_MediaFeatureId | "dir",
      StyleDescriptor,
    ]
  // [Start, End]
  | [
      "[]",
      MediaFeatureNameFor_MediaFeatureId,
      StyleDescriptor, // Start
      MediaFeatureComparison, // Start comparison
      StyleDescriptor, // End
      MediaFeatureComparison, // End comparison
    ];

export type MediaFeatureComparison = "=" | ">" | ">=" | "<" | "<=";

export interface PseudoClassesQuery {
  /** Hover */
  h?: 1;
  /** Active */
  a?: 1;
  /** Focus */
  f?: 1;
}

type AttributeQueryType =
  | "a" // Attribute
  | "d"; // Data-Attribute

export type AttributeQuery =
  | [AttributeQueryType, string] // Exists
  | [AttributeQueryType, string, "!"] // Falsy
  | [AttributeQueryType, string, AttrSelectorOperator, string] // Use operator
  | [AttributeQueryType, string, AttrSelectorOperator, string, "i" | "s"]; // Case sensitivity

export type AttrSelectorOperator = "=" | "~=" | "|=" | "^=" | "$=" | "*=";

/******************************    Containers    *****************************/

export interface ContainerQuery {
  /** Name */
  n?: string | null;
  m?: MediaCondition;
  p?: PseudoClassesQuery;
  a?: AttributeQuery[];
}

/******************************    Specificity    *****************************/

/**
 * https://drafts.csswg.org/selectors/#specificity-rules
 *
 * This array is sorted by most common values when parsing a StyleSheet
 */
export type SpecificityArray = SpecificityValue[];
export type SpecificityValue = number | undefined;

/******************************    Compiler    ********************************/

type FeatureFlags = never;
export type FeatureFlagRecord = Partial<Record<FeatureFlags, boolean>>;

/** @internal */
export type PathTokens = string | string[];
/** @internal */
export type StyleRuleMapping = Record<string, PathTokens>;

/**
 * @internal
 */
export type LoggerOptions = {
  logger: (message: string) => void;
};

/**
 * @internal
 */
export interface CompilerCollection extends CompilerOptions {
  features: FeatureFlagRecord;
  rules: Map<string, StyleRule[]>;
  keyframes: Map<string, AnimationKeyframes[]>;
  darkMode?: string | null;
  rootVariables: VariableRecord;
  universalVariables: VariableRecord;
  selectorPrefix?: string;
  appearanceOrder: number;
  rem?: number | boolean;
  varUsageCount: Map<string, number>;
}
