import { AnimationKeyframes, KeyFramesWithStyles } from "../../runtime.types";
import { defaultValues, setValue } from "../utils/properties";

export function writeAnimation(
  _: unknown,
  animation: AnimationKeyframes,
): KeyFramesWithStyles {
  const baseStyles: Record<string, any> = {};

  for (const frame of animation[0]) {
    const prop = frame[0];
    setValue(baseStyles, prop, defaultValues[prop]);
  }

  return { animation, baseStyles };
}
