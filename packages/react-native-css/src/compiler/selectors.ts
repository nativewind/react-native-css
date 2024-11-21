import type { Selector, SelectorComponent, SelectorList } from "lightningcss";

import type {
  AttributeCondition,
  MediaQuery,
  PseudoClassesQuery,
  SpecificityArray,
  StyleRule,
} from "../runtime";
import { Specificity } from "../runtime/utils";
import type { CompilerCollection } from "./compiler.types";

export type NormalizeSelector =
  | {
      type: "rootVariables" | "universalVariables";
      subtype: "light" | "dark";
    }
  | {
      type: "className";
      className: string;
      media?: MediaQuery[];
      groupClassName?: string;
      pseudoClasses?: PseudoClassesQuery;
      groupPseudoClasses?: PseudoClassesQuery;
      groupAttrs?: AttributeCondition[];
      attrs?: AttributeCondition[];
      specificity: SpecificityArray;
    };

/**
 * Turns a CSS selector into a `react-native-css-interop` selector.
 */
export function normalizeSelectors(
  extractedStyle: StyleRule,
  selectorList: SelectorList,
  collection: CompilerCollection,
  selectors: NormalizeSelector[] = [],
  defaults: Partial<NormalizeSelector> = {},
) {
  for (let cssSelector of selectorList) {
    // Ignore `:is()`, and just process its selectors
    if (isIsPseudoClass(cssSelector)) {
      normalizeSelectors(
        extractedStyle,
        cssSelector[0].selectors,
        collection,
        selectors,
      );
    } else if (
      // Matches: :root {}
      isRootVariableSelector(cssSelector)
    ) {
      if (
        // Matches: @media(prefers-dark-mode) { :root {} }
        isDarkModeMediaQuery(extractedStyle.m?.[0])
      ) {
        selectors.push({
          type: "rootVariables",
          subtype: "dark",
        });
      } else {
        selectors.push({
          type: "rootVariables",
          subtype: "light",
        });
      }
    } else if (
      // Matches: .dark:root {} || :root[class~="dark"]
      isRootDarkVariableSelector(cssSelector, collection)
    ) {
      selectors.push({
        type: "rootVariables",
        subtype: "dark",
      });
    } else if (
      // Matches: * {}
      isDefaultVariableSelector(cssSelector)
    ) {
      if (
        // Matches @media(prefers-dark-mode) { * {} }
        isDarkModeMediaQuery(extractedStyle.m?.[0])
      ) {
        selectors.push({
          type: "universalVariables",
          subtype: "dark",
        });
      } else {
        selectors.push({
          type: "universalVariables",
          subtype: "light",
        });
      }
    } else if (
      // Matches:  .dark * {}
      isDarkUniversalSelector(cssSelector, collection)
    ) {
      selectors.push({
        type: "universalVariables",
        subtype: "dark",
      });
    } else if (
      // Matches:  .dark <selector> {}
      isDarkClassLegacySelector(cssSelector, collection)
    ) {
      const [_, __, third, ...rest] = cssSelector;

      normalizeSelectors(
        extractedStyle,
        [[third, ...rest]],
        collection,
        selectors,
        {
          media: [["plain", "prefers-color-scheme", "dark"]],
        },
      );
    } else if (
      // Matches:  <selector>:is(.dark *) {}
      isDarkClassSelector(cssSelector, collection)
    ) {
      const [first] = cssSelector;

      normalizeSelectors(extractedStyle, [[first]], collection, selectors, {
        media: [["plain", "prefers-color-scheme", "dark"]],
      });
    } else {
      const selector = reduceSelector(
        {
          ...defaults,
          type: "className",
          className: "",
          specificity: [],
        },
        cssSelector,
        collection,
      );

      if (selector === null || !selector.className) {
        continue;
      }

      selectors.push(selector);
    }
  }

  return selectors;
}

