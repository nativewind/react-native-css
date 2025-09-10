import type { AttrOperation, Selector, SelectorList } from "lightningcss";

import { Specificity } from "../utilities";
import type {
  AttributeQuery,
  AttrSelectorOperator,
  CompilerOptions,
  ContainerQuery,
  MediaCondition,
  PseudoClassesQuery,
  SpecificityArray,
} from "./compiler.types";

interface ReactNativeClassNameSelector {
  type: "className";
  specificity: SpecificityArray;
  className: string;
  mediaQuery?: MediaCondition[];
  containerQuery?: ContainerQuery[];
  pseudoClassesQuery?: PseudoClassesQuery;
  attributeQuery?: AttributeQuery[];
  pseudoElementQuery?: string[];
}

interface ReactNativeGlobalSelector {
  type: "rootVariables" | "universalVariables";
}

type PartialSelector = Partial<ReactNativeClassNameSelector> & {
  type: "className";
  specificity: SpecificityArray;
};

const containerQueryMap = new WeakMap<WeakKey, ContainerQuery[]>();
const attributeQueryMap = new WeakMap<WeakKey, AttributeQuery[]>();
const mediaQueryMap = new WeakMap<WeakKey, MediaCondition[]>();
const pseudoClassesQueryMap = new WeakMap<WeakKey, PseudoClassesQuery>();

type ContainerQueryWithSpecificity = ContainerQuery & {
  specificity: SpecificityArray;
  m?: MediaCondition;
};

export function getClassNameSelectors(
  selectors: SelectorList,
  options: CompilerOptions = {},
) {
  if (!selectors.length) {
    return [];
  }

  return selectors.flatMap(
    (selector): (ReactNativeGlobalSelector | PartialSelector)[] => {
      const root: PartialSelector = {
        type: "className",
        specificity: [],
      };

      const specificity: SpecificityArray = [0];

      if (isRootVariableSelector(selector)) {
        return [{ type: "rootVariables" }];
      } else if (isUniversalSelector(selector)) {
        return [{ type: "universalVariables" }];
      } else {
        return (
          parseComponents(
            selector.reverse(),
            options,
            root,
            root,
            specificity,
          ) ?? []
        );
      }
    },
  );
}

