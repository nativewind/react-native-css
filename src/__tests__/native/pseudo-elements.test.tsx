import { act, render, screen } from "@testing-library/react-native";
import type { CompilerOptions } from "react-native-css/compiler";
import { TextInput } from "react-native-css/components/TextInput";
import { View } from "react-native-css/components/View";
import { registerCSS, testID } from "react-native-css/jest";
import { colorScheme } from "react-native-css/runtime";

const controlTestID = "control";

const propsWithoutTestID = (id: string): Record<string, unknown> => {
  const { testID: _testID, ...props } = screen.getByTestId(id).props;
  return props;
};

// Prop names first: a leaked container wraps the children in a provider whose full diff exhausts the heap
const expectIndistinguishableFromControl = () => {
  const host = propsWithoutTestID(testID);
  const control = propsWithoutTestID(controlTestID);

  expect(Object.keys(host).sort()).toStrictEqual(Object.keys(control).sort());
  expect(host).toStrictEqual(control);
};

describe("declarations a pseudo-element cannot express never reach the host", () => {
  test("::selection { color } does not publish currentcolor to the subtree", () => {
    registerCSS(`
      .sel::selection { color: #ff0000; }
      .child { color: currentColor; }
    `);

    render(
      <View>
        <View className="sel">
          <View testID={testID} className="child" />
        </View>
        <View testID={controlTestID} className="child" />
      </View>,
    );

    expectIndistinguishableFromControl();
  });

  test("::selection { font-size } does not become the element's em base", () => {
    registerCSS(`
      .a::selection { font-size: 40px; }
      .a { width: 2em; }
      .control { width: 2em; }
    `);

    render(
      <View>
        <View testID={testID} className="a" />
        <View testID={controlTestID} className="control" />
      </View>,
    );

    expectIndistinguishableFromControl();
  });

  test("::selection { animation } does not render the host as animated", () => {
    registerCSS(`.a::selection { animation: spin 1s; }`);

    render(
      <View>
        <View testID={testID} className="a" />
        <View testID={controlTestID} className="unstyled" />
      </View>,
    );

    expectIndistinguishableFromControl();
  });

  test("::selection { container-name } does not turn the host into a container", () => {
    registerCSS(`
      .a::selection { background-color: #ff0000; container-name: foo; }
      .control::selection { background-color: #ff0000; }
    `);

    render(
      <View>
        <View testID={testID} className="a" />
        <View testID={controlTestID} className="control" />
      </View>,
    );

    expectIndistinguishableFromControl();
  });

  test("::placeholder { color } does not publish currentcolor to the subtree", () => {
    registerCSS(`
      .a::placeholder { color: #ff0000; }
      .child { color: currentColor; }
    `);

    render(
      <View>
        <TextInput className="a">
          <View testID={testID} className="child" />
        </TextInput>
        <View testID={controlTestID} className="child" />
      </View>,
    );

    expectIndistinguishableFromControl();
  });
});

describe("the declaration a pseudo-element can express reaches its prop", () => {
  test("::selection { background-color } reaches selectionColor", () => {
    registerCSS(`.a::selection { background-color: #ff0000; }`);

    render(<TextInput testID={testID} className="a" />);

    expect(screen.getByTestId(testID).props).toStrictEqual({
      children: undefined,
      selectionColor: "#f00",
      style: {},
      testID,
    });
  });

  test("::placeholder { color } reaches placeholderTextColor", () => {
    registerCSS(`.a::placeholder { color: #ff0000; }`);

    render(<TextInput testID={testID} className="a" />);

    expect(screen.getByTestId(testID).props).toStrictEqual({
      children: undefined,
      placeholderTextColor: "#f00",
      style: {},
      testID,
    });
  });

  test("light-dark() reaches selectionColor in either scheme, never the host", () => {
    registerCSS(
      `.a::selection { background-color: light-dark(#123456, #654321); }`,
    );

    render(<TextInput testID={testID} className="a" />);
    const component = screen.getByTestId(testID);

    expect(component.props).toStrictEqual({
      children: undefined,
      selectionColor: "#123456",
      style: {},
      testID,
    });

    act(() => {
      colorScheme.set("dark");
    });

    expect(component.props).toStrictEqual({
      children: undefined,
      selectionColor: "#654321",
      style: {},
      testID,
    });
  });
});

const pseudoElements = [
  {
    selector: "::selection",
    property: "background-color",
    prop: "selectionColor",
  },
  {
    selector: "::placeholder",
    property: "color",
    prop: "placeholderTextColor",
  },
] as const;

const inlineVariablesModes = [
  ["on", {}],
  ["off", { inlineVariables: false }],
] as const satisfies readonly (readonly [string, CompilerOptions])[];

