import { render, screen } from "@testing-library/react-native";
import { Text } from "react-native-css/components/Text";
import { View } from "react-native-css/components/View";
import { registerCSS, testID } from "react-native-css/jest";

const parentID = "parent";
const childID = "child";

interface RegisteredConfig {
  defaultStyle?: Record<string, unknown>;
  selectors?: { selector: string; group?: number; style: object }[];
  hostsGroup?: number;
  transition?: Record<string, unknown>;
}

const mockSetPseudoStyles = jest.fn<
  undefined,
  [{ props: { testID?: string } }, RegisteredConfig | null]
>();
let mockGroupCount = 0;

jest.mock("react-native-reanimated", () => ({
  default: {},
  createAnimatedComponent: (component: unknown) => component,
  createPseudoGroup: () => {
    mockGroupCount += 1;
    return mockGroupCount;
  },
  setPseudoStyles: (...args: Parameters<typeof mockSetPseudoStyles>) => {
    mockSetPseudoStyles(...args);
  },
}));

/** The configs registered on the element rendered with `id`. */
const registrationsOf = (id: string): (RegisteredConfig | null)[] =>
  mockSetPseudoStyles.mock.calls
    .filter(([instance]) => instance.props.testID === id)
    .map(([, config]) => config);

beforeEach(() => {
  mockSetPseudoStyles.mockClear();
});

test("active registers the pressed style on the host view instead of a press handler", () => {
  registerCSS(`
    .press { background-color: blue; }
    .press:active { background-color: red; }
  `);

  render(<View testID={testID} className="press" />);

  expect(screen.getByTestId(testID).props).toStrictEqual({
    testID,
    children: undefined,
    style: { backgroundColor: "#00f" },
  });
  expect(registrationsOf(testID)).toStrictEqual([
    {
      defaultStyle: { backgroundColor: "#00f" },
      selectors: [
        {
          selector: ":active-deepest",
          style: { backgroundColor: "#f00" },
        },
      ],
    },
  ]);
});

test("a render that changes nothing registers nothing again", () => {
  registerCSS(`
    .press { background-color: blue; }
    .press:active { background-color: red; }
  `);

  const { rerender } = render(<View testID={testID} className="press" />);
  rerender(<View testID={testID} className="press" />);

  expect(registrationsOf(testID)).toHaveLength(1);
});

test("active with no resting value rests at whatever React renders", () => {
  registerCSS(`.press:active { background-color: red; }`);

  render(<View testID={testID} className="press" />);

  expect(registrationsOf(testID)).toStrictEqual([
    {
      defaultStyle: { backgroundColor: undefined },
      selectors: [
        {
          selector: ":active-deepest",
          style: { backgroundColor: "#f00" },
        },
      ],
    },
  ]);
});

test("an inline style outranks the pressed style, so nothing is registered", () => {
  registerCSS(`.press:active { background-color: red; }`);

  render(
    <View
      testID={testID}
      className="press"
      style={{ backgroundColor: "green" }}
    />,
  );

  expect(registrationsOf(testID)).toStrictEqual([]);
});

test("a disabled element registers no press", () => {
  registerCSS(`
    .press { background-color: blue; }
    .press:active { background-color: red; }
  `);

  render(<View testID={testID} className="press" aria-disabled />);

  expect(registrationsOf(testID)).toStrictEqual([]);
});

test("a press follows the element's transition", () => {
  registerCSS(`
    .press {
      background-color: blue;
      transition-property: background-color;
      transition-duration: 150ms;
    }
    .press:active { background-color: red; }
  `);

  render(<View testID={testID} className="press" />);

  expect(registrationsOf(testID)).toStrictEqual([
    expect.objectContaining({
      selectors: [
        {
          selector: ":active-deepest",
          style: { backgroundColor: "#f00" },
        },
      ],
      transition: expect.objectContaining({
        transitionProperty: expect.anything(),
        transitionDuration: expect.anything(),
      }),
    }),
  ]);
});

test("unmounting the element unregisters its press", () => {
  registerCSS(`.press:active { background-color: red; }`);

  const { unmount } = render(<View testID={testID} className="press" />);
  unmount();

  expect(registrationsOf(testID).at(-1)).toBeNull();
});

test("a press that changes inherited text stays in JavaScript on a view", () => {
  registerCSS(`
    .text-color { color: blue; }
    .text-color:active { color: red; }
  `);

  render(<View testID={testID} className="text-color" />);

  expect(registrationsOf(testID)).toStrictEqual([]);
  expect(screen.getByTestId(testID).props.onClick).toEqual(
    expect.any(Function),
  );
});

test("group-active on text follows the group the container hosts", () => {
  registerCSS(`
    .my-class { color: blue; }
    .group\\/item:active .my-class { color: red; }
  `);

  render(
    <View testID={parentID} className="group/item">
      <Text testID={childID} className="my-class" />
    </View>,
  );

  const [childRegistration] = registrationsOf(childID);
  const group = childRegistration?.selectors?.[0]?.group;

  expect(group).toEqual(expect.any(Number));
  expect(childRegistration).toStrictEqual({
    defaultStyle: { color: "#00f" },
    selectors: [{ selector: ":active", group, style: { color: "#f00" } }],
  });
  expect(registrationsOf(parentID)).toStrictEqual([
    { defaultStyle: {}, selectors: [], hostsGroup: group },
  ]);
});

test("a container no element follows hosts no group", () => {
  registerCSS(`
    .my-class { color: blue; }
    .group\\/item:active .my-class { color: red; }
  `);

  render(
    <View testID={parentID} className="group/item">
      <Text testID={childID} />
    </View>,
  );

  expect(registrationsOf(parentID)).toStrictEqual([]);
});