function parseComponents(
  [component, ...rest]: Selector,
  options: CompilerOptions,
  root: PartialSelector,
  ref: PartialSelector | ContainerQuery,
  specificity: SpecificityArray,
): PartialSelector[] | null {
  if (!component || Array.isArray(component.type)) {
    // Merge the specificity with the root specificity
    for (let i = 0; i < specificity.length; i++) {
      const value = specificity[i];
      if (value !== undefined) {
        root.specificity[i] = (root.specificity[i] ?? 0) + value;
      }
    }

    // Return the root
    return [root];
  }

  switch (component.type) {
    case "id": // #id
    case "namespace": // @namespace
    case "universal": // * - universal selector
      return null;
    case "type": {
      // div, span
      if (
        component.name === options.selectorPrefix ||
        component.name === "html"
      ) {
        return parseComponents(rest, options, root, ref, specificity);
      } else {
        return null;
      }
    }
    case "nesting":
      // &
      // The SelectorList should be flattened, so we can skip these
      return parseComponents(rest, options, root, ref, specificity);
    case "combinator": {
      // We only support the descendant combinator
      if (component.value === "descendant") {
        // Switch to now parsing a container query
        ref = {};
        return parseComponents(rest, options, root, ref, specificity);
      }

      return [];
    }
    case "pseudo-element": {
      switch (component.kind) {
        case "selection":
        case "placeholder": {
          specificity[Specificity.PseudoElements] =
            (specificity[Specificity.PseudoElements] ?? 0) + 1;
          root.pseudoElementQuery ??= [];
          root.pseudoElementQuery.push(component.kind);
          return parseComponents(rest, options, root, ref, specificity);
        }
        default: {
          return [];
        }
      }
    }
    case "pseudo-class": {
      switch (component.kind) {
        case "hover": {
          getPseudoClassesQuery(ref).h = 1;
          specificity[Specificity.PseudoClass] =
            (specificity[Specificity.PseudoClass] ?? 0) + 1;
          return parseComponents(rest, options, root, ref, specificity);
        }
        case "active": {
          getPseudoClassesQuery(ref).a = 1;
          specificity[Specificity.PseudoClass] =
            (specificity[Specificity.PseudoClass] ?? 0) + 1;
          return parseComponents(rest, options, root, ref, specificity);
        }
        case "focus": {
          getPseudoClassesQuery(ref).f = 1;
          specificity[Specificity.PseudoClass] =
            (specificity[Specificity.PseudoClass] ?? 0) + 1;
          return parseComponents(rest, options, root, ref, specificity);
        }
        case "disabled": {
          getAttributeQuery(ref).push(["a", "disabled"]);
          specificity[Specificity.PseudoClass] =
            (specificity[Specificity.PseudoClass] ?? 0) + 1;
          return parseComponents(rest, options, root, ref, specificity);
        }
        case "empty": {
          getAttributeQuery(ref).push(["a", "children", "!"]);
          specificity[Specificity.PseudoClass] =
            (specificity[Specificity.PseudoClass] ?? 0) + 1;
          return parseComponents(rest, options, root, ref, specificity);
        }
        case "where":
        case "is": {
          // Now get the selectors inside the `is` or `where` pseudo-class
          const isWhereContainerQueries = component.selectors.flatMap(
            (selector) => {
              return parseIsWhereComponents(component.kind, selector) ?? [];
            },
          );

          // Remember we're looping in reverse order,
          // So `rest` contains the selectors BEFORE this one
          const parents = parseComponents(
            rest,
            options,
            root,
            ref,
            specificity,
          );

          if (!parents) {
            return null;
          }

          // Each parent selector should be combined with each pseudo-class selector
          return parents.flatMap((parent) => {
            const originalParent = { ...parent };

            return isWhereContainerQueries.map((containerQuery) => {
              const { specificity, m, ...query } = containerQuery;
              parent = { ...originalParent };
              parent.specificity = [...originalParent.specificity];

              if (m && m.length > 1) {
                parent.mediaQuery = originalParent.mediaQuery
                  ? [["&", [...originalParent.mediaQuery, m]]]
                  : [m];
              }

              if (component.kind === "is") {
                for (let i = 0; i < specificity.length; i++) {
                  const value = specificity[i];
                  if (value !== undefined) {
                    parent.specificity[i] =
                      (parent.specificity[i] ?? 0) + value;
                  }
                }
              }

              if (query.a || query.p || query.n !== undefined) {
                parent.containerQuery = [
                  ...(originalParent.containerQuery ?? []),
                ];
                parent.containerQuery.push(query);
              }

              return parent;
            });
          });
        }
        default: {
          return [];
        }
      }
    }
    case "attribute": {
      if (component.name === "dir") {
        if (!component.operation) {
          return [];
        }
        const operator = operatorMap[component.operation.operator];

        if (operator !== "=") {
          return [];
        }

        getMediaQuery(ref).push([operator, "dir", component.operation.value]);
        return parseComponents(rest, options, root, ref, specificity);
      } else {
        // specificity[Specificity.ClassName] =
        //   (specificity[Specificity.ClassName] ?? 0) + 1;
        const attributeQuery: AttributeQuery = component.name.startsWith(
          "data-",
        )
          ? // [data-*] are turned into `dataSet` queries
            ["d", toRNProperty(component.name.replace("data-", ""))]
          : // Everything else is turned into `attribute` queries
            ["a", toRNProperty(component.name)];
        if (component.operation) {
          let operator: AttrSelectorOperator | undefined;
          switch (component.operation.operator) {
            case "equal":
              operator = "=";
              break;
            case "includes":
              operator = "~=";
              break;
            case "dash-match":
              operator = "|=";
              break;
            case "prefix":
              operator = "^=";
              break;
            case "substring":
              operator = "*=";
              break;
            case "suffix":
              operator = "$=";
              break;
            default:
              component.operation.operator satisfies never;
              break;
          }
          if (operator) {
            // Append the operator onto the attribute query
            attributeQuery.push(operator, component.operation.value);
          }
        }
        getAttributeQuery(ref).push(attributeQuery);
        specificity[Specificity.ClassName] =
          (specificity[Specificity.ClassName] ?? 0) + 1;
        return parseComponents(rest, options, root, ref, specificity);
      }
    }
    case "class": {
      if (component.name === options.selectorPrefix) {
        // Skip this one
        return parseComponents(rest, options, root, ref, specificity);
      } else if (!isContainerQuery(ref) && !ref.className) {
        ref.className = component.name;
        specificity[Specificity.ClassName] =
          (specificity[Specificity.ClassName] ?? 0) + 1;
        return parseComponents(rest, options, root, ref, specificity);
      } else if (!isContainerQuery(ref)) {
        // Only the first className is used, the rest are attribute queries
        getAttributeQuery(ref).unshift([
          "a",
          "className",
          "*=",
          component.name,
        ]);
      } else {
        let containerQueries = containerQueryMap.get(root);
        if (!containerQueries) {
          containerQueries = [];
          root.containerQuery = containerQueries;
          containerQueryMap.set(root, containerQueries);
        }
        if (!ref.n) {
          containerQueries.unshift(ref);
        }

        ref.n = ref.n ? `${ref.n}.${component.name}` : `g:${component.name}`;
      }

      specificity[Specificity.ClassName] =
        (specificity[Specificity.ClassName] ?? 0) + 1;
      return parseComponents(rest, options, root, ref, specificity);
    }
  }
}

