/* eslint-disable */
// @ts-nocheck
import React from "react";
import { View } from "react-native";

import { render, screen } from "@testing-library/react-native";
import { registerCSS, testID } from "react-native-css/jest";
import { styled } from "react-native-css/runtime";

const children = undefined;

// Mock SVG component that mimics react-native-svg behavior
const MockSvg = React.forwardRef<any, any>((props: any, ref: any) => {
  return <View ref={ref} {...props} testID={props.testID ?? "mock-svg"} />;
});
MockSvg.displayName = "MockSvg";

describe("styled() ref forwarding and deprecated property support", () => {
  test("should work with explicit nativeStyleMapping", () => {
    registerCSS(`
      .svg-explicit {
        height: 24px;
        width: 24px;
        fill: red;
      }
    `);

    const StyledSvg = styled(MockSvg, {
      className: {
        target: "style",
        nativeStyleMapping: {
          height: "height",
          width: "width",
          fill: "fill",
        },
      },
    });

    render(<StyledSvg testID={testID} className="svg-explicit" />);
    const component = screen.getByTestId(testID);

    expect(component.props).toEqual(
      expect.objectContaining({
        testID,
        children,
        height: 24,
        width: 24,
        fill: "#f00",
        style: {},
      }),
    );
  });

  test("should properly forward refs", () => {
    registerCSS(`
      .ref-test {
        height: 16px;
        width: 16px;
      }
    `);

    const StyledSvg = styled(MockSvg, {
      className: {
        target: "style",
        nativeStyleMapping: {
          height: "height",
          width: "width",
        },
      },
    });

    const ref = React.createRef<any>();

    render(<StyledSvg ref={ref} testID={testID} className="ref-test" />);

    // Ref should be properly forwarded
    expect(ref.current).toBeTruthy();
    expect(ref.current.props.testID).toBe(testID);
  });

  test("should work without explicit mapping for regular components", () => {
    registerCSS(`
      .regular {
        padding: 10px;
        background-color: green;
      }
    `);

    const StyledView = styled(View, {
      className: "style",
    });

    render(<StyledView testID={testID} className="regular" />);
    const component = screen.getByTestId(testID);

    expect(component.props).toEqual(
      expect.objectContaining({
        testID,
        children,
        style: {
          padding: 10,
          backgroundColor: "#008000",
        },
      }),
    );
  });
});
