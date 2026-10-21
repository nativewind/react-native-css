// The browser evaluates the stylesheet's @media rules itself, so an override reaches what scripts read and not the CSS, which MQ5 §13's requestOverride() will reach once a browser ships it
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
