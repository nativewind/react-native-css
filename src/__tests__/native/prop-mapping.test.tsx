import { render, screen } from "@testing-library/react-native";
import { transform } from "lightningcss";
import { View } from "react-native-css/components";
import { registerCSS } from "react-native-css/jest";

describe.each([false, true])("prop mapping (optimized: %s)", (minify) => {
  test.each([
    ["-rn-native-mapping: test", { test: 37 }],
    ["-rn-native-mapping: test.nested", { test: { nested: 37 } }],
    ["-rn-native-mapping: &.test", { style: { test: 37 } }],
    ["-rn-native-mapping-width: test", { test: 37 }],
    [
      "-rn-native-mapping-width: &.test.nested",
      { style: { test: { nested: 37 } } },
    ],
  ])("%s", (mapping, expected) => {
    const code = `.subject { width: 37px; ${mapping}; } .control { width: 29px; }`;
    const compiled = registerCSS(
      transform({
        filename: "test.css",
        code: Buffer.from(code),
        minify,
      }).code.toString(),
    );
    render(
      <>
        <View testID="subject" className="subject" />
        <View testID="control" className="control" />
      </>,
    );
    expect(screen.getByTestId("subject").props).toMatchObject(expected);
    expect(screen.getByTestId("subject").props.style?.width).toBeUndefined();
    expect(screen.getByTestId("control").props.style).toEqual({ width: 29 });
    expect(compiled.warnings()).toEqual({});
  });

  test("multiple property mappings retain unmapped declarations", () => {
    const code = `.subject {
      -rn-native-mapping-width: test.width;
      -rn-native-mapping-height: test.height;
      width: 37px; height: 41px; opacity: 0.5;
    }`;
    registerCSS(
      transform({
        filename: "test.css",
        code: Buffer.from(code),
        minify,
      }).code.toString(),
    );
    render(<View testID="subject" className="subject" />);
    expect(screen.getByTestId("subject").props).toMatchObject({
      test: { width: 37, height: 41 },
      style: { opacity: 0.5 },
    });
    expect(screen.getByTestId("subject").props.style).toEqual({ opacity: 0.5 });
  });
});

test("authored nativeMapping at rules remain supported", () => {
  registerCSS(
    `.subject { @nativeMapping { width: test.nested; } width: 37px; }`,
  );
  render(<View testID="subject" className="subject" />);
  expect(screen.getByTestId("subject").props.test).toEqual({ nested: 37 });
});
