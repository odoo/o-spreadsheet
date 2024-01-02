[o-spreadsheet API](../README.md) / AbstractChart

# Class: AbstractChart

AbstractChart is the class from which every Chart should inherit.
The role of this class is to maintain the state of each chart.

## Table of contents

### Methods

- [copyForSheetId](AbstractChart.md#copyforsheetid)
- [copyInSheetId](AbstractChart.md#copyinsheetid)
- [getContextCreation](AbstractChart.md#getcontextcreation)
- [getDefinition](AbstractChart.md#getdefinition)
- [getDefinitionForExcel](AbstractChart.md#getdefinitionforexcel)
- [updateRanges](AbstractChart.md#updateranges)
- [getDefinitionFromContextCreation](AbstractChart.md#getdefinitionfromcontextcreation)
- [transformDefinition](AbstractChart.md#transformdefinition)
- [validateChartDefinition](AbstractChart.md#validatechartdefinition)

## Methods

### copyForSheetId

▸ **copyForSheetId**(`sheetId`): [`AbstractChart`](AbstractChart.md)

Get a copy a the chart adapted to the given sheetId.
The ranges that are in the same sheet as the chart will be adapted to the given sheetId.

#### Parameters

| Name | Type |
| :------ | :------ |
| `sheetId` | `UID` |

#### Returns

[`AbstractChart`](AbstractChart.md)

___

### copyInSheetId

▸ **copyInSheetId**(`sheetId`): [`AbstractChart`](AbstractChart.md)

Get a copy a the chart in the given sheetId.
The ranges of the chart will stay the same as the copied chart.

#### Parameters

| Name | Type |
| :------ | :------ |
| `sheetId` | `UID` |

#### Returns

[`AbstractChart`](AbstractChart.md)

___

### getContextCreation

▸ **getContextCreation**(): `ChartCreationContext`

Extract the ChartCreationContext of the chart

#### Returns

`ChartCreationContext`

___

### getDefinition

▸ **getDefinition**(): `ChartDefinition`

Get the definition of the chart

#### Returns

`ChartDefinition`

___

### getDefinitionForExcel

▸ **getDefinitionForExcel**(): `undefined` \| `ExcelChartDefinition`

Get the definition of the chart that will be used for excel export.
If the chart is not supported by Excel, this function returns undefined.

#### Returns

`undefined` \| `ExcelChartDefinition`

___

### updateRanges

▸ **updateRanges**(`applyChange`): [`AbstractChart`](AbstractChart.md)

This function should be used to update all the ranges of the chart after
a grid change (add/remove col/row, rename sheet, ...)

#### Parameters

| Name | Type |
| :------ | :------ |
| `applyChange` | `ApplyRangeChange` |

#### Returns

[`AbstractChart`](AbstractChart.md)

___

### getDefinitionFromContextCreation

▸ **getDefinitionFromContextCreation**(`context`): `ChartDefinition`

Get an empty definition based on the given context

#### Parameters

| Name | Type |
| :------ | :------ |
| `context` | `ChartCreationContext` |

#### Returns

`ChartDefinition`

___

### transformDefinition

▸ **transformDefinition**(`definition`, `executed`): `ChartDefinition`

Get a new chart definition transformed with the executed command. This
functions will be called during operational transform process

#### Parameters

| Name | Type |
| :------ | :------ |
| `definition` | `ChartDefinition` |
| `executed` | `AddColumnsRowsCommand` \| `RemoveColumnsRowsCommand` |

#### Returns

`ChartDefinition`

___

### validateChartDefinition

▸ **validateChartDefinition**(`validator`, `definition`): `Success` \| `CancelledForUnknownReason` \| `WillRemoveExistingMerge` \| `MergeIsDestructive` \| `CellIsMerged` \| `InvalidTarget` \| `EmptyUndoStack` \| `EmptyRedoStack` \| `NotEnoughElements` \| `NotEnoughSheets` \| `MissingSheetName` \| `UnchangedSheetName` \| `DuplicatedSheetName` \| `DuplicatedSheetId` \| `ForbiddenCharactersInSheetName` \| `WrongSheetMove` \| `WrongSheetPosition` \| `InvalidAnchorZone` \| `SelectionOutOfBound` \| `TargetOutOfSheet` \| `WrongCutSelection` \| `WrongPasteSelection` \| `WrongPasteOption` \| `WrongFigurePasteOption` \| `EmptyClipboard` \| `EmptyRange` \| `InvalidRange` \| `InvalidZones` \| `InvalidSheetId` \| `InvalidFigureId` \| `InputAlreadyFocused` \| `MaximumRangesReached` \| `MinimumRangesReached` \| `InvalidChartDefinition` \| `InvalidDataSet` \| `InvalidLabelRange` \| `InvalidScorecardKeyValue` \| `InvalidScorecardBaseline` \| `InvalidGaugeDataRange` \| `EmptyGaugeRangeMin` \| `GaugeRangeMinNaN` \| `EmptyGaugeRangeMax` \| `GaugeRangeMaxNaN` \| `GaugeRangeMinBiggerThanRangeMax` \| `GaugeLowerInflectionPointNaN` \| `GaugeUpperInflectionPointNaN` \| `GaugeLowerBiggerThanUpper` \| `InvalidAutofillSelection` \| `WrongComposerSelection` \| `MinBiggerThanMax` \| `LowerBiggerThanUpper` \| `MidBiggerThanMax` \| `MinBiggerThanMid` \| `FirstArgMissing` \| `SecondArgMissing` \| `MinNaN` \| `MidNaN` \| `MaxNaN` \| `ValueUpperInflectionNaN` \| `ValueLowerInflectionNaN` \| `MinInvalidFormula` \| `MidInvalidFormula` \| `MaxInvalidFormula` \| `ValueUpperInvalidFormula` \| `ValueLowerInvalidFormula` \| `InvalidSortZone` \| `WaitingSessionConfirmation` \| `MergeOverlap` \| `TooManyHiddenElements` \| `Readonly` \| `InvalidViewportSize` \| `InvalidScrollingDirection` \| `FigureDoesNotExist` \| `InvalidConditionalFormatId` \| `InvalidCellPopover` \| `EmptyTarget` \| `InvalidFreezeQuantity` \| `FrozenPaneOverlap` \| `ValuesNotChanged` \| `InvalidFilterZone` \| `FilterOverlap` \| `FilterNotFound` \| `MergeInFilter` \| `NonContinuousTargets` \| `DuplicatedFigureId` \| `InvalidSelectionStep` \| `DuplicatedChartId` \| `ChartDoesNotExist` \| `InvalidHeaderIndex` \| `InvalidQuantity` \| `MoreThanOneColumnSelected` \| `EmptySplitSeparator` \| `SplitWillOverwriteContent` \| `NoSplitSeparatorInSelection` \| `NoActiveSheet` \| `InvalidLocale` \| `AlreadyInPaintingFormatMode` \| `MoreThanOneRangeSelected` \| `NoColumnsProvided` \| `ColumnsNotIncludedInZone` \| `DuplicatesColumnsSelected` \| `InvalidHeaderGroupStartEnd` \| `HeaderGroupAlreadyExists` \| `UnknownHeaderGroup` \| `UnknownDataValidationRule` \| `UnknownDataValidationCriterionType` \| `InvalidDataValidationCriterionValue` \| `InvalidNumberOfCriterionValues` \| `BlockingValidationRule` \| `InvalidCopyPasteSelection` \| `NoChanges` \| `CommandResult`[]

Validate the chart definition given as arguments. This function will be
called from allowDispatch function

#### Parameters

| Name | Type |
| :------ | :------ |
| `validator` | `Validator` |
| `definition` | `ChartDefinition` |

#### Returns

`Success` \| `CancelledForUnknownReason` \| `WillRemoveExistingMerge` \| `MergeIsDestructive` \| `CellIsMerged` \| `InvalidTarget` \| `EmptyUndoStack` \| `EmptyRedoStack` \| `NotEnoughElements` \| `NotEnoughSheets` \| `MissingSheetName` \| `UnchangedSheetName` \| `DuplicatedSheetName` \| `DuplicatedSheetId` \| `ForbiddenCharactersInSheetName` \| `WrongSheetMove` \| `WrongSheetPosition` \| `InvalidAnchorZone` \| `SelectionOutOfBound` \| `TargetOutOfSheet` \| `WrongCutSelection` \| `WrongPasteSelection` \| `WrongPasteOption` \| `WrongFigurePasteOption` \| `EmptyClipboard` \| `EmptyRange` \| `InvalidRange` \| `InvalidZones` \| `InvalidSheetId` \| `InvalidFigureId` \| `InputAlreadyFocused` \| `MaximumRangesReached` \| `MinimumRangesReached` \| `InvalidChartDefinition` \| `InvalidDataSet` \| `InvalidLabelRange` \| `InvalidScorecardKeyValue` \| `InvalidScorecardBaseline` \| `InvalidGaugeDataRange` \| `EmptyGaugeRangeMin` \| `GaugeRangeMinNaN` \| `EmptyGaugeRangeMax` \| `GaugeRangeMaxNaN` \| `GaugeRangeMinBiggerThanRangeMax` \| `GaugeLowerInflectionPointNaN` \| `GaugeUpperInflectionPointNaN` \| `GaugeLowerBiggerThanUpper` \| `InvalidAutofillSelection` \| `WrongComposerSelection` \| `MinBiggerThanMax` \| `LowerBiggerThanUpper` \| `MidBiggerThanMax` \| `MinBiggerThanMid` \| `FirstArgMissing` \| `SecondArgMissing` \| `MinNaN` \| `MidNaN` \| `MaxNaN` \| `ValueUpperInflectionNaN` \| `ValueLowerInflectionNaN` \| `MinInvalidFormula` \| `MidInvalidFormula` \| `MaxInvalidFormula` \| `ValueUpperInvalidFormula` \| `ValueLowerInvalidFormula` \| `InvalidSortZone` \| `WaitingSessionConfirmation` \| `MergeOverlap` \| `TooManyHiddenElements` \| `Readonly` \| `InvalidViewportSize` \| `InvalidScrollingDirection` \| `FigureDoesNotExist` \| `InvalidConditionalFormatId` \| `InvalidCellPopover` \| `EmptyTarget` \| `InvalidFreezeQuantity` \| `FrozenPaneOverlap` \| `ValuesNotChanged` \| `InvalidFilterZone` \| `FilterOverlap` \| `FilterNotFound` \| `MergeInFilter` \| `NonContinuousTargets` \| `DuplicatedFigureId` \| `InvalidSelectionStep` \| `DuplicatedChartId` \| `ChartDoesNotExist` \| `InvalidHeaderIndex` \| `InvalidQuantity` \| `MoreThanOneColumnSelected` \| `EmptySplitSeparator` \| `SplitWillOverwriteContent` \| `NoSplitSeparatorInSelection` \| `NoActiveSheet` \| `InvalidLocale` \| `AlreadyInPaintingFormatMode` \| `MoreThanOneRangeSelected` \| `NoColumnsProvided` \| `ColumnsNotIncludedInZone` \| `DuplicatesColumnsSelected` \| `InvalidHeaderGroupStartEnd` \| `HeaderGroupAlreadyExists` \| `UnknownHeaderGroup` \| `UnknownDataValidationRule` \| `UnknownDataValidationCriterionType` \| `InvalidDataValidationCriterionValue` \| `InvalidNumberOfCriterionValues` \| `BlockingValidationRule` \| `InvalidCopyPasteSelection` \| `NoChanges` \| `CommandResult`[]
