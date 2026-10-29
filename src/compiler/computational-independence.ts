import type {
  CalcFor_DimensionPercentageFor_LengthValue,
  CalcFor_Length,
  DimensionPercentageFor_LengthValue,
  Length,
  LengthUnit,
  LengthValue,
  MathFunctionFor_DimensionPercentageFor_LengthValue,
  MathFunctionFor_Length,
  ParsedComponent,
  Transform,
} from "lightningcss";

// An @property initial-value may not depend on the element, so a font- or container-relative unit invalidates the rule (css-properties-values-api-1 §3)
const ELEMENT_RELATIVE_UNITS: ReadonlySet<LengthUnit> = new Set<LengthUnit>([
  "em",
  "rem",
  "ex",
  "rex",
  "ch",
  "rch",
  "cap",
  "rcap",
  "ic",
  "ric",
  "lh",
  "rlh",
  "cqw",
  "cqh",
  "cqi",
  "cqb",
  "cqmin",
  "cqmax",
]);

type LengthOperand = Length | DimensionPercentageFor_LengthValue;

type LengthCalculation =
  | CalcFor_Length
  | CalcFor_DimensionPercentageFor_LengthValue;

type LengthMathFunction =
  | MathFunctionFor_Length
  | MathFunctionFor_DimensionPercentageFor_LengthValue;

export function isComputationallyIndependent(
  component: ParsedComponent,
): boolean {
  switch (component.type) {
    case "length":
    case "length-percentage":
      return isIndependentOperand(component.value);
    case "transform-function":
      return isIndependentTransform(component.value);
    case "transform-list":
      return component.value.every(isIndependentTransform);
    case "repeated":
      return component.value.components.every(isComputationallyIndependent);
    case "number":
    case "integer":
    case "percentage":
    case "color":
    case "image":
    case "url":
    case "angle":
    case "time":
    case "resolution":
    case "custom-ident":
    case "literal":
    case "token-list":
      return true;
    default:
      (component) satisfies never;
      return false;
  }
}

function isIndependentLength(length: LengthValue): boolean {
  return !ELEMENT_RELATIVE_UNITS.has(length.unit);
}

function isIndependentOperand(operand: LengthOperand): boolean {
  switch (operand.type) {
    case "value":
    case "dimension":
      return isIndependentLength(operand.value);
    case "percentage":
      return true;
    case "calc":
      return isIndependentCalculation(operand.value);
    default:
      operand satisfies never;
      return false;
  }
}

function isIndependentCalculation(calculation: LengthCalculation): boolean {
  switch (calculation.type) {
    case "number":
      return true;
    case "value":
      return isIndependentOperand(calculation.value);
    case "sum":
      return calculation.value.every(isIndependentCalculation);
    case "product":
      return isIndependentCalculation(calculation.value[1]);
    case "function":
      return isIndependentMathFunction(calculation.value);
    default:
      calculation satisfies never;
      return false;
  }
}

function isIndependentMathFunction(mathFunction: LengthMathFunction): boolean {
  switch (mathFunction.type) {
    case "calc":
    case "abs":
    case "sign":
      return isIndependentCalculation(mathFunction.value);
    case "min":
    case "max":
    case "hypot":
    case "clamp":
    case "rem":
    case "mod":
      return mathFunction.value.every(isIndependentCalculation);
    case "round":
      return (
        isIndependentCalculation(mathFunction.value[1]) &&
        isIndependentCalculation(mathFunction.value[2])
      );
    default:
      mathFunction satisfies never;
      return false;
  }
}

function isIndependentTransform(transform: Transform): boolean {
  switch (transform.type) {
    case "translate":
    case "translate3d":
      return transform.value.every(isIndependentOperand);
    case "translateX":
    case "translateY":
    case "translateZ":
    case "perspective":
      return isIndependentOperand(transform.value);
    case "scale":
    case "scaleX":
    case "scaleY":
    case "scaleZ":
    case "scale3d":
    case "rotate":
    case "rotateX":
    case "rotateY":
    case "rotateZ":
    case "rotate3d":
    case "skew":
    case "skewX":
    case "skewY":
    case "matrix":
    case "matrix3d":
      return true;
    default:
      transform satisfies never;
      return false;
  }
}
