import type { ComponentProps, ComponentType } from "react";
import type {
  ColorSchemeName,
  ImageStyle,
  TextStyle,
  ViewStyle,
} from "react-native";

import type { makeMutable, SharedValue } from "react-native-reanimated";

import type {
  AnimationKeyframes,
  EasingFunction,
  LightDarkVariable,
  StyleDescriptor,
} from "../compiler";
import type { FlattenComponentProps, ReactComponent } from "./utils";

/********************************    Styles    ********************************/

export type InlineStyleRecord = Record<string, unknown> & {
  // Used to differentiate between InlineStyleRecord and StyleRule
  s?: never;
};

export type InlineStyle =
  | InlineStyleRecord
  | undefined
  | null
  | (Record<string, unknown> | undefined | null)[]
  | (() => unknown);

/******************************    Animations    ******************************/

export type Mutable<Value> = ReturnType<typeof makeMutable<Value>>;
export type AnimationMutable = Mutable<number>;

export type KeyFramesWithStyles = {
  animation: AnimationKeyframes;
  baseStyles: Record<string, any>;
};

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

/******************************    Transitions    *****************************/

export type Transition = [string | string[], Mutable<any>];

/**********************************    API    *********************************/

export type Styled = <
  const C extends ReactComponent<any>,
  const M extends StyledConfiguration<C>,
>(
  component: C,
  mapping: M & StyledConfiguration<C>,
  options?: StyledOptions,
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

export type StyledConfiguration<C extends ReactComponent<any>> = Record<
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

export type StyledOptions = {
  passThrough?: boolean;
};

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
