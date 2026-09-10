import {
  Image as RNImage,
  StyleSheet,
  View,
  type ImageProps,
  type ImageStyle,
} from "react-native";

import { render, screen } from "@testing-library/react-native";
import { Image } from "react-native-css/components/Image";
import { registerCSS } from "react-native-css/jest";
import { styled } from "react-native-css/native";

const props = () =>
  screen.UNSAFE_getByType(RNImage).props as ImageProps & {
    contentFit?: unknown;
  };
const style = (): ImageStyle | undefined => StyleSheet.flatten(props().style);

test("React Native Image receives CSS object-fit as an image style", () => {
  registerCSS(`.contain { object-fit: contain; } .fill { object-fit: fill; }`);
  render(
    <Image testID="image" source={{ uri: "test-image" }} className="contain" />,
  );
  expect(style()?.objectFit).toBe("contain");
  expect(props().contentFit).toBeUndefined();
  screen.rerender(
    <Image testID="image" source={{ uri: "test-image" }} className="fill" />,
  );
  expect(style()?.objectFit).toBe("fill");
  screen.rerender(<Image testID="image" source={{ uri: "test-image" }} />);
  expect(style()?.objectFit).toBeUndefined();
});

test("an inline image fit overrides the utility and returns when removed", () => {
  registerCSS(`.contain { object-fit: contain; }`);
  render(
    <Image
      source={{ uri: "test-image" }}
      className="contain"
      style={{ objectFit: "cover" }}
    />,
  );
  expect(style()?.objectFit).toBe("cover");
  screen.rerender(<Image source={{ uri: "test-image" }} className="contain" />);
  expect(style()?.objectFit).toBe("contain");
});

test("the shared mapping still delivers contentFit to custom image components", () => {
  registerCSS(`.contain { object-fit: contain; }`);
  const Custom = styled((props: { contentFit?: string }) => (
    <View testID="custom" {...props} />
  ));
  render(<Custom className="contain" />);
  expect(screen.getByTestId("custom").props.contentFit).toBe("contain");
});

test("an image with a transition can use the animated component adapter", () => {
  registerCSS(
    `.image { object-fit: contain; opacity: 1; transition: opacity 100ms; } .changed { opacity: 0.5; }`,
  );
  render(<Image source={{ uri: "test-image" }} className="image" />);
  expect(style()?.objectFit).toBe("contain");
  screen.rerender(
    <Image source={{ uri: "test-image" }} className="image changed" />,
  );
  expect(style()?.objectFit).toBe("contain");
});

test("important image fitting overrides inline style and preserves its siblings", () => {
  registerCSS(`.contain { object-fit: contain !important; }`);
  render(
    <Image
      source={{ uri: "test-image" }}
      className="contain"
      style={{ objectFit: "cover", opacity: 0.5 }}
    />,
  );
  expect(style()).toMatchObject({ objectFit: "contain", opacity: 0.5 });
  screen.rerender(
    <Image
      source={{ uri: "test-image" }}
      style={{ objectFit: "cover", opacity: 0.5 }}
    />,
  );
  expect(style()).toMatchObject({ objectFit: "cover", opacity: 0.5 });
});
