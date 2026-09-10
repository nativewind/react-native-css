import { ImageBackground as RNImageBackground } from "react-native";

import { render, screen } from "@testing-library/react-native";
import { ImageBackground } from "react-native-css/components/ImageBackground";
import { registerCSS } from "react-native-css/jest";

test("ImageBackground maps image and container classes separately", () => {
  registerCSS(`.container { background-color: red; width: 80px; }
    .image { opacity: 0.5; } .updated { opacity: 0.75; }`);
  const subject = (imageClassName?: string) => (
    <ImageBackground
      source={{ uri: "test-image" }}
      className="container"
      {...{ imageClassName }}
    />
  );
  render(subject("image"));
  const props = () => screen.UNSAFE_getByType(RNImageBackground).props;
  expect(props().style).toEqual({ backgroundColor: "#f00", width: 80 });
  expect(props().imageStyle).toEqual({ opacity: 0.5 });
  expect(props().backgroundColor).toBeUndefined();
  screen.rerender(subject("updated"));
  expect(props().imageStyle).toEqual({ opacity: 0.75 });
  screen.rerender(subject());
  expect(props().imageStyle).toBeUndefined();
});