function reduceSelector(
  acc: Extract<NormalizeSelector, { type: "className" }>,
  selectorComponents: Selector,
  collection: CompilerCollection,
) {
  let previousType: SelectorComponent["type"] = "combinator";
  let inGroup = false;
  /*
   * Loop over each token and the cssSelector and parse it into a `react-native-css-interop` selector
   */
  for (const component of selectorComponents) {
    switch (component.type) {
      case "universal":
      case "namespace":
      case "nesting":
      case "id":
      case "pseudo-element":
        // We don't support these selectors at all
        return null;
      case "attribute": {
        if (!acc.groupClassName && !acc.className) {
          if (
            component.name === "dir" &&
            component.operation?.operator === "equal"
          ) {
            acc.media ??= [];
            acc.media.push(["boolean", component.operation.value]);
          } else {
            return null;
          }
          break;
        }

        // Turn attribute selectors into AttributeConditions
        acc.specificity[Specificity.ClassName] =
          (acc.specificity[Specificity.ClassName] ?? 0) + 1;

        let attrs: AttributeCondition[];
        if (inGroup) {
          acc.groupAttrs ??= [];
          attrs = acc.groupAttrs;
        } else {
          acc.attrs ??= [];
          attrs = acc.attrs;
        }

        if (component.name.startsWith("data-")) {
          attrs.push({
            ...component,
            name: toRNProperty(component.name.replace("data-", "")),
            type: "data-attribute",
          });
        } else {
          attrs.push(component);
        }
        break;
      }
      case "type": {
        /*
         * We only support type selectors as part of the selector prefix
         * For example: `html .my-class`
         *
         * NOTE: We ignore specificity for this
         */
        if (component.name !== collection.selectorPrefix) {
          return null;
        }
        break;
      }
      case "combinator": {
        // We only support the descendant combinator, this is used for groups
        if (component.value !== "descendant") {
          return null;
        }

        inGroup = false;

        break;
      }
      case "class": {
        acc.specificity[Specificity.ClassName] =
          (acc.specificity[Specificity.ClassName] ?? 0) + 1;

        // .class.otherClass is only valid if the previous class was a valid group, or the last token was a combinator
        switch (previousType) {
          // <something> .class
          case "combinator": {
            // We can only have two classnames in a selector if the first one is a valid group
            if (acc.className) {
              // .className .otherClassName
              // This will only occur if the first className is not a group
              return null;
            } else if (component.name === collection.selectorPrefix?.slice(1)) {
              // If the name matches the selectorPrefix, just ignore it!
              // E.g .dark .myClass
              break;
            } else {
              const groupingValid =
                !acc.groupClassName &&
                collection.grouping.some((group) => {
                  return group.test(component.name);
                });

              if (groupingValid) {
                // Otherwise make the current className the group
                acc.groupClassName = component.name;
                acc.groupPseudoClasses = acc.pseudoClasses;
                acc.pseudoClasses = {};
                inGroup = true;
              } else if (!acc.className) {
                acc.className = component.name;
              } else {
                return null;
              }
            }
            break;
          }
          // .class.otherClass
          case "class": {
            if (!inGroup) {
              return null;
            }

            // We are in a group selector, so any additional classes are groupAttributes
            acc.groupAttrs ??= [];
            acc.groupAttrs.push({
              type: "attribute",
              name: "className",
              operation: { operator: "includes", value: component.name },
            });
            break;
          }
          default: {
            return null;
          }
        }
        break;
      }
      case "pseudo-class": {
        acc.specificity[Specificity.ClassName] =
          (acc.specificity[Specificity.ClassName] ?? 0) + 1;

        let pseudoClasses: PseudoClassesQuery;
        let attrs: AttributeCondition[];
        if (component.kind === "is") {
          if (isDarkUniversalSelector(component.selectors[0], collection)) {
            acc.media ??= [];
            acc.media.push(["plain", "prefers-color-scheme", "dark"]);
            break;
          }
        }

        switch (previousType) {
          case "pseudo-class":
          case "class": {
            if (acc.className) {
              acc.pseudoClasses ??= {};
              pseudoClasses = acc.pseudoClasses;
              acc.attrs ??= [];
              attrs = acc.attrs;
            } else if (acc.groupClassName) {
              acc.groupPseudoClasses ??= {};
              pseudoClasses = acc.groupPseudoClasses;
              acc.groupAttrs ??= [];
              attrs = acc.groupAttrs;
            } else {
              return null;
            }
            break;
          }
          default: {
            return null;
          }
        }

        switch (component.kind) {
          case "hover":
            pseudoClasses ??= {};
            pseudoClasses.h = 1;
            break;
          case "active":
            pseudoClasses ??= {};
            pseudoClasses.a = 1;
            break;
          case "focus":
            pseudoClasses ??= {};
            pseudoClasses.f = 1;
            break;
          case "disabled":
            attrs ??= [];
            attrs.push({
              type: "attribute",
              name: "disabled",
              operation: { operator: "truthy" },
            });
            break;
          case "empty":
            attrs ??= [];
            attrs.push({
              type: "attribute",
              name: "children",
              operation: { operator: "empty" },
            });
            break;
        }
      }
    }

    previousType = component.type;
  }

  return acc;
}

