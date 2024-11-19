import type {
  ClassicComponentClass,
  ComponentClass,
  ComponentProps,
  ForwardRefExoticComponent,
  FunctionComponent,
} from "react";

export type ReactComponent<P = any> =
  | ClassicComponentClass<P>
  | ComponentClass<P>
  | FunctionComponent<P>
  | ForwardRefExoticComponent<P>;

export type FlattenComponentProps<C extends ReactComponent<any>> =
  FlattenObjectKeys<ComponentProps<C>>;

type FlattenObjectKeys<
  T extends Record<string, unknown>,
  Depth extends number[] = [],
  MaxDepth extends number = 10,
  Key = keyof T,
> = Depth["length"] extends MaxDepth
  ? never
  : Key extends string
    ? unknown extends T[Key] // If its unknown or any then allow for freeform string
      ? Key | `${Key}.${string}`
      : NonNullable<T[Key]> extends Record<string, unknown>
        ?
            | Key
            | `${Key}.${FlattenObjectKeys<NonNullable<T[Key]>, [...Depth, 0]>}`
        : Key
    : never;
