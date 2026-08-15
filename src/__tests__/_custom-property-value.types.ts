/**
 * Compile-time assertions for the value a CSS custom property can be given from
 * JavaScript. `yarn typecheck` is the runner — there is nothing here to execute,
 * which is why the filename is `_`-prefixed and jest skips it.
 *
 * The planes are reached as module types rather than imported, so the file stays
 * type-only under `verbatimModuleSyntax`.
 */
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

/**
 * The parity invariant. `react-native-css` ships one set of declarations to both
 * platforms — there is no `moduleSuffixes` or export condition that hands a
 * consumer the native ones — so a value the shared entry accepts has to be a
 * value both implementations honour. A future divergence fails here.
 */
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

/**
 * An array is a comma-separated CSS list, alongside the scalars a custom
 * property can hold. `undefined` leaves the property unset so an ancestor's
 * value inherits.
 */
export type Accepted = [
  Expect<Accepts<string, CustomPropertyValue>>,
  Expect<Accepts<number, CustomPropertyValue>>,
  Expect<Accepts<boolean, CustomPropertyValue>>,
  Expect<Accepts<undefined, CustomPropertyValue>>,
  Expect<Accepts<string[], CustomPropertyValue>>,
  Expect<Accepts<(string | number)[], CustomPropertyValue>>,
  Expect<Accepts<(string | string[])[], CustomPropertyValue>>,
];

/**
 * A `StyleDescriptor` is wider than a custom property's public value type. Each
 * row fails if the type is widened past what both implementations serialise.
 */
export type Rejected = [
  // `null` is not a CSS value — `undefined` is how a property is left unset.
  Expect<Equal<Accepts<null, CustomPropertyValue>, false>>,
  // An object has no custom-property serialisation.
  Expect<Equal<Accepts<{ red: 1 }, CustomPropertyValue>, false>>,
  // A StyleFunction is the compiler's own encoding of `var()`, `rgba()` and the
  // rest. The web implementation has no way to serialise one.
  Expect<
    Equal<
      Accepts<[Record<never, never>, "var", ["other"]], CustomPropertyValue>,
      false
    >
  >,
  // The compiler's whole descriptor union — what the native runtime resolves
  // internally — is wider than what a caller may hand in.
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
