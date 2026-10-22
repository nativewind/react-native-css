/* eslint-disable @typescript-eslint/no-explicit-any */
import type {
  ClassicComponentClass,
  ComponentClass,
  ComponentProps,
  ComponentPropsWithRef,
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

import type { DotNotation } from "react-native-css/utilities";

/********************************     API      ********************************/

type StyledSourceProps<M> = {
  -readonly [K in keyof M as K extends string
    ? M[K] extends undefined | false
      ? never
      : M[K] extends true | string | object
        ? K
        : never
    : never]?: string | undefined;
};

export type StyledReactElement<
  C extends ReactComponent,
  M extends StyledConfiguration<C>,
> = ReactElement<ComponentProps<C> & StyledSourceProps<M>>;

export type StyledProps<P, M extends StyledConfiguration<ReactComponent>> = P &
  StyledSourceProps<M>;

export interface Styled {
  <const C extends ReactComponent>(
    component: C,
    mapping?: undefined,
    options?: StyledOptions,
  ): ComponentType<
    ComponentPropsWithRef<C> & StyledSourceProps<DefaultStyledConfiguration>
  >;
  <const C extends ReactComponent, const M extends StyledConfiguration<C>>(
    component: C,
    mapping: M & StyledConfiguration<C>,
    options?: StyledOptions,
  ): StyledComponent<C, M>;
}

type StyledComponent<
  C extends ReactComponent,
  M extends StyledConfiguration<C>,
> = ComponentType<ComponentPropsWithRef<C> & StyledSourceProps<M>>;

export interface DefaultStyledConfiguration {
  readonly className: "style";
}

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
  nativeStyleMapping?: NativeStyleMapping<ComponentProps<C>> | undefined;
  /** @deprecated Please use nativeStyleMapping */
  nativeStyleToProp?: StyledConfigurationObject<C, T>["nativeStyleMapping"];
}

// A -rn- declaration puts its camel-cased name in the style, so a key may be any string beside React Native's style keys
type NativeStyleMapping<S> = Readonly<
  Partial<Record<keyof RNStyle, NativeStyleMappingValue<S>>>
> &
  Readonly<Record<string, NativeStyleMappingValue<S>>>;

type NativeStyleMappingValue<S> = true | DotNotation<S> | undefined;

export interface StyledOptions {
  passThrough?: boolean | undefined;
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
  get: () => ColorSchemeName | null | undefined;
  set: (value: ColorSchemeName | null | undefined) => void;
}
