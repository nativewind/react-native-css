/** The React Native key a CSS property is written to, where it is not the property's own camelCase. */
export const propertyRename: Record<string, string> = {
  "background-image": "experimental_backgroundImage",
  // React Native has no border-inline-* props, but ships the equivalent
  // RTL-aware border-start-* / border-end-* props
  "border-inline-end-color": "border-end-color",
  "border-inline-end-width": "border-end-width",
  "border-inline-start-color": "border-start-color",
  "border-inline-start-width": "border-start-width",
  "border-block-start-width": "border-top-width",
  "border-block-end-width": "border-bottom-width",
  "font-variant-caps": "font-variant",
};

type CamelCase<S extends string> =
  S extends `${infer P1}-${infer P2}${infer P3}`
    ? `${Lowercase<P1>}${Uppercase<P2>}${CamelCase<P3>}`
    : Lowercase<S>;

export function toRNProperty<T extends string>(str: T) {
  return str
    .replace(/^-rn-/, "")
    .replace(/-./g, (x) => x[1]?.toUpperCase() ?? "") as CamelCase<T>;
}

/** The style key a transition on `property` animates, which is the key the property is written to; `visibility` names none, as no style key carries it. */
export function transitionStyleKey(property: string): string | undefined {
  return property === "visibility"
    ? undefined
    : toRNProperty(propertyRename[property] ?? property);
}
