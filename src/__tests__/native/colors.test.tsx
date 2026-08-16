import { act, fireEvent, render, screen } from "@testing-library/react-native";
import { Text } from "react-native-css/components/Text";
import { View } from "react-native-css/components/View";
import { registerCSS, testID } from "react-native-css/jest";
import { colorScheme } from "react-native-css/runtime";

describe("hsl", () => {
  test("inline", () => {
    registerCSS(`.my-class { color: hsl(0 84.2% 60.2%); }`);

    render(<View testID={testID} className="my-class" />);
    const component = screen.getByTestId(testID);

    expect(component.type).toBe("View");
    expect(component.props).toStrictEqual({
      children: undefined,
      style: { color: "#ef4444" },
      testID,
    });
  });

  test("inline with comma", () => {
    registerCSS(`.my-class {
      color: hsl(0, 84.2%, 60.2%);
    }`);

    render(<View testID={testID} className="my-class" />);
    const component = screen.getByTestId(testID);

    expect(component.type).toBe("View");
    expect(component.props).toStrictEqual({
      children: undefined,
      style: { color: "#ef4444" },
      testID,
    });
  });

  test("var with spaces", () => {
    registerCSS(`.my-class {
      --primary: 0 84.2% 60.2%;
      color: hsl(var(--primary));
    }`);

    render(<View testID={testID} className="my-class" />);
    const component = screen.getByTestId(testID);

    expect(component.type).toBe("View");
    expect(component.props).toStrictEqual({
      children: undefined,
      style: { color: "#ef4444" },
      testID,
    });
  });

  test("var with comma", () => {
    registerCSS(`.my-class {
        --primary: 0, 84.2%, 60.2%;
        color: hsl(var(--primary));
      }`);

    render(<View testID={testID} className="my-class" />);
    const component = screen.getByTestId(testID);

    expect(component.type).toBe("View");
    expect(component.props).toStrictEqual({
      children: undefined,
      style: { color: "#ef4444" },
      testID,
    });
  });
});

describe("hsla", () => {
  test("inline with slash", () => {
    registerCSS(`.my-class {
      color: hsla(0 84.2% 60.2% / 60%);
    }`);

    render(<View testID={testID} className="my-class" />);
    const component = screen.getByTestId(testID);

    expect(component.type).toBe("View");
    expect(component.props).toStrictEqual({
      children: undefined,
      style: { color: "#ef444499" },
      testID,
    });
  });

  test("inline with comma", () => {
    registerCSS(`.my-class {
      color: hsla(0, 84.2%, 60.2%, 60%);
    }`);

    render(<View testID={testID} className="my-class" />);
    const component = screen.getByTestId(testID);

    expect(component.type).toBe("View");
    expect(component.props).toStrictEqual({
      children: undefined,
      style: { color: "#ef444499" },
      testID,
    });
  });

  test("function with slash", () => {
    registerCSS(`.my-class {
      --primary: 0 84.2% 60.2% / 60%;
      color: hsla(var(--primary));
    }`);

    render(<View testID={testID} className="my-class" />);
    const component = screen.getByTestId(testID);

    expect(component.type).toBe("View");
    expect(component.props).toStrictEqual({
      children: undefined,
      style: { color: "#ef444499" },
      testID,
    });
  });

  test("function with comma", () => {
    registerCSS(`.my-class {
      --primary: 0, 84.2%, 60.2%, 60%;
      color: hsla(var(--primary));
    }`);

    render(<View testID={testID} className="my-class" />);
    const component = screen.getByTestId(testID);

    expect(component.type).toBe("View");
    expect(component.props).toStrictEqual({
      children: undefined,
      style: { color: "#ef444499" },
      testID,
    });
  });
});

