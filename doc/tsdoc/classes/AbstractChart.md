[o-spreadsheet API](../README.md) / AbstractChart

# Class: AbstractChart

AbstractChart is the class from which every Chart should inherit.
The role of this class is to maintain the state of each chart.

## Table of contents

### Constructors

- [constructor](AbstractChart.md#constructor)

### Properties

- [getters](AbstractChart.md#getters)
- [sheetId](AbstractChart.md#sheetid)
- [title](AbstractChart.md#title)
- [type](AbstractChart.md#type)

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

## Constructors

### constructor

• **new AbstractChart**(`definition`, `sheetId`, `getters`)

#### Parameters

| Name | Type |
| :------ | :------ |
| `definition` | `ChartDefinition` |
| `sheetId` | `UID` |
| `getters` | `CoreGetters` |

## Properties

### getters

• `Protected` `Readonly` **getters**: `CoreGetters`

___

### sheetId

• `Readonly` **sheetId**: `UID`

___

### title

• `Readonly` **title**: `string`

___

### type

• `Readonly` `Abstract` **type**: `ChartType`

## Methods

### copyForSheetId

▸ `Abstract` **copyForSheetId**(`sheetId`): [`AbstractChart`](AbstractChart.md)

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

▸ `Abstract` **copyInSheetId**(`sheetId`): [`AbstractChart`](AbstractChart.md)

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

▸ `Abstract` **getContextCreation**(): `ChartCreationContext`

Extract the ChartCreationContext of the chart

#### Returns

`ChartCreationContext`

___

### getDefinition

▸ `Abstract` **getDefinition**(): `ChartDefinition`

Get the definition of the chart

#### Returns

`ChartDefinition`

___

### getDefinitionForExcel

▸ `Abstract` **getDefinitionForExcel**(): `undefined` \| `ExcelChartDefinition`

Get the definition of the chart that will be used for excel export.
If the chart is not supported by Excel, this function returns undefined.

#### Returns

`undefined` \| `ExcelChartDefinition`

___

### updateRanges

▸ `Abstract` **updateRanges**(`applyChange`): [`AbstractChart`](AbstractChart.md)

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

▸ `Static` **getDefinitionFromContextCreation**(`context`): `ChartDefinition`

Get an empty definition based on the given context

#### Parameters

| Name | Type |
| :------ | :------ |
| `context` | `ChartCreationContext` |

#### Returns

`ChartDefinition`

___

### transformDefinition

▸ `Static` **transformDefinition**(`definition`, `executed`): `ChartDefinition`

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

▸ `Static` **validateChartDefinition**(`validator`, `definition`): [`CommandResult`](../enums/CommandResult.md) \| [`CommandResult`](../enums/CommandResult.md)[]

Validate the chart definition given as arguments. This function will be
called from allowDispatch function

#### Parameters

| Name | Type |
| :------ | :------ |
| `validator` | `Validator` |
| `definition` | `ChartDefinition` |

#### Returns

[`CommandResult`](../enums/CommandResult.md) \| [`CommandResult`](../enums/CommandResult.md)[]
