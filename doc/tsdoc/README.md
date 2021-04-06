o-spreadsheet API

# o-spreadsheet API

## Table of contents

### Classes

- [CorePlugin](classes/coreplugin.md)
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

- [CollaborationMessage](README.md#collaborationmessage)

### Variables

- [DATETIME\_FORMAT](README.md#datetime_format)
- [SPREADSHEET\_DIMENSIONS](README.md#spreadsheet_dimensions)
- [\_\_DEBUG\_\_](README.md#__debug__)
- [\_\_info\_\_](README.md#__info__)
- [coreTypes](README.md#coretypes)
- [functionCache](README.md#functioncache)
- [helpers](README.md#helpers)
- [registries](README.md#registries)

### Functions

- [astToFormula](README.md#asttoformula)
- [normalize](README.md#normalize)
- [parse](README.md#parse)
- [setTranslationMethod](README.md#settranslationmethod)

## Type aliases

### CollaborationMessage

Ƭ **CollaborationMessage**: [*RevisionUndoneMessage*](interfaces/revisionundonemessage.md) \| [*RevisionRedoneMessage*](interfaces/revisionredonemessage.md) \| [*RemoteRevisionMessage*](interfaces/remoterevisionmessage.md) \| [*ClientMovedMessage*](interfaces/clientmovedmessage.md) \| [*ClientJoinedMessage*](interfaces/clientjoinedmessage.md) \| [*ClientLeftMessage*](interfaces/clientleftmessage.md)

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

• `Const` **coreTypes**: *Set*<*UPDATE_CELL* \| *UPDATE_CELL_POSITION* \| *CLEAR_CELL* \| *DELETE_CONTENT* \| *SET_DECIMAL* \| *ADD_COLUMNS_ROWS* \| *REMOVE_COLUMNS_ROWS* \| *RESIZE_COLUMNS_ROWS* \| *HIDE_COLUMNS_ROWS* \| *UNHIDE_COLUMNS_ROWS* \| *ADD_MERGE* \| *REMOVE_MERGE* \| *CREATE_SHEET* \| *DELETE_SHEET* \| *DUPLICATE_SHEET* \| *MOVE_SHEET* \| *RENAME_SHEET* \| *ADD_CONDITIONAL_FORMAT* \| *REMOVE_CONDITIONAL_FORMAT* \| *CREATE_FIGURE* \| *DELETE_FIGURE* \| *UPDATE_FIGURE* \| *SET_FORMATTING* \| *CLEAR_FORMATTING* \| *SET_BORDER* \| *CREATE_CHART* \| *UPDATE_CHART*\>

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
`args` | (`strings`: *string*) => Arg[] |
`computeTextWidth` | (`context`: CanvasRenderingContext2D, `text`: *string*, `style`: Style) => *number* |
`createFullMenuItem` | (`key`: *string*, `value`: MenuItem) => FullMenuItem |
`formatDecimal` | (`n`: *number*, `decimals`: *number*, `sep`: *string*) => *string* |
`numberToLetters` | (`n`: *number*) => *string* |
`toBoolean` | (`value`: *any*) => *boolean* |
`toCartesian` | (`xc`: *string*) => [*number*, *number*] |
`toNumber` | (`value`: *any*) => *number* |
`toString` | (`value`: *any*) => *string* |
`toXC` | (`col`: *number*, `row`: *number*) => *string* |
`toZone` | (`xc`: *string*) => Zone |
`uuidv4` | () => *string* |

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
