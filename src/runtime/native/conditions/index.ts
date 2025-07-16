/* eslint-disable */
import type {
  AttributeQuery,
  PseudoClassesQuery,
  StyleRule,
} from "../../../compiler";
import type { Props } from "../../runtime.types";
import {
  activeFamily,
  focusFamily,
  hoverFamily,
  type ContainerContextValue,
  type Effect,
} from "../reactivity";
import { testContainerQueries } from "./container-query";
import type { RenderGuard } from "./guards";
import { testMediaQuery } from "./media-query";

export function testRule(
  rule: StyleRule,
  effect: Effect,
  props: Props,
  guards: RenderGuard[],
  containerContext: ContainerContextValue,
) {
  if (rule.p && !pseudoClasses(rule.p, effect)) {
    return false;
  }
  if (rule.m && !testMediaQuery(rule.m, effect)) {
    return false;
  }
  if (rule.aq && !attributes(rule.aq, props, guards)) {
    return false;
  }
  if (
    rule.cq &&
    !testContainerQueries(rule.cq, containerContext, guards, effect)
  ) {
    return false;
  }

  return true;
}

function pseudoClasses(query: PseudoClassesQuery, effect: Effect) {
  if (query.h && !hoverFamily(effect).get(effect)) {
    return false;
  }
  if (query.a && !activeFamily(effect).get(effect)) {
    return false;
  }
  if (query.f && !focusFamily(effect).get(effect)) {
    return false;
  }
  return true;
}

function attributes(
  queries: AttributeQuery[],
  props: Props,
  guards: RenderGuard[],
) {
  return queries.every((query) => testAttribute(query, props, guards));
}

function testAttribute(
  query: AttributeQuery,
  props: Props,
  guards: RenderGuard[],
) {
  let value: any;

  if (query[0] === "a") {
    value = props?.[query[1]];
  } else {
    value = props?.dataSet?.[query[1]];
  }

  guards.push([query[0], query[1], value]);

  const operator = query[2];

  if (!operator) {
    return value !== undefined && value !== null && value !== false;
  }

  switch (operator) {
    case "!":
      return !value;
    case "=":
      return value == query[3];
    case "~=":
      return value?.toString().split(" ").includes(query[3]);
    case "|=":
      return value?.toString().startsWith(query[3] + "-");
    case "^=":
      return value?.toString().startsWith(query[3]);
    case "$=":
      return value?.toString().endsWith(query[3]);
    case "*=":
      return value?.toString().includes(query[3]);
    default:
      operator satisfies never;
      return false;
  }
}
