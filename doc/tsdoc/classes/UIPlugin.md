[o-spreadsheet API](../README.md) / UIPlugin

# Class: UIPlugin<State, C\>

UI plugins handle any transient data required to display a spreadsheet.
They can draw on the grid canvas.

## Type parameters

| Name | Type |
| :------ | :------ |
| `State` | `any` |
| `C` | `Command` |

## Hierarchy

- `BasePlugin`<`State`, `C`\>

  ↳ **`UIPlugin`**

## Table of contents

### Constructors

- [constructor](UIPlugin.md#constructor)

### Properties

- [dispatch](UIPlugin.md#dispatch)
- [getters](UIPlugin.md#getters)
- [history](UIPlugin.md#history)
- [selection](UIPlugin.md#selection)
- [ui](UIPlugin.md#ui)
- [getters](UIPlugin.md#getters)
- [layers](UIPlugin.md#layers)

### Methods

- [allowDispatch](UIPlugin.md#allowdispatch)
- [batchValidations](UIPlugin.md#batchvalidations)
- [beforeHandle](UIPlugin.md#beforehandle)
- [chainValidations](UIPlugin.md#chainvalidations)
- [checkValidations](UIPlugin.md#checkvalidations)
- [drawGrid](UIPlugin.md#drawgrid)
- [exportForExcel](UIPlugin.md#exportforexcel)
- [finalize](UIPlugin.md#finalize)
- [handle](UIPlugin.md#handle)

## Constructors

### constructor

• **new UIPlugin**<`State`, `C`\>(`getters`, `state`, `dispatch`, `config`, `selection`)

#### Type parameters

| Name | Type |
| :------ | :------ |
| `State` | `any` |
| `C` | `Command` |

#### Parameters

| Name | Type |
| :------ | :------ |
| `getters` | `Getters` |
| `state` | `StateObserver` |
| `dispatch` | <T, C\>(`type`: {} extends `Omit`<`C`, ``"type"``\> ? `T` : `never`) => [`DispatchResult`](DispatchResult.md)<T, C\>(`type`: `T`, `r`: `Omit`<`C`, ``"type"``\>) => [`DispatchResult`](DispatchResult.md) |
| `config` | `ModelConfig` |
| `selection` | `SelectionStreamProcessor` |

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
| `T` | extends ``"UPDATE_CELL"`` \| ``"UPDATE_CELL_POSITION"`` \| ``"CLEAR_CELL"`` \| ``"DELETE_CONTENT"`` \| ``"SET_DECIMAL"`` \| ``"ADD_COLUMNS_ROWS"`` \| ``"REMOVE_COLUMNS_ROWS"`` \| ``"RESIZE_COLUMNS_ROWS"`` \| ``"HIDE_COLUMNS_ROWS"`` \| ``"UNHIDE_COLUMNS_ROWS"`` \| ``"SET_GRID_LINES_VISIBILITY"`` \| ``"FREEZE_COLUMNS"`` \| ``"FREEZE_ROWS"`` \| ``"UNFREEZE_COLUMNS_ROWS"`` \| ``"UNFREEZE_COLUMNS"`` \| ``"UNFREEZE_ROWS"`` \| ``"ADD_MERGE"`` \| ``"REMOVE_MERGE"`` \| ``"CREATE_SHEET"`` \| ``"DELETE_SHEET"`` \| ``"DUPLICATE_SHEET"`` \| ``"MOVE_SHEET"`` \| ``"RENAME_SHEET"`` \| ``"HIDE_SHEET"`` \| ``"SHOW_SHEET"`` \| ``"MOVE_RANGES"`` \| ``"ADD_CONDITIONAL_FORMAT"`` \| ``"REMOVE_CONDITIONAL_FORMAT"`` \| ``"MOVE_CONDITIONAL_FORMAT"`` \| ``"CREATE_FIGURE"`` \| ``"DELETE_FIGURE"`` \| ``"UPDATE_FIGURE"`` \| ``"SET_FORMATTING"`` \| ``"CLEAR_FORMATTING"`` \| ``"SET_BORDER"`` \| ``"CREATE_CHART"`` \| ``"UPDATE_CHART"`` \| ``"REQUEST_UNDO"`` \| ``"REQUEST_REDO"`` \| ``"UNDO"`` \| ``"REDO"`` \| ``"ENABLE_NEW_SELECTION_INPUT"`` \| ``"DISABLE_SELECTION_INPUT"`` \| ``"UNFOCUS_SELECTION_INPUT"`` \| ``"FOCUS_RANGE"`` \| ``"ADD_EMPTY_RANGE"`` \| ``"REMOVE_RANGE"`` \| ``"CHANGE_RANGE"`` \| ``"COPY"`` \| ``"CUT"`` \| ``"PASTE"`` \| ``"AUTOFILL_CELL"`` \| ``"PASTE_FROM_OS_CLIPBOARD"`` \| ``"ACTIVATE_PAINT_FORMAT"`` \| ``"PASTE_CONDITIONAL_FORMAT"`` \| ``"AUTORESIZE_COLUMNS"`` \| ``"AUTORESIZE_ROWS"`` \| ``"MOVE_COLUMNS_ROWS"`` \| ``"ACTIVATE_SHEET"`` \| ``"PREPARE_SELECTION_INPUT_EXPANSION"`` \| ``"STOP_SELECTION_INPUT"`` \| ``"EVALUATE_CELLS"`` \| ``"CHANGE_HIGHLIGHT"`` \| ``"START_CHANGE_HIGHLIGHT"`` \| ``"SET_HIGHLIGHT_COLOR"`` \| ``"STOP_COMPOSER_RANGE_SELECTION"`` \| ``"START_EDITION"`` \| ``"STOP_EDITION"`` \| ``"SET_CURRENT_CONTENT"`` \| ``"CHANGE_COMPOSER_CURSOR_SELECTION"`` \| ``"REPLACE_COMPOSER_CURSOR_SELECTION"`` \| ``"CYCLE_EDITION_REFERENCES"`` \| ``"START"`` \| ``"AUTOFILL"`` \| ``"AUTOFILL_SELECT"`` \| ``"SET_FORMULA_VISIBILITY"`` \| ``"AUTOFILL_AUTO"`` \| ``"SELECT_FIGURE"`` \| ``"UPDATE_SEARCH"`` \| ``"CLEAR_SEARCH"`` \| ``"SELECT_SEARCH_PREVIOUS_MATCH"`` \| ``"SELECT_SEARCH_NEXT_MATCH"`` \| ``"REPLACE_SEARCH"`` \| ``"REPLACE_ALL_SEARCH"`` \| ``"SORT_CELLS"`` \| ``"RESIZE_SHEETVIEW"`` \| ``"SUM_SELECTION"`` \| ``"DELETE_CELL"`` \| ``"INSERT_CELL"`` \| ``"SET_VIEWPORT_OFFSET"`` \| ``"SHIFT_VIEWPORT_DOWN"`` \| ``"SHIFT_VIEWPORT_UP"`` \| ``"OPEN_CELL_POPOVER"`` \| ``"CLOSE_CELL_POPOVER"`` \| ``"ACTIVATE_NEXT_SHEET"`` \| ``"ACTIVATE_PREVIOUS_SHEET"`` |
| `C` | extends { `type`: `T`  } & `UpdateCellCommand` \| { `type`: `T`  } & `UpdateCellPositionCommand` \| { `type`: `T`  } & `ClearCellCommand` \| { `type`: `T`  } & `DeleteContentCommand` \| { `type`: `T`  } & `SetDecimalCommand` \| { `type`: `T`  } & `AddColumnsRowsCommand` \| { `type`: `T`  } & `RemoveColumnsRowsCommand` \| { `type`: `T`  } & `ResizeColumnsRowsCommand` \| { `type`: `T`  } & `HideColumnsRowsCommand` \| { `type`: `T`  } & `UnhideColumnsRowsCommand` \| { `type`: `T`  } & `SetGridLinesVisibilityCommand` \| { `type`: `T`  } & `FreezeColumnsCommand` \| { `type`: `T`  } & `FreezeRowsCommand` \| { `type`: `T`  } & `UnfreezeColumnsRowsCommand` \| { `type`: `T`  } & `UnfreezeColumnsCommand` \| { `type`: `T`  } & `UnfreezeRowsCommand` \| { `type`: `T`  } & `AddMergeCommand` \| { `type`: `T`  } & `RemoveMergeCommand` \| { `type`: `T`  } & `CreateSheetCommand` \| { `type`: `T`  } & `DeleteSheetCommand` \| { `type`: `T`  } & `DuplicateSheetCommand` \| { `type`: `T`  } & `MoveSheetCommand` \| { `type`: `T`  } & `RenameSheetCommand` \| { `type`: `T`  } & `HideSheetCommand` \| { `type`: `T`  } & `ShowSheetCommand` \| { `type`: `T`  } & `MoveRangeCommand` \| { `type`: `T`  } & `AddConditionalFormatCommand` \| { `type`: `T`  } & `RemoveConditionalFormatCommand` \| { `type`: `T`  } & `MoveConditionalFormatCommand` \| { `type`: `T`  } & `CreateFigureCommand` \| { `type`: `T`  } & `DeleteFigureCommand` \| { `type`: `T`  } & `UpdateFigureCommand` \| { `type`: `T`  } & `SetFormattingCommand` \| { `type`: `T`  } & `ClearFormattingCommand` \| { `type`: `T`  } & `SetBorderCommand` \| { `type`: `T`  } & `CreateChartCommand` \| { `type`: `T`  } & `UpdateChartCommand` \| { `type`: `T`  } & `RequestUndoCommand` \| { `type`: `T`  } & `RequestRedoCommand` \| { `type`: `T`  } & `UndoCommand` \| { `type`: `T`  } & `RedoCommand` \| { `type`: `T`  } & `NewInputCommand` \| { `type`: `T`  } & `RemoveInputCommand` \| { `type`: `T`  } & `UnfocusInputCommand` \| { `type`: `T`  } & `FocusInputCommand` \| { `type`: `T`  } & `AddEmptyRangeCommand` \| { `type`: `T`  } & `RemoveRangeCommand` \| { `type`: `T`  } & `ChangeRangeCommand` \| { `type`: `T`  } & `CopyCommand` \| { `type`: `T`  } & `CutCommand` \| { `type`: `T`  } & `PasteCommand` \| { `type`: `T`  } & `AutoFillCellCommand` \| { `type`: `T`  } & `PasteFromOSClipboardCommand` \| { `type`: `T`  } & `ActivatePaintFormatCommand` \| { `type`: `T`  } & `PasteCFCommand` \| { `type`: `T`  } & `AutoresizeColumnsCommand` \| { `type`: `T`  } & `AutoresizeRowsCommand` \| { `type`: `T`  } & `MoveColumnsRowsCommand` \| { `type`: `T`  } & `ActivateSheetCommand` \| { `type`: `T`  } & `PrepareExpansionCommand` \| { `type`: `T`  } & `StopSelectionCommand` \| { `type`: `T`  } & `EvaluateCellsCommand` \| { `type`: `T`  } & `ChangeHighlightCommand` \| { `type`: `T`  } & `StartChangeHighlightCommand` \| { `type`: `T`  } & `SetColorCommand` \| { `type`: `T`  } & `StopComposerSelectionCommand` \| { `type`: `T`  } & `StartEditionCommand` \| { `type`: `T`  } & `StopEditionCommand` \| { `type`: `T`  } & `SetCurrentContentCommand` \| { `type`: `T`  } & `ChangeComposerSelectionCommand` \| { `type`: `T`  } & `ReplaceComposerSelectionCommand` \| { `type`: `T`  } & `CycleEditionReferencesCommand` \| { `type`: `T`  } & `StartCommand` \| { `type`: `T`  } & `AutofillCommand` \| { `type`: `T`  } & `AutofillSelectCommand` \| { `type`: `T`  } & `ShowFormulaCommand` \| { `type`: `T`  } & `AutofillAutoCommand` \| { `type`: `T`  } & `SelectFigureCommand` \| { `type`: `T`  } & `UpdateSearchCommand` \| { `type`: `T`  } & `RefreshSearchCommand` \| { `type`: `T`  } & `ClearSearchCommand` \| { `type`: `T`  } & `SelectSearchPreviousCommand` \| { `type`: `T`  } & `SelectSearchNextCommand` \| { `type`: `T`  } & `ReplaceSearchCommand` \| { `type`: `T`  } & `ReplaceAllSearchCommand` \| { `type`: `T`  } & `SortCommand` \| { `type`: `T`  } & `ResizeViewportCommand` \| { `type`: `T`  } & `SumSelectionCommand` \| { `type`: `T`  } & `DeleteCellCommand` \| { `type`: `T`  } & `InsertCellCommand` \| { `type`: `T`  } & `SetViewportOffsetCommand` \| { `type`: `T`  } & `MoveViewportDownCommand` \| { `type`: `T`  } & `MoveViewportUpCommand` \| { `type`: `T`  } & `OpenCellPopoverCommand` \| { `type`: `T`  } & `CloseCellPopoverCommand` \| { `type`: `T`  } & `ActivateNextSheetCommand` \| { `type`: `T`  } & `ActivatePreviousSheetCommand` |

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
| `T` | extends ``"UPDATE_CELL"`` \| ``"UPDATE_CELL_POSITION"`` \| ``"CLEAR_CELL"`` \| ``"DELETE_CONTENT"`` \| ``"SET_DECIMAL"`` \| ``"ADD_COLUMNS_ROWS"`` \| ``"REMOVE_COLUMNS_ROWS"`` \| ``"RESIZE_COLUMNS_ROWS"`` \| ``"HIDE_COLUMNS_ROWS"`` \| ``"UNHIDE_COLUMNS_ROWS"`` \| ``"SET_GRID_LINES_VISIBILITY"`` \| ``"FREEZE_COLUMNS"`` \| ``"FREEZE_ROWS"`` \| ``"UNFREEZE_COLUMNS_ROWS"`` \| ``"UNFREEZE_COLUMNS"`` \| ``"UNFREEZE_ROWS"`` \| ``"ADD_MERGE"`` \| ``"REMOVE_MERGE"`` \| ``"CREATE_SHEET"`` \| ``"DELETE_SHEET"`` \| ``"DUPLICATE_SHEET"`` \| ``"MOVE_SHEET"`` \| ``"RENAME_SHEET"`` \| ``"HIDE_SHEET"`` \| ``"SHOW_SHEET"`` \| ``"MOVE_RANGES"`` \| ``"ADD_CONDITIONAL_FORMAT"`` \| ``"REMOVE_CONDITIONAL_FORMAT"`` \| ``"MOVE_CONDITIONAL_FORMAT"`` \| ``"CREATE_FIGURE"`` \| ``"DELETE_FIGURE"`` \| ``"UPDATE_FIGURE"`` \| ``"SET_FORMATTING"`` \| ``"CLEAR_FORMATTING"`` \| ``"SET_BORDER"`` \| ``"CREATE_CHART"`` \| ``"UPDATE_CHART"`` \| ``"REQUEST_UNDO"`` \| ``"REQUEST_REDO"`` \| ``"UNDO"`` \| ``"REDO"`` \| ``"ENABLE_NEW_SELECTION_INPUT"`` \| ``"DISABLE_SELECTION_INPUT"`` \| ``"UNFOCUS_SELECTION_INPUT"`` \| ``"FOCUS_RANGE"`` \| ``"ADD_EMPTY_RANGE"`` \| ``"REMOVE_RANGE"`` \| ``"CHANGE_RANGE"`` \| ``"COPY"`` \| ``"CUT"`` \| ``"PASTE"`` \| ``"AUTOFILL_CELL"`` \| ``"PASTE_FROM_OS_CLIPBOARD"`` \| ``"ACTIVATE_PAINT_FORMAT"`` \| ``"PASTE_CONDITIONAL_FORMAT"`` \| ``"AUTORESIZE_COLUMNS"`` \| ``"AUTORESIZE_ROWS"`` \| ``"MOVE_COLUMNS_ROWS"`` \| ``"ACTIVATE_SHEET"`` \| ``"PREPARE_SELECTION_INPUT_EXPANSION"`` \| ``"STOP_SELECTION_INPUT"`` \| ``"EVALUATE_CELLS"`` \| ``"CHANGE_HIGHLIGHT"`` \| ``"START_CHANGE_HIGHLIGHT"`` \| ``"SET_HIGHLIGHT_COLOR"`` \| ``"STOP_COMPOSER_RANGE_SELECTION"`` \| ``"START_EDITION"`` \| ``"STOP_EDITION"`` \| ``"SET_CURRENT_CONTENT"`` \| ``"CHANGE_COMPOSER_CURSOR_SELECTION"`` \| ``"REPLACE_COMPOSER_CURSOR_SELECTION"`` \| ``"CYCLE_EDITION_REFERENCES"`` \| ``"START"`` \| ``"AUTOFILL"`` \| ``"AUTOFILL_SELECT"`` \| ``"SET_FORMULA_VISIBILITY"`` \| ``"AUTOFILL_AUTO"`` \| ``"SELECT_FIGURE"`` \| ``"UPDATE_SEARCH"`` \|  ``"CLEAR_SEARCH"`` \| ``"SELECT_SEARCH_PREVIOUS_MATCH"`` \| ``"SELECT_SEARCH_NEXT_MATCH"`` \| ``"REPLACE_SEARCH"`` \| ``"REPLACE_ALL_SEARCH"`` \| ``"SORT_CELLS"`` \| ``"RESIZE_SHEETVIEW"`` \| ``"SUM_SELECTION"`` \| ``"DELETE_CELL"`` \| ``"INSERT_CELL"`` \| ``"SET_VIEWPORT_OFFSET"`` \| ``"SHIFT_VIEWPORT_DOWN"`` \| ``"SHIFT_VIEWPORT_UP"`` \| ``"OPEN_CELL_POPOVER"`` \| ``"CLOSE_CELL_POPOVER"`` \| ``"ACTIVATE_NEXT_SHEET"`` \| ``"ACTIVATE_PREVIOUS_SHEET"`` |
| `C` | extends { `type`: `T`  } & `UpdateCellCommand` \| { `type`: `T`  } & `UpdateCellPositionCommand` \| { `type`: `T`  } & `ClearCellCommand` \| { `type`: `T`  } & `DeleteContentCommand` \| { `type`: `T`  } & `SetDecimalCommand` \| { `type`: `T`  } & `AddColumnsRowsCommand` \| { `type`: `T`  } & `RemoveColumnsRowsCommand` \| { `type`: `T`  } & `ResizeColumnsRowsCommand` \| { `type`: `T`  } & `HideColumnsRowsCommand` \| { `type`: `T`  } & `UnhideColumnsRowsCommand` \| { `type`: `T`  } & `SetGridLinesVisibilityCommand` \| { `type`: `T`  } & `FreezeColumnsCommand` \| { `type`: `T`  } & `FreezeRowsCommand` \| { `type`: `T`  } & `UnfreezeColumnsRowsCommand` \| { `type`: `T`  } & `UnfreezeColumnsCommand` \| { `type`: `T`  } & `UnfreezeRowsCommand` \| { `type`: `T`  } & `AddMergeCommand` \| { `type`: `T`  } & `RemoveMergeCommand` \| { `type`: `T`  } & `CreateSheetCommand` \| { `type`: `T`  } & `DeleteSheetCommand` \| { `type`: `T`  } & `DuplicateSheetCommand` \| { `type`: `T`  } & `MoveSheetCommand` \| { `type`: `T`  } & `RenameSheetCommand` \| { `type`: `T`  } & `HideSheetCommand` \| { `type`: `T`  } & `ShowSheetCommand` \| { `type`: `T`  } & `MoveRangeCommand` \| { `type`: `T`  } & `AddConditionalFormatCommand` \| { `type`: `T`  } & `RemoveConditionalFormatCommand` \| { `type`: `T`  } & `MoveConditionalFormatCommand` \| { `type`: `T`  } & `CreateFigureCommand` \| { `type`: `T`  } & `DeleteFigureCommand` \| { `type`: `T`  } & `UpdateFigureCommand` \| { `type`: `T`  } & `SetFormattingCommand` \| { `type`: `T`  } & `ClearFormattingCommand` \| { `type`: `T`  } & `SetBorderCommand` \| { `type`: `T`  } & `CreateChartCommand` \| { `type`: `T`  } & `UpdateChartCommand` \| { `type`: `T`  } & `RequestUndoCommand` \| { `type`: `T`  } & `RequestRedoCommand` \| { `type`: `T`  } & `UndoCommand` \| { `type`: `T`  } & `RedoCommand` \| { `type`: `T`  } & `NewInputCommand` \| { `type`: `T`  } & `RemoveInputCommand` \| { `type`: `T`  } & `UnfocusInputCommand` \| { `type`: `T`  } & `FocusInputCommand` \| { `type`: `T`  } & `AddEmptyRangeCommand` \| { `type`: `T`  } & `RemoveRangeCommand` \| { `type`: `T`  } & `ChangeRangeCommand` \| { `type`: `T`  } & `CopyCommand` \| { `type`: `T`  } & `CutCommand` \| { `type`: `T`  } & `PasteCommand` \| { `type`: `T`  } & `AutoFillCellCommand` \| { `type`: `T`  } & `PasteFromOSClipboardCommand` \| { `type`: `T`  } & `ActivatePaintFormatCommand` \| { `type`: `T`  } & `PasteCFCommand` \| { `type`: `T`  } & `AutoresizeColumnsCommand` \| { `type`: `T`  } & `AutoresizeRowsCommand` \| { `type`: `T`  } & `MoveColumnsRowsCommand` \| { `type`: `T`  } & `ActivateSheetCommand` \| { `type`: `T`  } & `PrepareExpansionCommand` \| { `type`: `T`  } & `StopSelectionCommand` \| { `type`: `T`  } & `EvaluateCellsCommand` \| { `type`: `T`  } & `ChangeHighlightCommand` \| { `type`: `T`  } & `StartChangeHighlightCommand` \| { `type`: `T`  } & `SetColorCommand` \| { `type`: `T`  } & `StopComposerSelectionCommand` \| { `type`: `T`  } & `StartEditionCommand` \| { `type`: `T`  } & `StopEditionCommand` \| { `type`: `T`  } & `SetCurrentContentCommand` \| { `type`: `T`  } & `ChangeComposerSelectionCommand` \| { `type`: `T`  } & `ReplaceComposerSelectionCommand` \| { `type`: `T`  } & `CycleEditionReferencesCommand` \| { `type`: `T`  } & `StartCommand` \| { `type`: `T`  } & `AutofillCommand` \| { `type`: `T`  } & `AutofillSelectCommand` \| { `type`: `T`  } & `ShowFormulaCommand` \| { `type`: `T`  } & `AutofillAutoCommand` \| { `type`: `T`  } & `SelectFigureCommand` \| { `type`: `T`  } & `UpdateSearchCommand` \| { `type`: `T`  } & `RefreshSearchCommand` \| { `type`: `T`  } & `ClearSearchCommand` \| { `type`: `T`  } & `SelectSearchPreviousCommand` \| { `type`: `T`  } & `SelectSearchNextCommand` \| { `type`: `T`  } & `ReplaceSearchCommand` \| { `type`: `T`  } & `ReplaceAllSearchCommand` \| { `type`: `T`  } & `SortCommand` \| { `type`: `T`  } & `ResizeViewportCommand` \| { `type`: `T`  } & `SumSelectionCommand` \| { `type`: `T`  } & `DeleteCellCommand` \| { `type`: `T`  } & `InsertCellCommand` \| { `type`: `T`  } & `SetViewportOffsetCommand` \| { `type`: `T`  } & `MoveViewportDownCommand` \| { `type`: `T`  } & `MoveViewportUpCommand` \| { `type`: `T`  } & `OpenCellPopoverCommand` \| { `type`: `T`  } & `CloseCellPopoverCommand` \| { `type`: `T`  } & `ActivateNextSheetCommand` \| { `type`: `T`  } & `ActivatePreviousSheetCommand` |

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

• `Protected` **getters**: `Getters`

___

### history

• `Protected` **history**: `WorkbookHistory`<`State`\>

#### Inherited from

BasePlugin.history

___

### selection

• `Protected` **selection**: `SelectionStreamProcessor`

___

### ui

• `Protected` **ui**: `UIActions`

___

### getters

▪ `Static` **getters**: readonly `string`[] = `[]`

#### Inherited from

BasePlugin.getters

___

### layers

▪ `Static` **layers**: `LAYERS`[] = `[]`

## Methods

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

### drawGrid

▸ **drawGrid**(`ctx`, `layer`): `void`

#### Parameters

| Name | Type |
| :------ | :------ |
| `ctx` | `GridRenderingContext` |
| `layer` | `LAYERS` |

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
