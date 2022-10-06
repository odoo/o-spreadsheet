[o-spreadsheet API](../README.md) / CorePlugin

# Class: CorePlugin<State, C\>

Core plugins handle spreadsheet data.
They are responsible to import, export and maintain the spreadsheet
persisted state.
They should not be concerned about UI parts or transient state.

## Type parameters

| Name | Type |
| :------ | :------ |
| `State` | `any` |
| `C` | `CoreCommand` |

## Hierarchy

- `BasePlugin`<`State`, `C`\>

  ↳ **`CorePlugin`**

## Implements

- `RangeProvider`

## Table of contents

### Constructors

- [constructor](CorePlugin.md#constructor)

### Properties

- [dispatch](CorePlugin.md#dispatch)
- [getters](CorePlugin.md#getters)
- [history](CorePlugin.md#history)
- [range](CorePlugin.md#range)
- [uuidGenerator](CorePlugin.md#uuidgenerator)
- [getters](CorePlugin.md#getters)

### Methods

- [adaptRanges](CorePlugin.md#adaptranges)
- [allowDispatch](CorePlugin.md#allowdispatch)
- [batchValidations](CorePlugin.md#batchvalidations)
- [beforeHandle](CorePlugin.md#beforehandle)
- [chainValidations](CorePlugin.md#chainvalidations)
- [checkValidations](CorePlugin.md#checkvalidations)
- [export](CorePlugin.md#export)
- [exportForExcel](CorePlugin.md#exportforexcel)
- [finalize](CorePlugin.md#finalize)
- [handle](CorePlugin.md#handle)
- [import](CorePlugin.md#import)

## Constructors

### constructor

• **new CorePlugin**<`State`, `C`\>(`getters`, `stateObserver`, `range`, `dispatch`, `config`, `uuidGenerator`)

#### Type parameters

| Name | Type |
| :------ | :------ |
| `State` | `any` |
| `C` | `CoreCommand` |

#### Parameters

| Name | Type |
| :------ | :------ |
| `getters` | `CoreGetters` |
| `stateObserver` | `StateObserver` |
| `range` | `RangeAdapter` |
| `dispatch` | <T, C\>(`type`: {} extends `Omit`<`C`, ``"type"``\> ? `T` : `never`) => [`DispatchResult`](DispatchResult.md)<T, C\>(`type`: `T`, `r`: `Omit`<`C`, ``"type"``\>) => [`DispatchResult`](DispatchResult.md) |
| `config` | `ModelConfig` |
| `uuidGenerator` | `UuidGenerator` |

#### Overrides

BasePlugin&lt;State, C\&gt;.constructor

## Properties

### dispatch

• `Protected` **dispatch**: <T, C\>(`type`: {} extends `Omit`<`C`, ``"type"``\> ? `T` : `never`) => [`DispatchResult`](DispatchResult.md)<T, C\>(`type`: `T`, `r`: `Omit`<`C`, ``"type"``\>) => [`DispatchResult`](DispatchResult.md)

#### Type declaration

▸ <`T`, `C`\>(`type`): [`DispatchResult`](DispatchResult.md)

##### Type parameters

| Name | Type |
| :------ | :------ |
| `T` | extends ``"UPDATE_CELL"`` \| ``"UPDATE_CELL_POSITION"`` \| ``"CLEAR_CELL"`` \| ``"DELETE_CONTENT"`` \| ``"SET_DECIMAL"`` \| ``"ADD_COLUMNS_ROWS"`` \| ``"REMOVE_COLUMNS_ROWS"`` \| ``"RESIZE_COLUMNS_ROWS"`` \| ``"HIDE_COLUMNS_ROWS"`` \| ``"UNHIDE_COLUMNS_ROWS"`` \| ``"SET_GRID_LINES_VISIBILITY"`` \| ``"FREEZE_COLUMNS"`` \| ``"FREEZE_ROWS"`` \| ``"UNFREEZE_COLUMNS_ROWS"`` \| ``"UNFREEZE_COLUMNS"`` \| ``"UNFREEZE_ROWS"`` \| ``"ADD_MERGE"`` \| ``"REMOVE_MERGE"`` \| ``"CREATE_SHEET"`` \| ``"DELETE_SHEET"`` \| ``"DUPLICATE_SHEET"`` \| ``"MOVE_SHEET"`` \| ``"RENAME_SHEET"`` \| ``"HIDE_SHEET"`` \| ``"SHOW_SHEET"`` \| ``"MOVE_RANGES"`` \| ``"ADD_CONDITIONAL_FORMAT"`` \| ``"REMOVE_CONDITIONAL_FORMAT"`` \| ``"MOVE_CONDITIONAL_FORMAT"`` \| ``"CREATE_FIGURE"`` \| ``"DELETE_FIGURE"`` \| ``"UPDATE_FIGURE"`` \| ``"SET_FORMATTING"`` \| ``"CLEAR_FORMATTING"`` \| ``"SET_BORDER"`` \| ``"CREATE_CHART"`` \| ``"UPDATE_CHART"`` |
| `C` | extends { `type`: `T`  } & `UpdateCellCommand` \| { `type`: `T`  } & `UpdateCellPositionCommand` \| { `type`: `T`  } & `ClearCellCommand` \| { `type`: `T`  } & `DeleteContentCommand` \| { `type`: `T`  } & `SetDecimalCommand` \| { `type`: `T`  } & `AddColumnsRowsCommand` \| { `type`: `T`  } & `RemoveColumnsRowsCommand` \| { `type`: `T`  } & `ResizeColumnsRowsCommand` \| { `type`: `T`  } & `HideColumnsRowsCommand` \| { `type`: `T`  } & `UnhideColumnsRowsCommand` \| { `type`: `T`  } & `SetGridLinesVisibilityCommand` \| { `type`: `T`  } & `FreezeColumnsCommand` \| { `type`: `T`  } & `FreezeRowsCommand` \| { `type`: `T`  } & `UnfreezeColumnsRowsCommand` \| { `type`: `T`  } & `UnfreezeColumnsCommand` \| { `type`: `T`  } & `UnfreezeRowsCommand` \| { `type`: `T`  } & `AddMergeCommand` \| { `type`: `T`  } & `RemoveMergeCommand` \| { `type`: `T`  } & `CreateSheetCommand` \| { `type`: `T`  } & `DeleteSheetCommand` \| { `type`: `T`  } & `DuplicateSheetCommand` \| { `type`: `T`  } & `MoveSheetCommand` \| { `type`: `T`  } & `RenameSheetCommand` \| { `type`: `T`  } & `HideSheetCommand` \| { `type`: `T`  } & `ShowSheetCommand` \| { `type`: `T`  } & `MoveRangeCommand` \| { `type`: `T`  } & `AddConditionalFormatCommand` \| { `type`: `T`  } & `RemoveConditionalFormatCommand` \| { `type`: `T`  } & `MoveConditionalFormatCommand` \| { `type`: `T`  } & `CreateFigureCommand` \| { `type`: `T`  } & `DeleteFigureCommand` \| { `type`: `T`  } & `UpdateFigureCommand` \| { `type`: `T`  } & `SetFormattingCommand` \| { `type`: `T`  } & `ClearFormattingCommand` \| { `type`: `T`  } & `SetBorderCommand` \| { `type`: `T`  } & `CreateChartCommand` \| { `type`: `T`  } & `UpdateChartCommand` |

##### Parameters

| Name | Type |
| :------ | :------ |
| `type` | {} extends `Omit`<`C`, ``"type"``\> ? `T` : `never` |

##### Returns

[`DispatchResult`](DispatchResult.md)

▸ <`T`, `C`\>(`type`, `r`): [`DispatchResult`](DispatchResult.md)

##### Type parameters

| Name | Type |
| :------ | :------ |
| `T` | extends ``"UPDATE_CELL"`` \| ``"UPDATE_CELL_POSITION"`` \| ``"CLEAR_CELL"`` \| ``"DELETE_CONTENT"`` \| ``"SET_DECIMAL"`` \| ``"ADD_COLUMNS_ROWS"`` \| ``"REMOVE_COLUMNS_ROWS"`` \| ``"RESIZE_COLUMNS_ROWS"`` \| ``"HIDE_COLUMNS_ROWS"`` \| ``"UNHIDE_COLUMNS_ROWS"`` \| ``"SET_GRID_LINES_VISIBILITY"`` \| ``"FREEZE_COLUMNS"`` \| ``"FREEZE_ROWS"`` \| ``"UNFREEZE_COLUMNS_ROWS"`` \| ``"UNFREEZE_COLUMNS"`` \| ``"UNFREEZE_ROWS"`` \| ``"ADD_MERGE"`` \| ``"REMOVE_MERGE"`` \| ``"CREATE_SHEET"`` \| ``"DELETE_SHEET"`` \| ``"DUPLICATE_SHEET"`` \| ``"MOVE_SHEET"`` \| ``"RENAME_SHEET"`` \| ``"HIDE_SHEET"`` \| ``"SHOW_SHEET"`` \| ``"MOVE_RANGES"`` \| ``"ADD_CONDITIONAL_FORMAT"`` \| ``"REMOVE_CONDITIONAL_FORMAT"`` \| ``"MOVE_CONDITIONAL_FORMAT"`` \| ``"CREATE_FIGURE"`` \| ``"DELETE_FIGURE"`` \| ``"UPDATE_FIGURE"`` \| ``"SET_FORMATTING"`` \| ``"CLEAR_FORMATTING"`` \| ``"SET_BORDER"`` \| ``"CREATE_CHART"`` \| ``"UPDATE_CHART"`` |
| `C` | extends { `type`: `T`  } & `UpdateCellCommand` \| { `type`: `T`  } & `UpdateCellPositionCommand` \| { `type`: `T`  } & `ClearCellCommand` \| { `type`: `T`  } & `DeleteContentCommand` \| { `type`: `T`  } & `SetDecimalCommand` \| { `type`: `T`  } & `AddColumnsRowsCommand` \| { `type`: `T`  } & `RemoveColumnsRowsCommand` \| { `type`: `T`  } & `ResizeColumnsRowsCommand` \| { `type`: `T`  } & `HideColumnsRowsCommand` \| { `type`: `T`  } & `UnhideColumnsRowsCommand` \| { `type`: `T`  } & `SetGridLinesVisibilityCommand` \| { `type`: `T`  } & `FreezeColumnsCommand` \| { `type`: `T`  } & `FreezeRowsCommand` \| { `type`: `T`  } & `UnfreezeColumnsRowsCommand` \| { `type`: `T`  } & `UnfreezeColumnsCommand` \| { `type`: `T`  } & `UnfreezeRowsCommand` \| { `type`: `T`  } & `AddMergeCommand` \| { `type`: `T`  } & `RemoveMergeCommand` \| { `type`: `T`  } & `CreateSheetCommand` \| { `type`: `T`  } & `DeleteSheetCommand` \| { `type`: `T`  } & `DuplicateSheetCommand` \| { `type`: `T`  } & `MoveSheetCommand` \| { `type`: `T`  } & `RenameSheetCommand` \| { `type`: `T`  } & `HideSheetCommand` \| { `type`: `T`  } & `ShowSheetCommand` \| { `type`: `T`  } & `MoveRangeCommand` \| { `type`: `T`  } & `AddConditionalFormatCommand` \| { `type`: `T`  } & `RemoveConditionalFormatCommand` \| { `type`: `T`  } & `MoveConditionalFormatCommand` \| { `type`: `T`  } & `CreateFigureCommand` \| { `type`: `T`  } & `DeleteFigureCommand` \| { `type`: `T`  } & `UpdateFigureCommand` \| { `type`: `T`  } & `SetFormattingCommand` \| { `type`: `T`  } & `ClearFormattingCommand` \| { `type`: `T`  } & `SetBorderCommand` \| { `type`: `T`  } & `CreateChartCommand` \| { `type`: `T`  } & `UpdateChartCommand` |

##### Parameters

| Name | Type |
| :------ | :------ |
| `type` | `T` |
| `r` | `Omit`<`C`, ``"type"``\> |

##### Returns

[`DispatchResult`](DispatchResult.md)

#### Inherited from

BasePlugin.dispatch

___

### getters

• `Protected` **getters**: `CoreGetters`

___

### history

• `Protected` **history**: `WorkbookHistory`<`State`\>

#### Inherited from

BasePlugin.history

___

### range

• `Protected` **range**: `RangeAdapter`

___

### uuidGenerator

• `Protected` **uuidGenerator**: `UuidGenerator`

___

### getters

▪ `Static` **getters**: readonly `string`[] = `[]`

#### Inherited from

BasePlugin.getters

## Methods

### adaptRanges

▸ **adaptRanges**(`applyChange`, `sheetId?`): `void`

This method can be implemented in any plugin, to loop over the plugin's data structure and adapt the plugin's ranges.
To adapt them, the implementation of the function must have a perfect knowledge of the data structure, thus
implementing the loops over it makes sense in the plugin itself.
When calling the method applyChange, the range will be adapted if necessary, then a copy will be returned along with
the type of change that occurred.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `applyChange` | `ApplyRangeChange` | a function that, when called, will adapt the range according to the change on the grid |
| `sheetId?` | `UID` | an optional sheetId to adapt either range of that sheet specifically, or ranges pointing to that sheet |

#### Returns

`void`

#### Implementation of

RangeProvider.adaptRanges

___

### allowDispatch

▸ **allowDispatch**(`command`): [`CommandResult`](../enums/CommandResult.md) \| [`CommandResult`](../enums/CommandResult.md)[]

Before a command is accepted, the model will ask each plugin if the command
is allowed.  If all of then return true, then we can proceed. Otherwise,
the command is cancelled.

There should not be any side effects in this method.

#### Parameters

| Name | Type |
| :------ | :------ |
| `command` | `C` |

#### Returns

[`CommandResult`](../enums/CommandResult.md) \| [`CommandResult`](../enums/CommandResult.md)[]

#### Inherited from

BasePlugin.allowDispatch

___

### batchValidations

▸ **batchValidations**<`T`\>(...`validations`): `Validation`<`T`\>

Combine multiple validation functions into a single function
returning the list of result of every validation.

#### Type parameters

| Name |
| :------ |
| `T` |

#### Parameters

| Name | Type |
| :------ | :------ |
| `...validations` | `Validation`<`T`\>[] |

#### Returns

`Validation`<`T`\>

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
| `command` | `C` |

#### Returns

`void`

#### Inherited from

BasePlugin.beforeHandle

___

### chainValidations

▸ **chainValidations**<`T`\>(...`validations`): `Validation`<`T`\>

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
| `...validations` | `Validation`<`T`\>[] |

#### Returns

`Validation`<`T`\>

#### Inherited from

BasePlugin.chainValidations

___

### checkValidations

▸ **checkValidations**<`T`\>(`command`, ...`validations`): [`CommandResult`](../enums/CommandResult.md) \| [`CommandResult`](../enums/CommandResult.md)[]

#### Type parameters

| Name |
| :------ |
| `T` |

#### Parameters

| Name | Type |
| :------ | :------ |
| `command` | `T` |
| `...validations` | `Validation`<`T`\>[] |

#### Returns

[`CommandResult`](../enums/CommandResult.md) \| [`CommandResult`](../enums/CommandResult.md)[]

#### Inherited from

BasePlugin.checkValidations

___

### export

▸ **export**(`data`): `void`

#### Parameters

| Name | Type |
| :------ | :------ |
| `data` | `WorkbookData` |

#### Returns

`void`

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
| `command` | `C` |

#### Returns

`void`

#### Inherited from

BasePlugin.handle

___

### import

▸ **import**(`data`): `void`

#### Parameters

| Name | Type |
| :------ | :------ |
| `data` | `WorkbookData` |

#### Returns

`void`
