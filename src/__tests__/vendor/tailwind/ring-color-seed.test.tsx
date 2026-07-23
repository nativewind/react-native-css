import { colorScheme } from "react-native-css/runtime";

import { renderSimple } from "./_tailwind";

// The root `__rn-css-color` seed is a module-load side effect gated on
// Platform.OS, and jest-expo defaults to ios. Mock android so the runtime takes
// the Android branch, then drive it with *real* Tailwind output — the default
// `ring-*` color is `currentcolor`, which resolves through the root seed.
jest.mock("react-native", () => {
  const ReactNative =
    jest.requireActual<typeof import("react-native")>("react-native");
  ReactNative.Platform.OS = "android";
  return ReactNative;
});

const ringColor = (props: { style?: unknown }): string => {
  const style = props.style as { boxShadow: [{ color: string }] };
  return style.boxShadow[0].color;
};

describe("android default ring paints (real Tailwind → root color seed)", () => {
  test("ring-2 with no explicit color resolves to the seed, not an invisible ColorStateList", async () => {
    // The reported bug: Tailwind's default ring color is currentcolor, and with
    // the old PlatformColor('?attr/textColorPrimary') seed the ring never
    // painted on Android. It now resolves to the concrete seed.
    colorScheme.set("light");
    const { props } = await renderSimple({ className: "ring-2" });
    expect(ringColor(props)).toBe("#000000");
  });

  test("the default ring is scheme-aware (white in dark mode)", async () => {
    colorScheme.set("dark");
    const { props } = await renderSimple({ className: "ring" });
    expect(ringColor(props)).toBe("#FFFFFF");
  });

  test("an explicit ring color still wins over the currentcolor default", async () => {
    colorScheme.set("light");
    const { props } = await renderSimple({ className: "ring-2 ring-red-500" });
    expect(ringColor(props)).toBe("#fb2c36");
  });
});
