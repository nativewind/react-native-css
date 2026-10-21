// The browser evaluates the stylesheet's @media rules and matchMedia() itself, so an override changes only what get() returns, where MQ5 §13's requestOverride() would reach both once a browser ships it
export function browserPreference<Value>(
  readBrowser: () => Value | undefined,
): {
  readonly get: () => Value | undefined;
  readonly set: (value: Value | null) => void;
} {
  let override: Value | undefined;

  return {
    get: () => override ?? readBrowser(),
    set: (value) => {
      // A server renders every visitor's page in one process, so only a browser keeps an override
      if (typeof window !== "undefined") {
        override = value ?? undefined;
      }
    },
  };
}
