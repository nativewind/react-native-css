export type RotationAxis =
  | { readonly type: "none" }
  | {
      readonly type: "axis";
      readonly rotation: "rotateX" | "rotateY" | "rotateZ";
      readonly reversed: boolean;
    }
  | { readonly type: "oblique" };

// css-transforms-2 §3: a rotation turns about the direction its vector names, and the zero vector names none
export function rotationAxis(x: number, y: number, z: number): RotationAxis {
  if (x === 0 && y === 0 && z === 0) {
    return { type: "none" };
  }

  if (y === 0 && z === 0) {
    return { type: "axis", rotation: "rotateX", reversed: x < 0 };
  }

  if (x === 0 && z === 0) {
    return { type: "axis", rotation: "rotateY", reversed: y < 0 };
  }

  if (x === 0 && y === 0) {
    return { type: "axis", rotation: "rotateZ", reversed: z < 0 };
  }

  return { type: "oblique" };
}

export function negateAngle(angle: string | number): string | number {
  if (typeof angle === "number") {
    return -angle;
  }

  return angle.startsWith("-") ? angle.slice(1) : `-${angle}`;
}
