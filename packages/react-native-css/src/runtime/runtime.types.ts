import { ComponentProps, ComponentType } from "react";
import type {
  ColorSchemeName,
  ImageStyle,
  TextStyle,
  ViewStyle,
} from "react-native";

import type {
  AnimationDirection,
  AnimationFillMode,
  AnimationPlayState,
  ContainerCondition,
  MediaQuery as CSSMediaQuery,
  Declaration,
  MediaFeatureId,
  MediaFeatureNameFor_MediaFeatureId,
  Operator,
  Qualifier,
  SelectorComponent,
} from "lightningcss";
import type { makeMutable, SharedValue } from "react-native-reanimated";

import type { FlattenComponentProps, ReactComponent } from "./utils";

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

export type InlineStyle =
  | Record<string, unknown>
  | undefined
  | null
  | (Record<string, unknown> | undefined | null)[];

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

export type Mutable<Value> = ReturnType<typeof makeMutable<Value>>;
export type AnimationMutable = Mutable<number>;

export type Animation = {
  animation: AnimationKeyframes;
  baseStyles: Record<string, any>;
};

export type AnimationKeyframes =
  | [AnimationInterpolation[]]
  | [AnimationInterpolation[], AnimationEasing[]];

export type AnimationInterpolation =
  | [string, number[], StyleDescriptor[]]
  | [string, number[], StyleDescriptor[], number]
  | [string, number[], StyleDescriptor[], number, AnimationInterpolationType];

export type AnimationInterpolationType = "color" | "%" | undefined;

export type SharedValueInterpolation = [
  SharedValue<number>,
  AnimationInterpolation[],
];

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

export type Transition = [string | string[], Mutable<any>];

export type TransitionDeclarations = {
  transition?: TransitionAttributes;
  sharedValues?: Map<string, Mutable<any>>;
};

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

export type MediaQuery =
  // Boolean
  | ["!!", MediaFeatureNameFor_MediaFeatureId]
  // Not
  | ["!", MediaQuery]
  // And
  | ["&", MediaQuery[]]
  // Or
  | ["|", MediaQuery[]]
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

/**********************************    API    *********************************/

export type Styled = <
  const C extends ReactComponent<any>,
  const M extends StyledOptions<C>,
>(
  component: C,
  mapping: M & StyledOptions<C>,
) => ComponentType<
  ComponentProps<C> & {
    [K in keyof M as K extends string
      ? M[K] extends undefined | false
        ? never
        : M[K] extends true | FlattenComponentProps<C>
          ? K
          : M[K] extends
                | {
                    target: FlattenComponentProps<C> | true;
                  }
                | {
                    target: false;
                    nativeStyleToProp: Record<string, unknown>;
                  }
            ? K
            : never
      : never]?: string;
  }
>;

export type StyledOptions<C extends ReactComponent<any>> = Record<
  string,
  | boolean
  | FlattenComponentProps<C>
  | {
      target: false;
      nativeStyleToProp: {
        [K in
          | (keyof RNStyle & string)
          | "fill"
          | "stroke"]?: K extends FlattenComponentProps<C>
          ? FlattenComponentProps<C> | true
          : FlattenComponentProps<C>;
      };
    }
  | {
      target: FlattenComponentProps<C> | true;
      nativeStyleToProp?: {
        [K in
          | (keyof RNStyle & string)
          | "fill"
          | "stroke"]?: K extends FlattenComponentProps<C>
          ? FlattenComponentProps<C> | true
          : FlattenComponentProps<C>;
      };
    }
>;

/*********************************    JSX    **********************************/

export type JSXFunction = (
  type: React.ComponentType,
  props: Record<string, any> | undefined | null,
  key?: React.Key,
  isStaticChildren?: boolean,
  __source?: unknown,
  __self?: unknown,
) => React.ReactNode;

/*********************************    Misc    *********************************/

export type Props = Record<string, any> | undefined | null;
export type Callback = () => void;
export type RNStyle = ViewStyle & TextStyle & ImageStyle;

/********************************    Globals    ********************************/

export type ColorScheme = {
  get: () => ColorSchemeName;
  set: (value: ColorSchemeName) => void;
};
