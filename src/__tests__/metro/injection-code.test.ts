import { Script } from "node:vm";

import { getNativeInjectionCode } from "../../metro/injection-code";

describe("getNativeInjectionCode", () => {
  test("emits code that can execute in script mode", () => {
    const inject = jest.fn();
    const requireModule = jest.fn((specifier: string) => {
      if (specifier === "react-native-css/native-internal") {
        return { StyleCollection: { inject } };
      }
      return {};
    });
    const code = getNativeInjectionCode(
      ["./styles.css"],
      [{ s: [] }],
    ).toString();

    const script = new Script(code);
    script.runInNewContext({ require: requireModule });

    expect(requireModule).toHaveBeenNthCalledWith(
      1,
      "react-native-css/native-internal",
    );
    expect(requireModule).toHaveBeenNthCalledWith(2, "./styles.css");
    expect(inject).toHaveBeenCalledWith({ s: [] });
  });
});