// CSS Pseudo-Elements 4 §3.5: a pseudo-element's own custom properties win, the rest come from its originating element
describe.each(pseudoElements)(
  "$selector custom properties",
  ({ selector, property, prop }) => {
    const other = pseudoElements.find((entry) => entry.selector !== selector);

    describe.each(inlineVariablesModes)(
      "with inline variables %s",
      (_mode, options) => {
        const propOf = (css: string): unknown => {
          registerCSS(css, options);

          render(
            <View className="p">
              <TextInput testID={testID} className="a" />
            </View>,
          );

          return screen.getByTestId(testID).props[prop];
        };

        test.each([
          [
            "apply to its own declaration",
            `.a${selector} { --x: #123456; ${property}: var(--x); }`,
          ],
          [
            "apply across its rules",
            `.a${selector} { --x: #123456; } .a${selector} { ${property}: var(--x); }`,
          ],
          [
            "win over the originating element's",
            `.a { --x: #654321; } .a${selector} { --x: #123456; ${property}: var(--x); }`,
          ],
          [
            "win over an ancestor's",
            `.p { --x: #654321; } .a${selector} { --x: #123456; ${property}: var(--x); }`,
          ],
          [
            "cascade by importance",
            `.a${selector} { --x: #123456 !important; } .a${selector} { --x: #654321; ${property}: var(--x); }`,
          ],
          [
            "fall back to the originating element's",
            `.a { --x: #123456; } .a${selector} { ${property}: var(--x); }`,
          ],
          [
            "fall back to an ancestor's",
            `.p { --x: #123456; } .a${selector} { ${property}: var(--x); }`,
          ],
          [
            "fall back to the root's",
            `:root { --root: #123456; } .a${selector} { ${property}: var(--root); }`,
          ],
        ])("%s", (_name, css) => {
          expect(propOf(css)).toBe("#123456");
        });

        test("are not inherited from a parent's pseudo-element", () => {
          expect(
            propOf(
              `.p${selector} { --x: #123456; } .a${selector} { ${property}: var(--x, #654321); }`,
            ),
          ).toBe("#654321");
        });

        test("follow their media query", () => {
          expect(
            propOf(
              `.a${selector} { --x: #123456; ${property}: var(--x); } @media (prefers-color-scheme: dark) { .a${selector} { --x: #654321; } }`,
            ),
          ).toBe("#123456");

          act(() => {
            colorScheme.set("dark");
          });

          expect(screen.getByTestId(testID).props[prop]).toBe("#654321");
        });

        test("never reach the originating element", () => {
          registerCSS(
            `.a${selector} { --x: #123456; } .a { background-color: var(--x, #654321); }`,
            options,
          );

          render(<View testID={testID} className="a" />);

          expect(screen.getByTestId(testID).props.style).toStrictEqual({
            backgroundColor: "#654321",
          });
        });

        test("never reach a descendant", () => {
          registerCSS(
            `.a${selector} { --x: #123456; } .child { background-color: var(--x, #654321); }`,
            options,
          );

          render(
            <View className="a">
              <View testID={testID} className="child" />
            </View>,
          );

          expect(screen.getByTestId(testID).props.style).toStrictEqual({
            backgroundColor: "#654321",
          });
        });

        test("never reach the element's other pseudo-element", () => {
          expect(other).toBeDefined();

          registerCSS(
            `.a${selector} { --x: #123456; } .a${other?.selector} { ${other?.property}: var(--x, #654321); }`,
            options,
          );

          render(<TextInput testID={testID} className="a" />);

          expect(screen.getByTestId(testID).props[other?.prop ?? prop]).toBe(
            "#654321",
          );
        });
      },
    );
  },
);

// CSS Color 4: currentcolor is the pseudo-element's own color, or its originating element's when it sets none
describe("currentcolor in a pseudo-element", () => {
  test.each([
    [
      "is ::selection's own color",
      `.a { color: #654321; } .a::selection { color: #123456; background-color: currentcolor; }`,
      { selectionColor: "#123456" },
    ],
    [
      "is the originating element's color when ::selection sets none",
      `.a { color: #123456; } .a::selection { background-color: currentcolor; }`,
      { selectionColor: "#123456" },
    ],
    [
      "as ::placeholder's color is the originating element's color",
      `.a { color: #123456; } .a::placeholder { color: currentcolor; }`,
      { placeholderTextColor: "#123456" },
    ],
  ])("%s", (_name, css, expected) => {
    registerCSS(css);

    render(<TextInput testID={testID} className="a" />);

    expect(screen.getByTestId(testID).props).toMatchObject(expected);
  });
});
