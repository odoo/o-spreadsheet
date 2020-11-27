[o-spreadsheet API](../README.md) / Revision

# Class: Revision

## Hierarchy

* **Revision**

## Implements

* *RevisionData*

## Table of contents

### Constructors

- [constructor](revision.md#constructor)

### Properties

- [clientId](revision.md#clientid)
- [id](revision.md#id)

### Accessors

- [changes](revision.md#changes)
- [commands](revision.md#commands)

### Methods

- [setChanges](revision.md#setchanges)

## Constructors

### constructor

\+ **new Revision**(`id`: *string*, `clientId`: *string*, `commands`: readonly CoreCommand[], `changes?`: readonly HistoryChange[]): [*Revision*](revision.md)

A revision represents a whole client action (Create a sheet, merge a Zone, Undo, ...).
A revision contains the following information:
 - id: ID of the revision
 - commands: CoreCommands that are linked to the action, and should be
             dispatched in other clients
 - clientId: Client who initiated the action
 - changes: List of changes applied on the state.

#### Parameters:

Name | Type |
------ | ------ |
`id` | *string* |
`clientId` | *string* |
`commands` | readonly CoreCommand[] |
`changes?` | readonly HistoryChange[] |

**Returns:** [*Revision*](revision.md)

## Properties

### clientId

• `Readonly` **clientId**: *string*

___

### id

• `Readonly` **id**: *string*

## Accessors

### changes

• **changes**(): readonly HistoryChange[]

**Returns:** readonly HistoryChange[]

___

### commands

• **commands**(): readonly CoreCommand[]

**Returns:** readonly CoreCommand[]

## Methods

### setChanges

▸ **setChanges**(`changes`: readonly HistoryChange[]): *void*

#### Parameters:

Name | Type |
------ | ------ |
`changes` | readonly HistoryChange[] |

**Returns:** *void*