describe("currentcolor", () => {
  test("currentcolor and global variables", () => {
    registerCSS(`
      @layer theme {
        :root {
          --color-red-500: red;
        }
      }
      @layer utilities {
        .bg-current {
          background-color: currentcolor;
        }
        .text-red-500 {
          color: var(--color-red-500);
        }
      }
    `);

    render(<View testID={testID} className="bg-current text-red-500" />);
    const component = screen.getByTestId(testID);

    expect(component.type).toBe("View");
    expect(component.props).toStrictEqual({
      children: undefined,
      style: { color: "#f00", backgroundColor: "#f00" },
      testID,
    });
  });
});

describe("inherit", () => {
  test("color: inherit resolves to the parent's color", () => {
    registerCSS(`
      .parent { color: red; }
      .child { color: inherit; }
    `);

    render(
      <View testID="parent" className="parent">
        <View testID="child" className="child" />
      </View>,
    );

    expect(screen.getByTestId("child").props.style).toStrictEqual({
      color: "#f00",
    });
  });

  test("text-inherit: a child Text inherits its parent's color", () => {
    // The shape that surfaced the bug: a labelled button whose label renders
    // React Native's default color (black) on native instead of the button's
    // foreground color, while web inherits correctly.
    registerCSS(`
      .button { color: white; }
      .label { color: inherit; }
    `);

    render(
      <View testID="button" className="button">
        <Text testID="label" className="label" />
      </View>,
    );

    expect(screen.getByTestId("label").props.style).toStrictEqual({
      color: "#fff",
    });
  });

  test("inherit chains through an inheriting ancestor without breaking the chain", () => {
    // The middle node inherits and must NOT republish a circular
    // --__rn-css-color, or the grandchild would fail to resolve the color.
    registerCSS(`
      .parent { color: red; }
      .mid { color: inherit; }
      .child { color: inherit; }
    `);

    render(
      <View testID="parent" className="parent">
        <View testID="mid" className="mid">
          <View testID="child" className="child" />
        </View>
      </View>,
    );

    expect(screen.getByTestId("mid").props.style).toStrictEqual({
      color: "#f00",
    });
    expect(screen.getByTestId("child").props.style).toStrictEqual({
      color: "#f00",
    });
  });

  test("inherit follows the nearest colored ancestor", () => {
    registerCSS(`
      .outer { color: red; }
      .inner { color: blue; }
      .child { color: inherit; }
    `);

    render(
      <View className="outer">
        <View className="inner">
          <View testID="child" className="child" />
        </View>
      </View>,
    );

    expect(screen.getByTestId("child").props.style).toStrictEqual({
      color: "#00f",
    });
  });

  test("color: unset inherits the parent's color, same as inherit", () => {
    // `unset` computes to `inherit` on inherited properties, and color is one.
    registerCSS(`
      .parent { color: red; }
      .child { color: unset; }
    `);

    render(
      <View testID="parent" className="parent">
        <View testID="child" className="child" />
      </View>,
    );

    expect(screen.getByTestId("child").props.style).toStrictEqual({
      color: "#f00",
    });
  });

  test.each(["UNSET", "INHERIT", "Inherit"])(
    "color: %s is case-folded and inherits",
    (spelling) => {
      registerCSS(`
        .parent { color: red; }
        .child { color: ${spelling}; }
      `);

      render(
        <View className="parent">
          <View testID="child" className="child" />
        </View>,
      );

      expect(screen.getByTestId("child").props.style).toStrictEqual({
        color: "#f00",
      });
    },
  );

  test("color: INITIAL is case-folded into the drop, not into the lookup", () => {
    registerCSS(`
      .parent { color: red; }
      .child { color: INITIAL; }
    `);

    render(
      <View className="parent">
        <View testID="child" className="child" />
      </View>,
    );

    expect(screen.getByTestId("child").props.style).toBeUndefined();
  });

  test("a descendant override restarts the chain", () => {
    registerCSS(`
      .red { color: red; }
      .blue { color: blue; }
      .inherit { color: inherit; }
    `);

    render(
      <View className="red">
        <View testID="first" className="inherit">
          <View className="blue">
            <View testID="second" className="inherit" />
          </View>
        </View>
      </View>,
    );

    expect(screen.getByTestId("first").props.style).toStrictEqual({
      color: "#f00",
    });
    expect(screen.getByTestId("second").props.style).toStrictEqual({
      color: "#00f",
    });
  });

  test("color: inherit under a media query", () => {
    registerCSS(`
      .parent { color: red; }
      @media (min-width: 1px) { .child { color: inherit; } }
    `);

    render(
      <View className="parent">
        <View testID="child" className="child" />
      </View>,
    );

    expect(screen.getByTestId("child").props.style).toStrictEqual({
      color: "#f00",
    });
  });

  test("color: inherit under :hover", () => {
    registerCSS(`
      .parent { color: red; }
      .child { color: blue; }
      .child:hover { color: inherit; }
    `);

    render(
      <View className="parent">
        <View testID="child" className="child" />
      </View>,
    );

    const child = screen.getByTestId("child");
    expect(child.props.style).toStrictEqual({ color: "#00f" });

    fireEvent(child, "hoverIn", {});
    expect(screen.getByTestId("child").props.style).toStrictEqual({
      color: "#f00",
    });
  });

  test("color: inherit !important beats a normal color on the same element", () => {
    registerCSS(`
      .parent { color: red; }
      .child { color: inherit !important; }
      .override { color: blue; }
    `);

    render(
      <View className="parent">
        <View testID="child" className="child override" />
      </View>,
    );

    expect(screen.getByTestId("child").props.style).toStrictEqual({
      color: "#f00",
    });
  });

  test("color: inherit on ::placeholder and ::selection", () => {
    registerCSS(`
      .parent { color: red; }
      .child::placeholder { color: inherit; }
      .child::selection { color: inherit; }
    `);

    render(
      <View className="parent">
        <View testID="child" className="child" />
      </View>,
    );

    expect(screen.getByTestId("child").props).toStrictEqual({
      children: undefined,
      placeholderTextColor: "#f00",
      selectionColor: "#f00",
      style: {},
      testID: "child",
    });
  });

  test.each(["border-color", "background-color"])(
    "%s: inherit is dropped, it does not read the color variable",
    (property) => {
      // Only `color` seeds --__rn-css-color, so only `color` can read it back.
      // Neither of these inherits in CSS either, so there is nothing for them
      // to have inherited even if a per-property context existed.
      registerCSS(`
        .parent { color: red; }
        .child { ${property}: inherit; }
      `);

      render(
        <View className="parent">
          <View testID="child" className="child" />
        </View>,
      );

      expect(screen.getByTestId("child").props.style).toBeUndefined();
    },
  );

  test("background-color: unset still clears the color", () => {
    // The counterpart to the drop above. `unset` on a non-inherited property
    // means `initial`, and the literal the compiler leaves in place is what the
    // runtime clears the declared colour with — so adding `unset` to the
    // keyword drop would silently take away the only way to clear one. The
    // cleared element keeps the KEY and loses the value, which is how a later
    // rule overrides an earlier one here rather than merging with it.
    registerCSS(`
      .filled { background-color: red; }
      .cleared { background-color: unset; }
    `);

    render(
      <>
        <View testID="filled" className="filled" />
        <View testID="cleared" className="filled cleared" />
      </>,
    );

    expect(screen.getByTestId("filled").props.style).toStrictEqual({
      backgroundColor: "#f00",
    });
    expect(screen.getByTestId("cleared").props.style).toStrictEqual({
      backgroundColor: undefined,
    });
  });

  test("color: inherit with no colored ancestor falls back to the root seed", () => {
    // Nothing publishes --__rn-css-color above this element, so the read lands
    // on the value the root seeds it with: the platform's label colour. The
    // failure this guards is not a wrong colour but an UNRESOLVED one — the
    // pre-fix drop left `style` undefined and React Native painted its own
    // default, and a read that resolved to nothing would do the same.
    registerCSS(`.child { color: inherit; }`);

    render(<View testID="child" className="child" />);

    expect(screen.getByTestId("child").props.style).toStrictEqual({
      color: { semantic: ["label", "labelColor"] },
    });
  });

  test("inherit resolves an ancestor color that is itself a variable", () => {
    // `--brand` has a single definition, so the compiler inlines it and the
    // published inherited colour is already a resolved string.
    registerCSS(`
      .parent { --brand: #ff0000; color: var(--brand); }
      .child { color: inherit; }
    `);

    render(
      <View testID="parent" className="parent">
        <View testID="child" className="child" />
      </View>,
    );

    expect(screen.getByTestId("parent").props.style).toStrictEqual({
      color: "#f00",
    });
    expect(screen.getByTestId("child").props.style).toStrictEqual({
      color: "#f00",
    });
  });

  test("inherit resolves an ancestor color from an UNINLINED variable", () => {
    // A second definition of `--brand` stops the compiler inlining it, so the
    // ancestor publishes the var() lookup itself rather than a resolved colour.
    // The descendant must still end up with the ancestor's COMPUTED colour —
    // which is what `readsInheritedColor` letting a non-inherited `var()`
    // through is for. Asserted as an equality against the ancestor rather than
    // a literal: the class is that the two agree, and the raw-token colour a
    // named-colour custom property currently produces is not this fix's to pin.
    registerCSS(`
      .parent { --brand: #ff0000; color: var(--brand); }
      .child { --brand: #0000ff; color: inherit; }
    `);

    render(
      <View testID="parent" className="parent">
        <View testID="child" className="child" />
      </View>,
    );

    const parentColor = screen.getByTestId("parent").props.style.color;

    expect(parentColor).toBeDefined();
    expect(screen.getByTestId("child").props.style).toStrictEqual({
      color: parentColor,
    });
  });

  /**
   * `color: var(--brand)` where the KEYWORD is the custom property's value.
   *
   * The two tests below are the same CSS but for one extra declaration of
   * `--brand`, and they end at opposite outcomes, because `inlineVariables`
   * keys on a custom property's DECLARATION COUNT:
   *
   * - declared once, the value is folded into its consumer at compile time and
   *   the rule compiles as `color: <keyword>` — the property context exists and
   *   `inherit` resolves;
   * - declared twice or more, the fold is defeated, `var(--brand)` survives as
   *   a runtime lookup, and the compiler meets the keyword on a CUSTOM property
   *   instead, where there is no property to inherit from — so it drops and the
   *   lookup resolves to nothing.
   *
   * Mapping `color: inherit` to the inherited-color variable reaches the folded
   * route only: before it BOTH routes were broken, so pinning them together is
   * what records that the split between them is new.
   */
  test("color: var(--brand) with --brand: inherit resolves when the variable is inlined", () => {
    registerCSS(`
      .parent { color: red; }
      .child { --brand: inherit; color: var(--brand); }
    `);

    render(
      <View className="parent">
        <View testID="child" className="child" />
      </View>,
    );

    expect(screen.getByTestId("child").props.style).toStrictEqual({
      color: "#f00",
    });
  });

  test("color: var(--brand) with --brand: inherit drops when the variable is NOT inlined", () => {
    // The unfolded half of the pair, pinned at the current output rather than
    // at the CSS-correct one. Per CSS the child computes to red here too. The
    // keyword is not the only thing that would have to change to get there: a
    // custom property would need to carry the property context of whatever
    // consumes it, which is a resolver change, not a keyword-table one.
    registerCSS(`
      .parent { color: red; }
      .child { --brand: inherit; color: var(--brand); }
      .other { --brand: inherit; }
    `);

    render(
      <View className="parent">
        <View testID="child" className="child" />
      </View>,
    );

    expect(screen.getByTestId("child").props.style).toStrictEqual({});
  });

  test.each([
    ["currentcolor", "inlined"],
    ["currentcolor", "uninlined"],
    ["currentColor", "inlined"],
    ["currentColor", "uninlined"],
  ] as const)(
    "color: var(--brand) with --brand: %s resolves on the %s route",
    (spelling, route) => {
      // The control for the pair above: `currentcolor` is resolved by a
      // keyword-only arm, so it never needs a property context and is symmetric
      // across the fold. The camelCase spelling is symmetric too only because
      // parseUnparsed folds case: lightningcss hands a custom property's tokens
      // through verbatim, so without that fold the uninlined route publishes
      // the literal string "currentColor" as the variable's value and this
      // element renders it as a colour.
      const secondDefinition =
        route === "uninlined" ? `.other { --brand: ${spelling}; }` : "";

      registerCSS(`
        .parent { color: red; }
        .child { --brand: ${spelling}; color: var(--brand); }
        ${secondDefinition}
      `);

      render(
        <View className="parent">
          <View testID="child" className="child" />
        </View>,
      );

      expect(screen.getByTestId("child").props.style).toStrictEqual({
        color: "#f00",
      });
    },
  );

  test("color: inherit alongside a box-shadow leaves no placeholder in the style", () => {
    // The delayed-value placeholder `{ color: true }` is internal bookkeeping.
    // A rule whose LAST declaration walks into a nested target (a shadow object)
    // must not strand the placeholder of an earlier delayed declaration.
    registerCSS(`
      .parent { color: red; }
      .child { color: inherit; box-shadow: 1px 1px blue; }
    `);

    render(
      <View className="parent">
        <View testID="child" className="child" />
      </View>,
    );

    expect(screen.getByTestId("child").props.style).toStrictEqual({
      color: "#f00",
      boxShadow: [
        {
          offsetX: 1,
          offsetY: 1,
          blurRadius: 0,
          spreadDistance: 0,
          color: "#00f",
        },
      ],
    });
  });

  test("color: currentcolor alongside a box-shadow leaves no placeholder either", () => {
    // The same runtime defect with no `inherit` anywhere in the input. The
    // stranded target is a property of how a rule's declarations are walked,
    // not of the keyword that made the colour delayed — so this is the pin that
    // survives if the calculate-props fix is split into its own change.
    registerCSS(`
      .parent { color: red; }
      .child { color: currentcolor; box-shadow: 1px 1px blue; }
    `);

    render(
      <View className="parent">
        <View testID="child" className="child" />
      </View>,
    );

    expect(screen.getByTestId("child").props.style).toStrictEqual({
      color: "#f00",
      boxShadow: [
        {
          offsetX: 1,
          offsetY: 1,
          blurRadius: 0,
          spreadDistance: 0,
          color: "#00f",
        },
      ],
    });
  });

  test("color: inherit alongside a text-shadow leaves no placeholder either", () => {
    registerCSS(`
      .parent { color: red; }
      .child { color: inherit; text-shadow: 1px 1px 2px blue; }
    `);

    render(
      <View className="parent">
        <View testID="child" className="child" />
      </View>,
    );

    expect(screen.getByTestId("child").props.style).toStrictEqual({
      color: "#f00",
      textShadowColor: "#00f",
      textShadowOffset: { width: 1, height: 1 },
      textShadowRadius: 2,
    });
  });

  test.each(["revert", "revert-layer"])(
    "color: %s publishes nothing to descendants",
    (keyword) => {
      // React Native has no cascade origins, so neither keyword has a computed
      // value. Emitting the literal handed every descendant `color: "revert"`.
      registerCSS(`
        .parent { color: red; }
        .mid { color: ${keyword}; }
        .child { color: inherit; }
      `);

      render(
        <View className="parent">
          <View testID="mid" className="mid">
            <View testID="child" className="child" />
          </View>
        </View>,
      );

      expect(screen.getByTestId("mid").props.style).toBeUndefined();
      expect(screen.getByTestId("child").props.style).toStrictEqual({
        color: "#f00",
      });
    },
  );

  test("a light-dark() ancestor is inherited by a descendant", () => {
    registerCSS(`
      .parent { color: light-dark(red, blue); }
      .child { color: inherit; }
    `);

    render(
      <View testID="parent" className="parent">
        <View testID="child" className="child" />
      </View>,
    );

    expect(screen.getByTestId("parent").props.style).toStrictEqual({
      color: "#f00",
    });
    expect(screen.getByTestId("child").props.style).toStrictEqual({
      color: "#f00",
    });

    act(() => {
      colorScheme.set("dark");
    });

    // KNOWN DIVERGENCE, pinned at the current output rather than at the
    // CSS-correct one — the same treatment the `rgb(from …)` census entry below
    // gets. Per CSS the descendant computes to the ancestor's used colour, so
    // both should be `#00f` here. `light-dark()` instead publishes
    // --__rn-css-color from its LIGHT branch only: the extra
    // `prefers-color-scheme: dark` rule carries the dark `color` declaration
    // beside the light published value.
    //
    // It predates this change — it reproduces with the double parse restored —
    // and it is #420's defect 2, so it is pinned here rather than fixed. Which
    // of the two lands first decides who updates this expectation.
    expect(screen.getByTestId("parent").props.style).toStrictEqual({
      color: "#00f",
    });
    expect(screen.getByTestId("child").props.style).toStrictEqual({
      color: "#f00",
    });
  });
});

