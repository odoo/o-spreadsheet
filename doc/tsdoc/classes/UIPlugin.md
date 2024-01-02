[o-spreadsheet API](../README.md) / UIPlugin

# Class: UIPlugin\<State\>

UI plugins handle any transient data required to display a spreadsheet.
They can draw on the grid canvas.

## Type parameters

| Name | Type |
| :------ | :------ |
| `State` | `any` |

## Hierarchy

- `BasePlugin`\<`State`, `Command`\>

  ↳ **`UIPlugin`**

## Table of contents

### Methods

- [allowDispatch](UIPlugin.md#allowdispatch)
- [batchValidations](UIPlugin.md#batchvalidations)
- [beforeHandle](UIPlugin.md#beforehandle)
- [chainValidations](UIPlugin.md#chainvalidations)
- [exportForExcel](UIPlugin.md#exportforexcel)
- [finalize](UIPlugin.md#finalize)
- [handle](UIPlugin.md#handle)

## Methods

### allowDispatch

▸ **allowDispatch**(`command`): `Success` \| `CancelledForUnknownReason` \| `WillRemoveExistingMerge` \| `MergeIsDestructive` \| `CellIsMerged` \| `InvalidTarget` \| `EmptyUndoStack` \| `EmptyRedoStack` \| `NotEnoughElements` \| `NotEnoughSheets` \| `MissingSheetName` \| `UnchangedSheetName` \| `DuplicatedSheetName` \| `DuplicatedSheetId` \| `ForbiddenCharactersInSheetName` \| `WrongSheetMove` \| `WrongSheetPosition` \| `InvalidAnchorZone` \| `SelectionOutOfBound` \| `TargetOutOfSheet` \| `WrongCutSelection` \| `WrongPasteSelection` \| `WrongPasteOption` \| `WrongFigurePasteOption` \| `EmptyClipboard` \| `EmptyRange` \| `InvalidRange` \| `InvalidZones` \| `InvalidSheetId` \| `InvalidFigureId` \| `InputAlreadyFocused` \| `MaximumRangesReached` \| `MinimumRangesReached` \| `InvalidChartDefinition` \| `InvalidDataSet` \| `InvalidLabelRange` \| `InvalidScorecardKeyValue` \| `InvalidScorecardBaseline` \| `InvalidGaugeDataRange` \| `EmptyGaugeRangeMin` \| `GaugeRangeMinNaN` \| `EmptyGaugeRangeMax` \| `GaugeRangeMaxNaN` \| `GaugeRangeMinBiggerThanRangeMax` \| `GaugeLowerInflectionPointNaN` \| `GaugeUpperInflectionPointNaN` \| `GaugeLowerBiggerThanUpper` \| `InvalidAutofillSelection` \| `WrongComposerSelection` \| `MinBiggerThanMax` \| `LowerBiggerThanUpper` \| `MidBiggerThanMax` \| `MinBiggerThanMid` \| `FirstArgMissing` \| `SecondArgMissing` \| `MinNaN` \| `MidNaN` \| `MaxNaN` \| `ValueUpperInflectionNaN` \| `ValueLowerInflectionNaN` \| `MinInvalidFormula` \| `MidInvalidFormula` \| `MaxInvalidFormula` \| `ValueUpperInvalidFormula` \| `ValueLowerInvalidFormula` \| `InvalidSortZone` \| `WaitingSessionConfirmation` \| `MergeOverlap` \| `TooManyHiddenElements` \| `Readonly` \| `InvalidViewportSize` \| `InvalidScrollingDirection` \| `FigureDoesNotExist` \| `InvalidConditionalFormatId` \| `InvalidCellPopover` \| `EmptyTarget` \| `InvalidFreezeQuantity` \| `FrozenPaneOverlap` \| `ValuesNotChanged` \| `InvalidFilterZone` \| `FilterOverlap` \| `FilterNotFound` \| `MergeInFilter` \| `NonContinuousTargets` \| `DuplicatedFigureId` \| `InvalidSelectionStep` \| `DuplicatedChartId` \| `ChartDoesNotExist` \| `InvalidHeaderIndex` \| `InvalidQuantity` \| `MoreThanOneColumnSelected` \| `EmptySplitSeparator` \| `SplitWillOverwriteContent` \| `NoSplitSeparatorInSelection` \| `NoActiveSheet` \| `InvalidLocale` \| `AlreadyInPaintingFormatMode` \| `MoreThanOneRangeSelected` \| `NoColumnsProvided` \| `ColumnsNotIncludedInZone` \| `DuplicatesColumnsSelected` \| `InvalidHeaderGroupStartEnd` \| `HeaderGroupAlreadyExists` \| `UnknownHeaderGroup` \| `UnknownDataValidationRule` \| `UnknownDataValidationCriterionType` \| `InvalidDataValidationCriterionValue` \| `InvalidNumberOfCriterionValues` \| `BlockingValidationRule` \| `InvalidCopyPasteSelection` \| `NoChanges` \| `CommandResult`[]

Before a command is accepted, the model will ask each plugin if the command
is allowed.  If all of then return true, then we can proceed. Otherwise,
the command is cancelled.

There should not be any side effects in this method.

#### Parameters

| Name | Type |
| :------ | :------ |
| `command` | `Command` |

#### Returns

`Success` \| `CancelledForUnknownReason` \| `WillRemoveExistingMerge` \| `MergeIsDestructive` \| `CellIsMerged` \| `InvalidTarget` \| `EmptyUndoStack` \| `EmptyRedoStack` \| `NotEnoughElements` \| `NotEnoughSheets` \| `MissingSheetName` \| `UnchangedSheetName` \| `DuplicatedSheetName` \| `DuplicatedSheetId` \| `ForbiddenCharactersInSheetName` \| `WrongSheetMove` \| `WrongSheetPosition` \| `InvalidAnchorZone` \| `SelectionOutOfBound` \| `TargetOutOfSheet` \| `WrongCutSelection` \| `WrongPasteSelection` \| `WrongPasteOption` \| `WrongFigurePasteOption` \| `EmptyClipboard` \| `EmptyRange` \| `InvalidRange` \| `InvalidZones` \| `InvalidSheetId` \| `InvalidFigureId` \| `InputAlreadyFocused` \| `MaximumRangesReached` \| `MinimumRangesReached` \| `InvalidChartDefinition` \| `InvalidDataSet` \| `InvalidLabelRange` \| `InvalidScorecardKeyValue` \| `InvalidScorecardBaseline` \| `InvalidGaugeDataRange` \| `EmptyGaugeRangeMin` \| `GaugeRangeMinNaN` \| `EmptyGaugeRangeMax` \| `GaugeRangeMaxNaN` \| `GaugeRangeMinBiggerThanRangeMax` \| `GaugeLowerInflectionPointNaN` \| `GaugeUpperInflectionPointNaN` \| `GaugeLowerBiggerThanUpper` \| `InvalidAutofillSelection` \| `WrongComposerSelection` \| `MinBiggerThanMax` \| `LowerBiggerThanUpper` \| `MidBiggerThanMax` \| `MinBiggerThanMid` \| `FirstArgMissing` \| `SecondArgMissing` \| `MinNaN` \| `MidNaN` \| `MaxNaN` \| `ValueUpperInflectionNaN` \| `ValueLowerInflectionNaN` \| `MinInvalidFormula` \| `MidInvalidFormula` \| `MaxInvalidFormula` \| `ValueUpperInvalidFormula` \| `ValueLowerInvalidFormula` \| `InvalidSortZone` \| `WaitingSessionConfirmation` \| `MergeOverlap` \| `TooManyHiddenElements` \| `Readonly` \| `InvalidViewportSize` \| `InvalidScrollingDirection` \| `FigureDoesNotExist` \| `InvalidConditionalFormatId` \| `InvalidCellPopover` \| `EmptyTarget` \| `InvalidFreezeQuantity` \| `FrozenPaneOverlap` \| `ValuesNotChanged` \| `InvalidFilterZone` \| `FilterOverlap` \| `FilterNotFound` \| `MergeInFilter` \| `NonContinuousTargets` \| `DuplicatedFigureId` \| `InvalidSelectionStep` \| `DuplicatedChartId` \| `ChartDoesNotExist` \| `InvalidHeaderIndex` \| `InvalidQuantity` \| `MoreThanOneColumnSelected` \| `EmptySplitSeparator` \| `SplitWillOverwriteContent` \| `NoSplitSeparatorInSelection` \| `NoActiveSheet` \| `InvalidLocale` \| `AlreadyInPaintingFormatMode` \| `MoreThanOneRangeSelected` \| `NoColumnsProvided` \| `ColumnsNotIncludedInZone` \| `DuplicatesColumnsSelected` \| `InvalidHeaderGroupStartEnd` \| `HeaderGroupAlreadyExists` \| `UnknownHeaderGroup` \| `UnknownDataValidationRule` \| `UnknownDataValidationCriterionType` \| `InvalidDataValidationCriterionValue` \| `InvalidNumberOfCriterionValues` \| `BlockingValidationRule` \| `InvalidCopyPasteSelection` \| `NoChanges` \| `CommandResult`[]

#### Inherited from

BasePlugin.allowDispatch

___

### batchValidations

▸ **batchValidations**\<`T`\>(`...validations`): `Validation`\<`T`\>

Combine multiple validation functions into a single function
returning the list of result of every validation.

#### Type parameters

| Name |
| :------ |
| `T` |

#### Parameters

| Name | Type |
| :------ | :------ |
| `...validations` | `Validation`\<`T`\>[] |

#### Returns

`Validation`\<`T`\>

#### Inherited from

BasePlugin.batchValidations

___

### beforeHandle

▸ **beforeHandle**(`command`): `void`

This method is useful when a plugin need to perform some action before a
command is handled in another plugin. This should only be used if it is not
possible to do the work in the handle method.

#### Parameters

| Name | Type |
| :------ | :------ |
| `command` | `Command` |

#### Returns

`void`

#### Inherited from

BasePlugin.beforeHandle

___

### chainValidations

▸ **chainValidations**\<`T`\>(`...validations`): `Validation`\<`T`\>

Combine multiple validation functions. Every validation is executed one after
the other. As soon as one validation fails, it stops and the cancelled reason
is returned.

#### Type parameters

| Name |
| :------ |
| `T` |

#### Parameters

| Name | Type |
| :------ | :------ |
| `...validations` | `Validation`\<`T`\>[] |

#### Returns

`Validation`\<`T`\>

#### Inherited from

BasePlugin.chainValidations

___

### exportForExcel

▸ **exportForExcel**(`data`): `void`

Export for excel should be available for all plugins, even for the UI.
In some case, we need to export evaluated value, which is available from
UI plugin only.

#### Parameters

| Name | Type |
| :------ | :------ |
| `data` | `ExcelWorkbookData` |

#### Returns

`void`

#### Inherited from

BasePlugin.exportForExcel

___

### finalize

▸ **finalize**(): `void`

Sometimes, it is useful to perform some work after a command (and all its
subcommands) has been completely handled.  For example, when we paste
multiple cells, we only want to reevaluate the cell values once at the end.

#### Returns

`void`

#### Inherited from

BasePlugin.finalize

___

### handle

▸ **handle**(`command`): `void`

This is the standard place to handle any command. Most of the plugin
command handling work should take place here.

#### Parameters

| Name | Type |
| :------ | :------ |
| `command` | `Command` |

#### Returns

`void`

#### Inherited from

BasePlugin.handle
