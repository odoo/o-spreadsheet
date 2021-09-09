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
- [linkEditor](spreadsheet.md#linkeditor)
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

- [closeLinkEditor](spreadsheet.md#closelinkeditor)
- [copy](spreadsheet.md#copy)
- [destroy](spreadsheet.md#destroy)
- [focusGrid](spreadsheet.md#focusgrid)
- [mounted](spreadsheet.md#mounted)
- [onGridComposerCellFocused](spreadsheet.md#ongridcomposercellfocused)
- [onGridComposerContentFocused](spreadsheet.md#ongridcomposercontentfocused)
- [onKeydown](spreadsheet.md#onkeydown)
- [onKeyup](spreadsheet.md#onkeyup)
- [onTopBarComposerFocused](spreadsheet.md#ontopbarcomposerfocused)
- [openLinkEditor](spreadsheet.md#openlinkeditor)
- [openSidePanel](spreadsheet.md#opensidepanel)
- [paste](spreadsheet.md#paste)
- [save](spreadsheet.md#save)
- [toggleSidePanel](spreadsheet.md#togglesidepanel)
- [willUnmount](spreadsheet.md#willunmount)
- [willUpdateProps](spreadsheet.md#willupdateprops)

## Constructors

### constructor

\+ **new Spreadsheet**(): [*Spreadsheet*](spreadsheet.md)

**Returns:** [*Spreadsheet*](spreadsheet.md)

## Properties

### composer

• **composer**: *object*

#### Type declaration:

Name | Type |
:------ | :------ |
`gridFocusMode` | *inactive* \| *contentFocus* \| *cellFocus* |
`topBarFocus` | *inactive* \| *contentFocus* |

___

### grid

• **grid**: *Ref*<Component<any, Env\>\>

___

### linkEditor

• **linkEditor**: *object*

#### Type declaration:

Name | Type |
:------ | :------ |
`isOpen` | *boolean* |

___

### model

• **model**: [*Model*](model.md)

___

### sidePanel

• **sidePanel**: *object*

#### Type declaration:

Name | Type |
:------ | :------ |
`component`? | *string* |
`isOpen` | *boolean* |
`panelProps` | *any* |

___

### \_t

▪ `Static` **\_t**: (`s`: *string*) => *string*

#### Type declaration:

▸ (`s`: *string*): *string*

#### Parameters:

Name | Type |
:------ | :------ |
`s` | *string* |

**Returns:** *string*

___

### components

▪ `Static` **components**: *object*

#### Type declaration:

Name | Type |
:------ | :------ |
`BottomBar` | *typeof* BottomBar |
`Grid` | *typeof* Grid |
`LinkEditor` | *typeof* LinkEditor |
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

• get **focusGridComposer**(): *inactive* \| *contentFocus* \| *cellFocus*

**Returns:** *inactive* \| *contentFocus* \| *cellFocus*

___

### focusTopBarComposer

• get **focusTopBarComposer**(): *inactive* \| *contentFocus*

**Returns:** *inactive* \| *contentFocus*

## Methods

### closeLinkEditor

▸ **closeLinkEditor**(): *void*

**Returns:** *void*

___

### copy

▸ **copy**(`cut`: *boolean*, `ev`: ClipboardEvent): *void*

#### Parameters:

Name | Type |
:------ | :------ |
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

### onGridComposerCellFocused

▸ **onGridComposerCellFocused**(`ev`: ComposerFocusedEvent): *void*

#### Parameters:

Name | Type |
:------ | :------ |
`ev` | ComposerFocusedEvent |

**Returns:** *void*

___

### onGridComposerContentFocused

▸ **onGridComposerContentFocused**(`ev`: ComposerFocusedEvent): *void*

#### Parameters:

Name | Type |
:------ | :------ |
`ev` | ComposerFocusedEvent |

**Returns:** *void*

___

### onKeydown

▸ **onKeydown**(`ev`: KeyboardEvent): *void*

#### Parameters:

Name | Type |
:------ | :------ |
`ev` | KeyboardEvent |

**Returns:** *void*

___

### onKeyup

▸ **onKeyup**(`ev`: KeyboardEvent): *void*

#### Parameters:

Name | Type |
:------ | :------ |
`ev` | KeyboardEvent |

**Returns:** *void*

___

### onTopBarComposerFocused

▸ **onTopBarComposerFocused**(`ev`: ComposerFocusedEvent): *void*

#### Parameters:

Name | Type |
:------ | :------ |
`ev` | ComposerFocusedEvent |

**Returns:** *void*

___

### openLinkEditor

▸ **openLinkEditor**(): *void*

**Returns:** *void*

___

### openSidePanel

▸ **openSidePanel**(`panel`: *string*, `panelProps`: *any*): *void*

#### Parameters:

Name | Type |
:------ | :------ |
`panel` | *string* |
`panelProps` | *any* |

**Returns:** *void*

___

### paste

▸ **paste**(`ev`: ClipboardEvent): *void*

#### Parameters:

Name | Type |
:------ | :------ |
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
:------ | :------ |
`panel` | *string* |
`panelProps` | *any* |

**Returns:** *void*

___

### willUnmount

▸ **willUnmount**(): *void*

**Returns:** *void*

___

### willUpdateProps

▸ **willUpdateProps**(`nextProps`: Props): *Promise*<void\>

#### Parameters:

Name | Type |
:------ | :------ |
`nextProps` | Props |

**Returns:** *Promise*<void\>
