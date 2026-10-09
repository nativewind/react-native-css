import { render, screen } from "@testing-library/react-native";
import type { CompilerOptions } from "react-native-css/compiler";
import { Text } from "react-native-css/components/Text";
import { View } from "react-native-css/components/View";
import { registerCSS } from "react-native-css/jest";

import {
  otherSource,
  paddingOf,
  parentID,
  remountWarning,
  sources,
  trackRemounts,
  withClassNames,
} from "./_remounts";

const childID = "child";

const { log, MountCounter, renderChanges, scrollView, view } = trackRemounts();

test("adding a group", () => {
  registerCSS(
    `.group .my-class {
      color: red;
    }`,
  );

  render(
    <View testID={parentID}>
      <Text testID={childID} className="my-class" />
    </View>,
  );

  const child = screen.getByTestId(childID);

  expect(child.props.style).toStrictEqual(undefined);

  screen.rerender(
    <View testID={parentID} className="group">
      <Text testID={childID} className="my-class" />
    </View>,
  );

  expect(log.mock.calls).toEqual([
    [remountWarning.container("className 'group'")],
  ]);
});

test("will-change-container", () => {
  registerCSS(
    `.group .my-class {
      color: red;
    }`,
  );

  render(
    <View testID={parentID} className="will-change-container">
      <Text testID={childID} className="my-class" />
    </View>,
  );

  const child = screen.getByTestId(childID);

  expect(child.props.style).toStrictEqual(undefined);

  screen.rerender(
    <View testID={parentID} className="group">
      <Text testID={childID} className="my-class" />
    </View>,
  );

  // There shouldn't be any error, as we continued to have a container
  expect(log.mock.calls).toEqual([]);
});

const remountingCSS = `
  @keyframes fade { from { opacity: 0; } to { opacity: 1; } }
  .variable { --gap: 8px; }
  .variable-elsewhere { --gap: 4px; }
  .colour { color: red; }
  .container { container-type: inline-size; }
  .animation { animation: fade 1s linear; }
  .press:active { opacity: 0.5; }
  .plain { margin: 2px; }
`;

// A custom property defined twice stays a runtime variable, and color is published to descendants as one
const remountingClassNames = [
  ["variable", remountWarning.variable],
  ["colour", remountWarning.variable],
  ["container", remountWarning.container],
  ["animation", remountWarning.animation],
] as const;

