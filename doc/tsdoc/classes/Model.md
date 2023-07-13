[o-spreadsheet API](../README.md) / Model

# Class: Model

## Hierarchy

- `EventBus`<`any`\>

  ↳ **`Model`**

## Implements

- `CommandDispatcher`

## Table of contents

### Constructors

- [constructor](Model.md#constructor)

### Properties

- [dispatch](Model.md#dispatch)
- [getters](Model.md#getters)
- [selection](Model.md#selection)
- [subscriptions](Model.md#subscriptions)
- [uuidGenerator](Model.md#uuidgenerator)

### Accessors

- [handlers](Model.md#handlers)

### Methods

- [clear](Model.md#clear)
- [drawGrid](Model.md#drawgrid)
- [exportData](Model.md#exportdata)
- [exportXLSX](Model.md#exportxlsx)
- [joinSession](Model.md#joinsession)
- [leaveSession](Model.md#leavesession)
- [off](Model.md#off)
- [on](Model.md#on)
- [trigger](Model.md#trigger)
- [updateMode](Model.md#updatemode)

## Constructors

### constructor

• **new Model**(`data?`, `config?`, `stateUpdateMessages?`, `uuidGenerator?`, `verboseImport?`)

#### Parameters

| Name | Type | Default value |
| :------ | :------ | :------ |
| `data` | `any` | `{}` |
| `config` | `Partial`<`ModelConfig`\> | `{}` |
| `stateUpdateMessages` | `StateUpdateMessage`[] | `[]` |
| `uuidGenerator` | `UuidGenerator` | `undefined` |
| `verboseImport` | `boolean` | `true` |

#### Overrides

EventBus&lt;any\&gt;.constructor

## Properties

### dispatch

• **dispatch**: <T, C\>(`type`: {} extends `Omit`<`C`, ``"type"``\> ? `T` : `never`) => [`DispatchResult`](DispatchResult.md)<T, C\>(`type`: `T`, `r`: `Omit`<`C`, ``"type"``\>) => [`DispatchResult`](DispatchResult.md)

#### Type declaration

▸ <`T`, `C`\>(`type`): [`DispatchResult`](DispatchResult.md)

The dispatch method is the only entry point to manipulate data in the model.
This is through this method that commands are dispatched most of the time
recursively until no plugin want to react anymore.

CoreCommands dispatched from this function are saved in the history.

Small technical detail: it is defined as an arrow function.  There are two
reasons for this:
1. this means that the dispatch method can be "detached" from the model,
   which is done when it is put in the environment (see the Spreadsheet
   component)
2. This allows us to define its type by using the interface CommandDispatcher

##### Type parameters

| Name | Type |
| :------ | :------ |
| `T` | extends ``"UPDATE_CELL"`` \| ``"UPDATE_CELL_POSITION"`` \| ``"CLEAR_CELL"`` \| ``"DELETE_CONTENT"`` \| ``"SET_DECIMAL"`` \| ``"ADD_COLUMNS_ROWS"`` \| ``"REMOVE_COLUMNS_ROWS"`` \| ``"RESIZE_COLUMNS_ROWS"`` \| ``"HIDE_COLUMNS_ROWS"`` \| ``"UNHIDE_COLUMNS_ROWS"`` \| ``"SET_GRID_LINES_VISIBILITY"`` \| ``"FREEZE_COLUMNS"`` \| ``"FREEZE_ROWS"`` \| ``"UNFREEZE_COLUMNS_ROWS"`` \| ``"UNFREEZE_COLUMNS"`` \| ``"UNFREEZE_ROWS"`` \| ``"ADD_MERGE"`` \| ``"REMOVE_MERGE"`` \| ``"CREATE_SHEET"`` \| ``"DELETE_SHEET"`` \| ``"DUPLICATE_SHEET"`` \| ``"MOVE_SHEET"`` \| ``"RENAME_SHEET"`` \| ``"HIDE_SHEET"`` \| ``"SHOW_SHEET"`` \| ``"MOVE_RANGES"`` \| ``"ADD_CONDITIONAL_FORMAT"`` \| ``"REMOVE_CONDITIONAL_FORMAT"`` \| ``"MOVE_CONDITIONAL_FORMAT"`` \| ``"CREATE_FIGURE"`` \| ``"DELETE_FIGURE"`` \| ``"UPDATE_FIGURE"`` \| ``"SET_FORMATTING"`` \| ``"CLEAR_FORMATTING"`` \| ``"SET_BORDER"`` \| ``"CREATE_CHART"`` \| ``"UPDATE_CHART"`` \| ``"REQUEST_UNDO"`` \| ``"REQUEST_REDO"`` \| ``"UNDO"`` \| ``"REDO"`` \| ``"ENABLE_NEW_SELECTION_INPUT"`` \| ``"DISABLE_SELECTION_INPUT"`` \| ``"UNFOCUS_SELECTION_INPUT"`` \| ``"FOCUS_RANGE"`` \| ``"ADD_EMPTY_RANGE"`` \| ``"REMOVE_RANGE"`` \| ``"CHANGE_RANGE"`` \| ``"COPY"`` \| ``"CUT"`` \| ``"PASTE"`` \| ``"AUTOFILL_CELL"`` \| ``"PASTE_FROM_OS_CLIPBOARD"`` \| ``"ACTIVATE_PAINT_FORMAT"`` \| ``"PASTE_CONDITIONAL_FORMAT"`` \| ``"AUTORESIZE_COLUMNS"`` \| ``"AUTORESIZE_ROWS"`` \| ``"MOVE_COLUMNS_ROWS"`` \| ``"ACTIVATE_SHEET"`` \| ``"PREPARE_SELECTION_INPUT_EXPANSION"`` \| ``"STOP_SELECTION_INPUT"`` \| ``"EVALUATE_CELLS"`` \| ``"CHANGE_HIGHLIGHT"`` \| ``"START_CHANGE_HIGHLIGHT"`` \| ``"SET_HIGHLIGHT_COLOR"`` \| ``"STOP_COMPOSER_RANGE_SELECTION"`` \| ``"START_EDITION"`` \| ``"STOP_EDITION"`` \| ``"SET_CURRENT_CONTENT"`` \| ``"CHANGE_COMPOSER_CURSOR_SELECTION"`` \| ``"REPLACE_COMPOSER_CURSOR_SELECTION"`` \| ``"CYCLE_EDITION_REFERENCES"`` \| ``"START"`` \| ``"AUTOFILL"`` \| ``"AUTOFILL_SELECT"`` \| ``"SET_FORMULA_VISIBILITY"`` \| ``"AUTOFILL_AUTO"`` \| ``"SELECT_FIGURE"`` \| ``"UPDATE_SEARCH"`` \|  ``"CLEAR_SEARCH"`` \| ``"SELECT_SEARCH_PREVIOUS_MATCH"`` \| ``"SELECT_SEARCH_NEXT_MATCH"`` \| ``"REPLACE_SEARCH"`` \| ``"REPLACE_ALL_SEARCH"`` \| ``"SORT_CELLS"`` \| ``"RESIZE_SHEETVIEW"`` \| ``"SUM_SELECTION"`` \| ``"DELETE_CELL"`` \| ``"INSERT_CELL"`` \| ``"SET_VIEWPORT_OFFSET"`` \| ``"SHIFT_VIEWPORT_DOWN"`` \| ``"SHIFT_VIEWPORT_UP"`` \| ``"OPEN_CELL_POPOVER"`` \| ``"CLOSE_CELL_POPOVER"`` \| ``"ACTIVATE_NEXT_SHEET"`` \| ``"ACTIVATE_PREVIOUS_SHEET"`` |
| `C` | extends { `type`: `T`  } & `UpdateCellCommand` \| { `type`: `T`  } & `UpdateCellPositionCommand` \| { `type`: `T`  } & `ClearCellCommand` \| { `type`: `T`  } & `DeleteContentCommand` \| { `type`: `T`  } & `SetDecimalCommand` \| { `type`: `T`  } & `AddColumnsRowsCommand` \| { `type`: `T`  } & `RemoveColumnsRowsCommand` \| { `type`: `T`  } & `ResizeColumnsRowsCommand` \| { `type`: `T`  } & `HideColumnsRowsCommand` \| { `type`: `T`  } & `UnhideColumnsRowsCommand` \| { `type`: `T`  } & `SetGridLinesVisibilityCommand` \| { `type`: `T`  } & `FreezeColumnsCommand` \| { `type`: `T`  } & `FreezeRowsCommand` \| { `type`: `T`  } & `UnfreezeColumnsRowsCommand` \| { `type`: `T`  } & `UnfreezeColumnsCommand` \| { `type`: `T`  } & `UnfreezeRowsCommand` \| { `type`: `T`  } & `AddMergeCommand` \| { `type`: `T`  } & `RemoveMergeCommand` \| { `type`: `T`  } & `CreateSheetCommand` \| { `type`: `T`  } & `DeleteSheetCommand` \| { `type`: `T`  } & `DuplicateSheetCommand` \| { `type`: `T`  } & `MoveSheetCommand` \| { `type`: `T`  } & `RenameSheetCommand` \| { `type`: `T`  } & `HideSheetCommand` \| { `type`: `T`  } & `ShowSheetCommand` \| { `type`: `T`  } & `MoveRangeCommand` \| { `type`: `T`  } & `AddConditionalFormatCommand` \| { `type`: `T`  } & `RemoveConditionalFormatCommand` \| { `type`: `T`  } & `MoveConditionalFormatCommand` \| { `type`: `T`  } & `CreateFigureCommand` \| { `type`: `T`  } & `DeleteFigureCommand` \| { `type`: `T`  } & `UpdateFigureCommand` \| { `type`: `T`  } & `SetFormattingCommand` \| { `type`: `T`  } & `ClearFormattingCommand` \| { `type`: `T`  } & `SetBorderCommand` \| { `type`: `T`  } & `CreateChartCommand` \| { `type`: `T`  } & `UpdateChartCommand` \| { `type`: `T`  } & `RequestUndoCommand` \| { `type`: `T`  } & `RequestRedoCommand` \| { `type`: `T`  } & `UndoCommand` \| { `type`: `T`  } & `RedoCommand` \| { `type`: `T`  } & `NewInputCommand` \| { `type`: `T`  } & `RemoveInputCommand` \| { `type`: `T`  } & `UnfocusInputCommand` \| { `type`: `T`  } & `FocusInputCommand` \| { `type`: `T`  } & `AddEmptyRangeCommand` \| { `type`: `T`  } & `RemoveRangeCommand` \| { `type`: `T`  } & `ChangeRangeCommand` \| { `type`: `T`  } & `CopyCommand` \| { `type`: `T`  } & `CutCommand` \| { `type`: `T`  } & `PasteCommand` \| { `type`: `T`  } & `AutoFillCellCommand` \| { `type`: `T`  } & `PasteFromOSClipboardCommand` \| { `type`: `T`  } & `ActivatePaintFormatCommand` \| { `type`: `T`  } & `PasteCFCommand` \| { `type`: `T`  } & `AutoresizeColumnsCommand` \| { `type`: `T`  } & `AutoresizeRowsCommand` \| { `type`: `T`  } & `MoveColumnsRowsCommand` \| { `type`: `T`  } & `ActivateSheetCommand` \| { `type`: `T`  } & `PrepareExpansionCommand` \| { `type`: `T`  } & `StopSelectionCommand` \| { `type`: `T`  } & `EvaluateCellsCommand` \| { `type`: `T`  } & `ChangeHighlightCommand` \| { `type`: `T`  } & `StartChangeHighlightCommand` \| { `type`: `T`  } & `SetColorCommand` \| { `type`: `T`  } & `StopComposerSelectionCommand` \| { `type`: `T`  } & `StartEditionCommand` \| { `type`: `T`  } & `StopEditionCommand` \| { `type`: `T`  } & `SetCurrentContentCommand` \| { `type`: `T`  } & `ChangeComposerSelectionCommand` \| { `type`: `T`  } & `ReplaceComposerSelectionCommand` \| { `type`: `T`  } & `CycleEditionReferencesCommand` \| { `type`: `T`  } & `StartCommand` \| { `type`: `T`  } & `AutofillCommand` \| { `type`: `T`  } & `AutofillSelectCommand` \| { `type`: `T`  } & `ShowFormulaCommand` \| { `type`: `T`  } & `AutofillAutoCommand` \| { `type`: `T`  } & `SelectFigureCommand` \| { `type`: `T`  } & `UpdateSearchCommand` \| { `type`: `T`  } & `RefreshSearchCommand` \| { `type`: `T`  } & `ClearSearchCommand` \| { `type`: `T`  } & `SelectSearchPreviousCommand` \| { `type`: `T`  } & `SelectSearchNextCommand` \| { `type`: `T`  } & `ReplaceSearchCommand` \| { `type`: `T`  } & `ReplaceAllSearchCommand` \| { `type`: `T`  } & `SortCommand` \| { `type`: `T`  } & `ResizeViewportCommand` \| { `type`: `T`  } & `SumSelectionCommand` \| { `type`: `T`  } & `DeleteCellCommand` \| { `type`: `T`  } & `InsertCellCommand` \| { `type`: `T`  } & `SetViewportOffsetCommand` \| { `type`: `T`  } & `MoveViewportDownCommand` \| { `type`: `T`  } & `MoveViewportUpCommand` \| { `type`: `T`  } & `OpenCellPopoverCommand` \| { `type`: `T`  } & `CloseCellPopoverCommand` \| { `type`: `T`  } & `ActivateNextSheetCommand` \| { `type`: `T`  } & `ActivatePreviousSheetCommand` |

##### Parameters

| Name | Type |
| :------ | :------ |
| `type` | {} extends `Omit`<`C`, ``"type"``\> ? `T` : `never` |

##### Returns

[`DispatchResult`](DispatchResult.md)

▸ <`T`, `C`\>(`type`, `r`): [`DispatchResult`](DispatchResult.md)

The dispatch method is the only entry point to manipulate data in the model.
This is through this method that commands are dispatched most of the time
recursively until no plugin want to react anymore.

CoreCommands dispatched from this function are saved in the history.

Small technical detail: it is defined as an arrow function.  There are two
reasons for this:
1. this means that the dispatch method can be "detached" from the model,
   which is done when it is put in the environment (see the Spreadsheet
   component)
2. This allows us to define its type by using the interface CommandDispatcher

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

#### Implementation of

CommandDispatcher.dispatch

___

### getters

• **getters**: `Getters`

Getters are the main way the rest of the UI read data from the model. Also,
it is shared between all plugins, so they can also communicate with each
other.

___

### selection

• `Readonly` **selection**: `SelectionStreamProcessor`

___

### subscriptions

• **subscriptions**: `Object` = `{}`

#### Index signature

▪ [eventType: `string`]: `Subscription`[]

#### Inherited from

EventBus.subscriptions

___

### uuidGenerator

• **uuidGenerator**: `UuidGenerator`

## Accessors

### handlers

• `get` **handlers**(): `CommandHandler`<`Command`\>[]

#### Returns

`CommandHandler`<`Command`\>[]

## Methods

### clear

▸ **clear**(): `void`

Remove all subscriptions.

#### Returns

`void`

#### Inherited from

EventBus.clear

___

### drawGrid

▸ **drawGrid**(`context`): `void`

When the Grid component is ready (= mounted), it has a reference to its
canvas and need to draw the grid on it.  This is then done by calling this
method, which will dispatch the call to all registered plugins.

Note that nothing prevent multiple grid components from calling this method
each, or one grid component calling it multiple times with a different
context. This is probably the way we should do if we want to be able to
freeze a part of the grid (so, we would need to render different zones)

#### Parameters

| Name | Type |
| :------ | :------ |
| `context` | `GridRenderingContext` |

#### Returns

`void`

___

### exportData

▸ **exportData**(): `WorkbookData`

As the name of this method strongly implies, it is useful when we need to
export date out of the model.

#### Returns

`WorkbookData`

___

### exportXLSX

▸ **exportXLSX**(): `XLSXExport`

Exports the current model data into a list of serialized XML files
to be zipped together as an *.xlsx file.

We need to trigger a cell revaluation  on every sheet and ensure that even
async functions are evaluated.
This prove to be necessary if the client did not trigger that evaluation in the first place
(e.g. open a document with several sheet and click on download before visiting each sheet)

#### Returns

`XLSXExport`

___

### joinSession

▸ **joinSession**(): `void`

#### Returns

`void`

___

### leaveSession

▸ **leaveSession**(): `void`

#### Returns

`void`

___

### off

▸ **off**<`T`\>(`eventType`, `owner`): `void`

Remove a listener

#### Type parameters

| Name | Type |
| :------ | :------ |
| `T` | extends `any` |

#### Parameters

| Name | Type |
| :------ | :------ |
| `eventType` | `T` |
| `owner` | `any` |

#### Returns

`void`

#### Inherited from

EventBus.off

___

### on

▸ **on**<`T`, `E`\>(`type`, `owner`, `callback`): `void`

Add a listener for the 'eventType' events.

Note that the 'owner' of this event can be anything, but will more likely
be a component or a class. The idea is that the callback will be called with
the proper owner bound.

Also, the owner should be kind of unique. This will be used to remove the
listener.

#### Type parameters

| Name | Type |
| :------ | :------ |
| `T` | extends `any` |
| `E` | extends `any` |

#### Parameters

| Name | Type |
| :------ | :------ |
| `type` | `T` |
| `owner` | `any` |
| `callback` | (`r`: `Omit`<`E`, ``"type"``\>) => `void` |

#### Returns

`void`

#### Inherited from

EventBus.on

___

### trigger

▸ **trigger**<`T`, `E`\>(`type`, `payload?`): `void`

Emit an event of type 'eventType'.  Any extra arguments will be passed to
the listeners callback.

#### Type parameters

| Name | Type |
| :------ | :------ |
| `T` | extends `any` |
| `E` | extends `any` |

#### Parameters

| Name | Type |
| :------ | :------ |
| `type` | `T` |
| `payload?` | `Omit`<`E`, ``"type"``\> |

#### Returns

`void`

#### Inherited from

EventBus.trigger

___

### updateMode

▸ **updateMode**(`mode`): `void`

#### Parameters

| Name | Type |
| :------ | :------ |
| `mode` | `Mode` |

#### Returns

`void`