/**
 * Each of these makes the middle element's `color` READ the inherited-color
 * variable from below the top level of its descriptor. Publishing such a value
 * as --__rn-css-color hands the child a value that resolves back into the same
 * variable, and resolution recurses until the stack is exhausted.
 *
 * The middle element resolves against ITS parent, so the child sees the nearest
 * ancestor that published a colour of its own — the red parent.
 */
const selfReferentialMiddleColors: [css: string, midColor: string][] = [
  ["inherit", "#f00"],
  ["unset", "#f00"],
  ["currentcolor", "#f00"],
  ["var(--missing, inherit)", "#f00"],
  ["var(--missing, unset)", "#f00"],
  ["var(--missing, currentcolor)", "#f00"],
  ["color-mix(in srgb, currentcolor, blue)", "rgba(127.5, 0, 127.5, 1)"],
  ["color-mix(in srgb, inherit, blue)", "rgba(127.5, 0, 127.5, 1)"],
  ["light-dark(currentcolor, blue)", "#f00"],
  // Relative colour syntax is not implemented, so the mid colour is the
  // stringified function rather than a colour. It is here for the crash, and it
  // pins the current output so that implementing `rgb(from …)` has to update it.
  ["rgb(from currentcolor r g b)", "rgb(from, #f00, r, g, b)"],
];

describe("a color that reads the inherited color never publishes itself", () => {
  test("the census is not empty", () => {
    expect(selfReferentialMiddleColors.length).toBeGreaterThan(0);
  });

  test.each(selfReferentialMiddleColors)(
    "mid { color: %s } renders, and its child inherits the grandparent's color",
    (midColorValue, expectedMidColor) => {
      registerCSS(`
        .parent { color: red; }
        .mid { color: ${midColorValue}; }
        .child { color: inherit; }
      `);

      render(
        <View className="parent">
          <View testID="mid" className="mid">
            <View testID="child" className="child" />
          </View>
        </View>,
      );

      expect(screen.getByTestId("mid").props.style).toStrictEqual({
        color: expectedMidColor,
      });
      expect(screen.getByTestId("child").props.style).toStrictEqual({
        color: "#f00",
      });
    },
  );
});
