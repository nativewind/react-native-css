import { render } from "@testing-library/react-native";
import { Text } from "react-native-css/components/Text";
import { registerCSS, testID } from "react-native-css/jest";

// A second definition keeps each variable from being inlined, so it resolves at runtime
const decoy = `.decoy { --c: green; --n: 9; --b: 1px solid green; --w: 9px; --s: 9px 9px green; }`;

function renderText(css: string, className = "my-class") {
  registerCSS(`${decoy} ${css}`);

  return render(<Text testID={testID} className={className} />).getByTestId(
    testID,
  ).props;
}

// A deferred declaration resolves after every other one in its rule, against the target it was declared on
describe("a deferred declaration beside a nested one", () => {
  test("color: var() beside a box-shadow", () => {
    expect(
      renderText(
        `.my-class { --c: red; color: var(--c); box-shadow: 1px 1px blue; }`,
      ).style,
    ).toStrictEqual({
      color: "red",
      boxShadow: [
        {
          color: "#00f",
          offsetX: 1,
          offsetY: 1,
          blurRadius: 0,
          spreadDistance: 0,
        },
      ],
    });
  });

  test("color: var() beside a text-shadow", () => {
    expect(
      renderText(
        `.my-class { --c: red; color: var(--c); text-shadow: 1px 1px 2px blue; }`,
      ).style,
    ).toStrictEqual({
      color: "red",
      textShadowColor: "#00f",
      textShadowRadius: 2,
      textShadowOffset: { width: 1, height: 1 },
    });
  });

  test("color: var() beside a prop", () => {
    const props = renderText(
      `.my-class { --c: red; color: var(--c); -webkit-line-clamp: 2; }`,
    );

    expect(props.style).toStrictEqual({ color: "red" });
    expect(props.numberOfLines).toBe(2);
  });

  test("a deferred prop beside a style", () => {
    const props = renderText(
      `.my-class { --n: 2; -webkit-line-clamp: var(--n); --c: red; color: var(--c); }`,
    );

    expect(props.style).toStrictEqual({ color: "red" });
    expect(props.numberOfLines).toBe(2);
  });

  test("a text-shadow with no colour takes the element's colour", () => {
    expect(
      renderText(`.my-class { color: #0000ff; text-shadow: 2px 2px; }`).style,
    ).toStrictEqual({
      color: "#00f",
      textShadowColor: "#00f",
      textShadowRadius: 0,
      textShadowOffset: { width: 2, height: 2 },
    });
  });

  test("a box-shadow's first shadow with no colour takes the inherited colour", () => {
    registerCSS(
      `${decoy} .parent { color: #123456; } .my-class { box-shadow: inset 1px 1px, 2px 2px #654321; }`,
    );

    const child = render(
      <Text className="parent">
        <Text testID={testID} className="my-class" />
      </Text>,
    ).getByTestId(testID);

    expect(child.props.style).toStrictEqual({
      boxShadow: [
        {
          color: "#123456",
          offsetX: 1,
          offsetY: 1,
          blurRadius: 0,
          spreadDistance: 0,
          inset: true,
        },
        {
          color: "#654321",
          offsetX: 2,
          offsetY: 2,
          blurRadius: 0,
          spreadDistance: 0,
        },
      ],
    });
  });
});

// Chromium 153, Firefox 155 and WebKit 26.6: each key belongs to the declaration that set it last, so a later longhand beats an earlier shorthand however late the shorthand resolves
describe("a deferred shorthand keeps no key a later declaration set", () => {
  test.each([
    [
      "border: var() then border-color, in one rule",
      ".my-class { --b: 2px solid red; border: var(--b); border-color: blue; }",
      "my-class",
      { borderWidth: 2, borderStyle: "solid", borderColor: "#00f" },
    ],
    [
      "border-color then border: var(), in one rule",
      ".my-class { border-color: blue; --b: 2px solid red; border: var(--b); }",
      "my-class",
      { borderWidth: 2, borderStyle: "solid", borderColor: "red" },
    ],
    [
      "border: var() then border-color, across rules",
      ".earlier { --b: 2px solid red; border: var(--b); } .my-class { border-color: blue; }",
      "earlier my-class",
      { borderWidth: 2, borderStyle: "solid", borderColor: "#00f" },
    ],
    [
      "border-color then border: var(), across rules",
      ".earlier { border-color: blue; } .my-class { --b: 2px solid red; border: var(--b); }",
      "earlier my-class",
      { borderWidth: 2, borderStyle: "solid", borderColor: "red" },
    ],
    [
      "border-inline-width: var() then border-inline-start-width",
      ".my-class { --w: 2px 3px; border-inline-width: var(--w); border-inline-start-width: 5px; }",
      "my-class",
      { borderStartWidth: 5, borderEndWidth: 3 },
    ],
    [
      "border-inline-start-width then border-inline-width: var()",
      ".my-class { border-inline-start-width: 5px; --w: 2px 3px; border-inline-width: var(--w); }",
      "my-class",
      { borderStartWidth: 2, borderEndWidth: 3 },
    ],
    [
      "text-shadow: var() then text-shadow, across rules",
      ".earlier { --s: 2px 2px #00f; text-shadow: var(--s); } .my-class { text-shadow: 1px 1px red; }",
      "earlier my-class",
      {
        textShadowColor: "#f00",
        textShadowRadius: 0,
        textShadowOffset: { width: 1, height: 1 },
      },
    ],
    [
      "text-shadow then text-shadow: var(), across rules",
      ".earlier { text-shadow: 1px 1px red; } .my-class { --s: 2px 2px #00f; text-shadow: var(--s); }",
      "earlier my-class",
      {
        textShadowColor: "#00f",
        textShadowRadius: 0,
        textShadowOffset: { width: 2, height: 2 },
      },
    ],
  ] as const)("%s", (_name, css, className, style) => {
    expect(renderText(css, className).style).toStrictEqual(style);
  });
});
