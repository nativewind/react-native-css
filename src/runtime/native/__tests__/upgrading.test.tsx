import { Text } from "react-native-css/components/Text";
import { View } from "react-native-css/components/View";
import { registerCSS, render, screen } from "react-native-css/jest";

const parentID = "parent";
const childID = "child";

test("group", () => {
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

  expect(() => {
    screen.rerender(
      <View testID={parentID} className="group">
        <Text testID={childID} className="my-class" />
      </View>,
    );
  })
    .toThrow(`ReactNativeCss: Cannot dynamically add a container context. 'group' was added after the initial render.
Use modifier ('hover:container', 'active:container', etc) to ensure it present in the initial render`);
});
