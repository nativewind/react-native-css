import {
  propertyRename,
  toRNProperty,
  transitionStyleKey,
} from "react-native-css/utilities";

test("the rename census is not empty", () => {
  expect(Object.keys(propertyRename).length).toBeGreaterThan(0);
});

test.each(Object.entries(propertyRename))(
  "a transition on %s names the key it is written to",
  (property, renamed) => {
    expect(transitionStyleKey(property)).toBe(toRNProperty(renamed));
  },
);

test.each([
  ["width", "width"],
  ["background-color", "backgroundColor"],
  ["all", "all"],
  ["none", "none"],
])("a transition on %s names %s", (property, key) => {
  expect(transitionStyleKey(property)).toBe(key);
});

test.each([
  ["WIDTH", "width"],
  ["Background-Image", "experimental_backgroundImage"],
  ["-webkit-transform", "transform"],
  ["ALL", "all"],
])(
  "a transition on %s, a name read in any case and without its vendor prefix, names %s",
  (property, key) => {
    expect(transitionStyleKey(property)).toBe(key);
  },
);

test.each(["visibility", "foo", "--foo"])(
  "a transition on %s, which no style key carries, keeps its own name",
  (property) => {
    expect(transitionStyleKey(property)).toBe(property);
  },
);
