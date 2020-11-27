[o-spreadsheet API](../README.md) / Spreadsheet

# Class: Spreadsheet

## Hierarchy

* *Component*<Props\>

  ↳ **Spreadsheet**

## Table of contents

### Constructors

- [constructor](spreadsheet.md#constructor)

### Properties

- [composer](spreadsheet.md#composer)
- [grid](spreadsheet.md#grid)
- [model](spreadsheet.md#model)
- [sidePanel](spreadsheet.md#sidepanel)
- [\_t](spreadsheet.md#_t)
- [components](spreadsheet.md#components)
- [style](spreadsheet.md#style)
- [template](spreadsheet.md#template)

### Accessors

- [focusGridComposer](spreadsheet.md#focusgridcomposer)
- [focusTopBarComposer](spreadsheet.md#focustopbarcomposer)

### Methods

- [copy](spreadsheet.md#copy)
- [destroy](spreadsheet.md#destroy)
- [focusGrid](spreadsheet.md#focusgrid)
- [mounted](spreadsheet.md#mounted)
- [onGridComposerFocused](spreadsheet.md#ongridcomposerfocused)
- [onKeydown](spreadsheet.md#onkeydown)
- [onKeyup](spreadsheet.md#onkeyup)
- [onTopBarComposerFocused](spreadsheet.md#ontopbarcomposerfocused)
- [openSidePanel](spreadsheet.md#opensidepanel)
- [paste](spreadsheet.md#paste)
- [save](spreadsheet.md#save)
- [toggleSidePanel](spreadsheet.md#togglesidepanel)
- [willUnmount](spreadsheet.md#willunmount)

## Constructors

### constructor

\+ **new Spreadsheet**(): [*Spreadsheet*](spreadsheet.md)

**Returns:** [*Spreadsheet*](spreadsheet.md)

## Properties

### composer

• **composer**: { `grid`: *boolean* = false; `topBar`: *boolean* = false }

#### Type declaration:

Name | Type |
------ | ------ |
`grid` | *boolean* |
`topBar` | *boolean* |

___

### grid

• **grid**: *Ref*<*Component*<*any*, Env\>\>

___

### model

• **model**: [*Model*](model.md)

___

### sidePanel

• **sidePanel**: { `component?`: *undefined* \| *string* ; `isOpen`: *boolean* ; `panelProps`: *any*  }

#### Type declaration:

Name | Type |
------ | ------ |
`component?` | *undefined* \| *string* |
`isOpen` | *boolean* |
`panelProps` | *any* |

___

### \_t

▪ `Static` **\_t**: (`s`: *string*) => *string*

___

### components

▪ `Static` **components**: { `BottomBar`: *typeof* BottomBar ; `Grid`: *typeof* Grid ; `SidePanel`: *typeof* SidePanel ; `TopBar`: *typeof* TopBar  }

#### Type declaration:

Name | Type |
------ | ------ |
`BottomBar` | *typeof* BottomBar |
`Grid` | *typeof* Grid |
`SidePanel` | *typeof* SidePanel |
`TopBar` | *typeof* TopBar |

___

### style

▪ `Static` **style**: *string*

___

### template

▪ `Static` **template**: *string*

## Accessors

### focusGridComposer

• **focusGridComposer**(): *boolean*

**Returns:** *boolean*

___

### focusTopBarComposer

• **focusTopBarComposer**(): *boolean*

**Returns:** *boolean*

## Methods

### copy

▸ **copy**(`cut`: *boolean*, `ev`: ClipboardEvent): *void*

#### Parameters:

Name | Type |
------ | ------ |
`cut` | *boolean* |
`ev` | ClipboardEvent |

**Returns:** *void*

___

### destroy

▸ **destroy**(): *void*

**Returns:** *void*

___

### focusGrid

▸ **focusGrid**(): *void*

**Returns:** *void*

___

### mounted

▸ **mounted**(): *void*

**Returns:** *void*

___

### onGridComposerFocused

▸ **onGridComposerFocused**(`ev`: ComposerFocusedEvent): *void*

#### Parameters:

Name | Type |
------ | ------ |
`ev` | ComposerFocusedEvent |

**Returns:** *void*

___

### onKeydown

▸ **onKeydown**(`ev`: KeyboardEvent): *void*

#### Parameters:

Name | Type |
------ | ------ |
`ev` | KeyboardEvent |

**Returns:** *void*

___

### onKeyup

▸ **onKeyup**(`ev`: KeyboardEvent): *void*

#### Parameters:

Name | Type |
------ | ------ |
`ev` | KeyboardEvent |

**Returns:** *void*

___

### onTopBarComposerFocused

▸ **onTopBarComposerFocused**(`ev`: ComposerFocusedEvent): *void*

#### Parameters:

Name | Type |
------ | ------ |
`ev` | ComposerFocusedEvent |

**Returns:** *void*

___

### openSidePanel

▸ **openSidePanel**(`panel`: *string*, `panelProps`: *any*): *void*

#### Parameters:

Name | Type |
------ | ------ |
`panel` | *string* |
`panelProps` | *any* |

**Returns:** *void*

___

### paste

▸ **paste**(`ev`: ClipboardEvent): *void*

#### Parameters:

Name | Type |
------ | ------ |
`ev` | ClipboardEvent |

**Returns:** *void*

___

### save

▸ **save**(): *void*

**Returns:** *void*

___

### toggleSidePanel

▸ **toggleSidePanel**(`panel`: *string*, `panelProps`: *any*): *void*

#### Parameters:

Name | Type |
------ | ------ |
`panel` | *string* |
`panelProps` | *any* |

**Returns:** *void*

___

### willUnmount

▸ **willUnmount**(): *void*

**Returns:** *void*
