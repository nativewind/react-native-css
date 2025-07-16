import { View } from "react-native";

import { act, registerCSS, renderHook } from "react-native-css/jest";

import { useNativeCss } from "../react/useNativeCss";
import {
  dimensions,
  rem,
  VAR_SYMBOL,
  VariableContext,
  vh,
  vw,
} from "../reactivity";
import { emVariableName } from "../styles/constants";

test("px", () => {
  registerCSS(`.my-class { width: 10px; }`);

  const { result } = renderHook(() => {
    return useNativeCss(View, { className: "my-class" });
  });

  expect(result.current.type).toBe(View);
  expect(result.current.props).toStrictEqual({
    style: { width: 10 },
  });
});

test("%", () => {
  registerCSS(`.my-class { width: 10%; }`);

  const { result } = renderHook(() => {
    return useNativeCss(View, { className: "my-class" });
  });

  expect(result.current.type).toBe(View);
  expect(result.current.props).toStrictEqual({
    style: { width: "10%" },
  });
});

test("vw", () => {
  registerCSS(`.my-class { width: 10vw; }`);

  const { result } = renderHook(() => {
    return useNativeCss(View, { className: "my-class" });
  });

  expect(vw.get()).toEqual(750);

  expect(result.current.type).toBe(View);
  expect(result.current.props).toStrictEqual({
    style: { width: 75 },
  });

  act(() => {
    dimensions.set({
      ...dimensions.get(),
      width: 100,
    });
  });

  expect(vw.get()).toEqual(100);
  expect(result.current.props).toStrictEqual({
    style: { width: 10 },
  });
});

test("vh", () => {
  registerCSS(`.my-class { height: 10vh; }`);

  const { result } = renderHook(() => {
    return useNativeCss(View, { className: "my-class" });
  });

  expect(vh.get()).toEqual(1334);
  expect(result.current.type).toBe(View);
  expect(result.current.props).toStrictEqual({
    style: { height: 133.4 },
  });

  act(() => {
    dimensions.set({
      ...dimensions.get(),
      height: 100,
    });
  });

  expect(vh.get()).toEqual(100);
  expect(result.current.props).toStrictEqual({
    style: { height: 10 },
  });
});

test("rem - default", () => {
  registerCSS(`.my-class { font-size: 10rem; }`);

  const { result } = renderHook(() => {
    return useNativeCss(View, { className: "my-class" });
  });

  expect(result.current.type).toBe(VariableContext.Provider);
  expect(result.current.props.value).toStrictEqual({
    [VAR_SYMBOL]: true,
    [emVariableName]: 140,
  });

  expect(result.current.props.children.type).toBe(View);
  expect(result.current.props.children.props).toStrictEqual({
    style: { fontSize: 140 },
  });
});

test("rem - override", () => {
  registerCSS(`.my-class { font-size: 10rem; }`, {
    inlineRem: 10,
  });

  const { result } = renderHook(() => {
    return useNativeCss(View, { className: "my-class" });
  });

  expect(result.current.type).toBe(VariableContext.Provider);
  expect(result.current.props.value).toStrictEqual({
    [VAR_SYMBOL]: true,
    [emVariableName]: 100,
  });

  expect(result.current.props.children.type).toBe(View);
  expect(result.current.props.children.props).toStrictEqual({
    style: { fontSize: 100 },
  });
});

test("rem - dynamic", () => {
  registerCSS(`.my-class { font-size: 10rem; }`, {
    inlineRem: false,
  });

  const { result } = renderHook(() => {
    return useNativeCss(View, { className: "my-class" });
  });

  expect(rem.get()).toEqual(14);
  expect(result.current.type).toBe(VariableContext.Provider);
  expect(result.current.props.value).toStrictEqual({
    [VAR_SYMBOL]: true,
    [emVariableName]: [{}, "rem", [10]],
  });

  expect(result.current.props.children.type).toBe(View);
  expect(result.current.props.children.props).toStrictEqual({
    style: { fontSize: 140 },
  });

  act(() => {
    rem.set(10);
  });

  expect(rem.get()).toEqual(10);
  expect(result.current.type).toBe(VariableContext.Provider);
  expect(result.current.props.value).toStrictEqual({
    [VAR_SYMBOL]: true,
    [emVariableName]: [{}, "rem", [10]],
  });

  expect(result.current.props.children.type).toBe(View);
  expect(result.current.props.children.props).toStrictEqual({
    style: { fontSize: 100 },
  });
});
