import { render, screen } from "@testing-library/react-native";
import { View } from "react-native-css/components/View";
import { registerCSS, testID } from "react-native-css/jest";

// import { getAnimatedStyle } from "react-native-reanimated";

const getAnimatedStyle = (..._args: unknown[]): unknown => {
  return;
};

jest.useFakeTimers();

describe.skip("animations", () => {
  test("basic animation", () => {
    registerCSS(`
    .animation-slide-in {
      animation-name: slide-in;
      animation-duration: 1s;
    }

    @keyframes slide-in {
      from {
        margin-left: 100%;
      }

      to {
        margin-left: 0%;
      }
    }
  `);

    render(<View testID={testID} className="animation-slide-in" />);

    const element = screen.getByTestId(testID);
    expect(getAnimatedStyle(element)).toMatchObject({
      marginLeft: "100%",
    });
  });
});

describe.skip("animation", () => {
  test("updating animation", () => {
    registerCSS(`
    .animation-slide-in {
      animation-name: slide-in;
      animation-duration: 1s;
    }

    .animation-slide-down {
      animation-name: slide-down;
      animation-duration: 1s;
    }

    @keyframes slide-in {
      from {
        margin-left: 100%;
      }

      to {
        margin-left: 0%;
      }
    }

    @keyframes slide-down {
      from {
        margin-top: 0%;
      }

      to {
        margin-top: 50%;
      }
    }
  `);

    render(<View testID={testID} className="animation-slide-in" />);

    expect(getAnimatedStyle(screen.getByTestId(testID))).toMatchObject({
      marginLeft: "100%",
    });

    screen.rerender(<View testID={testID} className="animation-slide-down" />);

    expect(getAnimatedStyle(screen.getByTestId(testID))).toMatchObject({
      marginTop: "0%",
    });

    jest.advanceTimersByTime(500);

    expect(getAnimatedStyle(screen.getByTestId(testID))).toMatchObject({
      marginTop: "25%",
    });
  });

  test("parsable shorthand animation", () => {
    registerCSS(`
    .animation-slide-in {
      animation: slide-in 1s;
    }

    @keyframes slide-in {
      from {
        margin-left: 100%;
      }

      to {
        margin-left: 0%;
      }
    }
  `);

    render(<View testID={testID} className="animation-slide-in" />);

    expect(getAnimatedStyle(screen.getByTestId(testID))).toMatchObject({
      marginLeft: "100%",
    });

    jest.advanceTimersByTime(1000);

    expect(getAnimatedStyle(screen.getByTestId(testID))).toMatchObject({
      marginLeft: "0%",
    });
  });

  test("unparsable shorthand animation", () => {
    registerCSS(`
    .animation-slide-in {
      --animation-name: slide-in;
      animation: var(--animation-name) 1s;
    }

    @keyframes slide-in {
      from {
        margin-left: 100%;
      }

      to {
        margin-left: 0%;
      }
    }
  `);

    render(<View testID={testID} className="animation-slide-in" />);

    expect(getAnimatedStyle(screen.getByTestId(testID))).toMatchObject({
      marginLeft: "100%",
    });

    jest.advanceTimersByTime(1000);

    expect(getAnimatedStyle(screen.getByTestId(testID))).toMatchObject({
      marginLeft: "0%",
    });
  });
});
