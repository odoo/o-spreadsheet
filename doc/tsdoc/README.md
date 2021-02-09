O-spreadsheet tsdoc

# O-spreadsheet tsdoc

## Table of contents

### Classes

- [CorePlugin](classes/coreplugin.md)
- [Model](classes/model.md)
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

- [DATETIME_FORMAT](README.md#datetime_format)
- [SPREADSHEET_DIMENSIONS](README.md#spreadsheet_dimensions)
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

Ƭ **CollaborationMessage**: [_RevisionUndoneMessage_](interfaces/revisionundonemessage.md) \| [_RevisionRedoneMessage_](interfaces/revisionredonemessage.md) \| [_RemoteRevisionMessage_](interfaces/remoterevisionmessage.md) \| [_ClientMovedMessage_](interfaces/clientmovedmessage.md) \| [_ClientJoinedMessage_](interfaces/clientjoinedmessage.md) \| [_ClientLeftMessage_](interfaces/clientleftmessage.md)

## Variables

### DATETIME_FORMAT

• `Const` **DATETIME_FORMAT**: _RegExp_

---

### SPREADSHEET_DIMENSIONS

• `Const` **SPREADSHEET_DIMENSIONS**: _object_

#### Type declaration:

| Name                  | Type     |
| --------------------- | -------- |
| `BOTTOMBAR_HEIGHT`    | _number_ |
| `DEFAULT_CELL_HEIGHT` | _number_ |
| `DEFAULT_CELL_WIDTH`  | _number_ |
| `HEADER_HEIGHT`       | _number_ |
| `HEADER_WIDTH`        | _number_ |
| `MIN_COL_WIDTH`       | _number_ |
| `MIN_ROW_HEIGHT`      | _number_ |
| `SCROLLBAR_WIDTH`     | _number_ |
| `TOPBAR_HEIGHT`       | _number_ |

---

### \_\_DEBUG\_\_

• `Const` **\_\_DEBUG\_\_**: _object_

---

### \_\_info\_\_

• `Const` **\_\_info\_\_**: _object_

We export here all entities that needs to be accessed publicly by Odoo.

Note that the **info** key is actually completed by the build process (see
the rollup.config.js file)

---

### coreTypes

• `Const` **coreTypes**: _Set_<_UPDATE_CELL_ \| _UPDATE_CELL_POSITION_ \| _CLEAR_CELL_ \| _DELETE_CONTENT_ \| _SET_DECIMAL_ \| _ADD_COLUMNS_ \| _ADD_ROWS_ \| _DELETE_COLUMNS_ \| _DELETE_ROWS_ \| _RESIZE_COLUMNS_ \| _RESIZE_ROWS_ \| _ADD_MERGE_ \| _DELETE_MERGE_ \| _CREATE_SHEET_ \| _DELETE_SHEET_ \| _DUPLICATE_SHEET_ \| _MOVE_SHEET_ \| _RENAME_SHEET_ \| _ADD_CONDITIONAL_FORMAT_ \| _DELETE_CONDITIONAL_FORMAT_ \| _CREATE_FIGURE_ \| _DELETE_FIGURE_ \| _UPDATE_FIGURE_ \| _SET_FORMATTING_ \| _CLEAR_FORMATTING_ \| _SET_BORDER_ \| _CREATE_CHART_ \| _UPDATE_CHART_\>

---

### functionCache

• `Const` **functionCache**: _object_

---

### helpers

• `Const` **helpers**: _object_

#### Type declaration:

| Name                 | Type                                                                                |
| -------------------- | ----------------------------------------------------------------------------------- |
| `args`               | (`strings`: _string_) => Arg[]                                                      |
| `computeTextWidth`   | (`context`: CanvasRenderingContext2D, `text`: _string_, `style`: Style) => _number_ |
| `createFullMenuItem` | (`key`: _string_, `value`: MenuItem) => FullMenuItem                                |
| `formatDecimal`      | (`n`: _number_, `decimals`: _number_, `sep`: _string_) => _string_                  |
| `numberToLetters`    | (`n`: _number_) => _string_                                                         |
| `toBoolean`          | (`value`: _any_) => _boolean_                                                       |
| `toCartesian`        | (`xc`: _string_) => [*number*, *number*]                                            |
| `toNumber`           | (`value`: _any_) => _number_                                                        |
| `toString`           | (`value`: _any_) => _string_                                                        |
| `toXC`               | (`col`: _number_, `row`: _number_) => _string_                                      |
| `toZone`             | (`xc`: _string_, `keepBoundaries`: _boolean_) => Zone                               |
| `uuidv4`             | () => _string_                                                                      |

---

### registries

• `Const` **registries**: _object_

#### Type declaration:

| Name                        | Type                                        |
| --------------------------- | ------------------------------------------- |
| `autofillModifiersRegistry` | _Registry_<AutofillModifierImplementation\> |
| `autofillRulesRegistry`     | _Registry_<AutofillRule\>                   |
| `cellMenuRegistry`          | _MenuItemRegistry_                          |
| `colMenuRegistry`           | _MenuItemRegistry_                          |
| `corePluginRegistry`        | _Registry_<CorePluginConstructor\>          |
| `functionRegistry`          | _FunctionRegistry_                          |
| `inverseCommandRegistry`    | _Registry_<InverseFunction\>                |
| `otRegistry`                | _OTRegistry_                                |
| `rowMenuRegistry`           | _MenuItemRegistry_                          |
| `sheetMenuRegistry`         | _MenuItemRegistry_                          |
| `sidePanelRegistry`         | _Registry_<SidePanelContent\>               |
| `topbarComponentRegistry`   | _Registry_<TopbarComponent\>                |
| `topbarMenuRegistry`        | _MenuItemRegistry_                          |
| `uiPluginRegistry`          | _Registry_<UIPluginConstuctor\>             |

## Functions

### astToFormula

▸ **astToFormula**(`ast`: AST): _string_

Converts an ast formula to the corresponding string

#### Parameters:

| Name  | Type |
| ----- | ---- |
| `ast` | AST  |

**Returns:** _string_

---

### normalize

▸ **normalize**(`formula`: _string_): NormalizedFormula

parses a formula (as a string) into the same formula,
but with the references to other cells extracted

=sum(a3:b1) + c3 --> =sum(|0|) + |1|

#### Parameters:

| Name      | Type     | Description |
| --------- | -------- | ----------- |
| `formula` | _string_ |             |

**Returns:** NormalizedFormula

---

### parse

▸ **parse**(`str`: _string_): AST

Parse an expression (as a string) into an AST.

#### Parameters:

| Name  | Type     |
| ----- | -------- |
| `str` | _string_ |

**Returns:** AST

---

### setTranslationMethod

▸ **setTranslationMethod**(`tfn`: TranslationFunction): _void_

Allow to inject a translation function from outside o-spreadsheet.

#### Parameters:

| Name  | Type                | Description                               |
| ----- | ------------------- | ----------------------------------------- |
| `tfn` | TranslationFunction | the function that will do the translation |

**Returns:** _void_
