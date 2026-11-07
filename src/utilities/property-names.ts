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

const vendorPrefix = /^-(?:webkit|moz|ms|o)-/;

/**
 * The style key a transition on `property` animates: its renamed or camelCase name, read in any case and without a vendor prefix.
 * One no style key carries, `visibility` or a custom property among them, keeps its own name, so it holds its place in the list (CSS Transitions 1 §2.1).
 */
export function transitionStyleKey(property: string): string {
  if (property.startsWith("--")) {
    return property;
  }

  const name = property.toLowerCase().replace(vendorPrefix, "");
  return toRNProperty(propertyRename[name] ?? name);
}
