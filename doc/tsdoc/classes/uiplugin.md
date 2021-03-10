[o-spreadsheet API](../README.md) / UIPlugin

# Class: UIPlugin<State, C\>

UI plugins handle any transient data required to display a spreadsheet.
They can draw on the grid canvas.

## Type parameters

Name | Default |
:------ | :------ |
`State` | *any* |
`C` | Command |

## Hierarchy

* *BasePlugin*<State, C\>

  ↳ **UIPlugin**

## Table of contents

### Constructors

- [constructor](uiplugin.md#constructor)

### Properties

- [currentMode](uiplugin.md#currentmode)
- [dispatch](uiplugin.md#dispatch)
- [getters](uiplugin.md#getters)
- [history](uiplugin.md#history)
- [ui](uiplugin.md#ui)
- [getters](uiplugin.md#getters)
- [layers](uiplugin.md#layers)
- [modes](uiplugin.md#modes)

### Methods

- [allowDispatch](uiplugin.md#allowdispatch)
- [beforeHandle](uiplugin.md#beforehandle)
- [drawGrid](uiplugin.md#drawgrid)
- [finalize](uiplugin.md#finalize)
- [handle](uiplugin.md#handle)

## Constructors

### constructor

\+ **new UIPlugin**<State, C\>(`getters`: Getters, `state`: *StateObserver*, `dispatch`: <T, C\>(`type`: {} *extends* *Pick*<C, Exclude<keyof C, *type*\>\> ? T : *never*) => CommandResult<T, C\>(`type`: T, `r`: *Pick*<C, Exclude<keyof C, *type*\>\>) => CommandResult, `config`: ModelConfig): [*UIPlugin*](uiplugin.md)<State, C\>

#### Type parameters:

Name | Default |
:------ | :------ |
`State` | *any* |
`C` | Command |

#### Parameters:

Name | Type |
:------ | :------ |
`getters` | Getters |
`state` | *StateObserver* |
`dispatch` | <T, C\>(`type`: {} *extends* *Pick*<C, Exclude<keyof C, *type*\>\> ? T : *never*) => CommandResult<T, C\>(`type`: T, `r`: *Pick*<C, Exclude<keyof C, *type*\>\>) => CommandResult |
`config` | ModelConfig |

**Returns:** [*UIPlugin*](uiplugin.md)<State, C\>

## Properties

### currentMode

• `Protected` **currentMode**: Mode

___

### dispatch

• `Protected` **dispatch**: <T, C\>(`type`: {} *extends* *Pick*<C, Exclude<keyof C, *type*\>\> ? T : *never*) => CommandResult<T, C\>(`type`: T, `r`: *Pick*<C, Exclude<keyof C, *type*\>\>) => CommandResult

#### Type declaration:

▸ <T, C\>(`type`: {} *extends* *Pick*<C, Exclude<keyof C, *type*\>\> ? T : *never*): CommandResult

#### Type parameters:

Name | Type |
:------ | :------ |
`T` | *UPDATE_CELL* \| *UPDATE_CELL_POSITION* \| *CLEAR_CELL* \| *DELETE_CONTENT* \| *SET_DECIMAL* \| *ADD_COLUMNS_ROWS* \| *REMOVE_COLUMNS_ROWS* \| *RESIZE_COLUMNS_ROWS* \| *ADD_MERGE* \| *REMOVE_MERGE* \| *CREATE_SHEET* \| *DELETE_SHEET* \| *DUPLICATE_SHEET* \| *MOVE_SHEET* \| *RENAME_SHEET* \| *ADD_CONDITIONAL_FORMAT* \| *REMOVE_CONDITIONAL_FORMAT* \| *CREATE_FIGURE* \| *DELETE_FIGURE* \| *UPDATE_FIGURE* \| *SET_FORMATTING* \| *CLEAR_FORMATTING* \| *SET_BORDER* \| *CREATE_CHART* \| *UPDATE_CHART* \| *UNDO* \| *REDO* \| *ENABLE_NEW_SELECTION_INPUT* \| *DISABLE_SELECTION_INPUT* \| *FOCUS_RANGE* \| *ADD_EMPTY_RANGE* \| *REMOVE_RANGE* \| *CHANGE_RANGE* \| *COPY* \| *CUT* \| *PASTE* \| *PASTE_CELL* \| *AUTOFILL_CELL* \| *PASTE_FROM_OS_CLIPBOARD* \| *ACTIVATE_PAINT_FORMAT* \| *AUTORESIZE_COLUMNS* \| *AUTORESIZE_ROWS* \| *MOVE_POSITION* \| *DELETE_SHEET_CONFIRMATION* \| *ACTIVATE_SHEET* \| *START_SELECTION* \| *START_SELECTION_EXPANSION* \| *PREPARE_SELECTION_EXPANSION* \| *STOP_SELECTION* \| *SELECT_CELL* \| *SET_SELECTION* \| *SELECT_COLUMN* \| *SELECT_ROW* \| *SELECT_ALL* \| *ALTER_SELECTION* \| *EVALUATE_CELLS* \| *ADD_HIGHLIGHTS* \| *REMOVE_HIGHLIGHTS* \| *REMOVE_ALL_HIGHLIGHTS* \| *HIGHLIGHT_SELECTION* \| *ADD_PENDING_HIGHLIGHTS* \| *RESET_PENDING_HIGHLIGHT* \| *SET_HIGHLIGHT_COLOR* \| *STOP_COMPOSER_RANGE_SELECTION* \| *START_EDITION* \| *STOP_EDITION* \| *SET_CURRENT_CONTENT* \| *CHANGE_COMPOSER_CURSOR_SELECTION* \| *REPLACE_COMPOSER_CURSOR_SELECTION* \| *START* \| *AUTOFILL* \| *AUTOFILL_SELECT* \| *SET_FORMULA_VISIBILITY* \| *AUTOFILL_AUTO* \| *SELECT_FIGURE* \| *UPDATE_SEARCH* \| *REFRESH_SEARCH* \| *CLEAR_SEARCH* \| *SELECT_SEARCH_PREVIOUS_MATCH* \| *SELECT_SEARCH_NEXT_MATCH* \| *REPLACE_SEARCH* \| *REPLACE_ALL_SEARCH* \| *SORT_CELLS* \| *RESIZE_VIEWPORT* \| *SET_VIEWPORT_OFFSET* |
`C` | { `type`: T  } & UpdateCellCommand \| { `type`: T  } & UpdateCellPositionCommand \| { `type`: T  } & ClearCellCommand \| { `type`: T  } & DeleteContentCommand \| { `type`: T  } & SetDecimalCommand \| { `type`: T  } & AddColumnsRowsCommand \| { `type`: T  } & RemoveColumnsRowsCommand \| { `type`: T  } & ResizeColumnsRowsCommand \| { `type`: T  } & AddMergeCommand \| { `type`: T  } & RemoveMergeCommand \| { `type`: T  } & CreateSheetCommand \| { `type`: T  } & DeleteSheetCommand \| { `type`: T  } & DuplicateSheetCommand \| { `type`: T  } & MoveSheetCommand \| { `type`: T  } & RenameSheetCommand \| { `type`: T  } & AddConditionalFormatCommand \| { `type`: T  } & RemoveConditionalFormatCommand \| { `type`: T  } & CreateFigureCommand \| { `type`: T  } & DeleteFigureCommand \| { `type`: T  } & *UpdateFigureCommand* \| { `type`: T  } & SetFormattingCommand \| { `type`: T  } & ClearFormattingCommand \| { `type`: T  } & SetBorderCommand \| { `type`: T  } & CreateChartCommand \| { `type`: T  } & UpdateChartCommand \| { `type`: T  } & UndoCommand \| { `type`: T  } & RedoCommand \| { `type`: T  } & NewInputCommand \| { `type`: T  } & RemoveInputCommand \| { `type`: T  } & FocusInputCommand \| { `type`: T  } & AddEmptyRangeCommand \| { `type`: T  } & RemoveRangeCommand \| { `type`: T  } & ChangeRangeCommand \| { `type`: T  } & CopyCommand \| { `type`: T  } & CutCommand \| { `type`: T  } & PasteCommand \| { `type`: T  } & PasteCellCommand \| { `type`: T  } & AutoFillCellCommand \| { `type`: T  } & PasteFromOSClipboardCommand \| { `type`: T  } & ActivatePaintFormatCommand \| { `type`: T  } & AutoresizeColumnsCommand \| { `type`: T  } & AutoresizeRowsCommand \| { `type`: T  } & MovePositionCommand \| { `type`: T  } & DeleteSheetConfirmationCommand \| { `type`: T  } & ActivateSheetCommand \| { `type`: T  } & StartSelectionCommand \| { `type`: T  } & StartExpansionCommand \| { `type`: T  } & PrepareExpansionCommand \| { `type`: T  } & StopSelectionCommand \| { `type`: T  } & SelectCellCommand \| { `type`: T  } & SetSelectionCommand \| { `type`: T  } & SelectColumnCommand \| { `type`: T  } & SelectRowCommand \| { `type`: T  } & SelectAllCommand \| { `type`: T  } & AlterSelectionCommand \| { `type`: T  } & EvaluateCellsCommand \| { `type`: T  } & AddHighlightsCommand \| { `type`: T  } & RemoveHighlightsCommand \| { `type`: T  } & RemoveAllHighlightsCommand \| { `type`: T  } & HighlightSelectionCommand \| { `type`: T  } & AddPendingHighlightCommand \| { `type`: T  } & ResetPendingHighlightCommand \| { `type`: T  } & SetColorCommand \| { `type`: T  } & StopComposerSelectionCommand \| { `type`: T  } & StartEditionCommand \| { `type`: T  } & StopEditionCommand \| { `type`: T  } & SetCurrentContentCommand \| { `type`: T  } & ChangeComposerSelectionCommand \| { `type`: T  } & ReplaceComposerSelectionCommand \| { `type`: T  } & StartCommand \| { `type`: T  } & AutofillCommand \| { `type`: T  } & AutofillSelectCommand \| { `type`: T  } & ShowFormulaCommand \| { `type`: T  } & AutofillAutoCommand \| { `type`: T  } & SelectFigureCommand \| { `type`: T  } & UpdateSearchCommand \| { `type`: T  } & RefreshSearchCommand \| { `type`: T  } & ClearSearchCommand \| { `type`: T  } & SelectSearchPreviousCommand \| { `type`: T  } & SelectSearchNextCommand \| { `type`: T  } & ReplaceSearchCommand \| { `type`: T  } & ReplaceAllSearchCommand \| { `type`: T  } & SortCommand \| { `type`: T  } & ResizeViewportCommand \| { `type`: T  } & SetViewportOffsetCommand |

#### Parameters:

Name | Type |
:------ | :------ |
`type` | {} *extends* *Pick*<C, Exclude<keyof C, *type*\>\> ? T : *never* |

**Returns:** CommandResult

▸ <T, C\>(`type`: T, `r`: *Pick*<C, Exclude<keyof C, *type*\>\>): CommandResult

#### Type parameters:

Name | Type |
:------ | :------ |
`T` | *UPDATE_CELL* \| *UPDATE_CELL_POSITION* \| *CLEAR_CELL* \| *DELETE_CONTENT* \| *SET_DECIMAL* \| *ADD_COLUMNS_ROWS* \| *REMOVE_COLUMNS_ROWS* \| *RESIZE_COLUMNS_ROWS* \| *ADD_MERGE* \| *REMOVE_MERGE* \| *CREATE_SHEET* \| *DELETE_SHEET* \| *DUPLICATE_SHEET* \| *MOVE_SHEET* \| *RENAME_SHEET* \| *ADD_CONDITIONAL_FORMAT* \| *REMOVE_CONDITIONAL_FORMAT* \| *CREATE_FIGURE* \| *DELETE_FIGURE* \| *UPDATE_FIGURE* \| *SET_FORMATTING* \| *CLEAR_FORMATTING* \| *SET_BORDER* \| *CREATE_CHART* \| *UPDATE_CHART* \| *UNDO* \| *REDO* \| *ENABLE_NEW_SELECTION_INPUT* \| *DISABLE_SELECTION_INPUT* \| *FOCUS_RANGE* \| *ADD_EMPTY_RANGE* \| *REMOVE_RANGE* \| *CHANGE_RANGE* \| *COPY* \| *CUT* \| *PASTE* \| *PASTE_CELL* \| *AUTOFILL_CELL* \| *PASTE_FROM_OS_CLIPBOARD* \| *ACTIVATE_PAINT_FORMAT* \| *AUTORESIZE_COLUMNS* \| *AUTORESIZE_ROWS* \| *MOVE_POSITION* \| *DELETE_SHEET_CONFIRMATION* \| *ACTIVATE_SHEET* \| *START_SELECTION* \| *START_SELECTION_EXPANSION* \| *PREPARE_SELECTION_EXPANSION* \| *STOP_SELECTION* \| *SELECT_CELL* \| *SET_SELECTION* \| *SELECT_COLUMN* \| *SELECT_ROW* \| *SELECT_ALL* \| *ALTER_SELECTION* \| *EVALUATE_CELLS* \| *ADD_HIGHLIGHTS* \| *REMOVE_HIGHLIGHTS* \| *REMOVE_ALL_HIGHLIGHTS* \| *HIGHLIGHT_SELECTION* \| *ADD_PENDING_HIGHLIGHTS* \| *RESET_PENDING_HIGHLIGHT* \| *SET_HIGHLIGHT_COLOR* \| *STOP_COMPOSER_RANGE_SELECTION* \| *START_EDITION* \| *STOP_EDITION* \| *SET_CURRENT_CONTENT* \| *CHANGE_COMPOSER_CURSOR_SELECTION* \| *REPLACE_COMPOSER_CURSOR_SELECTION* \| *START* \| *AUTOFILL* \| *AUTOFILL_SELECT* \| *SET_FORMULA_VISIBILITY* \| *AUTOFILL_AUTO* \| *SELECT_FIGURE* \| *UPDATE_SEARCH* \| *REFRESH_SEARCH* \| *CLEAR_SEARCH* \| *SELECT_SEARCH_PREVIOUS_MATCH* \| *SELECT_SEARCH_NEXT_MATCH* \| *REPLACE_SEARCH* \| *REPLACE_ALL_SEARCH* \| *SORT_CELLS* \| *RESIZE_VIEWPORT* \| *SET_VIEWPORT_OFFSET* |
`C` | { `type`: T  } & UpdateCellCommand \| { `type`: T  } & UpdateCellPositionCommand \| { `type`: T  } & ClearCellCommand \| { `type`: T  } & DeleteContentCommand \| { `type`: T  } & SetDecimalCommand \| { `type`: T  } & AddColumnsRowsCommand \| { `type`: T  } & RemoveColumnsRowsCommand \| { `type`: T  } & ResizeColumnsRowsCommand \| { `type`: T  } & AddMergeCommand \| { `type`: T  } & RemoveMergeCommand \| { `type`: T  } & CreateSheetCommand \| { `type`: T  } & DeleteSheetCommand \| { `type`: T  } & DuplicateSheetCommand \| { `type`: T  } & MoveSheetCommand \| { `type`: T  } & RenameSheetCommand \| { `type`: T  } & AddConditionalFormatCommand \| { `type`: T  } & RemoveConditionalFormatCommand \| { `type`: T  } & CreateFigureCommand \| { `type`: T  } & DeleteFigureCommand \| { `type`: T  } & *UpdateFigureCommand* \| { `type`: T  } & SetFormattingCommand \| { `type`: T  } & ClearFormattingCommand \| { `type`: T  } & SetBorderCommand \| { `type`: T  } & CreateChartCommand \| { `type`: T  } & UpdateChartCommand \| { `type`: T  } & UndoCommand \| { `type`: T  } & RedoCommand \| { `type`: T  } & NewInputCommand \| { `type`: T  } & RemoveInputCommand \| { `type`: T  } & FocusInputCommand \| { `type`: T  } & AddEmptyRangeCommand \| { `type`: T  } & RemoveRangeCommand \| { `type`: T  } & ChangeRangeCommand \| { `type`: T  } & CopyCommand \| { `type`: T  } & CutCommand \| { `type`: T  } & PasteCommand \| { `type`: T  } & PasteCellCommand \| { `type`: T  } & AutoFillCellCommand \| { `type`: T  } & PasteFromOSClipboardCommand \| { `type`: T  } & ActivatePaintFormatCommand \| { `type`: T  } & AutoresizeColumnsCommand \| { `type`: T  } & AutoresizeRowsCommand \| { `type`: T  } & MovePositionCommand \| { `type`: T  } & DeleteSheetConfirmationCommand \| { `type`: T  } & ActivateSheetCommand \| { `type`: T  } & StartSelectionCommand \| { `type`: T  } & StartExpansionCommand \| { `type`: T  } & PrepareExpansionCommand \| { `type`: T  } & StopSelectionCommand \| { `type`: T  } & SelectCellCommand \| { `type`: T  } & SetSelectionCommand \| { `type`: T  } & SelectColumnCommand \| { `type`: T  } & SelectRowCommand \| { `type`: T  } & SelectAllCommand \| { `type`: T  } & AlterSelectionCommand \| { `type`: T  } & EvaluateCellsCommand \| { `type`: T  } & AddHighlightsCommand \| { `type`: T  } & RemoveHighlightsCommand \| { `type`: T  } & RemoveAllHighlightsCommand \| { `type`: T  } & HighlightSelectionCommand \| { `type`: T  } & AddPendingHighlightCommand \| { `type`: T  } & ResetPendingHighlightCommand \| { `type`: T  } & SetColorCommand \| { `type`: T  } & StopComposerSelectionCommand \| { `type`: T  } & StartEditionCommand \| { `type`: T  } & StopEditionCommand \| { `type`: T  } & SetCurrentContentCommand \| { `type`: T  } & ChangeComposerSelectionCommand \| { `type`: T  } & ReplaceComposerSelectionCommand \| { `type`: T  } & StartCommand \| { `type`: T  } & AutofillCommand \| { `type`: T  } & AutofillSelectCommand \| { `type`: T  } & ShowFormulaCommand \| { `type`: T  } & AutofillAutoCommand \| { `type`: T  } & SelectFigureCommand \| { `type`: T  } & UpdateSearchCommand \| { `type`: T  } & RefreshSearchCommand \| { `type`: T  } & ClearSearchCommand \| { `type`: T  } & SelectSearchPreviousCommand \| { `type`: T  } & SelectSearchNextCommand \| { `type`: T  } & ReplaceSearchCommand \| { `type`: T  } & ReplaceAllSearchCommand \| { `type`: T  } & SortCommand \| { `type`: T  } & ResizeViewportCommand \| { `type`: T  } & SetViewportOffsetCommand |

#### Parameters:

Name | Type |
:------ | :------ |
`type` | T |
`r` | *Pick*<C, Exclude<keyof C, *type*\>\> |

**Returns:** CommandResult

___

### getters

• `Protected` **getters**: Getters

___

### history

• `Protected` **history**: *WorkbookHistory*<State\>

___

### ui

• `Protected` **ui**: *Pick*<ModelConfig, *askConfirmation* \| *notifyUser* \| *openSidePanel* \| *editText*\>

___

### getters

▪ `Static` **getters**: *string*[]

___

### layers

▪ `Static` **layers**: LAYERS[]

___

### modes

▪ `Static` **modes**: Mode[]

## Methods

### allowDispatch

▸ **allowDispatch**(`command`: C): CommandResult

Before a command is accepted, the model will ask each plugin if the command
is allowed.  If all of then return true, then we can proceed. Otherwise,
the command is cancelled.

There should not be any side effects in this method.

#### Parameters:

Name | Type |
:------ | :------ |
`command` | C |

**Returns:** CommandResult

___

### beforeHandle

▸ **beforeHandle**(`command`: C): *void*

This method is useful when a plugin need to perform some action before a
command is handled in another plugin. This should only be used if it is not
possible to do the work in the handle method.

#### Parameters:

Name | Type |
:------ | :------ |
`command` | C |

**Returns:** *void*

___

### drawGrid

▸ **drawGrid**(`ctx`: GridRenderingContext, `layer`: LAYERS): *void*

#### Parameters:

Name | Type |
:------ | :------ |
`ctx` | GridRenderingContext |
`layer` | LAYERS |

**Returns:** *void*

___

### finalize

▸ **finalize**(): *void*

Sometimes, it is useful to perform some work after a command (and all its
subcommands) has been completely handled.  For example, when we paste
multiple cells, we only want to reevaluate the cell values once at the end.

**Returns:** *void*

___

### handle

▸ **handle**(`command`: C): *void*

This is the standard place to handle any command. Most of the plugin
command handling work should take place here.

#### Parameters:

Name | Type |
:------ | :------ |
`command` | C |

**Returns:** *void*