function parseIsWhereComponents(
  type: "is" | "where",
  selector: Selector,
  index = 0,
  queries?: ContainerQueryWithSpecificity[],
): ContainerQueryWithSpecificity[] | null {
  const component = selector[index];

  if (!component || Array.isArray(component.type)) {
    return queries ?? [];
  }

  switch (component.type) {
    // These are not allowed in `is()` or `where()`
    case "id": // #id
    case "namespace": // @namespace
    case "type": // div, span
    case "nesting": // &
    case "pseudo-element": // ::selection, ::placeholder, etc
      return null;
    case "combinator": {
      // We only support the descendant combinator
      if (component.value === "descendant") {
        // Each "block" is a new container query
        const children = parseIsWhereComponents(type, selector, index + 1);
        return children && queries ? [...queries, ...children] : children;
      }
      return null;
    }
    case "universal": {
      // * - universal selector
      if (index !== selector.length - 1) {
        // We only accept it in the last position
        return null;
      }

      // This was the only component, so we return the ref
      if (selector.length === 1) {
        return queries ?? [{ specificity: [] }];
      }

      const previous = selector[index - 1];

      // If the previous component is not a descendant combinator,
      if (
        !previous ||
        previous.type !== "combinator" ||
        previous.value !== "descendant"
      ) {
        return null;
      }

      return parseIsWhereComponents(type, selector, index + 1, queries);
    }
    case "pseudo-class": {
      // const specificity = ref.specificity;

      //   specificity[Specificity.ClassName] =
      //     (specificity[Specificity.ClassName] ?? 0) + 1;
      switch (component.kind) {
        case "dir": {
          queries ??= [{ specificity: [] }];
          queries.forEach((query) => {
            getMediaQuery(query).push(["=", "dir", component.direction]);
          });
          return parseIsWhereComponents(type, selector, index + 1, queries);
        }
        case "hover": {
          queries ??= [{ specificity: [] }];
          queries.forEach((query) => {
            getPseudoClassesQuery(query).h = 1;
          });
          return parseIsWhereComponents(type, selector, index + 1, queries);
        }
        case "active": {
          queries ??= [{ specificity: [] }];
          queries.forEach((query) => {
            getPseudoClassesQuery(query).a = 1;
          });
          return parseIsWhereComponents(type, selector, index + 1, queries);
        }
        case "focus": {
          queries ??= [{ specificity: [] }];
          queries.forEach((query) => {
            getPseudoClassesQuery(query).f = 1;
          });
          return parseIsWhereComponents(type, selector, index + 1, queries);
        }
        case "disabled": {
          queries ??= [{ specificity: [] }];
          queries.forEach((query) => {
            getAttributeQuery(query).push(["a", "disabled"]);
          });
          return parseIsWhereComponents(type, selector, index + 1, queries);
        }
        case "empty": {
          queries ??= [{ specificity: [] }];
          queries.forEach((query) => {
            getAttributeQuery(query).push(["a", "children", "!"]);
          });
          return parseIsWhereComponents(type, selector, index + 1, queries);
        }
        case "where":
        case "is": {
          // Now get the selectors inside the `is` or `where` pseudo-class
          queries = component.selectors.flatMap((selector) => {
            return parseIsWhereComponents(type, selector, 0, queries) ?? [];
          });

          return parseIsWhereComponents(type, selector, index + 1, queries);
        }
        default: {
          return null;
        }
      }
    }
    case "attribute": {
      if (component.name === "dir") {
        return null;
      }

      if (type !== "where") {
        // specificity[Specificity.ClassName] =
        //   (specificity[Specificity.ClassName] ?? 0) + 1;
      }
      const attributeQuery: AttributeQuery = component.name.startsWith("data-")
        ? // [data-*] are turned into `dataSet` queries
          ["d", toRNProperty(component.name.replace("data-", ""))]
        : // Everything else is turned into `attribute` queries
          ["a", toRNProperty(component.name)];
      if (component.operation) {
        const operator = operatorMap[component.operation.operator];
        // Append the operator onto the attribute query
        attributeQuery.push(operator, component.operation.value);
      }
      queries ??= [{ specificity: [] }];
      for (const query of queries) {
        if (type === "is") {
          query.specificity[Specificity.ClassName] =
            (query.specificity[Specificity.ClassName] ?? 0) + 1;
        }
        getAttributeQuery(query).push(attributeQuery);
      }
      return parseIsWhereComponents(type, selector, index + 1, queries);
    }
    case "class": {
      // In `is` and `where` selectors, the ref will always be a container query
      queries ??= [{ specificity: [] }];
      for (const query of queries) {
        if (type === "is") {
          query.specificity[Specificity.ClassName] =
            (query.specificity[Specificity.ClassName] ?? 0) + 1;
        }

        query.n = query.n
          ? `${query.n}.${component.name}`
          : `g:${component.name}`;
      }

      return parseIsWhereComponents(type, selector, index + 1, queries);
    }
  }
}

