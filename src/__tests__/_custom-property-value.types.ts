// Type-level assertions, run by yarn typecheck; the leading underscore keeps jest off this file
import type { CustomPropertyValue } from "react-native-css";

type RootApi = typeof import("react-native-css");
type NativeApi = typeof import("react-native-css/native");
type WebApi = typeof import("react-native-css/web");

type Equal<X, Y> = [X] extends [Y] ? ([Y] extends [X] ? true : false) : false;
type Expect<T extends true> = T;
type Accepts<TValue, TTarget> = [TValue] extends [TTarget] ? true : false;

type VarsParameter<TApi extends { vars: (variables: never) => unknown }> =
  Parameters<TApi["vars"]>[0];
type ProviderValue<
  TApi extends { VariableContextProvider: (props: never) => unknown },
> = Parameters<TApi["VariableContextProvider"]>[0]["value"];

// The shared entry's declarations reach both platforms, so all three entries must agree
export type Parity = [
  Expect<Equal<VarsParameter<RootApi>, Record<string, CustomPropertyValue>>>,
  Expect<Equal<VarsParameter<NativeApi>, VarsParameter<RootApi>>>,
  Expect<Equal<VarsParameter<WebApi>, VarsParameter<RootApi>>>,
  Expect<
    Equal<ProviderValue<RootApi>, Record<`--${string}`, CustomPropertyValue>>
  >,
  Expect<Equal<ProviderValue<NativeApi>, ProviderValue<RootApi>>>,
  Expect<Equal<ProviderValue<WebApi>, ProviderValue<RootApi>>>,
];

export type Accepted = [
  Expect<Accepts<string, CustomPropertyValue>>,
  Expect<Accepts<number, CustomPropertyValue>>,
  Expect<Accepts<boolean, CustomPropertyValue>>,
  Expect<Accepts<undefined, CustomPropertyValue>>,
  Expect<Accepts<string[], CustomPropertyValue>>,
  Expect<Accepts<(string | number)[], CustomPropertyValue>>,
  Expect<Accepts<(string | string[])[], CustomPropertyValue>>,
];

export type Rejected = [
  // `null` is not a CSS value — `undefined` is how a property is left unset.
  Expect<Equal<Accepts<null, CustomPropertyValue>, false>>,
  // An object has no custom-property serialisation.
  Expect<Equal<Accepts<{ red: 1 }, CustomPropertyValue>, false>>,
  Expect<
    Equal<
      Accepts<[Record<never, never>, "var", ["other"]], CustomPropertyValue>,
      false
    >
  >,
  Expect<
    Equal<
      Accepts<
        import("react-native-css/compiler").StyleDescriptor,
        CustomPropertyValue
      >,
      false
    >
  >,
];
