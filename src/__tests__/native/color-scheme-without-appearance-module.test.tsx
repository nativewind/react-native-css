import { Appearance } from "react-native";

import { act, render, screen } from "@testing-library/react-native";
import { View } from "react-native-css/components/View";
import { registerCSS, testID } from "react-native-css/jest";
import { colorScheme } from "react-native-css/runtime";

import { resetBetweenTests } from "../../jest/reset";

const TRI_STATE_CSS = `
.my-class { color: green; }

@media (prefers-color-scheme: light) {
  .my-class { color: blue; }
  :root { --scheme-color: #00f; }
}

@media (prefers-color-scheme: dark) {
  .my-class { color: red; }
  :root { --scheme-color: #f0f; }
}

.scheme-variable { color: var(--scheme-color); }`;

const VARIABLE_TEST_ID = "scheme-variable";

const BLUE = { color: "#00f" } as const;
const RED = { color: "#f00" } as const;
const MAGENTA = { color: "#f0f" } as const;

beforeEach(() => {
  registerCSS(TRI_STATE_CSS);
  render(
    <>
      <View testID={testID} className="my-class" />
      <View testID={VARIABLE_TEST_ID} className="scheme-variable" />
    </>,
  );
});

test("without an Appearance module, colorScheme.set holds the scheme for every layer", () => {
  act(() => {
    colorScheme.set("dark");
  });

  expect(Appearance.getColorScheme()).toBeNull();
  expect(colorScheme.get()).toBe("dark");
  expect(screen.getByTestId(testID).props.style).toStrictEqual(RED);
  expect(screen.getByTestId(VARIABLE_TEST_ID).props.style).toStrictEqual(
    MAGENTA,
  );
});

test.each([null, "unspecified"] as const)(
  "without an Appearance module, set(%p) resolves light on every layer",
  (handBack) => {
    act(() => {
      colorScheme.set("dark");
    });
    act(() => {
      colorScheme.set(handBack);
    });

    expect(colorScheme.get()).toBe("light");
    expect(screen.getByTestId(testID).props.style).toStrictEqual(BLUE);
    expect(screen.getByTestId(VARIABLE_TEST_ID).props.style).toStrictEqual(
      BLUE,
    );
  },
);

test("the jest helper's reset forgets a scheme this library held without an Appearance module", () => {
  act(() => {
    colorScheme.set("dark");
  });
  act(() => {
    resetBetweenTests();
  });

  expect(colorScheme.get()).toBe("light");
});
