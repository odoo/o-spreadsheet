o-spreadsheet API

# o-spreadsheet API

## Table of contents

### Enumerations

- [CommandResult](enums/commandresult.md)

### Classes

- [CorePlugin](classes/coreplugin.md)
- [DispatchResult](classes/dispatchresult.md)
- [Model](classes/model.md)
- [Revision](classes/revision.md)
- [Spreadsheet](classes/spreadsheet.md)
- [UIPlugin](classes/uiplugin.md)

### Interfaces

- [Client](interfaces/client.md)
- [ClientJoinedMessage](interfaces/clientjoinedmessage.md)
- [ClientLeftMessage](interfaces/clientleftmessage.md)
- [ClientMovedMessage](interfaces/clientmovedmessage.md)
- [RemoteRevisionMessage](interfaces/remoterevisionmessage.md)
- [RevisionRedoneMessage](interfaces/revisionredonemessage.md)
- [RevisionUndoneMessage](interfaces/revisionundonemessage.md)
- [TransportService](interfaces/transportservice.md)

### Type aliases

- [CancelledReason](README.md#cancelledreason)
- [CollaborationMessage](README.md#collaborationmessage)

### Variables

- [DATETIME\_FORMAT](README.md#datetime_format)
- [SPREADSHEET\_DIMENSIONS](README.md#spreadsheet_dimensions)
- [\_\_DEBUG\_\_](README.md#__debug__)
- [\_\_info\_\_](README.md#__info__)
- [coreTypes](README.md#coretypes)
- [functionCache](README.md#functioncache)
- [helpers](README.md#helpers)
- [readonlyAllowedCommands](README.md#readonlyallowedcommands)
- [registries](README.md#registries)

### Functions

- [astToFormula](README.md#asttoformula)
- [normalize](README.md#normalize)
- [parse](README.md#parse)
- [setTranslationMethod](README.md#settranslationmethod)

## Type aliases

### CancelledReason

Ƭ **CancelledReason**: *Exclude*<[*CommandResult*](enums/commandresult.md), [*Success*](enums/commandresult.md#success)\>

___

### CollaborationMessage

Ƭ **CollaborationMessage**: [*RevisionUndoneMessage*](interfaces/revisionundonemessage.md) \| [*RevisionRedoneMessage*](interfaces/revisionredonemessage.md) \| [*RemoteRevisionMessage*](interfaces/remoterevisionmessage.md) \| SnapshotMessage \| SnapshotCreatedMessage \| [*ClientMovedMessage*](interfaces/clientmovedmessage.md) \| [*ClientJoinedMessage*](interfaces/clientjoinedmessage.md) \| [*ClientLeftMessage*](interfaces/clientleftmessage.md)

## Variables

### DATETIME\_FORMAT

• `Const` **DATETIME\_FORMAT**: *RegExp*

___

### SPREADSHEET\_DIMENSIONS

• `Const` **SPREADSHEET\_DIMENSIONS**: *object*

#### Type declaration:

Name | Type |
:------ | :------ |
`BOTTOMBAR_HEIGHT` | *number* |
`DEFAULT_CELL_HEIGHT` | *number* |
`DEFAULT_CELL_WIDTH` | *number* |
`HEADER_HEIGHT` | *number* |
`HEADER_WIDTH` | *number* |
`MIN_COL_WIDTH` | *number* |
`MIN_ROW_HEIGHT` | *number* |
`SCROLLBAR_WIDTH` | *number* |
`TOPBAR_HEIGHT` | *number* |

___

### \_\_DEBUG\_\_

• `Const` **\_\_DEBUG\_\_**: *object*

#### Type declaration:

___

### \_\_info\_\_

• `Const` **\_\_info\_\_**: *object*

We export here all entities that needs to be accessed publicly by Odoo.

Note that the __info__ key is actually completed by the build process (see
the rollup.config.js file)

#### Type declaration:

___

### coreTypes

• `Const` **coreTypes**: *Set*<*UPDATE_CELL* \| *UPDATE_CELL_POSITION* \| *CLEAR_CELL* \| *DELETE_CONTENT* \| *SET_DECIMAL* \| *ADD_COLUMNS_ROWS* \| *REMOVE_COLUMNS_ROWS* \| *RESIZE_COLUMNS_ROWS* \| *HIDE_COLUMNS_ROWS* \| *UNHIDE_COLUMNS_ROWS* \| *SET_GRID_LINES_VISIBILITY* \| *ADD_MERGE* \| *REMOVE_MERGE* \| *CREATE_SHEET* \| *DELETE_SHEET* \| *DUPLICATE_SHEET* \| *MOVE_SHEET* \| *RENAME_SHEET* \| *ADD_CONDITIONAL_FORMAT* \| *REMOVE_CONDITIONAL_FORMAT* \| *CREATE_FIGURE* \| *DELETE_FIGURE* \| *UPDATE_FIGURE* \| *SET_FORMATTING* \| *CLEAR_FORMATTING* \| *SET_BORDER* \| *CREATE_CHART* \| *UPDATE_CHART*\>

___

### functionCache

• `Const` **functionCache**: *object*

#### Type declaration:

___

### helpers

• `Const` **helpers**: *object*

#### Type declaration:

Name | Type |
:------ | :------ |
`UuidGenerator` | *typeof* UuidGenerator |
`args` | (`strings`: *string*) => Arg[] |
`computeTextWidth` | (`context`: CanvasRenderingContext2D, `text`: *string*, `style`: Style) => *number* |
`createFullMenuItem` | (`key`: *string*, `value`: MenuItem) => FullMenuItem |
`formatDecimal` | (`n`: *number*, `decimals`: *number*, `sep`: *string*) => *string* |
`numberToLetters` | (`n`: *number*) => *string* |
`toBoolean` | (`value`: ArgValue) => *boolean* |
`toCartesian` | (`xc`: *string*) => [*number*, *number*] |
`toNumber` | (`value`: ArgValue) => *number* |
`toString` | (`value`: ArgValue) => *string* |
`toXC` | (`col`: *number*, `row`: *number*) => *string* |
`toZone` | (`xc`: *string*) => Zone |

___

### readonlyAllowedCommands

• `Const` **readonlyAllowedCommands**: *Set*<*UPDATE_CELL* \| *UPDATE_CELL_POSITION* \| *CLEAR_CELL* \| *DELETE_CONTENT* \| *SET_DECIMAL* \| *ADD_COLUMNS_ROWS* \| *REMOVE_COLUMNS_ROWS* \| *RESIZE_COLUMNS_ROWS* \| *HIDE_COLUMNS_ROWS* \| *UNHIDE_COLUMNS_ROWS* \| *SET_GRID_LINES_VISIBILITY* \| *ADD_MERGE* \| *REMOVE_MERGE* \| *CREATE_SHEET* \| *DELETE_SHEET* \| *DUPLICATE_SHEET* \| *MOVE_SHEET* \| *RENAME_SHEET* \| *ADD_CONDITIONAL_FORMAT* \| *REMOVE_CONDITIONAL_FORMAT* \| *CREATE_FIGURE* \| *DELETE_FIGURE* \| *UPDATE_FIGURE* \| *SET_FORMATTING* \| *CLEAR_FORMATTING* \| *SET_BORDER* \| *CREATE_CHART* \| *UPDATE_CHART* \| *REQUEST_UNDO* \| *REQUEST_REDO* \| *UNDO* \| *REDO* \| *ENABLE_NEW_SELECTION_INPUT* \| *DISABLE_SELECTION_INPUT* \| *FOCUS_RANGE* \| *ADD_EMPTY_RANGE* \| *REMOVE_RANGE* \| *CHANGE_RANGE* \| *COPY* \| *CUT* \| *PASTE* \| *CUT_AND_PASTE* \| *AUTOFILL_CELL* \| *PASTE_FROM_OS_CLIPBOARD* \| *ACTIVATE_PAINT_FORMAT* \| *PASTE_CONDITIONAL_FORMAT* \| *AUTORESIZE_COLUMNS* \| *AUTORESIZE_ROWS* \| *MOVE_POSITION* \| *DELETE_SHEET_CONFIRMATION* \| *ACTIVATE_SHEET* \| *START_SELECTION* \| *START_SELECTION_EXPANSION* \| *PREPARE_SELECTION_EXPANSION* \| *STOP_SELECTION* \| *SELECT_CELL* \| *SET_SELECTION* \| *SELECT_COLUMN* \| *SELECT_ROW* \| *SELECT_ALL* \| *ALTER_SELECTION* \| *EVALUATE_CELLS* \| *ADD_HIGHLIGHTS* \| *REMOVE_HIGHLIGHTS* \| *REMOVE_ALL_HIGHLIGHTS* \| *HIGHLIGHT_SELECTION* \| *ADD_PENDING_HIGHLIGHTS* \| *RESET_PENDING_HIGHLIGHT* \| *SET_HIGHLIGHT_COLOR* \| *STOP_COMPOSER_RANGE_SELECTION* \| *START_EDITION* \| *STOP_EDITION* \| *SET_CURRENT_CONTENT* \| *CHANGE_COMPOSER_CURSOR_SELECTION* \| *REPLACE_COMPOSER_CURSOR_SELECTION* \| *START* \| *AUTOFILL* \| *AUTOFILL_SELECT* \| *SET_FORMULA_VISIBILITY* \| *AUTOFILL_AUTO* \| *SELECT_FIGURE* \| *UPDATE_SEARCH* \| *REFRESH_SEARCH* \| *CLEAR_SEARCH* \| *SELECT_SEARCH_PREVIOUS_MATCH* \| *SELECT_SEARCH_NEXT_MATCH* \| *REPLACE_SEARCH* \| *REPLACE_ALL_SEARCH* \| *SORT_CELLS* \| *RESIZE_VIEWPORT* \| *REFRESH_CHART* \| *SUM_SELECTION* \| *DELETE_CELL* \| *INSERT_CELL* \| *SET_VIEWPORT_OFFSET* \| *EVALUATE_ALL_SHEETS* \| *ACTIVATE_NEXT_SHEET* \| *ACTIVATE_PREVIOUS_SHEET*\>

___

### registries

• `Const` **registries**: *object*

#### Type declaration:

Name | Type |
:------ | :------ |
`autofillModifiersRegistry` | *Registry*<AutofillModifierImplementation\> |
`autofillRulesRegistry` | *Registry*<AutofillRule\> |
`cellMenuRegistry` | *MenuItemRegistry* |
`colMenuRegistry` | *MenuItemRegistry* |
`corePluginRegistry` | *Registry*<CorePluginConstructor\> |
`functionRegistry` | *FunctionRegistry* |
`inverseCommandRegistry` | *Registry*<InverseFunction\> |
`otRegistry` | *OTRegistry* |
`rowMenuRegistry` | *MenuItemRegistry* |
`sheetMenuRegistry` | *MenuItemRegistry* |
`sidePanelRegistry` | *Registry*<SidePanelContent\> |
`topbarComponentRegistry` | *Registry*<TopbarComponent\> |
`topbarMenuRegistry` | *MenuItemRegistry* |
`uiPluginRegistry` | *Registry*<UIPluginConstructor\> |

## Functions

### astToFormula

▸ **astToFormula**(`ast`: AST): *string*

Converts an ast formula to the corresponding string

#### Parameters:

Name | Type |
:------ | :------ |
`ast` | AST |

**Returns:** *string*

___

### normalize

▸ **normalize**(`formula`: *string*): NormalizedFormula

parses a formula (as a string) into the same formula,
but with the references to other cells extracted

=sum(a3:b1) + c3 --> =sum(|0|) + |1|

#### Parameters:

Name | Type |
:------ | :------ |
`formula` | *string* |

**Returns:** NormalizedFormula

___

### parse

▸ **parse**(`str`: *string*): AST

Parse an expression (as a string) into an AST.

#### Parameters:

Name | Type |
:------ | :------ |
`str` | *string* |

**Returns:** AST

___

### setTranslationMethod

▸ **setTranslationMethod**(`tfn`: TranslationFunction): *void*

Allow to inject a translation function from outside o-spreadsheet.

#### Parameters:

Name | Type | Description |
:------ | :------ | :------ |
`tfn` | TranslationFunction | the function that will do the translation    |

**Returns:** *void*
