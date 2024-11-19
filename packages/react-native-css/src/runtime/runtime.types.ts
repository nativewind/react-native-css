import type {
  AnimationDirection,
  AnimationFillMode,
  AnimationPlayState,
  ContainerCondition,
  MediaQuery as CSSMediaQuery,
  Declaration,
  SelectorComponent,
} from "lightningcss";

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
  // c?: Container[];

  /**
   * Conditionals
   */

  /** MediaQuery */
  m?: MediaQuery[];
  /** PseudoClassesQuery */
  p?: PseudoClassesQuery;
  /** Container Query */
  q?: ContainerQuery[];
  /** Attribute Conditions */
  ac?: AttributeCondition[];

  /**
   * Animations and Transitions
   */

  /** Animations */
  a?: [AnimationAttributes] | [AnimationAttributes, StyleFunction];
  /** Transitions */
  t?: TransitionAttributes;
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

/***************************    Style Injection    ****************************/

export interface InjectStylesOptions {
  f?: FeatureFlagRecord;
  /** rem */
  r?: number;
  /** StyleRuleSets */
  s?: [string, StyleRuleSet][];
  /** KeyFrames */
  k?: [string, AnimationKeyframes][];
  /** Root Variables */
  vr?: [string, StyleDescriptor[]][];
  /** Universal Variables */
  vu?: [string, StyleDescriptor[]][];
}

type FeatureFlags = "";
export type FeatureFlagRecord = Partial<Record<FeatureFlags, boolean>>;

/******************************    Variables    *******************************/

export type VariableRecord = Record<string, StyleDescriptor[]>;
export type VariableDescriptor = [string, StyleDescriptor];

/******************************    Animations    ******************************/

export type AnimationAttributes = {
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
};

export type AnimationKeyframes =
  | [AnimationInterpolation[]]
  | [AnimationInterpolation[], AnimationEasing[]];

export type AnimationInterpolation =
  | [string, number[], StyleDescriptor[]]
  | [string, number[], StyleDescriptor[], number]
  | [string, number[], StyleDescriptor[], number, AnimationInterpolationType];

export type AnimationInterpolationType = "color" | "%" | undefined;
export type AnimationEasing = number | [number, EasingFunction];

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

export type TransitionAttributes = {
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

export type MediaQuery = CSSMediaQuery;

export interface PseudoClassesQuery {
  /** Hover */
  h?: 1;
  /** Active */
  a?: 1;
  /** Focus */
  f?: 1;
}

export interface ContainerQuery {
  /** Name */
  n?: string | null;
  /** Conditions */
  c?: ContainerCondition<Declaration>;
  /** PseudoClassesQuery */
  p?: PseudoClassesQuery;
  /** Attribute conditions */
  a?: AttributeCondition[];
}

export type AttributeCondition = PropCondition | DataAttributeCondition;

type AttributeSelectorComponent = Extract<
  SelectorComponent,
  { type: "attribute" }
>;
export type PropCondition = Omit<AttributeSelectorComponent, "operation"> & {
  operation?:
    | AttributeSelectorComponent["operation"]
    | {
        operator: "empty" | "truthy";
      };
};

export type DataAttributeCondition = Omit<PropCondition, "type"> & {
  type: "data-attribute";
};

/******************************    Specificity    *****************************/

/**
 * https://drafts.csswg.org/selectors/#specificity-rules
 *
 * This array is sorted by most common values when parsing a StyleSheet
 */
export type SpecificityArray = SpecificityValue[];
export type SpecificityValue = number | undefined;
