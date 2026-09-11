import { I18nManager } from "react-native";

import { render, screen } from "@testing-library/react-native";
import { View } from "react-native-css/components/View";
import { registerCSS } from "react-native-css/jest";

const originalDirection = Object.getOwnPropertyDescriptor(I18nManager, "isRTL");
afterEach(() => {
  if (originalDirection)
    Object.defineProperty(I18nManager, "isRTL", originalDirection);
});

test.each([false, true])(
  "direction conditions are exclusive when isRTL=%s",
  (isRTL) => {
    Object.defineProperty(I18nManager, "isRTL", {
      configurable: true,
      value: isRTL,
    });
    registerCSS(`
    .rtl { width: 10px; }
    .ltr { width: 10px; }
    @media (dir: rtl) { .rtl { width: 37px; } }
    @media (dir: ltr) { .ltr { width: 37px; } }
  `);
    render(
      <View>
        <View testID="rtl" className="rtl" />
        <View testID="ltr" className="ltr" />
      </View>,
    );
    expect(screen.getByTestId("rtl")).toHaveStyle({ width: isRTL ? 37 : 10 });
    expect(screen.getByTestId("ltr")).toHaveStyle({ width: isRTL ? 10 : 37 });
  },
);
