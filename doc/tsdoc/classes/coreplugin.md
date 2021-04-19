[o-spreadsheet API](../README.md) / CorePlugin

# Class: CorePlugin<State, C\>

Core plugins handle spreadsheet data.
They are responsible to import, export and maintain the spreadsheet
persisted state.
They should not be concerned about UI parts or transient state.

## Type parameters

Name | Default |
:------ | :------ |
`State` | *any* |
`C` | CoreCommand |

## Hierarchy

* *BasePlugin*<State, C\>

  ↳ **CorePlugin**

## Implements

* *RangeProvider*

## Table of contents

### Constructors

- [constructor](coreplugin.md#constructor)

### Properties

- [dispatch](coreplugin.md#dispatch)
- [getters](coreplugin.md#getters)
- [history](coreplugin.md#history)
- [range](coreplugin.md#range)
- [getters](coreplugin.md#getters)

### Methods

- [adaptRanges](coreplugin.md#adaptranges)
- [allowDispatch](coreplugin.md#allowdispatch)
- [beforeHandle](coreplugin.md#beforehandle)
- [export](coreplugin.md#export)
- [finalize](coreplugin.md#finalize)
- [handle](coreplugin.md#handle)
- [import](coreplugin.md#import)

## Constructors

### constructor

\+ **new CorePlugin**<State, C\>(`getters`: CoreGetters, `stateObserver`: *StateObserver*, `range`: *RangeAdapter*, `dispatch`: <T, C\>(`type`: {} *extends* *Pick*<C, Exclude<keyof C, *type*\>\> ? T : *never*) => [*CommandResult*](../enums/commandresult.md)<T, C\>(`type`: T, `r`: *Pick*<C, Exclude<keyof C, *type*\>\>) => [*CommandResult*](../enums/commandresult.md), `config`: ModelConfig): [*CorePlugin*](coreplugin.md)<State, C\>

#### Type parameters:

Name | Default |
:------ | :------ |
`State` | *any* |
`C` | CoreCommand |

#### Parameters:

Name | Type |
:------ | :------ |
`getters` | CoreGetters |
`stateObserver` | *StateObserver* |
`range` | *RangeAdapter* |
`dispatch` | <T, C\>(`type`: {} *extends* *Pick*<C, Exclude<keyof C, *type*\>\> ? T : *never*) => [*CommandResult*](../enums/commandresult.md)<T, C\>(`type`: T, `r`: *Pick*<C, Exclude<keyof C, *type*\>\>) => [*CommandResult*](../enums/commandresult.md) |
`config` | ModelConfig |

**Returns:** [*CorePlugin*](coreplugin.md)<State, C\>

## Properties

### dispatch

• `Protected` **dispatch**: <T, C\>(`type`: {} *extends* *Pick*<C, Exclude<keyof C, *type*\>\> ? T : *never*) => [*CommandResult*](../enums/commandresult.md)<T, C\>(`type`: T, `r`: *Pick*<C, Exclude<keyof C, *type*\>\>) => [*CommandResult*](../enums/commandresult.md)

#### Type declaration:

▸ <T, C\>(`type`: {} *extends* *Pick*<C, Exclude<keyof C, *type*\>\> ? T : *never*): [*CommandResult*](../enums/commandresult.md)

#### Type parameters:

Name | Type |
:------ | :------ |
`T` | *UPDATE_CELL* \| *UPDATE_CELL_POSITION* \| *CLEAR_CELL* \| *DELETE_CONTENT* \| *SET_DECIMAL* \| *ADD_COLUMNS_ROWS* \| *REMOVE_COLUMNS_ROWS* \| *RESIZE_COLUMNS_ROWS* \| *HIDE_COLUMNS_ROWS* \| *UNHIDE_COLUMNS_ROWS* \| *ADD_MERGE* \| *REMOVE_MERGE* \| *CREATE_SHEET* \| *DELETE_SHEET* \| *DUPLICATE_SHEET* \| *MOVE_SHEET* \| *RENAME_SHEET* \| *ADD_CONDITIONAL_FORMAT* \| *REMOVE_CONDITIONAL_FORMAT* \| *CREATE_FIGURE* \| *DELETE_FIGURE* \| *UPDATE_FIGURE* \| *SET_FORMATTING* \| *CLEAR_FORMATTING* \| *SET_BORDER* \| *CREATE_CHART* \| *UPDATE_CHART* |
`C` | { `type`: T  } & UpdateCellCommand \| { `type`: T  } & UpdateCellPositionCommand \| { `type`: T  } & ClearCellCommand \| { `type`: T  } & DeleteContentCommand \| { `type`: T  } & SetDecimalCommand \| { `type`: T  } & AddColumnsRowsCommand \| { `type`: T  } & RemoveColumnsRowsCommand \| { `type`: T  } & ResizeColumnsRowsCommand \| { `type`: T  } & HideColumnsRowsCommand \| { `type`: T  } & UnhideColumnsRowsCommand \| { `type`: T  } & AddMergeCommand \| { `type`: T  } & RemoveMergeCommand \| { `type`: T  } & CreateSheetCommand \| { `type`: T  } & DeleteSheetCommand \| { `type`: T  } & DuplicateSheetCommand \| { `type`: T  } & MoveSheetCommand \| { `type`: T  } & RenameSheetCommand \| { `type`: T  } & AddConditionalFormatCommand \| { `type`: T  } & RemoveConditionalFormatCommand \| { `type`: T  } & CreateFigureCommand \| { `type`: T  } & DeleteFigureCommand \| { `type`: T  } & *UpdateFigureCommand* \| { `type`: T  } & SetFormattingCommand \| { `type`: T  } & ClearFormattingCommand \| { `type`: T  } & SetBorderCommand \| { `type`: T  } & CreateChartCommand \| { `type`: T  } & UpdateChartCommand |

#### Parameters:

Name | Type |
:------ | :------ |
`type` | {} *extends* *Pick*<C, Exclude<keyof C, *type*\>\> ? T : *never* |

**Returns:** [*CommandResult*](../enums/commandresult.md)

▸ <T, C\>(`type`: T, `r`: *Pick*<C, Exclude<keyof C, *type*\>\>): [*CommandResult*](../enums/commandresult.md)

#### Type parameters:

Name | Type |
:------ | :------ |
`T` | *UPDATE_CELL* \| *UPDATE_CELL_POSITION* \| *CLEAR_CELL* \| *DELETE_CONTENT* \| *SET_DECIMAL* \| *ADD_COLUMNS_ROWS* \| *REMOVE_COLUMNS_ROWS* \| *RESIZE_COLUMNS_ROWS* \| *HIDE_COLUMNS_ROWS* \| *UNHIDE_COLUMNS_ROWS* \| *ADD_MERGE* \| *REMOVE_MERGE* \| *CREATE_SHEET* \| *DELETE_SHEET* \| *DUPLICATE_SHEET* \| *MOVE_SHEET* \| *RENAME_SHEET* \| *ADD_CONDITIONAL_FORMAT* \| *REMOVE_CONDITIONAL_FORMAT* \| *CREATE_FIGURE* \| *DELETE_FIGURE* \| *UPDATE_FIGURE* \| *SET_FORMATTING* \| *CLEAR_FORMATTING* \| *SET_BORDER* \| *CREATE_CHART* \| *UPDATE_CHART* |
`C` | { `type`: T  } & UpdateCellCommand \| { `type`: T  } & UpdateCellPositionCommand \| { `type`: T  } & ClearCellCommand \| { `type`: T  } & DeleteContentCommand \| { `type`: T  } & SetDecimalCommand \| { `type`: T  } & AddColumnsRowsCommand \| { `type`: T  } & RemoveColumnsRowsCommand \| { `type`: T  } & ResizeColumnsRowsCommand \| { `type`: T  } & HideColumnsRowsCommand \| { `type`: T  } & UnhideColumnsRowsCommand \| { `type`: T  } & AddMergeCommand \| { `type`: T  } & RemoveMergeCommand \| { `type`: T  } & CreateSheetCommand \| { `type`: T  } & DeleteSheetCommand \| { `type`: T  } & DuplicateSheetCommand \| { `type`: T  } & MoveSheetCommand \| { `type`: T  } & RenameSheetCommand \| { `type`: T  } & AddConditionalFormatCommand \| { `type`: T  } & RemoveConditionalFormatCommand \| { `type`: T  } & CreateFigureCommand \| { `type`: T  } & DeleteFigureCommand \| { `type`: T  } & *UpdateFigureCommand* \| { `type`: T  } & SetFormattingCommand \| { `type`: T  } & ClearFormattingCommand \| { `type`: T  } & SetBorderCommand \| { `type`: T  } & CreateChartCommand \| { `type`: T  } & UpdateChartCommand |

#### Parameters:

Name | Type |
:------ | :------ |
`type` | T |
`r` | *Pick*<C, Exclude<keyof C, *type*\>\> |

**Returns:** [*CommandResult*](../enums/commandresult.md)

___

### getters

• `Protected` **getters**: CoreGetters

___

### history

• `Protected` **history**: *WorkbookHistory*<State\>

___

### range

• `Protected` **range**: *RangeAdapter*

___

### getters

▪ `Static` **getters**: *string*[]

## Methods

### adaptRanges

▸ **adaptRanges**(`applyChange`: ApplyRangeChange, `sheetId?`: *string*): *void*

This method can be implemented in any plugin, to loop over the plugin's data structure and adapt the plugin's ranges.
To adapt them, the implementation of the function must have a perfect knowledge of the data structure, thus
implementing the loops over it makes sense in the plugin itself.
When calling the method applyChange, the range will be adapted if necessary, then a copy will be returned along with
the type of change that occurred.

#### Parameters:

Name | Type | Description |
:------ | :------ | :------ |
`applyChange` | ApplyRangeChange | a function that, when called, will adapt the range according to the change on the grid   |
`sheetId?` | *string* | an optional sheetId to adapt either range of that sheet specifically, or ranges pointing to that sheet    |

**Returns:** *void*

___

### allowDispatch

▸ **allowDispatch**(`command`: C): [*CommandResult*](../enums/commandresult.md)

Before a command is accepted, the model will ask each plugin if the command
is allowed.  If all of then return true, then we can proceed. Otherwise,
the command is cancelled.

There should not be any side effects in this method.

#### Parameters:

Name | Type |
:------ | :------ |
`command` | C |

**Returns:** [*CommandResult*](../enums/commandresult.md)

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

### export

▸ **export**(`data`: WorkbookData): *void*

#### Parameters:

Name | Type |
:------ | :------ |
`data` | WorkbookData |

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

___

### import

▸ **import**(`data`: WorkbookData): *void*

#### Parameters:

Name | Type |
:------ | :------ |
`data` | WorkbookData |

**Returns:** *void*