describe.each(sources)("a ScrollView whose %s carries the rule", (source) => {
  const other = otherSource(source);

  beforeEach(() => {
    registerCSS(remountingCSS);
  });

  test.each(remountingClassNames)(
    "keeping '%s' neither re-mounts nor warns",
    (className) => {
      expect(
        renderChanges(
          scrollView(withClassNames(source, className)),
          scrollView(withClassNames(source, `${className} plain`)),
        ),
      ).toEqual({ mountLogs: [], logs: [], remounts: 0 });
    },
  );

  test.each(remountingClassNames)(
    "keeping '%s' while the other className prop changes neither re-mounts nor warns",
    (className) => {
      expect(
        renderChanges(
          scrollView(withClassNames(source, className)),
          scrollView({
            ...withClassNames(source, className),
            ...withClassNames(other, "plain"),
          }),
        ),
      ).toEqual({ mountLogs: [], logs: [], remounts: 0 });
    },
  );

  test.each(remountingClassNames)(
    "moving '%s' to the other className prop neither re-mounts nor warns",
    (className) => {
      expect(
        renderChanges(
          scrollView(withClassNames(source, className)),
          scrollView(withClassNames(other, className)),
        ),
      ).toEqual({ mountLogs: [], logs: [], remounts: 0 });
    },
  );

  test.each(remountingClassNames)(
    "re-rendering '%s' unchanged neither re-mounts nor warns",
    (className) => {
      expect(
        renderChanges(
          scrollView(withClassNames(source, className)),
          scrollView(withClassNames(source, className)),
          scrollView(withClassNames(source, className)),
        ),
      ).toEqual({ mountLogs: [], logs: [], remounts: 0 });
    },
  );

  test.each(remountingClassNames)(
    "adding '%s' re-mounts once and warns once",
    (className, warning) => {
      expect(
        renderChanges(
          scrollView(withClassNames(source, "plain")),
          scrollView(withClassNames(source, className)),
        ),
      ).toEqual({
        mountLogs: [],
        logs: [[warning(`${source} '${className}'`)]],
        remounts: 1,
      });
    },
  );

  test.each(remountingClassNames)(
    "adding '%s' beside a class on the other prop names both props in the warning",
    (className, warning) => {
      const named =
        source === "className"
          ? `className '${className}', contentContainerClassName 'plain'`
          : `className 'plain', contentContainerClassName '${className}'`;

      expect(
        renderChanges(
          scrollView({
            ...withClassNames(source, "plain"),
            ...withClassNames(other, "plain"),
          }),
          scrollView({
            ...withClassNames(source, className),
            ...withClassNames(other, "plain"),
          }),
        ),
      ).toEqual({ mountLogs: [], logs: [[warning(named)]], remounts: 1 });
    },
  );

  test.each(remountingClassNames)(
    "removing '%s' re-mounts once and warns once",
    (className, warning) => {
      expect(
        renderChanges(
          scrollView(withClassNames(source, className)),
          scrollView(withClassNames(source, "plain")),
        ),
      ).toEqual({
        mountLogs: [],
        logs: [[warning(`${source} 'plain'`)]],
        remounts: 1,
      });
    },
  );

  test.each(remountingClassNames)(
    "adding '%s' is reported once however often the element re-renders after it",
    (className, warning) => {
      expect(
        renderChanges(
          scrollView(withClassNames(source, "plain")),
          scrollView(withClassNames(source, className)),
          scrollView(withClassNames(source, className)),
          scrollView(withClassNames(source, className)),
        ),
      ).toEqual({
        mountLogs: [],
        logs: [[warning(`${source} '${className}'`)]],
        remounts: 1,
      });
    },
  );

  test.each(remountingClassNames)(
    "adding '%s' and removing it again re-mounts and warns once each way",
    (className, warning) => {
      expect(
        renderChanges(
          scrollView(withClassNames(source, "plain")),
          scrollView(withClassNames(source, className)),
          scrollView(withClassNames(source, "plain")),
        ),
      ).toEqual({
        mountLogs: [],
        logs: [
          [warning(`${source} '${className}'`)],
          [warning(`${source} 'plain'`)],
        ],
        remounts: 2,
      });
    },
  );
});

// Whether the compiler folds a custom property or keeps it for runtime decides if its rule scopes a variable
function registerCustomProperty(options: CompilerOptions) {
  const compiled = registerCSS(
    `.custom-property { --gap: 8px; padding: var(--gap); }
    .plain { margin: 2px; }`,
    options,
  );

  return Boolean(
    compiled
      .stylesheet()
      .s?.some(
        ([name, rules]) =>
          name === "custom-property" && rules.some((rule) => rule.v),
      ),
  );
}

describe.each([
  ["the default compiler options", {}],
  ["inlineVariables: false", { inlineVariables: false }],
] as const)("a custom property compiled with %s", (_options, options) => {
  test.each(sources)(
    "resolves the same padding, and re-mounts and warns once only if it scopes a variable, when added on %s",
    (source) => {
      const remounts = registerCustomProperty(options) ? 1 : 0;

      expect(
        renderChanges(
          scrollView(withClassNames(source, "plain")),
          scrollView(withClassNames(source, "custom-property")),
        ),
      ).toEqual({
        mountLogs: [],
        logs: remounts
          ? [[remountWarning.variable(`${source} 'custom-property'`)]]
          : [],
        remounts,
      });
      expect(paddingOf(source)).toBe(8);
    },
  );

  test.each(sources)(
    "re-mounts and warns once only if it scoped a variable when removed from %s",
    (source) => {
      const remounts = registerCustomProperty(options) ? 1 : 0;

      expect(
        renderChanges(
          scrollView(withClassNames(source, "custom-property")),
          scrollView(withClassNames(source, "plain")),
        ),
      ).toEqual({
        mountLogs: [],
        logs: remounts ? [[remountWarning.variable(`${source} 'plain'`)]] : [],
        remounts,
      });
    },
  );
});

test("inlineVariables: false keeps a custom property for runtime, so its rule scopes a variable", () => {
  expect(registerCustomProperty({ inlineVariables: false })).toBe(true);
});

