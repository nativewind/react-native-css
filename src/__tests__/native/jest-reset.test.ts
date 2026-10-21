import { reducedMotion } from "react-native-css/runtime";

import { resetBetweenTests } from "../../jest/reset";
import { deviceReducedMotion } from "../../native/reactivity";

describe("the react-native-css/jest reset", () => {
  test("clears a test's override", () => {
    reducedMotion.set("reduce");
    expect(reducedMotion.get()).toBe("reduce");

    resetBetweenTests();

    expect(reducedMotion.get()).toBe("no-preference");
  });

  test("puts a device a test changed back to AccessibilityInfo's answer", () => {
    deviceReducedMotion.set("reduce");
    expect(reducedMotion.get()).toBe("reduce");

    resetBetweenTests();

    expect(reducedMotion.get()).toBe("no-preference");
  });
});