function isContainerQuery(
  value: PartialSelector | ContainerQuery,
): value is ContainerQuery {
  return !("type" in value);
}

function getPseudoClassesQuery(key: PartialSelector | ContainerQuery) {
  let pseudoClassesQuery = pseudoClassesQueryMap.get(key);
  if (!pseudoClassesQuery) {
    if ("type" in key) {
      pseudoClassesQuery = {};
      key.pseudoClassesQuery = pseudoClassesQuery;
    } else {
      key.p ??= {};
      pseudoClassesQuery = key.p;
    }
    pseudoClassesQueryMap.set(key, pseudoClassesQuery);
  }

  return pseudoClassesQuery;
}

function getAttributeQuery(
  key: PartialSelector | ContainerQuery,
): AttributeQuery[] {
  let attributeQuery = attributeQueryMap.get(key);
  if (!attributeQuery) {
    if ("type" in key) {
      attributeQuery = [];
      key.attributeQuery = attributeQuery;
    } else {
      key.a ??= [];
      attributeQuery = key.a;
    }
    attributeQueryMap.set(key, attributeQuery);
  }

  return attributeQuery;
}

function getMediaQuery(
  key: PartialSelector | ContainerQuery,
): MediaCondition[] {
  let mediaQuery = mediaQueryMap.get(key);
  if (!mediaQuery) {
    if ("type" in key) {
      mediaQuery = [];
      key.mediaQuery = mediaQuery;
    } else {
      mediaQuery = [];
      key.m ??= ["&", mediaQuery];
    }
    mediaQueryMap.set(key, mediaQuery);
  }

  return mediaQuery;
}

function isRootVariableSelector([first, ...rest]: Selector) {
  rest = rest.filter((item) => item.type !== "nesting");
  return (
    first &&
    rest.length === 0 &&
    first.type === "pseudo-class" &&
    first.kind === "root"
  );
}

function isUniversalSelector([first, second]: Selector) {
  return first && first.type === "universal" && !second;
}

export function toRNProperty<T extends string>(str: T) {
  return str
    .replace(/^-rn-/, "")
    .replace(/-./g, (x) => x[1]?.toUpperCase() ?? "") as CamelCase<T>;
}

type CamelCase<S extends string> =
  S extends `${infer P1}-${infer P2}${infer P3}`
    ? `${Lowercase<P1>}${Uppercase<P2>}${CamelCase<P3>}`
    : Lowercase<S>;

const operatorMap: Record<AttrOperation["operator"], AttrSelectorOperator> = {
  "equal": "=",
  "includes": "~=",
  "dash-match": "|=",
  "prefix": "^=",
  "substring": "*=",
  "suffix": "$=",
};
