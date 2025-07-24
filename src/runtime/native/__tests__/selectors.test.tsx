import { View } from "react-native-css/components/View";
import {
  act,
  registerCSS,
  render,
  screen,
  testID,
} from "react-native-css/jest";

import { colorScheme } from "../api";

test.skip(":is(.dark *)", () => {
  registerCSS(`@cssInterop set darkMode class dark;
.my-class:is(.dark *) { color: red; }`);

  render(<View testID={testID} className="my-class" />);

  const component = screen.getByTestId(testID);

  expect(component.props.style).toStrictEqual(undefined);

  act(() => {
    colorScheme.set("dark");
  });

  expect(component.props.style).toStrictEqual({ color: "#f00" });
});

test.skip(':root[class="dark"]', () => {
  registerCSS(`@cssInterop set darkMode class dark;
:root[class="dark"] {
  --my-var: red;
}
.my-class { 
  color: var(--my-var); 
}`);

  render(<View testID={testID} className="my-class" />);

  const component = screen.getByTestId(testID);

  expect(component.props.style).toStrictEqual({});

  act(() => {
    colorScheme.set("dark");
  });

  expect(component.props.style).toStrictEqual({ color: "red" });
});

test(':root[class~="dark"]', () => {
  registerCSS(`
    @react-native {
      darkMode: dark;
    }

    :root[class~="dark"] {
      --my-var: red;
    }
    .my-class { 
      color: var(--my-var); 
    }
  `);

  render(<View testID={testID} className="my-class" />);

  const component = screen.getByTestId(testID);

  expect(component.props.style).toStrictEqual({});

  act(() => {
    colorScheme.set("dark");
  });

  expect(component.props.style).toStrictEqual({ color: "red" });
});
