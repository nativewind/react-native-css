// Preserve the callable default export when Node loads the preset as ESM.
import implementation from "../dist/commonjs/babel/index.js";

export default implementation.default;
