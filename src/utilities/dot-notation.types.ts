/* eslint-disable */
// ---------- Base Utilities ----------

type Falsy = undefined | null | false | "";
type RegisteredStyle<T> = number & { __registeredStyleBrand: T };

type Primitive =
  | string
  | number
  | boolean
  | bigint
  | symbol
  | null
  | undefined
  | Date
  | RegExp
  | false
  | true;

interface RecursiveArray<T>
  extends Array<T | ReadonlyArray<T> | RecursiveArray<T>> {}

export type StyleProp<T> =
  | T
  | RegisteredStyle<T>
  | RecursiveArray<T | RegisteredStyle<T> | Falsy>
  | Falsy;

// ---------- Type Helpers ----------

// Unwrap nested arrays (from RecursiveArray)
type UnwrapRecursiveArray<
  T,
  Depth extends unknown[] = [],
  MaxDepth extends number = 10
> = Depth["length"] extends MaxDepth
  ? T
  : T extends (infer I)[]
    ? UnwrapRecursiveArray<I, [...Depth, unknown], MaxDepth>
    : T;


// Remove null, false, undefined, etc.
type RemoveFalsy<T> = Exclude<T, Falsy>;

// Remove RegisteredStyle (branded numbers)
type RemoveRegisteredStyle<T> = T extends RegisteredStyle<any> ? never : T;

// Final cleaned style object from StyleProp<T>
type ExtractStyleObject<T> = RemoveRegisteredStyle<
  RemoveFalsy<UnwrapRecursiveArray<T extends StyleProp<infer U> ? U : T>>
>;

// Check if something is a non-array plain object
type IsPlainObject<T> = T extends object
  ? T extends Function
    ? false
    : T extends readonly any[]
      ? false
      : true
  : false;

// ---------- Resolve Path Type Helpers ----------

type Split<
  T extends string,
  Delimiter extends string,
> = T extends `${infer Head}${Delimiter}${infer Tail}`
  ? [Head, ...Split<Tail, Delimiter>]
  : [T];

// Special parser to break down dot + bracket notation (e.g., "users[0].name")
type ParsePath<T extends string> =
  T extends `${infer Head}[${number}]${infer Rest}`
    ? [Head, number, ...ParsePath<Rest extends `.${infer R}` ? R : Rest>]
    : Split<T, ".">;

type ResolvePath<T, Parts extends readonly any[]> = Parts extends [
  infer Head,
  ...infer Rest,
]
  ? Head extends keyof T
    ? ResolvePath<T[Head], Rest>
    : Head extends number
      ? T extends (infer U)[]
        ? ResolvePath<U, Rest>
        : never
      : never
  : T;

// ---------- Dot Notation Utility ----------

export type DotNotation<
  T,
  Depth extends unknown[] = [],
  MaxDepth extends number = 10,
  Key extends keyof T = keyof T,
> = Depth["length"] extends MaxDepth
  ? never
  : Key extends string
    ? unknown extends T[Key]
      ? Key | `${Key}.${string}`
      : // Handle StyleProp<T> and clean unions
        ExtractStyleObject<NonNullable<T[Key]>> extends infer Cleaned
        ? Cleaned extends Primitive
          ? Key
          : Cleaned extends readonly (infer E)[]
            ? E extends Primitive
              ? Key | `${Key}[number]`
              :
                  | Key
                  | `${Key}[number]`
                  | `${Key}[number].${DotNotation<E, [...Depth, 0], MaxDepth>}`
            : IsPlainObject<Cleaned> extends true
              ? Key | `${Key}.${DotNotation<Cleaned, [...Depth, 0], MaxDepth>}`
              : Key
        : never
    : never;

// ---------- Resolve Dot Path ----------

export type ResolveDotPath<T, Path extends string> = ResolvePath<
  T,
  ParsePath<Path>
>;
