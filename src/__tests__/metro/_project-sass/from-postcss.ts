import type { Plugin } from "postcss";

/** Appends a rule only Sass can compile, so the native stylesheet holds it only if Sass compiled this plugin's output. */
const fromPostcss: Plugin = {
  postcssPlugin: "from-postcss",
  Once(root, { Declaration, Rule }) {
    root.append(
      new Rule({ selector: ".from-postcss" }).append(
        new Declaration({ prop: "color", value: "$brand" }),
      ),
    );
  },
};

export default fromPostcss;
