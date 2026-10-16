/* eslint-disable @typescript-eslint/no-deprecated */
import { render, screen } from "@testing-library/react-native";
import { View } from "react-native-css/components/View";
import { registerCSS, testID } from "react-native-css/jest";
import { vars } from "react-native-css/runtime";

import {
  paddingOf,
  remountWarning,
  sources,
  trackRemounts,
  withClassNames,
  type ClassNameSource,
  type ScrollViewProps,
} from "./_remounts";

const { renderChanges, scrollView } = trackRemounts();

test("vars", () => {
  registerCSS(
    `.my-class {
        color: var(--color);
      }`,
  );

  render(
    <View
      testID={testID}
      className="my-class"
      style={vars({ color: "red" })}
    />,
  );

  const element = screen.getByTestId(testID);
  expect(element.props.style).toMatchObject({
    color: "red",
  });

  screen.rerender(
    <View
      testID={testID}
      className="my-class"
      style={vars({ color: "blue" })}
    />,
  );

  expect(element.props.style).toMatchObject({
    color: "blue",
  });
});

function withVariables(
  source: ClassNameSource,
  variables: Parameters<typeof vars>[0],
): ScrollViewProps {
  const style = vars(variables);

  return source === "className" ? { style } : { contentContainerStyle: style };
}

describe.each(sources)("vars() on the style that %s maps to", (source) => {
  beforeEach(() => {
    registerCSS(`.reads-gap { padding: var(--gap); }`);
  });

  test("changing its values neither re-mounts nor warns", () => {
    expect(
      renderChanges(
        scrollView({
          ...withClassNames(source, "reads-gap"),
          ...withVariables(source, { "--gap": 8 }),
        }),
        scrollView({
          ...withClassNames(source, "reads-gap"),
          ...withVariables(source, { "--gap": 4 }),
        }),
      ),
    ).toEqual({ mountLogs: [], logs: [], remounts: 0 });
    expect(paddingOf(source)).toBe(4);
  });

  test("adding it re-mounts once and warns once", () => {
    expect(
      renderChanges(
        scrollView(withClassNames(source, "reads-gap")),
        scrollView({
          ...withClassNames(source, "reads-gap"),
          ...withVariables(source, { "--gap": 8 }),
        }),
      ),
    ).toEqual({
      mountLogs: [],
      logs: [[remountWarning.variable(`${source} 'reads-gap'`)]],
      remounts: 1,
    });
    expect(paddingOf(source)).toBe(8);
  });

  test("removing it re-mounts once and warns once", () => {
    expect(
      renderChanges(
        scrollView({
          ...withClassNames(source, "reads-gap"),
          ...withVariables(source, { "--gap": 8 }),
        }),
        scrollView(withClassNames(source, "reads-gap")),
      ),
    ).toEqual({
      mountLogs: [],
      logs: [[remountWarning.variable(`${source} 'reads-gap'`)]],
      remounts: 1,
    });
  });
});
