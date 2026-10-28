const ANGLE = /^([+-]?(?:\d*\.)?\d+(?:e[+-]?\d+)?)(deg|grad|rad|turn)$/i;
const DEGREES_PER_ANGLE_UNIT: Readonly<Record<string, number>> = {
  deg: 1,
  grad: 0.9,
  turn: 360,
};

// React Native takes an angle in degrees or radians alone, so a gradian or a turn arrives in degrees
export function readAngle(argument: unknown): number | string | undefined {
  if (argument === 0) {
    return 0;
  }

  const match = typeof argument === "string" ? ANGLE.exec(argument) : null;
  if (!match) {
    return undefined;
  }

  const [, amount = "", unit = ""] = match;
  const degreesPerUnit = DEGREES_PER_ANGLE_UNIT[unit.toLowerCase()];
  return degreesPerUnit === undefined
    ? `${amount}rad`
    : `${Number(amount) * degreesPerUnit}deg`;
}
