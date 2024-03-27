o-spreadsheet API

# o-spreadsheet API

## Table of contents

### Enumerations

- [CommandResult](enums/CommandResult.md)

### Classes

- [AbstractChart](classes/AbstractChart.md)
- [CorePlugin](classes/CorePlugin.md)
- [DispatchResult](classes/DispatchResult.md)
- [EvaluationError](classes/EvaluationError.md)
- [Model](classes/Model.md)
- [Registry](classes/Registry.md)
- [Revision](classes/Revision.md)
- [Spreadsheet](classes/Spreadsheet.md)
- [UIPlugin](classes/UIPlugin.md)

### Interfaces

- [Client](interfaces/Client.md)
- [ClientJoinedMessage](interfaces/ClientJoinedMessage.md)
- [ClientLeftMessage](interfaces/ClientLeftMessage.md)
- [ClientMovedMessage](interfaces/ClientMovedMessage.md)
- [RemoteRevisionMessage](interfaces/RemoteRevisionMessage.md)
- [RevisionRedoneMessage](interfaces/RevisionRedoneMessage.md)
- [RevisionUndoneMessage](interfaces/RevisionUndoneMessage.md)
- [TransportService](interfaces/TransportService.md)

### Type aliases

- [CancelledReason](README.md#cancelledreason)
- [CollaborationMessage](README.md#collaborationmessage)

### Variables

- [DATETIME\_FORMAT](README.md#datetime_format)
- [SPREADSHEET\_DIMENSIONS](README.md#spreadsheet_dimensions)
- [\_\_info\_\_](README.md#__info__)
- [cellTypes](README.md#celltypes)
- [components](README.md#components)
- [coreTypes](README.md#coretypes)
- [functionCache](README.md#functioncache)
- [helpers](README.md#helpers)
- [invalidateEvaluationCommands](README.md#invalidateevaluationcommands)
- [readonlyAllowedCommands](README.md#readonlyallowedcommands)
- [registries](README.md#registries)

### Functions

- [astToFormula](README.md#asttoformula)
- [compile](README.md#compile)
- [convertAstNodes](README.md#convertastnodes)
- [findCellInNewZone](README.md#findcellinnewzone)
- [load](README.md#load)
- [parse](README.md#parse)
- [setTranslationMethod](README.md#settranslationmethod)
- [tokenize](README.md#tokenize)

## Type aliases

### CancelledReason

Ƭ **CancelledReason**: `Exclude`<[`CommandResult`](enums/CommandResult.md), [`Success`](enums/CommandResult.md#success)\>

___

### CollaborationMessage

Ƭ **CollaborationMessage**: [`RevisionUndoneMessage`](interfaces/RevisionUndoneMessage.md) \| [`RevisionRedoneMessage`](interfaces/RevisionRedoneMessage.md) \| [`RemoteRevisionMessage`](interfaces/RemoteRevisionMessage.md) \| `SnapshotMessage` \| `SnapshotCreatedMessage` \| [`ClientMovedMessage`](interfaces/ClientMovedMessage.md) \| [`ClientJoinedMessage`](interfaces/ClientJoinedMessage.md) \| [`ClientLeftMessage`](interfaces/ClientLeftMessage.md)

## Variables

### DATETIME\_FORMAT

• **DATETIME\_FORMAT**: `RegExp`

___

### SPREADSHEET\_DIMENSIONS

• **SPREADSHEET\_DIMENSIONS**: `Object`

#### Type declaration

| Name | Type |
| :------ | :------ |
| `BOTTOMBAR_HEIGHT` | `number` |
| `DEFAULT_CELL_HEIGHT` | `number` |
| `DEFAULT_CELL_WIDTH` | `number` |
| `HEADER_HEIGHT` | `number` |
| `HEADER_WIDTH` | `number` |
| `MIN_COL_WIDTH` | `number` |
| `MIN_ROW_HEIGHT` | `number` |
| `SCROLLBAR_WIDTH` | `number` |
| `TOPBAR_HEIGHT` | `number` |

___

### \_\_info\_\_

• **\_\_info\_\_**: `Object` = `{}`

We export here all entities that needs to be accessed publicly by Odoo.

Note that the __info__ key is actually completed by the build process (see
the rollup.config.js file)

___

### cellTypes

• **cellTypes**: `Object`

#### Type declaration

| Name | Type |
| :------ | :------ |
| `LinkCell` | typeof `LinkCell` |

___

### components

• **components**: `Object`

#### Type declaration

| Name | Type |
| :------ | :------ |
| `BarConfigPanel` | typeof `BarConfigPanel` |
| `ChartFigure` | typeof `ChartFigure` |
| `ChartJsComponent` | typeof `ChartJsComponent` |
| `ChartPanel` | typeof `ChartPanel` |
| `GaugeChartConfigPanel` | typeof `GaugeChartConfigPanel` |
| `GaugeChartDesignPanel` | typeof `GaugeChartDesignPanel` |
| `Grid` | typeof `Grid` |
| `GridOverlay` | typeof `GridOverlay` |
| `LineBarPieConfigPanel` | typeof `LineBarPieConfigPanel` |
| `LineBarPieDesignPanel` | typeof `LineBarPieDesignPanel` |
| `LineConfigPanel` | typeof `LineConfigPanel` |
| `ScorecardChart` | typeof `ScorecardChart` |
| `ScorecardChartConfigPanel` | typeof `ScorecardChartConfigPanel` |
| `ScorecardChartDesignPanel` | typeof `ScorecardChartDesignPanel` |

___

### coreTypes

• **coreTypes**: `Set`<``"UPDATE_CELL"`` \| ``"UPDATE_CELL_POSITION"`` \| ``"CLEAR_CELL"`` \| ``"DELETE_CONTENT"`` \| ``"SET_DECIMAL"`` \| ``"ADD_COLUMNS_ROWS"`` \| ``"REMOVE_COLUMNS_ROWS"`` \| ``"RESIZE_COLUMNS_ROWS"`` \| ``"HIDE_COLUMNS_ROWS"`` \| ``"UNHIDE_COLUMNS_ROWS"`` \| ``"SET_GRID_LINES_VISIBILITY"`` \| ``"FREEZE_COLUMNS"`` \| ``"FREEZE_ROWS"`` \| ``"UNFREEZE_COLUMNS_ROWS"`` \| ``"UNFREEZE_COLUMNS"`` \| ``"UNFREEZE_ROWS"`` \| ``"ADD_MERGE"`` \| ``"REMOVE_MERGE"`` \| ``"CREATE_SHEET"`` \| ``"DELETE_SHEET"`` \| ``"DUPLICATE_SHEET"`` \| ``"MOVE_SHEET"`` \| ``"RENAME_SHEET"`` \| ``"HIDE_SHEET"`` \| ``"SHOW_SHEET"`` \| ``"MOVE_RANGES"`` \| ``"ADD_CONDITIONAL_FORMAT"`` \| ``"REMOVE_CONDITIONAL_FORMAT"`` \| ``"MOVE_CONDITIONAL_FORMAT"`` \| ``"CREATE_FIGURE"`` \| ``"DELETE_FIGURE"`` \| ``"UPDATE_FIGURE"`` \| ``"SET_FORMATTING"`` \| ``"CLEAR_FORMATTING"`` \| ``"SET_BORDER"`` \| ``"CREATE_CHART"`` \| ``"UPDATE_CHART"``\>

___

### functionCache

• **functionCache**: `Object` = `{}`

#### Index signature

▪ [key: `string`]: `Omit`<`CompiledFormula`, ``"dependencies"`` \| ``"tokens"``\>

___

### helpers

• **helpers**: `Object`

#### Type declaration

| Name | Type |
| :------ | :------ |
| `CellErrorLevel` | typeof `CellErrorLevel` |
| `ColorGenerator` | typeof `ColorGenerator` |
| `EvaluationError` | typeof [`EvaluationError`](classes/EvaluationError.md) |
| `UuidGenerator` | typeof `UuidGenerator` |
| `args` | (`strings`: `string`) => `ArgDefinition`[] |
| `chartFontColor` | (`backgroundColor`: `undefined` \| `Color`) => `Color` |
| `colorToRGBA` | (`color`: `Color`) => `RGBA` |
| `computeTextWidth` | (`context`: `CanvasRenderingContext2D`, `text`: `string`, `style`: `Style`) => `number` |
| `createEmptyWorkbookData` | (`sheetName`: `string`) => `WorkbookData` |
| `createFullMenuItem` | (`key`: `string`, `value`: `MenuItem`) => `FullMenuItem` |
| `formatValue` | (`value`: `CellValue`, `format?`: `Format`) => `FormattedValue` |
| `getDefaultChartJsRuntime` | (`chart`: [`AbstractChart`](classes/AbstractChart.md), `labels`: `string`[], `fontColor`: `Color`) => `ChartConfiguration` |
| `getFillingMode` | (`index`: `number`) => ``"origin"`` \| `number` |
| `getMenuChildren` | (`node`: `Required`<`MenuItem`\>, `env`: `SpreadsheetChildEnv`) => `FullMenuItem`[] |
| `isMarkdownLink` | (`str`: `string`) => `boolean` |
| `markdownLink` | (`label`: `string`, `url`: `string`) => `string` |
| `numberToLetters` | (`n`: `number`) => `string` |
| `parseMarkdownLink` | (`str`: `string`) => `Link` |
| `positionToZone` | (`position`: `Position`) => { `bottom`: `HeaderIndex` ; `left`: `HeaderIndex` ; `right`: `HeaderIndex` ; `top`: `HeaderIndex`  } |
| `rgbaToHex` | (`rgba`: `RGBA`) => `Color` |
| `toBoolean` | (`value`: `undefined` \| ``null`` \| `string` \| `number` \| `boolean`) => `boolean` |
| `toCartesian` | (`xc`: `string`) => `Position` |
| `toJsDate` | (`value`: `undefined` \| ``null`` \| `string` \| `number` \| `boolean`) => `Date` |
| `toNumber` | (`value`: `undefined` \| ``null`` \| `string` \| `number` \| `boolean`) => `number` |
| `toString` | (`value`: `undefined` \| ``null`` \| `string` \| `number` \| `boolean`) => `string` |
| `toXC` | (`col`: `HeaderIndex`, `row`: `HeaderIndex`, `rangePart`: `RangePart`) => `string` |
| `toZone` | (`xc`: `string`) => `Zone` |

___

### invalidateEvaluationCommands

• **invalidateEvaluationCommands**: `Set`<``"UPDATE_CELL"`` \| ``"UPDATE_CELL_POSITION"`` \| ``"CLEAR_CELL"`` \| ``"DELETE_CONTENT"`` \| ``"SET_DECIMAL"`` \| ``"ADD_COLUMNS_ROWS"`` \| ``"REMOVE_COLUMNS_ROWS"`` \| ``"RESIZE_COLUMNS_ROWS"`` \| ``"HIDE_COLUMNS_ROWS"`` \| ``"UNHIDE_COLUMNS_ROWS"`` \| ``"SET_GRID_LINES_VISIBILITY"`` \| ``"FREEZE_COLUMNS"`` \| ``"FREEZE_ROWS"`` \| ``"UNFREEZE_COLUMNS_ROWS"`` \| ``"UNFREEZE_COLUMNS"`` \| ``"UNFREEZE_ROWS"`` \| ``"ADD_MERGE"`` \| ``"REMOVE_MERGE"`` \| ``"CREATE_SHEET"`` \| ``"DELETE_SHEET"`` \| ``"DUPLICATE_SHEET"`` \| ``"MOVE_SHEET"`` \| ``"RENAME_SHEET"`` \| ``"HIDE_SHEET"`` \| ``"SHOW_SHEET"`` \| ``"MOVE_RANGES"`` \| ``"ADD_CONDITIONAL_FORMAT"`` \| ``"REMOVE_CONDITIONAL_FORMAT"`` \| ``"MOVE_CONDITIONAL_FORMAT"`` \| ``"CREATE_FIGURE"`` \| ``"DELETE_FIGURE"`` \| ``"UPDATE_FIGURE"`` \| ``"SET_FORMATTING"`` \| ``"CLEAR_FORMATTING"`` \| ``"SET_BORDER"`` \| ``"CREATE_CHART"`` \| ``"UPDATE_CHART"`` \| ``"REQUEST_UNDO"`` \| ``"REQUEST_REDO"`` \| ``"UNDO"`` \| ``"REDO"`` \| ``"ENABLE_NEW_SELECTION_INPUT"`` \| ``"DISABLE_SELECTION_INPUT"`` \| ``"UNFOCUS_SELECTION_INPUT"`` \| ``"FOCUS_RANGE"`` \| ``"ADD_EMPTY_RANGE"`` \| ``"REMOVE_RANGE"`` \| ``"CHANGE_RANGE"`` \| ``"COPY"`` \| ``"CUT"`` \| ``"PASTE"`` \| ``"AUTOFILL_CELL"`` \| ``"PASTE_FROM_OS_CLIPBOARD"`` \| ``"ACTIVATE_PAINT_FORMAT"`` \| ``"PASTE_CONDITIONAL_FORMAT"`` \| ``"AUTORESIZE_COLUMNS"`` \| ``"AUTORESIZE_ROWS"`` \| ``"MOVE_COLUMNS_ROWS"`` \| ``"ACTIVATE_SHEET"`` \| ``"PREPARE_SELECTION_INPUT_EXPANSION"`` \| ``"STOP_SELECTION_INPUT"`` \| ``"EVALUATE_CELLS"`` \| ``"CHANGE_HIGHLIGHT"`` \| ``"START_CHANGE_HIGHLIGHT"`` \| ``"SET_HIGHLIGHT_COLOR"`` \| ``"STOP_COMPOSER_RANGE_SELECTION"`` \| ``"START_EDITION"`` \| ``"STOP_EDITION"`` \| ``"SET_CURRENT_CONTENT"`` \| ``"CHANGE_COMPOSER_CURSOR_SELECTION"`` \| ``"REPLACE_COMPOSER_CURSOR_SELECTION"`` \| ``"CYCLE_EDITION_REFERENCES"`` \| ``"START"`` \| ``"AUTOFILL"`` \| ``"AUTOFILL_SELECT"`` \| ``"SET_FORMULA_VISIBILITY"`` \| ``"AUTOFILL_AUTO"`` \| ``"SELECT_FIGURE"`` \| ``"UPDATE_SEARCH"`` \| ``"CLEAR_SEARCH"`` \| ``"SELECT_SEARCH_PREVIOUS_MATCH"`` \| ``"SELECT_SEARCH_NEXT_MATCH"`` \| ``"REPLACE_SEARCH"`` \| ``"REPLACE_ALL_SEARCH"`` \| ``"SORT_CELLS"`` \| ``"RESIZE_SHEETVIEW"`` \| ``"SUM_SELECTION"`` \| ``"DELETE_CELL"`` \| ``"INSERT_CELL"`` \| ``"SET_VIEWPORT_OFFSET"`` \| ``"SHIFT_VIEWPORT_DOWN"`` \| ``"SHIFT_VIEWPORT_UP"`` \| ``"OPEN_CELL_POPOVER"`` \| ``"CLOSE_CELL_POPOVER"`` \| ``"ACTIVATE_NEXT_SHEET"`` \| ``"ACTIVATE_PREVIOUS_SHEET"``\>

___

### readonlyAllowedCommands

• **readonlyAllowedCommands**: `Set`<``"UPDATE_CELL"`` \| ``"UPDATE_CELL_POSITION"`` \| ``"CLEAR_CELL"`` \| ``"DELETE_CONTENT"`` \| ``"SET_DECIMAL"`` \| ``"ADD_COLUMNS_ROWS"`` \| ``"REMOVE_COLUMNS_ROWS"`` \| ``"RESIZE_COLUMNS_ROWS"`` \| ``"HIDE_COLUMNS_ROWS"`` \| ``"UNHIDE_COLUMNS_ROWS"`` \| ``"SET_GRID_LINES_VISIBILITY"`` \| ``"FREEZE_COLUMNS"`` \| ``"FREEZE_ROWS"`` \| ``"UNFREEZE_COLUMNS_ROWS"`` \| ``"UNFREEZE_COLUMNS"`` \| ``"UNFREEZE_ROWS"`` \| ``"ADD_MERGE"`` \| ``"REMOVE_MERGE"`` \| ``"CREATE_SHEET"`` \| ``"DELETE_SHEET"`` \| ``"DUPLICATE_SHEET"`` \| ``"MOVE_SHEET"`` \| ``"RENAME_SHEET"`` \| ``"HIDE_SHEET"`` \| ``"SHOW_SHEET"`` \| ``"MOVE_RANGES"`` \| ``"ADD_CONDITIONAL_FORMAT"`` \| ``"REMOVE_CONDITIONAL_FORMAT"`` \| ``"MOVE_CONDITIONAL_FORMAT"`` \| ``"CREATE_FIGURE"`` \| ``"DELETE_FIGURE"`` \| ``"UPDATE_FIGURE"`` \| ``"SET_FORMATTING"`` \| ``"CLEAR_FORMATTING"`` \| ``"SET_BORDER"`` \| ``"CREATE_CHART"`` \| ``"UPDATE_CHART"`` \| ``"REQUEST_UNDO"`` \| ``"REQUEST_REDO"`` \| ``"UNDO"`` \| ``"REDO"`` \| ``"ENABLE_NEW_SELECTION_INPUT"`` \| ``"DISABLE_SELECTION_INPUT"`` \| ``"UNFOCUS_SELECTION_INPUT"`` \| ``"FOCUS_RANGE"`` \| ``"ADD_EMPTY_RANGE"`` \| ``"REMOVE_RANGE"`` \| ``"CHANGE_RANGE"`` \| ``"COPY"`` \| ``"CUT"`` \| ``"PASTE"`` \| ``"AUTOFILL_CELL"`` \| ``"PASTE_FROM_OS_CLIPBOARD"`` \| ``"ACTIVATE_PAINT_FORMAT"`` \| ``"PASTE_CONDITIONAL_FORMAT"`` \| ``"AUTORESIZE_COLUMNS"`` \| ``"AUTORESIZE_ROWS"`` \| ``"MOVE_COLUMNS_ROWS"`` \| ``"ACTIVATE_SHEET"`` \| ``"PREPARE_SELECTION_INPUT_EXPANSION"`` \| ``"STOP_SELECTION_INPUT"`` \| ``"EVALUATE_CELLS"`` \| ``"CHANGE_HIGHLIGHT"`` \| ``"START_CHANGE_HIGHLIGHT"`` \| ``"SET_HIGHLIGHT_COLOR"`` \| ``"STOP_COMPOSER_RANGE_SELECTION"`` \| ``"START_EDITION"`` \| ``"STOP_EDITION"`` \| ``"SET_CURRENT_CONTENT"`` \| ``"CHANGE_COMPOSER_CURSOR_SELECTION"`` \| ``"REPLACE_COMPOSER_CURSOR_SELECTION"`` \| ``"CYCLE_EDITION_REFERENCES"`` \| ``"START"`` \| ``"AUTOFILL"`` \| ``"AUTOFILL_SELECT"`` \| ``"SET_FORMULA_VISIBILITY"`` \| ``"AUTOFILL_AUTO"`` \| ``"SELECT_FIGURE"`` \| ``"UPDATE_SEARCH"`` \| ``"CLEAR_SEARCH"`` \| ``"SELECT_SEARCH_PREVIOUS_MATCH"`` \| ``"SELECT_SEARCH_NEXT_MATCH"`` \| ``"REPLACE_SEARCH"`` \| ``"REPLACE_ALL_SEARCH"`` \| ``"SORT_CELLS"`` \| ``"RESIZE_SHEETVIEW"`` \| ``"SUM_SELECTION"`` \| ``"DELETE_CELL"`` \| ``"INSERT_CELL"`` \| ``"SET_VIEWPORT_OFFSET"`` \| ``"SHIFT_VIEWPORT_DOWN"`` \| ``"SHIFT_VIEWPORT_UP"`` \| ``"OPEN_CELL_POPOVER"`` \| ``"CLOSE_CELL_POPOVER"`` \| ``"ACTIVATE_NEXT_SHEET"`` \| ``"ACTIVATE_PREVIOUS_SHEET"``\>

___

### registries

• **registries**: `Object`

#### Type declaration

| Name | Type |
| :------ | :------ |
| `autofillModifiersRegistry` | [`Registry`](classes/Registry.md)<`AutofillModifierImplementation`\> |
| `autofillRulesRegistry` | [`Registry`](classes/Registry.md)<`AutofillRule`\> |
| `cellMenuRegistry` | `MenuItemRegistry` |
| `cellPopoverRegistry` | [`Registry`](classes/Registry.md)<`PopoverBuilders`\> |
| `cellRegistry` | [`Registry`](classes/Registry.md)<`CellBuilder`\> |
| `chartComponentRegistry` | [`Registry`](classes/Registry.md)<`fn`\> |
| `chartRegistry` | [`Registry`](classes/Registry.md)<`ChartBuilder`\> |
| `chartSidePanelComponentRegistry` | [`Registry`](classes/Registry.md)<`ChartSidePanel`\> |
| `clickableCellRegistry` | [`Registry`](classes/Registry.md)<`CellClickableItem`\> |
| `colMenuRegistry` | `MenuItemRegistry` |
| `corePluginRegistry` | [`Registry`](classes/Registry.md)<`CorePluginConstructor`\> |
| `figureRegistry` | [`Registry`](classes/Registry.md)<`FigureContent`\> |
| `functionRegistry` | `FunctionRegistry` |
| `inverseCommandRegistry` | [`Registry`](classes/Registry.md)<`InverseFunction`\> |
| `linkMenuRegistry` | `MenuItemRegistry` |
| `otRegistry` | `OTRegistry` |
| `rowMenuRegistry` | `MenuItemRegistry` |
| `sheetMenuRegistry` | `MenuItemRegistry` |
| `sidePanelRegistry` | [`Registry`](classes/Registry.md)<`SidePanelContent`\> |
| `topbarComponentRegistry` | `TopBarComponentRegistry` |
| `topbarMenuRegistry` | `MenuItemRegistry` |
| `uiPluginRegistry` | [`Registry`](classes/Registry.md)<`UIPluginConstructor`\> |

## Functions

### astToFormula

▸ **astToFormula**(`ast`): `string`

Converts an ast formula to the corresponding string

#### Parameters

| Name | Type |
| :------ | :------ |
| `ast` | `AST` |

#### Returns

`string`

___

### compile

▸ **compile**(`formula`): `CompiledFormula`

#### Parameters

| Name | Type |
| :------ | :------ |
| `formula` | `string` |

#### Returns

`CompiledFormula`

___

### convertAstNodes

▸ **convertAstNodes**<`T`\>(`ast`, `type`, `fn`): `any`

Allows to visit all nodes of an AST and apply a mapping function
to nodes of a specific type.
Useful if you want to convert some part of a formula.

e.g.
```ts
convertAstNodes(ast, "FUNCALL", convertFormulaToExcel)

function convertFormulaToExcel(ast: ASTFuncall) {
  // ...
  return modifiedAst
}
```

#### Type parameters

| Name | Type |
| :------ | :------ |
| `T` | extends ``"BIN_OPERATION"`` \| ``"UNARY_OPERATION"`` \| ``"FUNCALL"`` \| ``"NUMBER"`` \| ``"BOOLEAN"`` \| ``"STRING"`` \| ``"REFERENCE"`` \| ``"UNKNOWN"`` |

#### Parameters

| Name | Type |
| :------ | :------ |
| `ast` | `AST` |
| `type` | `T` |
| `fn` | (`ast`: `Extract`<`ASTOperation`, `Object`\> \| `Extract`<`ASTUnaryOperation`, `Object`\> \| `Extract`<`ASTFuncall`, `Object`\> \| `Extract`<`ASTNumber`, `Object`\> \| `Extract`<`ASTBoolean`, `Object`\> \| `Extract`<`ASTString`, `Object`\> \| `Extract`<`ASTReference`, `Object`\> \| `Extract`<`ASTUnknown`, `Object`\>) => `AST` |

#### Returns

`any`

___

### findCellInNewZone

▸ **findCellInNewZone**(`oldZone`, `currentZone`): `Position`

This function will compare the modifications of selection to determine
a cell that is part of the new zone and not the previous one.

#### Parameters

| Name | Type |
| :------ | :------ |
| `oldZone` | `Zone` |
| `currentZone` | `Zone` |

#### Returns

`Position`

___

### load

▸ **load**(`data?`, `verboseImport?`): `WorkbookData`

This function tries to load anything that could look like a valid
workbookData object. It applies any migrations, if needed, and return a
current, complete workbookData object.

It also ensures that there is at least one sheet.

#### Parameters

| Name | Type |
| :------ | :------ |
| `data?` | `any` |
| `verboseImport?` | `boolean` |

#### Returns

`WorkbookData`

___

### parse

▸ **parse**(`str`): `AST`

Parse an expression (as a string) into an AST.

#### Parameters

| Name | Type |
| :------ | :------ |
| `str` | `string` |

#### Returns

`AST`

___

### setTranslationMethod

▸ **setTranslationMethod**(`tfn`): `void`

Allow to inject a translation function from outside o-spreadsheet.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `tfn` | `TranslationFunction` | the function that will do the translation |

#### Returns

`void`

___

### tokenize

▸ **tokenize**(`str`): `Token`[]

#### Parameters

| Name | Type |
| :------ | :------ |
| `str` | `string` |

#### Returns

`Token`[]
