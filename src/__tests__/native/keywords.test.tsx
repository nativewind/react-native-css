import { View } from "react-native";

import { renderHook } from "@testing-library/react-native";
import { registerCSS } from "react-native-css/jest";
import { useNativeCss } from "react-native-css/native";

test("unset", () => {
  registerCSS(`.my-class { background-color: unset; }`);

  const { result } = renderHook(() => {
    return useNativeCss(View, { className: "my-class" });
  });

  expect(result.current.props).toStrictEqual({
    style: { backgroundColor: undefined },
  });
});