function isIsPseudoClass(
  selector: Selector,
): selector is [{ type: "pseudo-class"; kind: "is"; selectors: Selector[] }] {
  return (
    selector.length === 1 &&
    selector[0].type === "pseudo-class" &&
    selector[0].kind === "is"
  );
}

function isDarkModeMediaQuery(query?: MediaQuery): boolean {
  if (!query) return false;

  return (
    query[0] === "plain" &&
    query[1] === "prefers-color-scheme" &&
    query[2] === "dark"
  );
}

// Matches:  <selector>:is(.dark *)
function isDarkClassSelector(
  [first, second, third]: Selector,
  collection: CompilerCollection,
) {
  if (collection.darkMode?.[0] !== "class" || !collection.darkMode[1]) {
    return false;
  }

  return (
    first &&
    second &&
    !third &&
    first.type === "class" &&
    second.type === "pseudo-class" &&
    second.kind === "is" &&
    second.selectors.length === 1 &&
    second.selectors[0].length === 3 &&
    second.selectors[0][0].type === "class" &&
    second.selectors[0][0].name === collection.darkMode[1] &&
    second.selectors[0][1].type === "combinator" &&
    second.selectors[0][1].value === "descendant" &&
    second.selectors[0][2].type === "universal"
  );
}

// Matches:  .dark <selector> {}
function isDarkClassLegacySelector(
  [first, second, third]: Selector,
  collection: CompilerCollection,
) {
  if (collection.darkMode?.[0] !== "class" || !collection.darkMode[1]) {
    return false;
  }

  return (
    first &&
    second &&
    third &&
    first.type === "class" &&
    first.name === collection.darkMode[1] &&
    second.type === "combinator" &&
    second.value === "descendant" &&
    third.type === "class"
  );
}

// Matches:  :root {}
function isRootVariableSelector([first, second]: Selector) {
  return (
    first && !second && first.type === "pseudo-class" && first.kind === "root"
  );
}

// Matches:  * {}
function isDefaultVariableSelector([first, second]: Selector) {
  return first && !second && first.type === "universal";
}

// Matches:  .dark:root  {}
function isRootDarkVariableSelector(
  [first, second]: Selector,
  collection: CompilerCollection,
) {
  return (
    first &&
    second &&
    collection.darkMode?.[0] === "class" &&
    // .dark:root {}
    ((first.type === "class" &&
      first.name === collection.darkMode[1] &&
      second.type === "pseudo-class" &&
      second.kind === "root") ||
      // :root[class~=dark] {}
      (first.type === "pseudo-class" &&
        first.kind === "root" &&
        second.type === "attribute" &&
        second.name === "class" &&
        second.operation &&
        second.operation.value === collection.darkMode[1] &&
        ["includes", "equal"].includes(second.operation.operator)))
  );
}

// Matches:  .dark * {}
function isDarkUniversalSelector(
  [first, second, third]: Selector,
  collection: CompilerCollection,
) {
  return (
    collection.darkMode?.[0] === "class" &&
    first &&
    second &&
    third &&
    first.type === "class" &&
    first.name === collection.darkMode[1] &&
    second.type === "combinator" &&
    second.value === "descendant" &&
    third.type === "universal"
  );
}

export function toRNProperty<T extends string>(str: T) {
  return str
    .replace(/^-rn-/, "")
    .replace(/-./g, (x) => x[1].toUpperCase()) as CamelCase<T>;
}

type CamelCase<S extends string> =
  S extends `${infer P1}-${infer P2}${infer P3}`
    ? `${Lowercase<P1>}${Uppercase<P2>}${CamelCase<P3>}`
    : Lowercase<S>;