[o-spreadsheet API](../README.md) / Revision

# Class: Revision

## Implements

- `RevisionData`

## Table of contents

### Constructors

- [constructor](Revision.md#constructor)

### Properties

- [clientId](Revision.md#clientid)
- [id](Revision.md#id)

### Accessors

- [changes](Revision.md#changes)
- [commands](Revision.md#commands)

### Methods

- [setChanges](Revision.md#setchanges)

## Constructors

### constructor

• **new Revision**(`id`, `clientId`, `commands`, `changes?`)

A revision represents a whole client action (Create a sheet, merge a Zone, Undo, ...).
A revision contains the following information:
 - id: ID of the revision
 - commands: CoreCommands that are linked to the action, and should be
             dispatched in other clients
 - clientId: Client who initiated the action
 - changes: List of changes applied on the state.

#### Parameters

| Name | Type |
| :------ | :------ |
| `id` | `UID` |
| `clientId` | `string` |
| `commands` | readonly `CoreCommand`[] |
| `changes?` | readonly `HistoryChange`[] |

## Properties

### clientId

• `Readonly` **clientId**: `string`

#### Implementation of

RevisionData.clientId

___

### id

• `Readonly` **id**: `UID`

#### Implementation of

RevisionData.id

## Accessors

### changes

• `get` **changes**(): readonly `HistoryChange`[]

#### Returns

readonly `HistoryChange`[]

___

### commands

• `get` **commands**(): readonly `CoreCommand`[]

#### Returns

readonly `CoreCommand`[]

## Methods

### setChanges

▸ **setChanges**(`changes`): `void`

#### Parameters

| Name | Type |
| :------ | :------ |
| `changes` | readonly `HistoryChange`[] |

#### Returns

`void`
