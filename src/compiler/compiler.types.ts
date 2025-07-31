/* eslint-disable */
import type { Debugger } from "debug";
import type {
  AnimationDirection,
  AnimationFillMode,
  AnimationPlayState,
  MediaFeatureNameFor_MediaFeatureId,
} from "lightningcss";

import { VAR_SYMBOL } from "../runtime/native/reactivity";

export interface CompilerOptions {
  inlineRem?: number | false;
  grouping?: (string | RegExp)[];
  selectorPrefix?: string;
  stylesheetOrder?: number;
  features?: FeatureFlagRecord;
  logger?: (message: string) => void | Debugger;
  /** Strip unused variables declarations. Defaults: false */
  stripUnusedVariables?: boolean;
  /** @internal */
  ignorePropertyWarningRegex?: (string | RegExp)[];
  preserveVariables?: boolean;
  hexColors?: boolean;
  colorPrecision?: number;
}

/**
 * A `react-native-css` StyleSheet
 */
export type ReactNativeCssStyleSheet = ReactNativeCssStyleSheet_V2;

export interface ReactNativeCssStyleSheet_V2 {
  /** Feature flags */
  f?: FeatureFlagRecord;
  /** rem */
  r?: number;
  /** StyleRuleSets */
  s?: (readonly [string, StyleRuleSet])[];
  /** KeyFrames */
  k?: Animation_V2[];
  /** Root Variables */
  vr?: [string, LightDarkVariable][];
  /** Universal Variables */
  vu?: [string, LightDarkVariable][];
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
  /** A value that can only be computed at runtime */
  | [StyleFunction, string | string[]]
  /** A value that can only be computed at runtime, and only after styles have been calculated */
  | [StyleFunction, string | string[], 1];

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
  | [
      Record<never, never>,
      string, // string
      StyleDescriptor, // arguments
    ]
  | [
      Record<never, never>,
      string, // string
      StyleDescriptor, // arguments
      1, // Should process after styles have been calculated
    ];

/******************************    Variables    *******************************/

export type VariableDescriptor = [string, StyleDescriptor];
export type VariableRecord = Record<string, LightDarkVariable>;
export type LightDarkVariable =
  | [StyleDescriptor]
  | [StyleDescriptor, StyleDescriptor];

export type InlineVariable = {
  [VAR_SYMBOL]: "inline";
  [key: string]: unknown | undefined;
};

/******************************   Animations V1  ******************************/

/**
 * An animation with a fallback style value
 */
export type AnimationWithDefault_V1 =
  | [AnimationRule_V1]
  | [AnimationRule_V1, StyleFunction];

/**
 * A CSS Animation rule
 */
export interface AnimationRule_V1 {
  /**
   * The animation delay.
   */
  de?: number[];
  /**
   * The direction of the animation.
   */
  di?: AnimationDirection[];
  /**
   * The animation duration.
   */
  du?: number[];
  /**
   * The animation fill mode.
   */
  f?: AnimationFillMode[];
  /**
   * The number of times the animation will run.
   */
  i?: number[];
  /**
   * The animation name.
   */
  n?: string[];
  /**
   * The current play state of the animation.
   */
  p?: AnimationPlayState[];
  /**
   * The animation timeline.
   */
  t?: never[];
  /**
   * The easing function for the animation.
   */
  e?: EasingFunction[];
}

export type AnimationKeyframes_V1 =
  | [AnimationInterpolation_V1[]]
  | [AnimationInterpolation_V1[], AnimationEasing[]];

export type AnimationEasing = number | [number, EasingFunction];

export type AnimationInterpolation_V1 =
  | [string, number[], StyleDescriptor[]]
  | [string, number[], StyleDescriptor[], number]
  | [string, number[], StyleDescriptor[], number, AnimationInterpolationType];

export type AnimationInterpolationType = "color" | "%" | undefined;

export type EasingFunction =
  | "linear"
  | "ease"
  | "ease-in"
  | "ease-out"
  | "ease-in-out"
  | {
      type: "cubic-bezier";
      /**
       * The x-position of the first point in the curve.
       */
      x1: number;
      /**
       * The x-position of the second point in the curve.
       */
      x2: number;
      /**
       * The y-position of the first point in the curve.
       */
      y1: number;
      /**
       * The y-position of the second point in the curve.
       */
      y2: number;
    }
  | {
      type: "steps";
      /**
       * The number of intervals in the function.
       */
      c: number;
      /**
       * The step position.
       */
      p?: "start" | "end" | "jump-none" | "jump-both";
    };

/******************************   Animations V2  ******************************/

export type Animation_V2 = [string, AnimationKeyframes_V2[]];
export type AnimationRecord = Record<string, AnimationKeyframes_V2[]>;
export type AnimationKeyframes_V2 = [string | number, StyleDeclaration[]];

/******************************    Transitions    *****************************/

export type TransitionRule = {
  /**
   * Delay before the transition starts in milliseconds.
   */
  de?: number[];
  /**
   * Duration of the transition in milliseconds.
   */
  du?: number[];
  /**
   * Property to transition.
   */
  p?: string[];
  /**
   * Easing function for the transition.
   */
  e?: EasingFunction[];
};

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
      MediaFeatureNameFor_MediaFeatureId | MediaFeatureNameFor_MediaFeatureId,
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
  keyframes: Map<string, AnimationKeyframes_V1 | AnimationKeyframes_V2[]>;
  darkMode?: string | null;
  rootVariables: VariableRecord;
  universalVariables: VariableRecord;
  selectorPrefix?: string;
  appearanceOrder: number;
  rem?: number | boolean;
  varUsageCount: Map<string, number>;
}
