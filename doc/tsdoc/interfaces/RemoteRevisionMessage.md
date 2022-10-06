[o-spreadsheet API](../README.md) / RemoteRevisionMessage

# Interface: RemoteRevisionMessage

## Hierarchy

- `AbstractMessage`

  ↳ **`RemoteRevisionMessage`**

## Table of contents

### Properties

- [clientId](RemoteRevisionMessage.md#clientid)
- [commands](RemoteRevisionMessage.md#commands)
- [nextRevisionId](RemoteRevisionMessage.md#nextrevisionid)
- [serverRevisionId](RemoteRevisionMessage.md#serverrevisionid)
- [type](RemoteRevisionMessage.md#type)
- [version](RemoteRevisionMessage.md#version)

## Properties

### clientId

• **clientId**: `string`

___

### commands

• **commands**: readonly `CoreCommand`[]

___

### nextRevisionId

• **nextRevisionId**: `UID`

___

### serverRevisionId

• **serverRevisionId**: `UID`

___

### type

• **type**: ``"REMOTE_REVISION"``

___

### version

• **version**: `number`

#### Inherited from

AbstractMessage.version
