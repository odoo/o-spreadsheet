[o-spreadsheet API](../README.md) / TransportService

# Interface: TransportService<T\>

The transport service allows to communicate between multiple clients.
A client can send any message to others.
The service will handle all networking details internally.

## Type parameters

| Name | Type |
| :------ | :------ |
| `T` | `any` |

## Table of contents

### Methods

- [leave](TransportService.md#leave)
- [onNewMessage](TransportService.md#onnewmessage)
- [sendMessage](TransportService.md#sendmessage)

## Methods

### leave

▸ **leave**(`id`): `void`

Unregister a callback linked to the given id

#### Parameters

| Name | Type |
| :------ | :------ |
| `id` | `UID` |

#### Returns

`void`

___

### onNewMessage

▸ **onNewMessage**(`id`, `callback`): `void`

Register a callback function which will be called each time
a new message is received.
The new message is given to the callback.

```js
transportService.onNewMessage(id, (message) => {
  // ... handle the new message
})
```
The `id` is used to unregister this callback when the session is closed.

#### Parameters

| Name | Type |
| :------ | :------ |
| `id` | `UID` |
| `callback` | `NewMessageCallback`<`T`\> |

#### Returns

`void`

___

### sendMessage

▸ **sendMessage**(`message`): `void`

Send a message to all clients

#### Parameters

| Name | Type |
| :------ | :------ |
| `message` | `T` |

#### Returns

`void`
