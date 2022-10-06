[o-spreadsheet API](../README.md) / Spreadsheet

# Class: Spreadsheet

## Hierarchy

- `Component`<`SpreadsheetProps`, `SpreadsheetChildEnv`\>

  ↳ **`Spreadsheet`**

## Table of contents

### Constructors

- [constructor](Spreadsheet.md#constructor)

### Properties

- [composer](Spreadsheet.md#composer)
- [model](Spreadsheet.md#model)
- [sidePanel](Spreadsheet.md#sidepanel)
- [\_t](Spreadsheet.md#_t)
- [components](Spreadsheet.md#components)
- [template](Spreadsheet.md#template)

### Accessors

- [focusGridComposer](Spreadsheet.md#focusgridcomposer)
- [focusTopBarComposer](Spreadsheet.md#focustopbarcomposer)

### Methods

- [closeSidePanel](Spreadsheet.md#closesidepanel)
- [focusGrid](Spreadsheet.md#focusgrid)
- [getStyle](Spreadsheet.md#getstyle)
- [onGridComposerCellFocused](Spreadsheet.md#ongridcomposercellfocused)
- [onGridComposerContentFocused](Spreadsheet.md#ongridcomposercontentfocused)
- [onKeydown](Spreadsheet.md#onkeydown)
- [onTopBarComposerFocused](Spreadsheet.md#ontopbarcomposerfocused)
- [openSidePanel](Spreadsheet.md#opensidepanel)
- [save](Spreadsheet.md#save)
- [setup](Spreadsheet.md#setup)
- [toggleSidePanel](Spreadsheet.md#togglesidepanel)

## Constructors

### constructor

• **new Spreadsheet**(`props`, `env`, `node`)

#### Parameters

| Name | Type |
| :------ | :------ |
| `props` | `SpreadsheetProps` |
| `env` | `SpreadsheetChildEnv` |
| `node` | `ComponentNode`<`any`, `any`\> |

#### Inherited from

Component<SpreadsheetProps, SpreadsheetChildEnv\>.constructor

## Properties

### composer

• **composer**: `ComposerState`

___

### model

• **model**: [`Model`](Model.md)

___

### sidePanel

• **sidePanel**: `SidePanelState`

___

### \_t

▪ `Static` **\_t**: (`s`: `string`) => `string`

#### Type declaration

▸ (`s`): `string`

##### Parameters

| Name | Type |
| :------ | :------ |
| `s` | `string` |

##### Returns

`string`

___

### components

▪ `Static` **components**: `Object`

#### Type declaration

| Name | Type |
| :------ | :------ |
| `BottomBar` | typeof `BottomBar` |
| `Grid` | typeof `Grid` |
| `SidePanel` | typeof `SidePanel` |
| `SpreadsheetDashboard` | typeof `SpreadsheetDashboard` |
| `TopBar` | typeof `TopBar` |

___

### template

▪ `Static` **template**: `string` = `"o-spreadsheet-Spreadsheet"`

#### Overrides

Component.template

## Accessors

### focusGridComposer

• `get` **focusGridComposer**(): `ComposerFocusType`

#### Returns

`ComposerFocusType`

___

### focusTopBarComposer

• `get` **focusTopBarComposer**(): `Omit`<`ComposerFocusType`, ``"cellFocus"``\>

#### Returns

`Omit`<`ComposerFocusType`, ``"cellFocus"``\>

## Methods

### closeSidePanel

▸ **closeSidePanel**(): `void`

#### Returns

`void`

___

### focusGrid

▸ **focusGrid**(): `void`

#### Returns

`void`

___

### getStyle

▸ **getStyle**(): `string`

#### Returns

`string`

___

### onGridComposerCellFocused

▸ **onGridComposerCellFocused**(`content?`, `selection?`): `void`

#### Parameters

| Name | Type |
| :------ | :------ |
| `content?` | `string` |
| `selection?` | `ComposerSelection` |

#### Returns

`void`

___

### onGridComposerContentFocused

▸ **onGridComposerContentFocused**(): `void`

#### Returns

`void`

___

### onKeydown

▸ **onKeydown**(`ev`): `void`

#### Parameters

| Name | Type |
| :------ | :------ |
| `ev` | `KeyboardEvent` |

#### Returns

`void`

___

### onTopBarComposerFocused

▸ **onTopBarComposerFocused**(`selection`): `void`

#### Parameters

| Name | Type |
| :------ | :------ |
| `selection` | `ComposerSelection` |

#### Returns

`void`

___

### openSidePanel

▸ **openSidePanel**(`panel`, `panelProps`): `void`

#### Parameters

| Name | Type |
| :------ | :------ |
| `panel` | `string` |
| `panelProps` | `any` |

#### Returns

`void`

___

### save

▸ **save**(): `void`

#### Returns

`void`

___

### setup

▸ **setup**(): `void`

#### Returns

`void`

#### Overrides

Component.setup

___

### toggleSidePanel

▸ **toggleSidePanel**(`panel`, `panelProps`): `void`

#### Parameters

| Name | Type |
| :------ | :------ |
| `panel` | `string` |
| `panelProps` | `any` |

#### Returns

`void`
