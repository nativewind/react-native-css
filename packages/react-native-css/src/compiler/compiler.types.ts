import type {
  AnimationDirection,
  AnimationFillMode,
  AnimationPlayState,
  MediaFeatureNameFor_ContainerSizeFeatureId,
  MediaFeatureNameFor_MediaFeatureId,
} from "lightningcss";

export interface CompilerOptions {
  inlineRem?: number | false;
  grouping?: (string | RegExp)[];
  selectorPrefix?: string;
  stylesheetOrder?: number;
  features?: FeatureFlagRecord;
  logger?: (message: string) => void;
  /** @internal */
  ignorePropertyWarningRegex?: (string | RegExp)[];
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
  s?: [string, StyleRuleSet][];
  /** KeyFrames */
  k?: [string, AnimationKeyframes][];
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
export type StyleRuleSet =
  | [StyleRule[]]
  | [StyleRule[] | undefined, StyleRule[]];

export interface StyleRule {
  /** Specificity */
  s: SpecificityArray;
  /** Declarations */
  d?: StyleDeclaration[];
  /** Variables */
  v?: VariableDescriptor[];
  /** Named Containers */
  c?: string[];

  /**
   * Conditionals
   */

  /** MediaQuery */
  m?: MediaCondition[];
  /** PseudoClassesQuery */
  p?: PseudoClassesQuery;
  /** Container Query */
  cq?: ContainerQuery;
  /** Attribute Conditions */
  aq?: AttributeQuery[];

  /**
   * Animations and Transitions
   */

  /** Animations */
  a?: AnimationWithDefault;
  /** Transitions */
  t?: TransitionRule;
}

export type StyleDeclaration =
  /** This is a static style object */
  | Record<string, StyleDescriptor>
  /** A style that needs to be set  */
  | [StyleDescriptor, StyleAttribute]
  /** A value that can only be computed at runtime */
  | [StyleFunction, StyleAttribute]
  /** A value that can only be computed at runtime, and only after styles have been calculated */
  | [StyleFunction, StyleAttribute, 1];

export type StyleAttribute = string | string[];
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
      undefined | StyleDescriptor[], // arguments
    ]
  | [
      Record<never, never>,
      string, // string
      undefined | StyleDescriptor[], // arguments
      1, // Should process after styles have been calculated
    ];

/******************************    Variables    *******************************/

export type VariableDescriptor = [string, StyleDescriptor];
export type VariableRecord = Record<string, LightDarkVariable>;
export type LightDarkVariable =
  | [StyleDescriptor]
  | [StyleDescriptor, StyleDescriptor];

/******************************    Animations    ******************************/

/**
 * An animation with a fallback style value
 */
export type AnimationWithDefault =
  | [AnimationRule]
  | [AnimationRule, StyleFunction];

/**
 * A CSS Animation rule
 */
export interface AnimationRule {
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

export type AnimationKeyframes =
  | [AnimationInterpolation[]]
  | [AnimationInterpolation[], AnimationEasing[]];

export type AnimationEasing = number | [number, EasingFunction];

export type AnimationInterpolation =
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
  // Plain
  | ["=", MediaFeatureNameFor_MediaFeatureId, StyleDescriptor]
  // Comparison
  | [
      "==",
      MediaFeatureNameFor_MediaFeatureId,
      StyleDescriptor,
      MediaFeatureComparison,
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
  c?: ContainerCondition;
  p?: PseudoClassesQuery;
  a?: AttributeQuery[];
}

export type ContainerCondition =
  // Boolean
  | ["!!", MediaFeatureNameFor_ContainerSizeFeatureId]
  // Not
  | ["!", ContainerCondition]
  // And
  | ["&", ContainerCondition[]]
  // Or
  | ["|", ContainerCondition[]]
  // Comparison
  | [
      MediaFeatureComparison,
      MediaFeatureNameFor_ContainerSizeFeatureId,
      StyleDescriptor,
    ]
  // [Start, End]
  | [
      "[]",
      MediaFeatureNameFor_ContainerSizeFeatureId,
      StyleDescriptor, // Start
      MediaFeatureComparison, // Start comparison
      StyleDescriptor, // End
      MediaFeatureComparison, // End comparison
    ];

/******************************    Specificity    *****************************/

/**
 * https://drafts.csswg.org/selectors/#specificity-rules
 *
 * This array is sorted by most common values when parsing a StyleSheet
 */
export type SpecificityArray = SpecificityValue[];
export type SpecificityValue = number | undefined;

/******************************    Compiler    ********************************/

type FeatureFlags = "";
export type FeatureFlagRecord = Partial<Record<FeatureFlags, boolean>>;

type DarkMode = ["media"] | ["class", string] | ["attribute", string];

/** @internal */
export type PathTokens = string | string[];
/** @internal */
export type StyleRuleMapping = Record<string, PathTokens | undefined>;

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
  rules: Map<string, StyleRule[]>;
  keyframes: Map<string, AnimationKeyframes>;
  grouping: RegExp[];
  darkMode?: DarkMode;
  rootVariables: VariableRecord;
  universalVariables: VariableRecord;
  flags: Record<string, unknown>;
  selectorPrefix?: string;
  appearanceOrder: number;
  rem?: number | boolean;
  varUsageCount: Map<string, number>;
}
