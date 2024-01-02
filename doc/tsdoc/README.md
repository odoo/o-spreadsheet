o-spreadsheet API

# o-spreadsheet API

## Table of contents

### Classes

- [AbstractChart](classes/AbstractChart.md)
- [CorePlugin](classes/CorePlugin.md)
- [DispatchResult](classes/DispatchResult.md)
- [Model](classes/Model.md)
- [Registry](classes/Registry.md)
- [UIPlugin](classes/UIPlugin.md)

### Interfaces

- [TransportService](interfaces/TransportService.md)

### Variables

- [\_\_info\_\_](README.md#__info__)

### Functions

- [astToFormula](README.md#asttoformula)
- [convertAstNodes](README.md#convertastnodes)
- [findCellInNewZone](README.md#findcellinnewzone)
- [load](README.md#load)
- [parse](README.md#parse)
- [setTranslationMethod](README.md#settranslationmethod)

## Variables

### \_\_info\_\_

• `Const` **\_\_info\_\_**: `Object` = `{}`

We export here all entities that needs to be accessed publicly by Odoo.

Note that the __info__ key is actually completed by the build process (see
the rollup.config.js file)

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

### convertAstNodes

▸ **convertAstNodes**\<`T`\>(`ast`, `type`, `fn`): `AST`

Allows to visit all nodes of an AST and apply a mapping function
to nodes of a specific type.
Useful if you want to convert some part of a formula.

#### Type parameters

| Name | Type |
| :------ | :------ |
| `T` | extends ``"BOOLEAN"`` \| ``"NUMBER"`` \| ``"STRING"`` \| ``"REFERENCE"`` \| ``"UNARY_OPERATION"`` \| ``"BIN_OPERATION"`` \| ``"FUNCALL"`` \| ``"EMPTY"`` |

#### Parameters

| Name | Type |
| :------ | :------ |
| `ast` | `AST` |
| `type` | `T` |
| `fn` | (`ast`: `Extract`\<`ASTNumber`, \{ `type`: `T`  }\> \| `Extract`\<`ASTReference`, \{ `type`: `T`  }\> \| `Extract`\<`ASTString`, \{ `type`: `T`  }\> \| `Extract`\<`ASTBoolean`, \{ `type`: `T`  }\> \| `Extract`\<`ASTUnaryOperation`, \{ `type`: `T`  }\> \| `Extract`\<`ASTOperation`, \{ `type`: `T`  }\> \| `Extract`\<`ASTFuncall`, \{ `type`: `T`  }\> \| `Extract`\<`ASTEmpty`, \{ `type`: `T`  }\>) => `AST` |

#### Returns

`AST`

**`Example`**

```ts
convertAstNodes(ast, "FUNCALL", convertFormulaToExcel)

function convertFormulaToExcel(ast: ASTFuncall) {
  // ...
  return modifiedAst
}
```

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

▸ **setTranslationMethod**(`tfn`, `loaded?`): `void`

Allow to inject a translation function from outside o-spreadsheet.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `tfn` | `TranslationFunction` | the function that will do the translation |
| `loaded` | () => `boolean` | a function that returns true when the translation is loaded |

#### Returns

`void`
