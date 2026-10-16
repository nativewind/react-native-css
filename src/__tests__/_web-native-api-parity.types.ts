/**
 * Compile-time assertions that every function both planes export takes the same arguments.
 * TypeScript resolves the root entry to the web plane, so its signatures are the ones every
 * consumer type-checks a native call against.
 */
type NativeApi = typeof import("react-native-css/native");
type WebApi = typeof import("react-native-css/web");

type Equal<X, Y> = [X] extends [Y] ? ([Y] extends [X] ? true : false) : false;
type Expect<T extends true> = T;

type SharedExport = Extract<keyof WebApi, keyof NativeApi>;

type SharedFunction = {
  [Name in SharedExport]: WebApi[Name] extends (...parameters: never) => unknown
    ? NativeApi[Name] extends (...parameters: never) => unknown
      ? Name
      : never
    : never;
}[SharedExport];

type DivergentParameters = {
  [Name in SharedFunction as Equal<
    Parameters<WebApi[Name]>,
    Parameters<NativeApi[Name]>
  > extends true
    ? never
    : Name]: [
    web: Parameters<WebApi[Name]>,
    native: Parameters<NativeApi[Name]>,
  ];
};

export type Parity = [
  Expect<Equal<[SharedFunction] extends [never] ? false : true, true>>,
  Expect<Equal<keyof DivergentParameters, never>>,
];
