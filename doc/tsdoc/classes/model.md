[o-spreadsheet API](../README.md) / Model

# Class: Model

## Hierarchy

* *EventBus*

  ↳ **Model**

## Implements

* *CommandDispatcher*

## Table of contents

### Constructors

- [constructor](model.md#constructor)

### Properties

- [dispatch](model.md#dispatch)
- [getters](model.md#getters)

### Accessors

- [handlers](model.md#handlers)

### Methods

- [destroy](model.md#destroy)
- [drawGrid](model.md#drawgrid)
- [exportData](model.md#exportdata)
- [leaveSession](model.md#leavesession)

## Constructors

### constructor

\+ **new Model**(`data?`: *any*, `config?`: *Partial*<ModelConfig\>, `stateUpdateMessages?`: ([*RevisionUndoneMessage*](../interfaces/revisionundonemessage.md) \| [*RevisionRedoneMessage*](../interfaces/revisionredonemessage.md) \| [*RemoteRevisionMessage*](../interfaces/remoterevisionmessage.md))[]): [*Model*](model.md)

#### Parameters:

Name | Type | Default value |
------ | ------ | ------ |
`data` | *any* | ... |
`config` | *Partial*<ModelConfig\> | ... |
`stateUpdateMessages` | ([*RevisionUndoneMessage*](../interfaces/revisionundonemessage.md) \| [*RevisionRedoneMessage*](../interfaces/revisionredonemessage.md) \| [*RemoteRevisionMessage*](../interfaces/remoterevisionmessage.md))[] | ... |

**Returns:** [*Model*](model.md)

## Properties

### dispatch

• **dispatch**: <T, C\>(`type`: {} *extends* *Pick*<C, *Exclude*<keyof C, *type*\>\> ? T : *never*) => CommandResult<T, C\>(`type`: T, `r`: *Pick*<C, *Exclude*<keyof C, *type*\>\>) => CommandResult

The dispatch method is the only entry point to manipulate data in the model.
This is through this method that commands are dispatched most of the time
recursively until no plugin want to react anymore.

CoreCommands dispatched from this function are saved in the history.

Small technical detail: it is defined as an arrow function.  There are two
reasons for this:
1. this means that the dispatch method can be "detached" from the model,
   which is done when it is put in the environment (see the Spreadsheet
   component)
2. This allows us to define its type by using the interface CommandDispatcher

___

### getters

• **getters**: Getters

Getters are the main way the rest of the UI read data from the model. Also,
it is shared between all plugins, so they can also communicate with each
other.

## Accessors

### handlers

• **handlers**(): *CommandHandler*<Command\>[]

**Returns:** *CommandHandler*<Command\>[]

## Methods

### destroy

▸ **destroy**(): *void*

**Returns:** *void*

___

### drawGrid

▸ **drawGrid**(`context`: GridRenderingContext): *void*

When the Grid component is ready (= mounted), it has a reference to its
canvas and need to draw the grid on it.  This is then done by calling this
method, which will dispatch the call to all registered plugins.

Note that nothing prevent multiple grid components from calling this method
each, or one grid component calling it multiple times with a different
context. This is probably the way we should do if we want to be able to
freeze a part of the grid (so, we would need to render different zones)

#### Parameters:

Name | Type |
------ | ------ |
`context` | GridRenderingContext |

**Returns:** *void*

___

### exportData

▸ **exportData**(): WorkbookData

As the name of this method strongly implies, it is useful when we need to
export date out of the model.

**Returns:** WorkbookData

___

### leaveSession

▸ **leaveSession**(): *void*

**Returns:** *void*
