import { StyleValueSubResolver } from ".";
import { StyleFunction } from "../../runtime.types";

export const em: StyleValueSubResolver<StyleFunction> = (_, func, options) => {
  const value = func[2]?.[0];

  if (typeof value !== "number" || !options.getEm) {
    return;
  }

  return value * options.getEm();
};
