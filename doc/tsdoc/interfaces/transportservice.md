[o-spreadsheet API](../README.md) / TransportService

# Interface: TransportService<T\>

The transport service allows to communicate between multiple clients.
A client can send any message to others.
The service will handle all networking details internally.

## Type parameters

Name | Default |
:------ | :------ |
`T` | *any* |

## Table of contents

### Properties

- [leave](transportservice.md#leave)
- [onNewMessage](transportservice.md#onnewmessage)
- [sendMessage](transportservice.md#sendmessage)

## Properties

### leave

• **leave**: (`id`: *string*) => *void*

Unregister a callback linked to the given id

#### Type declaration:

▸ (`id`: *string*): *void*

#### Parameters:

Name | Type |
:------ | :------ |
`id` | *string* |

**Returns:** *void*

___

### onNewMessage

• **onNewMessage**: (`id`: *string*, `callback`: *NewMessageCallback*<T\>) => *void*

Register a callback function which will be called each time
a new message is received.
The new message is given to the callback.

```js
transportService.onNewMessage(id, (message) => {
  // ... handle the new message
})
```
The `id` is used to unregister this callback when the session is closed.

#### Type declaration:

▸ (`id`: *string*, `callback`: *NewMessageCallback*<T\>): *void*

#### Parameters:

Name | Type |
:------ | :------ |
`id` | *string* |
`callback` | *NewMessageCallback*<T\> |

**Returns:** *void*

___

### sendMessage

• **sendMessage**: (`message`: T) => *void*

Send a message to all clients

#### Type declaration:

▸ (`message`: T): *void*

#### Parameters:

Name | Type |
:------ | :------ |
`message` | T |

**Returns:** *void*
