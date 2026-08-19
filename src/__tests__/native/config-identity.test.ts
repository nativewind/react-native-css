import { ScrollView as RNScrollView, View as RNView } from "react-native";

import { generateStateHash } from "../../native/react/rules";
import {
  mappingToConfig,
  type ComponentState,
  type Config,
} from "../../native/react/useNativeCss";
import {
  VAR_SYMBOL,
  type Effect,
  type VariableContextValue,
} from "../../native/reactivity";
import type { StyledConfiguration } from "../../runtime.types";

/**
 * The resolved-style cache is keyed by `generateStateHash`, which hashes `state.configs` by object
 * identity. Sharing therefore depends on one mapping producing one config array, rather than an
 * equal array per consumer.
 *
 * The rules half of that key already holds: `StyleCollection.styles(className)` is keyed by the
 * class string, so every element carrying the same class list references one rule set. The config
 * half is the one input that is minted per consumer.
 */

/** A stand-in for the rule set a shared class list resolves to — any object is a valid weak key. */
const ruleFor = (): WeakKey => ({});

/** The smallest `ComponentState` `generateStateHash` reads: it only touches `configs`. */
const stateFor = (configs: Config[]): ComponentState => {
  const observers = new Set<Effect>();
  const ruleEffect: Effect = { observers, run: () => undefined };
  const inheritedVariables: VariableContextValue = { [VAR_SYMBOL]: true };

  return {
    configs,
    inheritedContainers: {},
    inheritedVariables,
    ruleEffect,
    ruleEffectGetter: (observable) => observable.get(ruleEffect),
    styleEffect: { observers, run: () => undefined },
  };
};

const viewMapping = {
  className: "style",
} satisfies StyledConfiguration<typeof RNView>;

const scrollViewMapping = {
  className: "style",
  contentContainerClassName: "contentContainerStyle",
} satisfies StyledConfiguration<typeof RNScrollView>;

test("two consumers of one mapping share a cache key", () => {
  const rules = [ruleFor()];

  const first = generateStateHash(
    stateFor(mappingToConfig(viewMapping)),
    rules,
  );
  const second = generateStateHash(
    stateFor(mappingToConfig(viewMapping)),
    rules,
  );

  expect(first).toBe(second);
});

test("mappings that differ keep different cache keys", () => {
  const rules = [ruleFor()];

  const view = generateStateHash(stateFor(mappingToConfig(viewMapping)), rules);
  const scrollView = generateStateHash(
    stateFor(mappingToConfig(scrollViewMapping)),
    rules,
  );

  expect(view).not.toBe(scrollView);
});

test("a state hash always carries the config, so it is never the empty string", () => {
  // The empty string used to double as a no-keys sentinel in `generateStateHash`. With the key a
  // join rather than a digest, an empty key list renders as the empty string too — so the sentinel
  // and a real state would have shared one cache entry. The config is an unconditional key, which
  // is what makes the sentinel unnecessary rather than merely unlikely.
  const state = stateFor(mappingToConfig(viewMapping));

  expect(generateStateHash(state, [])).not.toBe("");
  expect(generateStateHash(state, [ruleFor()])).not.toBe("");
});

test("a mapping that is not an object is refused by name", () => {
  // The derivation is cached on the mapping OBJECT. A primitive cannot be a weak-map key, so
  // without this guard the failure surfaces as a `WeakMap` error naming nothing the caller wrote.
  expect(() => mappingToConfig("style" as never)).toThrow(
    /mapping must be an object/u,
  );
  expect(() => mappingToConfig(undefined as never)).toThrow(
    /mapping must be an object/u,
  );
});

test("a mapping mutated after its first use is not re-derived", () => {
  // Documented rather than defended: `useCssElement` already froze the derivation per instance, so
  // a mutation only ever reached NEWLY mounted elements — the same mapping meaning two things at
  // once. Deriving once per mapping settles it on one.
  const mapping: Record<string, string> = { className: "style" };
  const first = mappingToConfig(mapping);

  mapping.className = "contentContainerStyle";

  expect(mappingToConfig(mapping)).toBe(first);
});

test("a mapping built per call still produces an equal config", () => {
  // Every wrapper the library ships passes a module constant, but a caller may build the mapping
  // inline. That path cannot share on identity and has to keep working unchanged.
  expect(mappingToConfig({ className: "style" })).toEqual(
    mappingToConfig(viewMapping),
  );
});
