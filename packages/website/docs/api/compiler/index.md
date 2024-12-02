# compiler

A CSS-to-JSON compiler for React Native focusing on minimal output.

## Index

### Interfaces

| Interface                                                          | Description                                                                  |
| ------------------------------------------------------------------ | ---------------------------------------------------------------------------- |
| [CompilerOptions](interfaces/CompilerOptions.md)                   | -                                                                            |
| [ContainerQuery](interfaces/ContainerQuery.md)                     | ************\*\*\*\************* Containers ************\*\*\*\************* |
| [PseudoClassesQuery](interfaces/PseudoClassesQuery.md)             | -                                                                            |
| [ReactNativeCssStyleSheet](interfaces/ReactNativeCssStyleSheet.md) | A `react-native-css` StyleSheet                                              |
| [StyleRule](interfaces/StyleRule.md)                               | -                                                                            |

### Type Aliases

| Type alias                                                               | Description                                                                   |
| ------------------------------------------------------------------------ | ----------------------------------------------------------------------------- |
| [AnimationAttributes](type-aliases/AnimationAttributes.md)               | -                                                                             |
| [AnimationEasing](type-aliases/AnimationEasing.md)                       | -                                                                             |
| [AnimationInterpolation](type-aliases/AnimationInterpolation.md)         | -                                                                             |
| [AnimationInterpolationType](type-aliases/AnimationInterpolationType.md) | -                                                                             |
| [AnimationKeyframes](type-aliases/AnimationKeyframes.md)                 | -                                                                             |
| [AnimationRule](type-aliases/AnimationRule.md)                           | ************\*\*\*\************* Animations **************\***************    |
| [AttributeQuery](type-aliases/AttributeQuery.md)                         | -                                                                             |
| [AttrSelectorOperator](type-aliases/AttrSelectorOperator.md)             | -                                                                             |
| [ContainerCondition](type-aliases/ContainerCondition.md)                 | -                                                                             |
| [EasingFunction](type-aliases/EasingFunction.md)                         | -                                                                             |
| [FeatureFlagRecord](type-aliases/FeatureFlagRecord.md)                   | -                                                                             |
| [LightDarkVariable](type-aliases/LightDarkVariable.md)                   | -                                                                             |
| [MediaCondition](type-aliases/MediaCondition.md)                         | ************\*\*\*\************* Conditions **************\***************    |
| [MediaFeatureComparison](type-aliases/MediaFeatureComparison.md)         | -                                                                             |
| [SpecificityArray](type-aliases/SpecificityArray.md)                     | https://drafts.csswg.org/selectors/#specificity-rules                         |
| [SpecificityValue](type-aliases/SpecificityValue.md)                     | -                                                                             |
| [StyleAttribute](type-aliases/StyleAttribute.md)                         | -                                                                             |
| [StyleDeclaration](type-aliases/StyleDeclaration.md)                     | -                                                                             |
| [StyleDescriptor](type-aliases/StyleDescriptor.md)                       | -                                                                             |
| [StyleFunction](type-aliases/StyleFunction.md)                           | -                                                                             |
| [StyleRuleSet](type-aliases/StyleRuleSet.md)                             | The JS representation of a style object                                       |
| [TransitionRule](type-aliases/TransitionRule.md)                         | ************\*\*\*\************* Transitions ************\*\*\*\************* |
| [VariableDescriptor](type-aliases/VariableDescriptor.md)                 | ************\*\*\*\************* Variables **************\*\***************   |
| [VariableRecord](type-aliases/VariableRecord.md)                         | -                                                                             |

### Functions

| Function                        | Description                                                                                        |
| ------------------------------- | -------------------------------------------------------------------------------------------------- |
| [compile](functions/compile.md) | Converts a CSS file to a collection of style declarations that can be used with the StyleSheet API |
