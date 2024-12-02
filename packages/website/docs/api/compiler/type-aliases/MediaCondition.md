# MediaCondition

```ts
type MediaCondition:
  | ["!!", MediaFeatureNameFor_MediaFeatureId]
  | ["!", MediaCondition]
  | ["&", MediaCondition[]]
  | ["|", MediaCondition[]]
  | ["=", MediaFeatureNameFor_MediaFeatureId, StyleDescriptor]
  | ["==", MediaFeatureNameFor_MediaFeatureId, StyleDescriptor, MediaFeatureComparison]
  | ["[]", MediaFeatureNameFor_MediaFeatureId, StyleDescriptor, MediaFeatureComparison, StyleDescriptor, MediaFeatureComparison];
```

************\*\*\*\************* Conditions **************\***************

## Defined in

[compiler/compiler.types.ts:252](https://github.com/nativewind/react-native-css/blob/a400e1318389c5ae2af21e895162179d7418d761/packages/react-native-css/src/compiler/compiler.types.ts#L252)
