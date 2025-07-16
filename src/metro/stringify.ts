/* eslint-disable */
/**
 * Convert a data structure to JavaScript.
 * The output should be similar to JSON, but without the extra characters.
 * This is simply to reduce file size in production
 */
export function stringify(data: unknown): string {
  switch (typeof data) {
    case "bigint":
    case "symbol":
    case "function":
      throw new Error(`Cannot stringify ${typeof data}`);
    case "string":
      return `"${data}"`;
    case "number":
      // Reduce to 3 decimal places
      return `${Math.round(data * 1000) / 1000}`;
    case "boolean":
      return `${data}`;
    case "undefined":
      // null is processed faster than undefined
      // JSON.stringify also converts undefined to null
      return "null";
    case "object": {
      if (data === null) {
        return "null";
      } else if (Array.isArray(data)) {
        return `[${data
          .map((value) => {
            // These values can be omitted to create a holey array
            // This is slightly slower to parse at runtime, but keeps the
            // file size smaller
            return value === null || value === undefined
              ? ""
              : stringify(value);
          })
          .join(",")}]`;
      } else {
        return `{${Object.entries(data)
          .flatMap(([key, value]) => {
            // If an object's property is undefined or null we can just skip it
            if (value === null || value === undefined) {
              return [];
            }

            // Make sure we quote strings that require quotes
            if (key.match(/[^a-zA-Z]/)) {
              key = `"${key}"`;
            }

            value = stringify(value);

            return [`${key}:${value}`];
          })
          .join(",")}}`;
      }
    }
  }
}
