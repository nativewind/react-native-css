import type { CalcFor_Length, MediaFeatureValue } from "lightningcss";
import type {
  MediaCondition,
  MediaFeatureComparison,
  MediaFeatureName,
  MediaFeatureOperand,
  MediaFeatureRatio,
  MediaRatioComparison,
  MediaRatioFeatureName,
  MediaRatioInterval,
  ReadonlyStyleFunction,
  StyleFunction,
} from "react-native-css/compiler";

import type { RenderGuard } from "../../native/conditions/guards";
import type { DeepReadonly } from "../../utilities/deep-readonly.types";

type IsAssignable<Source, Target> = [Source] extends [Target] ? true : false;

type IsNever<Value> = [Value] extends [never] ? true : false;

// A readonly array or tuple is not assignable to a mutable one
type IsWritable<Value> = IsAssignable<Value, unknown[]>;

type HoldsWritable<Value> =
  IsNever<Extract<Value, unknown[]>> extends true ? false : true;

type ReadonlyValue<Type extends MediaFeatureValue["type"]> = Extract<
  DeepReadonly<MediaFeatureValue>,
  { type: Type }
>["value"];

type ReadonlySum = Extract<DeepReadonly<CalcFor_Length>, { type: "sum" }>;

type Operand = Extract<
  MediaCondition,
  readonly [MediaFeatureComparison, ...unknown[]]
>[2];

type OperandArguments = Extract<
  Operand,
  readonly [unknown, unknown, unknown, ...unknown[]]
>[2];

test("DeepReadonly reaches every depth of a lightningcss value and keeps its primitives", () => {
  const ratioWritable: IsWritable<ReadonlyValue<"ratio">> = false;
  const ratioPair: IsAssignable<
    ReadonlyValue<"ratio">,
    readonly [number, number]
  > = true;
  const keywordString: IsAssignable<ReadonlyValue<"ident">, string> = true;
  const sumWritable: IsWritable<ReadonlySum["value"]> = false;
  const nestedSumWritable: IsWritable<
    Extract<ReadonlySum["value"][0], { type: "sum" }>["value"]
  > = false;
  const passedAsWritten: IsAssignable<
    MediaFeatureValue,
    DeepReadonly<MediaFeatureValue>
  > = true;

  expect([
    ratioWritable,
    ratioPair,
    keywordString,
    sumWritable,
    nestedSumWritable,
    passedAsWritten,
  ]).toStrictEqual([false, true, true, false, false, true]);
});

test("a compiled condition is readonly at every depth", () => {
  const conditionWritable: HoldsWritable<MediaCondition> = false;
  const conjunctionWritable: IsWritable<
    Extract<MediaCondition, readonly ["&", unknown]>[1]
  > = false;
  const disjunctionWritable: IsWritable<
    Extract<MediaCondition, readonly ["|", unknown]>[1]
  > = false;
  const operandWritable: HoldsWritable<Operand> = false;
  const argumentsWritable: HoldsWritable<OperandArguments> = false;
  const nestedArgumentsWritable: HoldsWritable<
    Extract<OperandArguments, readonly unknown[]>[number]
  > = false;
  const compiledFunction: IsAssignable<StyleFunction, ReadonlyStyleFunction> =
    true;

  expect([
    conditionWritable,
    conjunctionWritable,
    disjunctionWritable,
    operandWritable,
    argumentsWritable,
    nestedArgumentsWritable,
    compiledFunction,
  ]).toStrictEqual([false, false, false, false, false, false, true]);
});

test("a render guard is a readonly tuple", () => {
  const guardWritable: HoldsWritable<RenderGuard> = false;

  expect(guardWritable).toBe(false);
});

test("a condition's feature names are closed, and each ratio feature compares a ratio in a variant of its own", () => {
  const unknownName: IsAssignable<"fictional-feature", MediaFeatureName> =
    false;
  const libraryNames: IsAssignable<"dir" | "platform", MediaFeatureName> = true;
  const ratioAsValueOperand: IsAssignable<
    MediaFeatureRatio,
    MediaFeatureOperand
  > = false;
  const valueAsRatioOperand: IsAssignable<
    MediaFeatureOperand,
    (MediaRatioComparison | MediaRatioInterval)[2]
  > = false;
  const ratioFeatureComparedAsValue: IsNever<
    Extract<
      MediaCondition,
      readonly [
        MediaFeatureComparison,
        MediaRatioFeatureName,
        MediaFeatureOperand,
      ]
    >
  > = true;
  const deviceAspectRatioLeft: IsAssignable<
    Exclude<
      MediaRatioComparison | MediaRatioInterval,
      { readonly 1: "aspect-ratio" }
    >[1],
    "device-aspect-ratio"
  > = true;
  const ratioWritable: IsWritable<MediaFeatureRatio> = false;

  expect([
    unknownName,
    libraryNames,
    ratioAsValueOperand,
    valueAsRatioOperand,
    ratioFeatureComparedAsValue,
    deviceAspectRatioLeft,
    ratioWritable,
  ]).toStrictEqual([false, true, false, false, true, true, false]);
});
