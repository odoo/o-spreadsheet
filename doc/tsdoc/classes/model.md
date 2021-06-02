[o-spreadsheet API](../README.md) / Model

# Class: Model

## Hierarchy

* *EventBus*

  ↳ **Model**

## Implements

* *CommandDispatcher*

## Table of contents

### Constructors

- [constructor](model.md#constructor)

### Properties

- [dispatch](model.md#dispatch)
- [getters](model.md#getters)

### Accessors

- [handlers](model.md#handlers)

### Methods

- [destroy](model.md#destroy)
- [drawGrid](model.md#drawgrid)
- [exportData](model.md#exportdata)
- [exportXLSX](model.md#exportxlsx)
- [leaveSession](model.md#leavesession)
- [updateReadOnly](model.md#updatereadonly)
- [waitForIdle](model.md#waitforidle)

## Constructors

### constructor

\+ **new Model**(`data?`: *any*, `config?`: *Partial*<ModelConfig\>, `stateUpdateMessages?`: ([*RevisionUndoneMessage*](../interfaces/revisionundonemessage.md) \| [*RevisionRedoneMessage*](../interfaces/revisionredonemessage.md) \| [*RemoteRevisionMessage*](../interfaces/remoterevisionmessage.md) \| SnapshotMessage \| SnapshotCreatedMessage)[]): [*Model*](model.md)

#### Parameters:

Name | Type |
:------ | :------ |
`data` | *any* |
`config` | *Partial*<ModelConfig\> |
`stateUpdateMessages` | ([*RevisionUndoneMessage*](../interfaces/revisionundonemessage.md) \| [*RevisionRedoneMessage*](../interfaces/revisionredonemessage.md) \| [*RemoteRevisionMessage*](../interfaces/remoterevisionmessage.md) \| SnapshotMessage \| SnapshotCreatedMessage)[] |

**Returns:** [*Model*](model.md)

## Properties

### dispatch

• **dispatch**: <T, C\>(`type`: {} *extends* *Pick*<C, Exclude<keyof C, *type*\>\> ? T : *never*) => [*CommandResult*](../enums/commandresult.md)<T, C\>(`type`: T, `r`: *Pick*<C, Exclude<keyof C, *type*\>\>) => [*CommandResult*](../enums/commandresult.md)

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

#### Type declaration:

▸ <T, C\>(`type`: {} *extends* *Pick*<C, Exclude<keyof C, *type*\>\> ? T : *never*): [*CommandResult*](../enums/commandresult.md)

#### Type parameters:

Name | Type |
:------ | :------ |
`T` | *UPDATE_CELL* \| *UPDATE_CELL_POSITION* \| *CLEAR_CELL* \| *DELETE_CONTENT* \| *SET_DECIMAL* \| *ADD_COLUMNS_ROWS* \| *REMOVE_COLUMNS_ROWS* \| *RESIZE_COLUMNS_ROWS* \| *HIDE_COLUMNS_ROWS* \| *UNHIDE_COLUMNS_ROWS* \| *SET_GRID_LINES_VISIBILITY* \| *ADD_MERGE* \| *REMOVE_MERGE* \| *CREATE_SHEET* \| *DELETE_SHEET* \| *DUPLICATE_SHEET* \| *MOVE_SHEET* \| *RENAME_SHEET* \| *ADD_CONDITIONAL_FORMAT* \| *REMOVE_CONDITIONAL_FORMAT* \| *CREATE_FIGURE* \| *DELETE_FIGURE* \| *UPDATE_FIGURE* \| *SET_FORMATTING* \| *CLEAR_FORMATTING* \| *SET_BORDER* \| *CREATE_CHART* \| *UPDATE_CHART* \| *REQUEST_UNDO* \| *REQUEST_REDO* \| *UNDO* \| *REDO* \| *ENABLE_NEW_SELECTION_INPUT* \| *DISABLE_SELECTION_INPUT* \| *FOCUS_RANGE* \| *ADD_EMPTY_RANGE* \| *REMOVE_RANGE* \| *CHANGE_RANGE* \| *COPY* \| *CUT* \| *PASTE* \| *CUT_AND_PASTE* \| *AUTOFILL_CELL* \| *PASTE_FROM_OS_CLIPBOARD* \| *ACTIVATE_PAINT_FORMAT* \| *PASTE_CONDITIONAL_FORMAT* \| *AUTORESIZE_COLUMNS* \| *AUTORESIZE_ROWS* \| *MOVE_POSITION* \| *DELETE_SHEET_CONFIRMATION* \| *ACTIVATE_SHEET* \| *START_SELECTION* \| *START_SELECTION_EXPANSION* \| *PREPARE_SELECTION_EXPANSION* \| *STOP_SELECTION* \| *SELECT_CELL* \| *SET_SELECTION* \| *SELECT_COLUMN* \| *SELECT_ROW* \| *SELECT_ALL* \| *ALTER_SELECTION* \| *EVALUATE_CELLS* \| *ADD_HIGHLIGHTS* \| *REMOVE_HIGHLIGHTS* \| *REMOVE_ALL_HIGHLIGHTS* \| *HIGHLIGHT_SELECTION* \| *ADD_PENDING_HIGHLIGHTS* \| *RESET_PENDING_HIGHLIGHT* \| *SET_HIGHLIGHT_COLOR* \| *STOP_COMPOSER_RANGE_SELECTION* \| *START_EDITION* \| *STOP_EDITION* \| *SET_CURRENT_CONTENT* \| *CHANGE_COMPOSER_CURSOR_SELECTION* \| *REPLACE_COMPOSER_CURSOR_SELECTION* \| *START* \| *AUTOFILL* \| *AUTOFILL_SELECT* \| *SET_FORMULA_VISIBILITY* \| *AUTOFILL_AUTO* \| *SELECT_FIGURE* \| *UPDATE_SEARCH* \| *REFRESH_SEARCH* \| *CLEAR_SEARCH* \| *SELECT_SEARCH_PREVIOUS_MATCH* \| *SELECT_SEARCH_NEXT_MATCH* \| *REPLACE_SEARCH* \| *REPLACE_ALL_SEARCH* \| *SORT_CELLS* \| *RESIZE_VIEWPORT* \| *REFRESH_CHART* \| *SUM_SELECTION* \| *DELETE_CELL* \| *INSERT_CELL* \| *SET_VIEWPORT_OFFSET* \| *EVALUATE_ALL_SHEETS* |
`C` | { `type`: T  } & UpdateCellCommand \| { `type`: T  } & UpdateCellPositionCommand \| { `type`: T  } & ClearCellCommand \| { `type`: T  } & DeleteContentCommand \| { `type`: T  } & SetDecimalCommand \| { `type`: T  } & AddColumnsRowsCommand \| { `type`: T  } & RemoveColumnsRowsCommand \| { `type`: T  } & ResizeColumnsRowsCommand \| { `type`: T  } & HideColumnsRowsCommand \| { `type`: T  } & UnhideColumnsRowsCommand \| { `type`: T  } & SetGridLinesVisibilityCommand \| { `type`: T  } & AddMergeCommand \| { `type`: T  } & RemoveMergeCommand \| { `type`: T  } & CreateSheetCommand \| { `type`: T  } & DeleteSheetCommand \| { `type`: T  } & DuplicateSheetCommand \| { `type`: T  } & MoveSheetCommand \| { `type`: T  } & RenameSheetCommand \| { `type`: T  } & AddConditionalFormatCommand \| { `type`: T  } & RemoveConditionalFormatCommand \| { `type`: T  } & CreateFigureCommand \| { `type`: T  } & DeleteFigureCommand \| { `type`: T  } & *UpdateFigureCommand* \| { `type`: T  } & SetFormattingCommand \| { `type`: T  } & ClearFormattingCommand \| { `type`: T  } & SetBorderCommand \| { `type`: T  } & CreateChartCommand \| { `type`: T  } & UpdateChartCommand \| { `type`: T  } & RequestUndoCommand \| { `type`: T  } & RequestRedoCommand \| { `type`: T  } & UndoCommand \| { `type`: T  } & RedoCommand \| { `type`: T  } & NewInputCommand \| { `type`: T  } & RemoveInputCommand \| { `type`: T  } & FocusInputCommand \| { `type`: T  } & AddEmptyRangeCommand \| { `type`: T  } & RemoveRangeCommand \| { `type`: T  } & ChangeRangeCommand \| { `type`: T  } & CopyCommand \| { `type`: T  } & CutCommand \| { `type`: T  } & PasteCommand \| { `type`: T  } & CutAndPasteCommand \| { `type`: T  } & AutoFillCellCommand \| { `type`: T  } & PasteFromOSClipboardCommand \| { `type`: T  } & ActivatePaintFormatCommand \| { `type`: T  } & PasteCFCommand \| { `type`: T  } & AutoresizeColumnsCommand \| { `type`: T  } & AutoresizeRowsCommand \| { `type`: T  } & MovePositionCommand \| { `type`: T  } & DeleteSheetConfirmationCommand \| { `type`: T  } & ActivateSheetCommand \| { `type`: T  } & StartSelectionCommand \| { `type`: T  } & StartExpansionCommand \| { `type`: T  } & PrepareExpansionCommand \| { `type`: T  } & StopSelectionCommand \| { `type`: T  } & SelectCellCommand \| { `type`: T  } & SetSelectionCommand \| { `type`: T  } & SelectColumnCommand \| { `type`: T  } & SelectRowCommand \| { `type`: T  } & SelectAllCommand \| { `type`: T  } & AlterSelectionCommand \| { `type`: T  } & EvaluateCellsCommand \| { `type`: T  } & AddHighlightsCommand \| { `type`: T  } & RemoveHighlightsCommand \| { `type`: T  } & RemoveAllHighlightsCommand \| { `type`: T  } & HighlightSelectionCommand \| { `type`: T  } & AddPendingHighlightCommand \| { `type`: T  } & ResetPendingHighlightCommand \| { `type`: T  } & SetColorCommand \| { `type`: T  } & StopComposerSelectionCommand \| { `type`: T  } & StartEditionCommand \| { `type`: T  } & StopEditionCommand \| { `type`: T  } & SetCurrentContentCommand \| { `type`: T  } & ChangeComposerSelectionCommand \| { `type`: T  } & ReplaceComposerSelectionCommand \| { `type`: T  } & StartCommand \| { `type`: T  } & AutofillCommand \| { `type`: T  } & AutofillSelectCommand \| { `type`: T  } & ShowFormulaCommand \| { `type`: T  } & AutofillAutoCommand \| { `type`: T  } & SelectFigureCommand \| { `type`: T  } & UpdateSearchCommand \| { `type`: T  } & RefreshSearchCommand \| { `type`: T  } & ClearSearchCommand \| { `type`: T  } & SelectSearchPreviousCommand \| { `type`: T  } & SelectSearchNextCommand \| { `type`: T  } & ReplaceSearchCommand \| { `type`: T  } & ReplaceAllSearchCommand \| { `type`: T  } & SortCommand \| { `type`: T  } & ResizeViewportCommand \| { `type`: T  } & RefreshChartCommand \| { `type`: T  } & SumSelectionCommand \| { `type`: T  } & DeleteCellCommand \| { `type`: T  } & InsertCellCommand \| { `type`: T  } & SetViewportOffsetCommand \| { `type`: T  } & EvaluateAllSheetsCommand |

#### Parameters:

Name | Type |
:------ | :------ |
`type` | {} *extends* *Pick*<C, Exclude<keyof C, *type*\>\> ? T : *never* |

**Returns:** [*CommandResult*](../enums/commandresult.md)

▸ <T, C\>(`type`: T, `r`: *Pick*<C, Exclude<keyof C, *type*\>\>): [*CommandResult*](../enums/commandresult.md)

#### Type parameters:

Name | Type |
:------ | :------ |
`T` | *UPDATE_CELL* \| *UPDATE_CELL_POSITION* \| *CLEAR_CELL* \| *DELETE_CONTENT* \| *SET_DECIMAL* \| *ADD_COLUMNS_ROWS* \| *REMOVE_COLUMNS_ROWS* \| *RESIZE_COLUMNS_ROWS* \| *HIDE_COLUMNS_ROWS* \| *UNHIDE_COLUMNS_ROWS* \| *SET_GRID_LINES_VISIBILITY* \| *ADD_MERGE* \| *REMOVE_MERGE* \| *CREATE_SHEET* \| *DELETE_SHEET* \| *DUPLICATE_SHEET* \| *MOVE_SHEET* \| *RENAME_SHEET* \| *ADD_CONDITIONAL_FORMAT* \| *REMOVE_CONDITIONAL_FORMAT* \| *CREATE_FIGURE* \| *DELETE_FIGURE* \| *UPDATE_FIGURE* \| *SET_FORMATTING* \| *CLEAR_FORMATTING* \| *SET_BORDER* \| *CREATE_CHART* \| *UPDATE_CHART* \| *REQUEST_UNDO* \| *REQUEST_REDO* \| *UNDO* \| *REDO* \| *ENABLE_NEW_SELECTION_INPUT* \| *DISABLE_SELECTION_INPUT* \| *FOCUS_RANGE* \| *ADD_EMPTY_RANGE* \| *REMOVE_RANGE* \| *CHANGE_RANGE* \| *COPY* \| *CUT* \| *PASTE* \| *CUT_AND_PASTE* \| *AUTOFILL_CELL* \| *PASTE_FROM_OS_CLIPBOARD* \| *ACTIVATE_PAINT_FORMAT* \| *PASTE_CONDITIONAL_FORMAT* \| *AUTORESIZE_COLUMNS* \| *AUTORESIZE_ROWS* \| *MOVE_POSITION* \| *DELETE_SHEET_CONFIRMATION* \| *ACTIVATE_SHEET* \| *START_SELECTION* \| *START_SELECTION_EXPANSION* \| *PREPARE_SELECTION_EXPANSION* \| *STOP_SELECTION* \| *SELECT_CELL* \| *SET_SELECTION* \| *SELECT_COLUMN* \| *SELECT_ROW* \| *SELECT_ALL* \| *ALTER_SELECTION* \| *EVALUATE_CELLS* \| *ADD_HIGHLIGHTS* \| *REMOVE_HIGHLIGHTS* \| *REMOVE_ALL_HIGHLIGHTS* \| *HIGHLIGHT_SELECTION* \| *ADD_PENDING_HIGHLIGHTS* \| *RESET_PENDING_HIGHLIGHT* \| *SET_HIGHLIGHT_COLOR* \| *STOP_COMPOSER_RANGE_SELECTION* \| *START_EDITION* \| *STOP_EDITION* \| *SET_CURRENT_CONTENT* \| *CHANGE_COMPOSER_CURSOR_SELECTION* \| *REPLACE_COMPOSER_CURSOR_SELECTION* \| *START* \| *AUTOFILL* \| *AUTOFILL_SELECT* \| *SET_FORMULA_VISIBILITY* \| *AUTOFILL_AUTO* \| *SELECT_FIGURE* \| *UPDATE_SEARCH* \| *REFRESH_SEARCH* \| *CLEAR_SEARCH* \| *SELECT_SEARCH_PREVIOUS_MATCH* \| *SELECT_SEARCH_NEXT_MATCH* \| *REPLACE_SEARCH* \| *REPLACE_ALL_SEARCH* \| *SORT_CELLS* \| *RESIZE_VIEWPORT* \| *REFRESH_CHART* \| *SUM_SELECTION* \| *DELETE_CELL* \| *INSERT_CELL* \| *SET_VIEWPORT_OFFSET* \| *EVALUATE_ALL_SHEETS* |
`C` | { `type`: T  } & UpdateCellCommand \| { `type`: T  } & UpdateCellPositionCommand \| { `type`: T  } & ClearCellCommand \| { `type`: T  } & DeleteContentCommand \| { `type`: T  } & SetDecimalCommand \| { `type`: T  } & AddColumnsRowsCommand \| { `type`: T  } & RemoveColumnsRowsCommand \| { `type`: T  } & ResizeColumnsRowsCommand \| { `type`: T  } & HideColumnsRowsCommand \| { `type`: T  } & UnhideColumnsRowsCommand \| { `type`: T  } & SetGridLinesVisibilityCommand \| { `type`: T  } & AddMergeCommand \| { `type`: T  } & RemoveMergeCommand \| { `type`: T  } & CreateSheetCommand \| { `type`: T  } & DeleteSheetCommand \| { `type`: T  } & DuplicateSheetCommand \| { `type`: T  } & MoveSheetCommand \| { `type`: T  } & RenameSheetCommand \| { `type`: T  } & AddConditionalFormatCommand \| { `type`: T  } & RemoveConditionalFormatCommand \| { `type`: T  } & CreateFigureCommand \| { `type`: T  } & DeleteFigureCommand \| { `type`: T  } & *UpdateFigureCommand* \| { `type`: T  } & SetFormattingCommand \| { `type`: T  } & ClearFormattingCommand \| { `type`: T  } & SetBorderCommand \| { `type`: T  } & CreateChartCommand \| { `type`: T  } & UpdateChartCommand \| { `type`: T  } & RequestUndoCommand \| { `type`: T  } & RequestRedoCommand \| { `type`: T  } & UndoCommand \| { `type`: T  } & RedoCommand \| { `type`: T  } & NewInputCommand \| { `type`: T  } & RemoveInputCommand \| { `type`: T  } & FocusInputCommand \| { `type`: T  } & AddEmptyRangeCommand \| { `type`: T  } & RemoveRangeCommand \| { `type`: T  } & ChangeRangeCommand \| { `type`: T  } & CopyCommand \| { `type`: T  } & CutCommand \| { `type`: T  } & PasteCommand \| { `type`: T  } & CutAndPasteCommand \| { `type`: T  } & AutoFillCellCommand \| { `type`: T  } & PasteFromOSClipboardCommand \| { `type`: T  } & ActivatePaintFormatCommand \| { `type`: T  } & PasteCFCommand \| { `type`: T  } & AutoresizeColumnsCommand \| { `type`: T  } & AutoresizeRowsCommand \| { `type`: T  } & MovePositionCommand \| { `type`: T  } & DeleteSheetConfirmationCommand \| { `type`: T  } & ActivateSheetCommand \| { `type`: T  } & StartSelectionCommand \| { `type`: T  } & StartExpansionCommand \| { `type`: T  } & PrepareExpansionCommand \| { `type`: T  } & StopSelectionCommand \| { `type`: T  } & SelectCellCommand \| { `type`: T  } & SetSelectionCommand \| { `type`: T  } & SelectColumnCommand \| { `type`: T  } & SelectRowCommand \| { `type`: T  } & SelectAllCommand \| { `type`: T  } & AlterSelectionCommand \| { `type`: T  } & EvaluateCellsCommand \| { `type`: T  } & AddHighlightsCommand \| { `type`: T  } & RemoveHighlightsCommand \| { `type`: T  } & RemoveAllHighlightsCommand \| { `type`: T  } & HighlightSelectionCommand \| { `type`: T  } & AddPendingHighlightCommand \| { `type`: T  } & ResetPendingHighlightCommand \| { `type`: T  } & SetColorCommand \| { `type`: T  } & StopComposerSelectionCommand \| { `type`: T  } & StartEditionCommand \| { `type`: T  } & StopEditionCommand \| { `type`: T  } & SetCurrentContentCommand \| { `type`: T  } & ChangeComposerSelectionCommand \| { `type`: T  } & ReplaceComposerSelectionCommand \| { `type`: T  } & StartCommand \| { `type`: T  } & AutofillCommand \| { `type`: T  } & AutofillSelectCommand \| { `type`: T  } & ShowFormulaCommand \| { `type`: T  } & AutofillAutoCommand \| { `type`: T  } & SelectFigureCommand \| { `type`: T  } & UpdateSearchCommand \| { `type`: T  } & RefreshSearchCommand \| { `type`: T  } & ClearSearchCommand \| { `type`: T  } & SelectSearchPreviousCommand \| { `type`: T  } & SelectSearchNextCommand \| { `type`: T  } & ReplaceSearchCommand \| { `type`: T  } & ReplaceAllSearchCommand \| { `type`: T  } & SortCommand \| { `type`: T  } & ResizeViewportCommand \| { `type`: T  } & RefreshChartCommand \| { `type`: T  } & SumSelectionCommand \| { `type`: T  } & DeleteCellCommand \| { `type`: T  } & InsertCellCommand \| { `type`: T  } & SetViewportOffsetCommand \| { `type`: T  } & EvaluateAllSheetsCommand |

#### Parameters:

Name | Type |
:------ | :------ |
`type` | T |
`r` | *Pick*<C, Exclude<keyof C, *type*\>\> |

**Returns:** [*CommandResult*](../enums/commandresult.md)

___

### getters

• **getters**: Getters

Getters are the main way the rest of the UI read data from the model. Also,
it is shared between all plugins, so they can also communicate with each
other.

## Accessors

### handlers

• get **handlers**(): *CommandHandler*<Command\>[]

**Returns:** *CommandHandler*<Command\>[]

## Methods

### destroy

▸ **destroy**(): *void*

**Returns:** *void*

___

### drawGrid

▸ **drawGrid**(`context`: GridRenderingContext): *void*

When the Grid component is ready (= mounted), it has a reference to its
canvas and need to draw the grid on it.  This is then done by calling this
method, which will dispatch the call to all registered plugins.

Note that nothing prevent multiple grid components from calling this method
each, or one grid component calling it multiple times with a different
context. This is probably the way we should do if we want to be able to
freeze a part of the grid (so, we would need to render different zones)

#### Parameters:

Name | Type |
:------ | :------ |
`context` | GridRenderingContext |

**Returns:** *void*

___

### exportData

▸ **exportData**(): WorkbookData

As the name of this method strongly implies, it is useful when we need to
export date out of the model.

**Returns:** WorkbookData

___

### exportXLSX

▸ **exportXLSX**(): *Promise*<XLSXExport\>

Exports the current model data into a list of serialized XML files
to be zipped together as an *.xlsx file.

We need to trigger a cell revaluation  on every sheet and ensure that even
async functions are evaluated.
This prove to be necessary if the client did not trigger that evaluation in the first place
(e.g. open a document with several sheet and click on download before visiting each sheet)

**Returns:** *Promise*<XLSXExport\>

___

### leaveSession

▸ **leaveSession**(): *void*

**Returns:** *void*

___

### updateReadOnly

▸ **updateReadOnly**(`isReadonly`: *undefined* \| *boolean*): *void*

Change the configuration of the model to put it in readonly or read-write mode

#### Parameters:

Name | Type |
:------ | :------ |
`isReadonly` | *undefined* \| *boolean* |

**Returns:** *void*

___

### waitForIdle

▸ **waitForIdle**(): *Promise*<void\>

Wait until all async cells in spreadsheet are computed

**Returns:** *Promise*<void\>
