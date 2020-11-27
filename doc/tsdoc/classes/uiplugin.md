[o-spreadsheet API](../README.md) / UIPlugin

# Class: UIPlugin<State, C\>

UI plugins handle any transient data required to display a spreadsheet.
They can draw on the grid canvas.

## Type parameters

Name | Default |
------ | ------ |
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
- [beforeHandle](uiplugin.md#beforehandle)
- [drawGrid](uiplugin.md#drawgrid)
- [finalize](uiplugin.md#finalize)
- [handle](uiplugin.md#handle)

## Constructors

### constructor

\+ **new UIPlugin**<State, C\>(`getters`: Getters, `state`: *StateObserver*, `dispatch`: <T, C\>(`type`: {} *extends* *Pick*<C, *Exclude*<keyof C, *type*\>\> ? T : *never*) => CommandResult<T, C\>(`type`: T, `r`: *Pick*<C, *Exclude*<keyof C, *type*\>\>) => CommandResult, `config`: ModelConfig): [*UIPlugin*](uiplugin.md)<State, C\>

#### Type parameters:

Name | Default |
------ | ------ |
`State` | *any* |
`C` | Command |

#### Parameters:

Name | Type |
------ | ------ |
`getters` | Getters |
`state` | *StateObserver* |
`dispatch` | <T, C\>(`type`: {} *extends* *Pick*<C, *Exclude*<keyof C, *type*\>\> ? T : *never*) => CommandResult<T, C\>(`type`: T, `r`: *Pick*<C, *Exclude*<keyof C, *type*\>\>) => CommandResult |
`config` | ModelConfig |

**Returns:** [*UIPlugin*](uiplugin.md)<State, C\>

## Properties

### currentMode

• `Protected` **currentMode**: Mode

___

### dispatch

• `Protected` **dispatch**: <T, C\>(`type`: {} *extends* *Pick*<C, *Exclude*<keyof C, *type*\>\> ? T : *never*) => CommandResult<T, C\>(`type`: T, `r`: *Pick*<C, *Exclude*<keyof C, *type*\>\>) => CommandResult

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

▸ **allowDispatch**(`command`: C): CommandResult

Before a command is accepted, the model will ask each plugin if the command
is allowed.  If all of then return true, then we can proceed. Otherwise,
the command is cancelled.

There should not be any side effects in this method.

#### Parameters:

Name | Type |
------ | ------ |
`command` | C |

**Returns:** CommandResult

___

### beforeHandle

▸ **beforeHandle**(`command`: C): *void*

This method is useful when a plugin need to perform some action before a
command is handled in another plugin. This should only be used if it is not
possible to do the work in the handle method.

#### Parameters:

Name | Type |
------ | ------ |
`command` | C |

**Returns:** *void*

___

### drawGrid

▸ **drawGrid**(`ctx`: GridRenderingContext, `layer`: LAYERS): *void*

#### Parameters:

Name | Type |
------ | ------ |
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
------ | ------ |
`command` | C |

**Returns:** *void*