describe("a View is swapped for a Pressable when it gains an onPress", () => {
  const onPress = jest.fn();

  beforeEach(() => {
    registerCSS(remountingCSS);
  });

  test("an :active rule re-mounts it once and warns once", () => {
    expect(
      renderChanges(view({ className: "plain" }), view({ className: "press" })),
    ).toEqual({
      mountLogs: [],
      logs: [[remountWarning.pressable("className 'press'")]],
      remounts: 1,
    });
  });

  test("it stays a Pressable once the :active rule is gone", () => {
    expect(
      renderChanges(view({ className: "press" }), view({ className: "plain" })),
    ).toEqual({ mountLogs: [], logs: [], remounts: 0 });
  });

  test("will-change-pressable makes it a Pressable from its first render", () => {
    expect(
      renderChanges(
        view({ className: "will-change-pressable" }),
        view({ className: "will-change-pressable press" }),
      ),
    ).toEqual({ mountLogs: [], logs: [], remounts: 0 });
  });

  test("its own onPress already made it a Pressable, so an :active rule neither re-mounts nor warns", () => {
    expect(
      renderChanges(
        view({ className: "plain", onPress }),
        view({ className: "press", onPress }),
      ),
    ).toEqual({ mountLogs: [], logs: [], remounts: 0 });
  });

  test("its own onPress arriving re-mounts it once and warns once", () => {
    expect(
      renderChanges(
        view({ className: "plain" }),
        view({ className: "plain", onPress }),
      ),
    ).toEqual({
      mountLogs: [],
      logs: [[remountWarning.pressable("className 'plain'")]],
      remounts: 1,
    });
  });

  test("its own onPress leaving re-mounts it once and warns once", () => {
    expect(
      renderChanges(
        view({ className: "plain", onPress }),
        view({ className: "plain" }),
      ),
    ).toEqual({
      mountLogs: [],
      logs: [[remountWarning.pressable("className 'plain'")]],
      remounts: 1,
    });
  });

  test("an :active rule keeps it a Pressable when its own onPress leaves", () => {
    expect(
      renderChanges(
        view({ className: "press", onPress }),
        view({ className: "press" }),
      ),
    ).toEqual({ mountLogs: [], logs: [], remounts: 0 });
  });

  test("a Text is never swapped, so an :active rule neither re-mounts nor warns", () => {
    expect(
      renderChanges(
        <Text testID={parentID} className="plain">
          <MountCounter />
        </Text>,
        <Text testID={parentID} className="press">
          <MountCounter />
        </Text>,
      ),
    ).toEqual({ mountLogs: [], logs: [], remounts: 0 });
  });

  test.each(sources)(
    "a ScrollView is never swapped, so an :active rule on %s neither re-mounts nor warns",
    (source) => {
      expect(
        renderChanges(
          scrollView(withClassNames(source, "plain")),
          scrollView(withClassNames(source, "press")),
        ),
      ).toEqual({ mountLogs: [], logs: [], remounts: 0 });
    },
  );
});

describe.each([
  ["will-change-variable", "variable"],
  ["will-change-container", "container"],
  ["will-change-animation", "animation"],
] as const)("%s", (marker, className) => {
  beforeEach(() => {
    registerCSS(remountingCSS);
  });

  test.each(sources)(
    `keeps the ScrollView from re-mounting when '${className}' arrives on %s`,
    (source) => {
      expect(
        renderChanges(
          scrollView(withClassNames(otherSource(source), marker)),
          scrollView({
            ...withClassNames(otherSource(source), marker),
            ...withClassNames(source, className),
          }),
        ),
      ).toEqual({ mountLogs: [], logs: [], remounts: 0 });
    },
  );
});

test("a production build re-mounts without the warning", () => {
  registerCSS(remountingCSS);
  const environment = process.env.NODE_ENV;
  process.env.NODE_ENV = "production";

  try {
    expect(
      renderChanges(
        scrollView(withClassNames("contentContainerClassName", "variable")),
        scrollView(withClassNames("contentContainerClassName", "plain")),
      ),
    ).toEqual({ mountLogs: [], logs: [], remounts: 1 });
  } finally {
    process.env.NODE_ENV = environment;
  }
});
