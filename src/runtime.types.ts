/* eslint-disable @typescript-eslint/no-explicit-any */
import type {
  ClassicComponentClass,
  ComponentClass,
  ComponentProps,
  ComponentType,
  ForwardRefExoticComponent,
  FunctionComponent,
  ReactElement,
} from "react";
import type {
  ColorSchemeName,
  ImageStyle,
  TextStyle,
  ViewStyle,
} from "react-native";

import type { DotNotation, ResolveDotPath } from "react-native-css/utilities";

/********************************     API      ********************************/

export type StyledReactElement<
  C extends ReactComponent,
  M extends StyledConfiguration<C>,
> = ReactElement<
  ComponentProps<C> & {
    [K in keyof M as K extends string
      ? M[K] extends undefined | false
        ? never
        : M[K] extends true | string | object
          ? K
          : never
      : never]?: string;
  }
>;

export type StyledProps<P, M extends StyledConfiguration<any>> = P & {
  [K in keyof M as K extends string
    ? M[K] extends undefined | false
      ? never
      : M[K] extends true | string | object
        ? K
        : never
    : never]?: string;
};

export type Styled = <
  const C extends ReactComponent,
  const M extends StyledConfiguration<C>,
>(
  component: C,
  mapping: M & StyledConfiguration<C>,
  options?: StyledOptions,
) => StyledComponent<C, M>;

type StyledComponent<
  C extends ReactComponent,
  M extends StyledConfiguration<C>,
> = ComponentType<
  ComponentProps<C> & {
    [K in keyof M as K extends string
      ? M[K] extends undefined | false
        ? never
        : M[K] extends true | string | object
          ? K
          : never
      : never]?: string;
  }
>;

export type StyledConfiguration<
  C extends ReactComponent,
  K extends string = string,
> = Record<
  K,
  | boolean
  | ComponentPropsDotNotation<C>
  | StyledConfigurationObject<C, ComponentPropsDotNotation<C> | false>
>;

interface StyledConfigurationObject<
  C extends ReactComponent,
  T extends ComponentPropsDotNotation<C> | false,
> {
  target: T;
  nativeStyleMapping?: T extends false
    ? NativeStyleMapping<string, ComponentProps<C>>
    : NativeStyleMapping<
        ResolveDotPath<T, ComponentProps<C>>,
        ComponentProps<C>
      >;
  /** @deprecated Please use nativeStyleMapping */
  nativeStyleToProp?: NativeStyleMapping<
    ResolveDotPath<T, ComponentProps<C>>,
    ComponentProps<C>
  >;
}

type NativeStyleMapping<T, S> = T extends object
  ? {
      [K in keyof T as K extends string ? K : never]: true | DotNotation<S>;
    } & {
      fill?: true | DotNotation<S>;
      stroke?: true | DotNotation<S>;
    }
  : Record<string, true | DotNotation<S>>;

export interface StyledOptions {
  passThrough?: boolean;
}

/***************************     React Helpers      ***************************/

export type ReactComponent<P = any> =
  // eslint-disable-next-line @typescript-eslint/no-deprecated
  | ClassicComponentClass<P>
  | ComponentClass<P>
  | FunctionComponent<P>
  | ForwardRefExoticComponent<P>;

export type ComponentPropsDotNotation<C extends ReactComponent> = DotNotation<
  ComponentProps<C>
>;

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

/*******************************    Variables    ******************************/

/**
 * A value a CSS custom property can be given from JavaScript, via `vars()` or
 * `<VariableContextProvider />`.
 *
 * Both platforms are written against this one type. A custom property holds a
 * token stream on web and a structured value on native, so the type is the set
 * of values both can honour:
 *
 * - An array is a comma-separated CSS list — a `font-family` stack, a
 *   `transition-property` list. A value whose parts are separated by spaces (a
 *   `box-shadow`, a `transform`) is a single string.
 * - `undefined` leaves the property unset, so an ancestor's value inherits.
 *
 * A `StyleDescriptor` is wider than this: it also covers the `StyleFunction`
 * tuples the compiler emits for `var()`, `rgba()` and friends. Those are an
 * internal encoding of the native runtime and have no web serialisation, so
 * they are not part of the public API.
 */
export type CustomPropertyValue =
  | string
  | number
  | boolean
  | undefined
  | CustomPropertyValue[];

/*********************************    Misc    *********************************/

export type Props = Record<string, any> | undefined | null;
export type Callback = () => void;
export type RNStyle = ViewStyle & TextStyle & ImageStyle;

/********************************    Globals    ********************************/

export interface ColorScheme {
  get: () => ColorSchemeName;
  set: (value: ColorSchemeName) => void;
}
