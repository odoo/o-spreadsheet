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
- [batchValidations](uiplugin.md#batchvalidations)
- [beforeHandle](uiplugin.md#beforehandle)
- [chainValidations](uiplugin.md#chainvalidations)
- [checkValidations](uiplugin.md#checkvalidations)
- [drawGrid](uiplugin.md#drawgrid)
- [finalize](uiplugin.md#finalize)
- [handle](uiplugin.md#handle)

## Constructors

### constructor

\+ **new UIPlugin**<State, C\>(`getters`: Getters, `state`: *StateObserver*, `dispatch`: <T, C\>(`type`: {} *extends* *Pick*<C, Exclude<keyof C, *type*\>\> ? T : *never*) => [*DispatchResult*](dispatchresult.md)<T, C\>(`type`: T, `r`: *Pick*<C, Exclude<keyof C, *type*\>\>) => [*DispatchResult*](dispatchresult.md), `config`: ModelConfig): [*UIPlugin*](uiplugin.md)<State, C\>

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
`dispatch` | <T, C\>(`type`: {} *extends* *Pick*<C, Exclude<keyof C, *type*\>\> ? T : *never*) => [*DispatchResult*](dispatchresult.md)<T, C\>(`type`: T, `r`: *Pick*<C, Exclude<keyof C, *type*\>\>) => [*DispatchResult*](dispatchresult.md) |
`config` | ModelConfig |

**Returns:** [*UIPlugin*](uiplugin.md)<State, C\>

## Properties

### currentMode

• `Protected` **currentMode**: Mode

___

### dispatch

• `Protected` **dispatch**: <T, C\>(`type`: {} *extends* *Pick*<C, Exclude<keyof C, *type*\>\> ? T : *never*) => [*DispatchResult*](dispatchresult.md)<T, C\>(`type`: T, `r`: *Pick*<C, Exclude<keyof C, *type*\>\>) => [*DispatchResult*](dispatchresult.md)

#### Type declaration:

▸ <T, C\>(`type`: {} *extends* *Pick*<C, Exclude<keyof C, *type*\>\> ? T : *never*): [*DispatchResult*](dispatchresult.md)

#### Type parameters:

Name | Type |
:------ | :------ |
`T` | *UPDATE_CELL* \| *UPDATE_CELL_POSITION* \| *CLEAR_CELL* \| *DELETE_CONTENT* \| *SET_DECIMAL* \| *ADD_COLUMNS_ROWS* \| *REMOVE_COLUMNS_ROWS* \| *RESIZE_COLUMNS_ROWS* \| *HIDE_COLUMNS_ROWS* \| *UNHIDE_COLUMNS_ROWS* \| *SET_GRID_LINES_VISIBILITY* \| *ADD_MERGE* \| *REMOVE_MERGE* \| *CREATE_SHEET* \| *DELETE_SHEET* \| *DUPLICATE_SHEET* \| *MOVE_SHEET* \| *RENAME_SHEET* \| *ADD_CONDITIONAL_FORMAT* \| *REMOVE_CONDITIONAL_FORMAT* \| *CREATE_FIGURE* \| *DELETE_FIGURE* \| *UPDATE_FIGURE* \| *SET_FORMATTING* \| *CLEAR_FORMATTING* \| *SET_BORDER* \| *CREATE_CHART* \| *UPDATE_CHART* \| *REQUEST_UNDO* \| *REQUEST_REDO* \| *UNDO* \| *REDO* \| *ENABLE_NEW_SELECTION_INPUT* \| *DISABLE_SELECTION_INPUT* \| *FOCUS_RANGE* \| *ADD_EMPTY_RANGE* \| *REMOVE_RANGE* \| *CHANGE_RANGE* \| *COPY* \| *CUT* \| *PASTE* \| *CUT_AND_PASTE* \| *AUTOFILL_CELL* \| *PASTE_FROM_OS_CLIPBOARD* \| *ACTIVATE_PAINT_FORMAT* \| *PASTE_CONDITIONAL_FORMAT* \| *AUTORESIZE_COLUMNS* \| *AUTORESIZE_ROWS* \| *MOVE_POSITION* \| *DELETE_SHEET_CONFIRMATION* \| *ACTIVATE_SHEET* \| *START_SELECTION* \| *START_SELECTION_EXPANSION* \| *PREPARE_SELECTION_EXPANSION* \| *STOP_SELECTION* \| *SELECT_CELL* \| *SET_SELECTION* \| *SELECT_COLUMN* \| *SELECT_ROW* \| *SELECT_ALL* \| *ALTER_SELECTION* \| *EVALUATE_CELLS* \| *ADD_HIGHLIGHTS* \| *REMOVE_HIGHLIGHTS* \| *REMOVE_ALL_HIGHLIGHTS* \| *HIGHLIGHT_SELECTION* \| *ADD_PENDING_HIGHLIGHTS* \| *RESET_PENDING_HIGHLIGHT* \| *SET_HIGHLIGHT_COLOR* \| *STOP_COMPOSER_RANGE_SELECTION* \| *START_EDITION* \| *STOP_EDITION* \| *SET_CURRENT_CONTENT* \| *CHANGE_COMPOSER_CURSOR_SELECTION* \| *REPLACE_COMPOSER_CURSOR_SELECTION* \| *START* \| *AUTOFILL* \| *AUTOFILL_SELECT* \| *SET_FORMULA_VISIBILITY* \| *AUTOFILL_AUTO* \| *SELECT_FIGURE* \| *UPDATE_SEARCH* \| *REFRESH_SEARCH* \| *CLEAR_SEARCH* \| *SELECT_SEARCH_PREVIOUS_MATCH* \| *SELECT_SEARCH_NEXT_MATCH* \| *REPLACE_SEARCH* \| *REPLACE_ALL_SEARCH* \| *SORT_CELLS* \| *RESIZE_VIEWPORT* \| *REFRESH_CHART* \| *SUM_SELECTION* \| *DELETE_CELL* \| *INSERT_CELL* \| *SET_VIEWPORT_OFFSET* \| *EVALUATE_ALL_SHEETS* \| *ACTIVATE_NEXT_SHEET* \| *ACTIVATE_PREVIOUS_SHEET* |
`C` | { `type`: T  } & UpdateCellCommand \| { `type`: T  } & UpdateCellPositionCommand \| { `type`: T  } & ClearCellCommand \| { `type`: T  } & DeleteContentCommand \| { `type`: T  } & SetDecimalCommand \| { `type`: T  } & AddColumnsRowsCommand \| { `type`: T  } & RemoveColumnsRowsCommand \| { `type`: T  } & ResizeColumnsRowsCommand \| { `type`: T  } & HideColumnsRowsCommand \| { `type`: T  } & UnhideColumnsRowsCommand \| { `type`: T  } & SetGridLinesVisibilityCommand \| { `type`: T  } & AddMergeCommand \| { `type`: T  } & RemoveMergeCommand \| { `type`: T  } & CreateSheetCommand \| { `type`: T  } & DeleteSheetCommand \| { `type`: T  } & DuplicateSheetCommand \| { `type`: T  } & MoveSheetCommand \| { `type`: T  } & RenameSheetCommand \| { `type`: T  } & AddConditionalFormatCommand \| { `type`: T  } & RemoveConditionalFormatCommand \| { `type`: T  } & CreateFigureCommand \| { `type`: T  } & DeleteFigureCommand \| { `type`: T  } & *UpdateFigureCommand* \| { `type`: T  } & SetFormattingCommand \| { `type`: T  } & ClearFormattingCommand \| { `type`: T  } & SetBorderCommand \| { `type`: T  } & CreateChartCommand \| { `type`: T  } & UpdateChartCommand \| { `type`: T  } & RequestUndoCommand \| { `type`: T  } & RequestRedoCommand \| { `type`: T  } & UndoCommand \| { `type`: T  } & RedoCommand \| { `type`: T  } & NewInputCommand \| { `type`: T  } & RemoveInputCommand \| { `type`: T  } & FocusInputCommand \| { `type`: T  } & AddEmptyRangeCommand \| { `type`: T  } & RemoveRangeCommand \| { `type`: T  } & ChangeRangeCommand \| { `type`: T  } & CopyCommand \| { `type`: T  } & CutCommand \| { `type`: T  } & PasteCommand \| { `type`: T  } & CutAndPasteCommand \| { `type`: T  } & AutoFillCellCommand \| { `type`: T  } & PasteFromOSClipboardCommand \| { `type`: T  } & ActivatePaintFormatCommand \| { `type`: T  } & PasteCFCommand \| { `type`: T  } & AutoresizeColumnsCommand \| { `type`: T  } & AutoresizeRowsCommand \| { `type`: T  } & MovePositionCommand \| { `type`: T  } & DeleteSheetConfirmationCommand \| { `type`: T  } & ActivateSheetCommand \| { `type`: T  } & StartSelectionCommand \| { `type`: T  } & StartExpansionCommand \| { `type`: T  } & PrepareExpansionCommand \| { `type`: T  } & StopSelectionCommand \| { `type`: T  } & SelectCellCommand \| { `type`: T  } & SetSelectionCommand \| { `type`: T  } & SelectColumnCommand \| { `type`: T  } & SelectRowCommand \| { `type`: T  } & SelectAllCommand \| { `type`: T  } & AlterSelectionCommand \| { `type`: T  } & EvaluateCellsCommand \| { `type`: T  } & AddHighlightsCommand \| { `type`: T  } & RemoveHighlightsCommand \| { `type`: T  } & RemoveAllHighlightsCommand \| { `type`: T  } & HighlightSelectionCommand \| { `type`: T  } & AddPendingHighlightCommand \| { `type`: T  } & ResetPendingHighlightCommand \| { `type`: T  } & SetColorCommand \| { `type`: T  } & StopComposerSelectionCommand \| { `type`: T  } & StartEditionCommand \| { `type`: T  } & StopEditionCommand \| { `type`: T  } & SetCurrentContentCommand \| { `type`: T  } & ChangeComposerSelectionCommand \| { `type`: T  } & ReplaceComposerSelectionCommand \| { `type`: T  } & StartCommand \| { `type`: T  } & AutofillCommand \| { `type`: T  } & AutofillSelectCommand \| { `type`: T  } & ShowFormulaCommand \| { `type`: T  } & AutofillAutoCommand \| { `type`: T  } & SelectFigureCommand \| { `type`: T  } & UpdateSearchCommand \| { `type`: T  } & RefreshSearchCommand \| { `type`: T  } & ClearSearchCommand \| { `type`: T  } & SelectSearchPreviousCommand \| { `type`: T  } & SelectSearchNextCommand \| { `type`: T  } & ReplaceSearchCommand \| { `type`: T  } & ReplaceAllSearchCommand \| { `type`: T  } & SortCommand \| { `type`: T  } & ResizeViewportCommand \| { `type`: T  } & RefreshChartCommand \| { `type`: T  } & SumSelectionCommand \| { `type`: T  } & DeleteCellCommand \| { `type`: T  } & InsertCellCommand \| { `type`: T  } & SetViewportOffsetCommand \| { `type`: T  } & EvaluateAllSheetsCommand \| { `type`: T  } & ActivateNextSheetCommand \| { `type`: T  } & ActivatePreviousSheetCommand |

#### Parameters:

Name | Type |
:------ | :------ |
`type` | {} *extends* *Pick*<C, Exclude<keyof C, *type*\>\> ? T : *never* |

**Returns:** [*DispatchResult*](dispatchresult.md)

▸ <T, C\>(`type`: T, `r`: *Pick*<C, Exclude<keyof C, *type*\>\>): [*DispatchResult*](dispatchresult.md)

#### Type parameters:

Name | Type |
:------ | :------ |
`T` | *UPDATE_CELL* \| *UPDATE_CELL_POSITION* \| *CLEAR_CELL* \| *DELETE_CONTENT* \| *SET_DECIMAL* \| *ADD_COLUMNS_ROWS* \| *REMOVE_COLUMNS_ROWS* \| *RESIZE_COLUMNS_ROWS* \| *HIDE_COLUMNS_ROWS* \| *UNHIDE_COLUMNS_ROWS* \| *SET_GRID_LINES_VISIBILITY* \| *ADD_MERGE* \| *REMOVE_MERGE* \| *CREATE_SHEET* \| *DELETE_SHEET* \| *DUPLICATE_SHEET* \| *MOVE_SHEET* \| *RENAME_SHEET* \| *ADD_CONDITIONAL_FORMAT* \| *REMOVE_CONDITIONAL_FORMAT* \| *CREATE_FIGURE* \| *DELETE_FIGURE* \| *UPDATE_FIGURE* \| *SET_FORMATTING* \| *CLEAR_FORMATTING* \| *SET_BORDER* \| *CREATE_CHART* \| *UPDATE_CHART* \| *REQUEST_UNDO* \| *REQUEST_REDO* \| *UNDO* \| *REDO* \| *ENABLE_NEW_SELECTION_INPUT* \| *DISABLE_SELECTION_INPUT* \| *FOCUS_RANGE* \| *ADD_EMPTY_RANGE* \| *REMOVE_RANGE* \| *CHANGE_RANGE* \| *COPY* \| *CUT* \| *PASTE* \| *CUT_AND_PASTE* \| *AUTOFILL_CELL* \| *PASTE_FROM_OS_CLIPBOARD* \| *ACTIVATE_PAINT_FORMAT* \| *PASTE_CONDITIONAL_FORMAT* \| *AUTORESIZE_COLUMNS* \| *AUTORESIZE_ROWS* \| *MOVE_POSITION* \| *DELETE_SHEET_CONFIRMATION* \| *ACTIVATE_SHEET* \| *START_SELECTION* \| *START_SELECTION_EXPANSION* \| *PREPARE_SELECTION_EXPANSION* \| *STOP_SELECTION* \| *SELECT_CELL* \| *SET_SELECTION* \| *SELECT_COLUMN* \| *SELECT_ROW* \| *SELECT_ALL* \| *ALTER_SELECTION* \| *EVALUATE_CELLS* \| *ADD_HIGHLIGHTS* \| *REMOVE_HIGHLIGHTS* \| *REMOVE_ALL_HIGHLIGHTS* \| *HIGHLIGHT_SELECTION* \| *ADD_PENDING_HIGHLIGHTS* \| *RESET_PENDING_HIGHLIGHT* \| *SET_HIGHLIGHT_COLOR* \| *STOP_COMPOSER_RANGE_SELECTION* \| *START_EDITION* \| *STOP_EDITION* \| *SET_CURRENT_CONTENT* \| *CHANGE_COMPOSER_CURSOR_SELECTION* \| *REPLACE_COMPOSER_CURSOR_SELECTION* \| *START* \| *AUTOFILL* \| *AUTOFILL_SELECT* \| *SET_FORMULA_VISIBILITY* \| *AUTOFILL_AUTO* \| *SELECT_FIGURE* \| *UPDATE_SEARCH* \| *REFRESH_SEARCH* \| *CLEAR_SEARCH* \| *SELECT_SEARCH_PREVIOUS_MATCH* \| *SELECT_SEARCH_NEXT_MATCH* \| *REPLACE_SEARCH* \| *REPLACE_ALL_SEARCH* \| *SORT_CELLS* \| *RESIZE_VIEWPORT* \| *REFRESH_CHART* \| *SUM_SELECTION* \| *DELETE_CELL* \| *INSERT_CELL* \| *SET_VIEWPORT_OFFSET* \| *EVALUATE_ALL_SHEETS* \| *ACTIVATE_NEXT_SHEET* \| *ACTIVATE_PREVIOUS_SHEET* |
`C` | { `type`: T  } & UpdateCellCommand \| { `type`: T  } & UpdateCellPositionCommand \| { `type`: T  } & ClearCellCommand \| { `type`: T  } & DeleteContentCommand \| { `type`: T  } & SetDecimalCommand \| { `type`: T  } & AddColumnsRowsCommand \| { `type`: T  } & RemoveColumnsRowsCommand \| { `type`: T  } & ResizeColumnsRowsCommand \| { `type`: T  } & HideColumnsRowsCommand \| { `type`: T  } & UnhideColumnsRowsCommand \| { `type`: T  } & SetGridLinesVisibilityCommand \| { `type`: T  } & AddMergeCommand \| { `type`: T  } & RemoveMergeCommand \| { `type`: T  } & CreateSheetCommand \| { `type`: T  } & DeleteSheetCommand \| { `type`: T  } & DuplicateSheetCommand \| { `type`: T  } & MoveSheetCommand \| { `type`: T  } & RenameSheetCommand \| { `type`: T  } & AddConditionalFormatCommand \| { `type`: T  } & RemoveConditionalFormatCommand \| { `type`: T  } & CreateFigureCommand \| { `type`: T  } & DeleteFigureCommand \| { `type`: T  } & *UpdateFigureCommand* \| { `type`: T  } & SetFormattingCommand \| { `type`: T  } & ClearFormattingCommand \| { `type`: T  } & SetBorderCommand \| { `type`: T  } & CreateChartCommand \| { `type`: T  } & UpdateChartCommand \| { `type`: T  } & RequestUndoCommand \| { `type`: T  } & RequestRedoCommand \| { `type`: T  } & UndoCommand \| { `type`: T  } & RedoCommand \| { `type`: T  } & NewInputCommand \| { `type`: T  } & RemoveInputCommand \| { `type`: T  } & FocusInputCommand \| { `type`: T  } & AddEmptyRangeCommand \| { `type`: T  } & RemoveRangeCommand \| { `type`: T  } & ChangeRangeCommand \| { `type`: T  } & CopyCommand \| { `type`: T  } & CutCommand \| { `type`: T  } & PasteCommand \| { `type`: T  } & CutAndPasteCommand \| { `type`: T  } & AutoFillCellCommand \| { `type`: T  } & PasteFromOSClipboardCommand \| { `type`: T  } & ActivatePaintFormatCommand \| { `type`: T  } & PasteCFCommand \| { `type`: T  } & AutoresizeColumnsCommand \| { `type`: T  } & AutoresizeRowsCommand \| { `type`: T  } & MovePositionCommand \| { `type`: T  } & DeleteSheetConfirmationCommand \| { `type`: T  } & ActivateSheetCommand \| { `type`: T  } & StartSelectionCommand \| { `type`: T  } & StartExpansionCommand \| { `type`: T  } & PrepareExpansionCommand \| { `type`: T  } & StopSelectionCommand \| { `type`: T  } & SelectCellCommand \| { `type`: T  } & SetSelectionCommand \| { `type`: T  } & SelectColumnCommand \| { `type`: T  } & SelectRowCommand \| { `type`: T  } & SelectAllCommand \| { `type`: T  } & AlterSelectionCommand \| { `type`: T  } & EvaluateCellsCommand \| { `type`: T  } & AddHighlightsCommand \| { `type`: T  } & RemoveHighlightsCommand \| { `type`: T  } & RemoveAllHighlightsCommand \| { `type`: T  } & HighlightSelectionCommand \| { `type`: T  } & AddPendingHighlightCommand \| { `type`: T  } & ResetPendingHighlightCommand \| { `type`: T  } & SetColorCommand \| { `type`: T  } & StopComposerSelectionCommand \| { `type`: T  } & StartEditionCommand \| { `type`: T  } & StopEditionCommand \| { `type`: T  } & SetCurrentContentCommand \| { `type`: T  } & ChangeComposerSelectionCommand \| { `type`: T  } & ReplaceComposerSelectionCommand \| { `type`: T  } & StartCommand \| { `type`: T  } & AutofillCommand \| { `type`: T  } & AutofillSelectCommand \| { `type`: T  } & ShowFormulaCommand \| { `type`: T  } & AutofillAutoCommand \| { `type`: T  } & SelectFigureCommand \| { `type`: T  } & UpdateSearchCommand \| { `type`: T  } & RefreshSearchCommand \| { `type`: T  } & ClearSearchCommand \| { `type`: T  } & SelectSearchPreviousCommand \| { `type`: T  } & SelectSearchNextCommand \| { `type`: T  } & ReplaceSearchCommand \| { `type`: T  } & ReplaceAllSearchCommand \| { `type`: T  } & SortCommand \| { `type`: T  } & ResizeViewportCommand \| { `type`: T  } & RefreshChartCommand \| { `type`: T  } & SumSelectionCommand \| { `type`: T  } & DeleteCellCommand \| { `type`: T  } & InsertCellCommand \| { `type`: T  } & SetViewportOffsetCommand \| { `type`: T  } & EvaluateAllSheetsCommand \| { `type`: T  } & ActivateNextSheetCommand \| { `type`: T  } & ActivatePreviousSheetCommand |

#### Parameters:

Name | Type |
:------ | :------ |
`type` | T |
`r` | *Pick*<C, Exclude<keyof C, *type*\>\> |

**Returns:** [*DispatchResult*](dispatchresult.md)

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

▸ **allowDispatch**(`command`: C): [*Success*](../enums/commandresult.md#success) \| [*CancelledForUnknownReason*](../enums/commandresult.md#cancelledforunknownreason) \| [*WillRemoveExistingMerge*](../enums/commandresult.md#willremoveexistingmerge) \| [*MergeIsDestructive*](../enums/commandresult.md#mergeisdestructive) \| [*CellIsMerged*](../enums/commandresult.md#cellismerged) \| [*EmptyUndoStack*](../enums/commandresult.md#emptyundostack) \| [*EmptyRedoStack*](../enums/commandresult.md#emptyredostack) \| [*NotEnoughElements*](../enums/commandresult.md#notenoughelements) \| [*NotEnoughSheets*](../enums/commandresult.md#notenoughsheets) \| [*MissingSheetName*](../enums/commandresult.md#missingsheetname) \| [*DuplicatedSheetName*](../enums/commandresult.md#duplicatedsheetname) \| [*ForbiddenCharactersInSheetName*](../enums/commandresult.md#forbiddencharactersinsheetname) \| [*WrongSheetMove*](../enums/commandresult.md#wrongsheetmove) \| [*WrongSheetPosition*](../enums/commandresult.md#wrongsheetposition) \| [*InvalidAnchorZone*](../enums/commandresult.md#invalidanchorzone) \| [*SelectionOutOfBound*](../enums/commandresult.md#selectionoutofbound) \| [*TargetOutOfSheet*](../enums/commandresult.md#targetoutofsheet) \| [*WrongPasteSelection*](../enums/commandresult.md#wrongpasteselection) \| [*EmptyClipboard*](../enums/commandresult.md#emptyclipboard) \| [*EmptyRange*](../enums/commandresult.md#emptyrange) \| [*InvalidRange*](../enums/commandresult.md#invalidrange) \| [*InvalidSheetId*](../enums/commandresult.md#invalidsheetid) \| [*InputAlreadyFocused*](../enums/commandresult.md#inputalreadyfocused) \| [*MaximumRangesReached*](../enums/commandresult.md#maximumrangesreached) \| [*InvalidChartDefinition*](../enums/commandresult.md#invalidchartdefinition) \| [*EmptyDataSet*](../enums/commandresult.md#emptydataset) \| [*InvalidDataSet*](../enums/commandresult.md#invaliddataset) \| [*InvalidLabelRange*](../enums/commandresult.md#invalidlabelrange) \| [*InvalidAutofillSelection*](../enums/commandresult.md#invalidautofillselection) \| [*WrongComposerSelection*](../enums/commandresult.md#wrongcomposerselection) \| [*MinBiggerThanMax*](../enums/commandresult.md#minbiggerthanmax) \| [*LowerBiggerThanUpper*](../enums/commandresult.md#lowerbiggerthanupper) \| [*MidBiggerThanMax*](../enums/commandresult.md#midbiggerthanmax) \| [*MinBiggerThanMid*](../enums/commandresult.md#minbiggerthanmid) \| [*FirstArgMissing*](../enums/commandresult.md#firstargmissing) \| [*SecondArgMissing*](../enums/commandresult.md#secondargmissing) \| [*MinNaN*](../enums/commandresult.md#minnan) \| [*MidNaN*](../enums/commandresult.md#midnan) \| [*MaxNaN*](../enums/commandresult.md#maxnan) \| [*ValueUpperInflectionNaN*](../enums/commandresult.md#valueupperinflectionnan) \| [*ValueLowerInflectionNaN*](../enums/commandresult.md#valuelowerinflectionnan) \| [*MinInvalidFormula*](../enums/commandresult.md#mininvalidformula) \| [*MidInvalidFormula*](../enums/commandresult.md#midinvalidformula) \| [*MaxInvalidFormula*](../enums/commandresult.md#maxinvalidformula) \| [*ValueUpperInvalidFormula*](../enums/commandresult.md#valueupperinvalidformula) \| [*ValueLowerInvalidFormula*](../enums/commandresult.md#valuelowerinvalidformula) \| [*InvalidSortZone*](../enums/commandresult.md#invalidsortzone) \| [*WaitingSessionConfirmation*](../enums/commandresult.md#waitingsessionconfirmation) \| [*MergeOverlap*](../enums/commandresult.md#mergeoverlap) \| [*TooManyHiddenElements*](../enums/commandresult.md#toomanyhiddenelements) \| [*Readonly*](../enums/commandresult.md#readonly) \| [*InvalidOffset*](../enums/commandresult.md#invalidoffset) \| [*InvalidViewportSize*](../enums/commandresult.md#invalidviewportsize) \| [*CommandResult*](../enums/commandresult.md)[]

Before a command is accepted, the model will ask each plugin if the command
is allowed.  If all of then return true, then we can proceed. Otherwise,
the command is cancelled.

There should not be any side effects in this method.

#### Parameters:

Name | Type |
:------ | :------ |
`command` | C |

**Returns:** [*Success*](../enums/commandresult.md#success) \| [*CancelledForUnknownReason*](../enums/commandresult.md#cancelledforunknownreason) \| [*WillRemoveExistingMerge*](../enums/commandresult.md#willremoveexistingmerge) \| [*MergeIsDestructive*](../enums/commandresult.md#mergeisdestructive) \| [*CellIsMerged*](../enums/commandresult.md#cellismerged) \| [*EmptyUndoStack*](../enums/commandresult.md#emptyundostack) \| [*EmptyRedoStack*](../enums/commandresult.md#emptyredostack) \| [*NotEnoughElements*](../enums/commandresult.md#notenoughelements) \| [*NotEnoughSheets*](../enums/commandresult.md#notenoughsheets) \| [*MissingSheetName*](../enums/commandresult.md#missingsheetname) \| [*DuplicatedSheetName*](../enums/commandresult.md#duplicatedsheetname) \| [*ForbiddenCharactersInSheetName*](../enums/commandresult.md#forbiddencharactersinsheetname) \| [*WrongSheetMove*](../enums/commandresult.md#wrongsheetmove) \| [*WrongSheetPosition*](../enums/commandresult.md#wrongsheetposition) \| [*InvalidAnchorZone*](../enums/commandresult.md#invalidanchorzone) \| [*SelectionOutOfBound*](../enums/commandresult.md#selectionoutofbound) \| [*TargetOutOfSheet*](../enums/commandresult.md#targetoutofsheet) \| [*WrongPasteSelection*](../enums/commandresult.md#wrongpasteselection) \| [*EmptyClipboard*](../enums/commandresult.md#emptyclipboard) \| [*EmptyRange*](../enums/commandresult.md#emptyrange) \| [*InvalidRange*](../enums/commandresult.md#invalidrange) \| [*InvalidSheetId*](../enums/commandresult.md#invalidsheetid) \| [*InputAlreadyFocused*](../enums/commandresult.md#inputalreadyfocused) \| [*MaximumRangesReached*](../enums/commandresult.md#maximumrangesreached) \| [*InvalidChartDefinition*](../enums/commandresult.md#invalidchartdefinition) \| [*EmptyDataSet*](../enums/commandresult.md#emptydataset) \| [*InvalidDataSet*](../enums/commandresult.md#invaliddataset) \| [*InvalidLabelRange*](../enums/commandresult.md#invalidlabelrange) \| [*InvalidAutofillSelection*](../enums/commandresult.md#invalidautofillselection) \| [*WrongComposerSelection*](../enums/commandresult.md#wrongcomposerselection) \| [*MinBiggerThanMax*](../enums/commandresult.md#minbiggerthanmax) \| [*LowerBiggerThanUpper*](../enums/commandresult.md#lowerbiggerthanupper) \| [*MidBiggerThanMax*](../enums/commandresult.md#midbiggerthanmax) \| [*MinBiggerThanMid*](../enums/commandresult.md#minbiggerthanmid) \| [*FirstArgMissing*](../enums/commandresult.md#firstargmissing) \| [*SecondArgMissing*](../enums/commandresult.md#secondargmissing) \| [*MinNaN*](../enums/commandresult.md#minnan) \| [*MidNaN*](../enums/commandresult.md#midnan) \| [*MaxNaN*](../enums/commandresult.md#maxnan) \| [*ValueUpperInflectionNaN*](../enums/commandresult.md#valueupperinflectionnan) \| [*ValueLowerInflectionNaN*](../enums/commandresult.md#valuelowerinflectionnan) \| [*MinInvalidFormula*](../enums/commandresult.md#mininvalidformula) \| [*MidInvalidFormula*](../enums/commandresult.md#midinvalidformula) \| [*MaxInvalidFormula*](../enums/commandresult.md#maxinvalidformula) \| [*ValueUpperInvalidFormula*](../enums/commandresult.md#valueupperinvalidformula) \| [*ValueLowerInvalidFormula*](../enums/commandresult.md#valuelowerinvalidformula) \| [*InvalidSortZone*](../enums/commandresult.md#invalidsortzone) \| [*WaitingSessionConfirmation*](../enums/commandresult.md#waitingsessionconfirmation) \| [*MergeOverlap*](../enums/commandresult.md#mergeoverlap) \| [*TooManyHiddenElements*](../enums/commandresult.md#toomanyhiddenelements) \| [*Readonly*](../enums/commandresult.md#readonly) \| [*InvalidOffset*](../enums/commandresult.md#invalidoffset) \| [*InvalidViewportSize*](../enums/commandresult.md#invalidviewportsize) \| [*CommandResult*](../enums/commandresult.md)[]

___

### batchValidations

▸ **batchValidations**<T\>(...`validations`: *Validation*<T\>[]): *Validation*<T\>

Combine multiple validation functions into a single function
returning the list of result of every validation.

#### Type parameters:

Name |
:------ |
`T` |

#### Parameters:

Name | Type |
:------ | :------ |
`...validations` | *Validation*<T\>[] |

**Returns:** *Validation*<T\>

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

### chainValidations

▸ **chainValidations**<T\>(...`validations`: *Validation*<T\>[]): *Validation*<T\>

Combine multiple validation functions. Every validation is executed one after
the other. As soon as one validation fails, it stops and the cancelled reason
is returned.

#### Type parameters:

Name |
:------ |
`T` |

#### Parameters:

Name | Type |
:------ | :------ |
`...validations` | *Validation*<T\>[] |

**Returns:** *Validation*<T\>

___

### checkValidations

▸ **checkValidations**<T\>(`command`: T, ...`validations`: *Validation*<T\>[]): [*Success*](../enums/commandresult.md#success) \| [*CancelledForUnknownReason*](../enums/commandresult.md#cancelledforunknownreason) \| [*WillRemoveExistingMerge*](../enums/commandresult.md#willremoveexistingmerge) \| [*MergeIsDestructive*](../enums/commandresult.md#mergeisdestructive) \| [*CellIsMerged*](../enums/commandresult.md#cellismerged) \| [*EmptyUndoStack*](../enums/commandresult.md#emptyundostack) \| [*EmptyRedoStack*](../enums/commandresult.md#emptyredostack) \| [*NotEnoughElements*](../enums/commandresult.md#notenoughelements) \| [*NotEnoughSheets*](../enums/commandresult.md#notenoughsheets) \| [*MissingSheetName*](../enums/commandresult.md#missingsheetname) \| [*DuplicatedSheetName*](../enums/commandresult.md#duplicatedsheetname) \| [*ForbiddenCharactersInSheetName*](../enums/commandresult.md#forbiddencharactersinsheetname) \| [*WrongSheetMove*](../enums/commandresult.md#wrongsheetmove) \| [*WrongSheetPosition*](../enums/commandresult.md#wrongsheetposition) \| [*InvalidAnchorZone*](../enums/commandresult.md#invalidanchorzone) \| [*SelectionOutOfBound*](../enums/commandresult.md#selectionoutofbound) \| [*TargetOutOfSheet*](../enums/commandresult.md#targetoutofsheet) \| [*WrongPasteSelection*](../enums/commandresult.md#wrongpasteselection) \| [*EmptyClipboard*](../enums/commandresult.md#emptyclipboard) \| [*EmptyRange*](../enums/commandresult.md#emptyrange) \| [*InvalidRange*](../enums/commandresult.md#invalidrange) \| [*InvalidSheetId*](../enums/commandresult.md#invalidsheetid) \| [*InputAlreadyFocused*](../enums/commandresult.md#inputalreadyfocused) \| [*MaximumRangesReached*](../enums/commandresult.md#maximumrangesreached) \| [*InvalidChartDefinition*](../enums/commandresult.md#invalidchartdefinition) \| [*EmptyDataSet*](../enums/commandresult.md#emptydataset) \| [*InvalidDataSet*](../enums/commandresult.md#invaliddataset) \| [*InvalidLabelRange*](../enums/commandresult.md#invalidlabelrange) \| [*InvalidAutofillSelection*](../enums/commandresult.md#invalidautofillselection) \| [*WrongComposerSelection*](../enums/commandresult.md#wrongcomposerselection) \| [*MinBiggerThanMax*](../enums/commandresult.md#minbiggerthanmax) \| [*LowerBiggerThanUpper*](../enums/commandresult.md#lowerbiggerthanupper) \| [*MidBiggerThanMax*](../enums/commandresult.md#midbiggerthanmax) \| [*MinBiggerThanMid*](../enums/commandresult.md#minbiggerthanmid) \| [*FirstArgMissing*](../enums/commandresult.md#firstargmissing) \| [*SecondArgMissing*](../enums/commandresult.md#secondargmissing) \| [*MinNaN*](../enums/commandresult.md#minnan) \| [*MidNaN*](../enums/commandresult.md#midnan) \| [*MaxNaN*](../enums/commandresult.md#maxnan) \| [*ValueUpperInflectionNaN*](../enums/commandresult.md#valueupperinflectionnan) \| [*ValueLowerInflectionNaN*](../enums/commandresult.md#valuelowerinflectionnan) \| [*MinInvalidFormula*](../enums/commandresult.md#mininvalidformula) \| [*MidInvalidFormula*](../enums/commandresult.md#midinvalidformula) \| [*MaxInvalidFormula*](../enums/commandresult.md#maxinvalidformula) \| [*ValueUpperInvalidFormula*](../enums/commandresult.md#valueupperinvalidformula) \| [*ValueLowerInvalidFormula*](../enums/commandresult.md#valuelowerinvalidformula) \| [*InvalidSortZone*](../enums/commandresult.md#invalidsortzone) \| [*WaitingSessionConfirmation*](../enums/commandresult.md#waitingsessionconfirmation) \| [*MergeOverlap*](../enums/commandresult.md#mergeoverlap) \| [*TooManyHiddenElements*](../enums/commandresult.md#toomanyhiddenelements) \| [*Readonly*](../enums/commandresult.md#readonly) \| [*InvalidOffset*](../enums/commandresult.md#invalidoffset) \| [*InvalidViewportSize*](../enums/commandresult.md#invalidviewportsize) \| [*CommandResult*](../enums/commandresult.md)[]

#### Type parameters:

Name |
:------ |
`T` |

#### Parameters:

Name | Type |
:------ | :------ |
`command` | T |
`...validations` | *Validation*<T\>[] |

**Returns:** [*Success*](../enums/commandresult.md#success) \| [*CancelledForUnknownReason*](../enums/commandresult.md#cancelledforunknownreason) \| [*WillRemoveExistingMerge*](../enums/commandresult.md#willremoveexistingmerge) \| [*MergeIsDestructive*](../enums/commandresult.md#mergeisdestructive) \| [*CellIsMerged*](../enums/commandresult.md#cellismerged) \| [*EmptyUndoStack*](../enums/commandresult.md#emptyundostack) \| [*EmptyRedoStack*](../enums/commandresult.md#emptyredostack) \| [*NotEnoughElements*](../enums/commandresult.md#notenoughelements) \| [*NotEnoughSheets*](../enums/commandresult.md#notenoughsheets) \| [*MissingSheetName*](../enums/commandresult.md#missingsheetname) \| [*DuplicatedSheetName*](../enums/commandresult.md#duplicatedsheetname) \| [*ForbiddenCharactersInSheetName*](../enums/commandresult.md#forbiddencharactersinsheetname) \| [*WrongSheetMove*](../enums/commandresult.md#wrongsheetmove) \| [*WrongSheetPosition*](../enums/commandresult.md#wrongsheetposition) \| [*InvalidAnchorZone*](../enums/commandresult.md#invalidanchorzone) \| [*SelectionOutOfBound*](../enums/commandresult.md#selectionoutofbound) \| [*TargetOutOfSheet*](../enums/commandresult.md#targetoutofsheet) \| [*WrongPasteSelection*](../enums/commandresult.md#wrongpasteselection) \| [*EmptyClipboard*](../enums/commandresult.md#emptyclipboard) \| [*EmptyRange*](../enums/commandresult.md#emptyrange) \| [*InvalidRange*](../enums/commandresult.md#invalidrange) \| [*InvalidSheetId*](../enums/commandresult.md#invalidsheetid) \| [*InputAlreadyFocused*](../enums/commandresult.md#inputalreadyfocused) \| [*MaximumRangesReached*](../enums/commandresult.md#maximumrangesreached) \| [*InvalidChartDefinition*](../enums/commandresult.md#invalidchartdefinition) \| [*EmptyDataSet*](../enums/commandresult.md#emptydataset) \| [*InvalidDataSet*](../enums/commandresult.md#invaliddataset) \| [*InvalidLabelRange*](../enums/commandresult.md#invalidlabelrange) \| [*InvalidAutofillSelection*](../enums/commandresult.md#invalidautofillselection) \| [*WrongComposerSelection*](../enums/commandresult.md#wrongcomposerselection) \| [*MinBiggerThanMax*](../enums/commandresult.md#minbiggerthanmax) \| [*LowerBiggerThanUpper*](../enums/commandresult.md#lowerbiggerthanupper) \| [*MidBiggerThanMax*](../enums/commandresult.md#midbiggerthanmax) \| [*MinBiggerThanMid*](../enums/commandresult.md#minbiggerthanmid) \| [*FirstArgMissing*](../enums/commandresult.md#firstargmissing) \| [*SecondArgMissing*](../enums/commandresult.md#secondargmissing) \| [*MinNaN*](../enums/commandresult.md#minnan) \| [*MidNaN*](../enums/commandresult.md#midnan) \| [*MaxNaN*](../enums/commandresult.md#maxnan) \| [*ValueUpperInflectionNaN*](../enums/commandresult.md#valueupperinflectionnan) \| [*ValueLowerInflectionNaN*](../enums/commandresult.md#valuelowerinflectionnan) \| [*MinInvalidFormula*](../enums/commandresult.md#mininvalidformula) \| [*MidInvalidFormula*](../enums/commandresult.md#midinvalidformula) \| [*MaxInvalidFormula*](../enums/commandresult.md#maxinvalidformula) \| [*ValueUpperInvalidFormula*](../enums/commandresult.md#valueupperinvalidformula) \| [*ValueLowerInvalidFormula*](../enums/commandresult.md#valuelowerinvalidformula) \| [*InvalidSortZone*](../enums/commandresult.md#invalidsortzone) \| [*WaitingSessionConfirmation*](../enums/commandresult.md#waitingsessionconfirmation) \| [*MergeOverlap*](../enums/commandresult.md#mergeoverlap) \| [*TooManyHiddenElements*](../enums/commandresult.md#toomanyhiddenelements) \| [*Readonly*](../enums/commandresult.md#readonly) \| [*InvalidOffset*](../enums/commandresult.md#invalidoffset) \| [*InvalidViewportSize*](../enums/commandresult.md#invalidviewportsize) \| [*CommandResult*](../enums/commandresult.md)[]

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
