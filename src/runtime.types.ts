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

/*********************************    Misc    *********************************/

export type Props = Record<string, any> | undefined | null;
export type Callback = () => void;
export type RNStyle = ViewStyle & TextStyle & ImageStyle;

/********************************    Globals    ********************************/

export interface ColorScheme {
  get: () => ColorSchemeName;
  set: (value: ColorSchemeName) => void;
}
