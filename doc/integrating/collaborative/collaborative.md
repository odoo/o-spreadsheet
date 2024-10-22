# Collaborative Edition

Realtime collaboration edition can be enabled to synchronize a spreadsheet across multiple clients.
It is enabled by providing a way to communicate with other connected clients to the `<Spreadsheet/>` component. We call it the _transport service_. Its interface and how it should be implemented is described in a [dedicated section](#transport-service). An optional [client](tsdoc/interfaces/client.md) can also be provided to display the names of connected clients.

```ts
const model = new Model(data, {
  transportService,
  client: { id: 456, name: "Raoul" },
});
```

```xml
<Spreadsheet model="model"/>
```

To learn more about the explored possibilities, please read [this](collaborative_choices.md).

- [Collaborative Edition](#collaborative-edition)
  - [Transport Service](#transport-service)
  - [Coordinating server](#coordinating-server)
  - [How it works](#how-it-works)
    - [Operational Transform](#operational-transform)
  - [Extension](#extension)
    - [Commands](#commands)
    - [Transformations](#transformations)
    - [History](#history)

## Transport Service

To enable realtime collaboration edition, a TransportService should be given to the Spreadsheet component.

The TransportService is responsible for sending and receiving messages between the clients with the help of central server.

The transport service should implement the [TransportService](tsdoc/interfaces/transportservice.md) interface.

An example can be found in demo/transport.js. The example is implemented using Websockets.

## Coordinating server

[Messages](tsdoc/README.md#CollaborationMessage) sent through the transport service should be handled by a centralized server. Its goal it to coordinate messages, order them and maintain the current spreadsheet revision.
For each received messages, the server decides if it's accepted or not. If the message is accepted, it's transmitted to all clients
(including the one which sent the message).

Messages can be split in two categories:

1. The messages that do not change the state of the spreadsheet and are always accepted:

- [ClientJoinedMessage](tsdoc/interfaces/clientjoinedmessage.md)
- [ClientMovedMessage](tsdoc/interfaces/clientmovedmessage.md)
- [ClientLeftMessage](tsdoc/interfaces/clientleftmessage.md)

1. The messages that require special care to ensure a correct message ordering:

- [RemoteRevisionMessage](tsdoc/interfaces/remoterevisionmessage.md)
- [RevisionUndoneMessage](tsdoc/interfaces/revisionundonemessage.md)
- [RevisionRedoneMessage](tsdoc/interfaces/revisionredonemessage.md)

They have two important properties: `serverRevisionId` and `nextRevisionId`. A message is accepted only if its `serverRevisionId`
is the same as the server revision id. The message is then transmitted to all clients, and the server revision id becomes `nextRevisionId`. Otherwise, the message is rejected. It means that the client should re-sent it later, after transforming it with all the messages it received in the meantime.

By convention, the initial revision id of a blank spreadsheet is `"START_REVISION"`.

A basic example can be found in tools/server/main.js. The example is implemented using Websockets

## How it works

Realtime collaborative editing is based on [Operational Transform](https://en.wikipedia.org/wiki/Operational_transformation).

### Operational Transform

The aim of operation transform is to manage realtime collaborative editing on a document and preserve consistency even with concurrent operations.
It ensures all clients eventually converge to the same state while preserving user intentions.

Let's take a look at two concurrent operations, why it can lead to problems and how operational transform can help:

Alice and Bob are working on the same sheet. At the same time, Alice wants to add a column before "B" and Bob wants to update the cell "B1" with the content "Hello". Let's call Alice's operation `OA` and Bob's operation `OB`.
Both Alice and Bob send their operation to the other.

When Alice receives `OB`, it would update "B1" with "Hello". When Bob receives `OA`,
it would add a column before "B", which moves the current column B to column C.
We now have:

- Alice with an additional column before "B" and "Hello" in "B1"
- Bob with an additional column before "B" and "Hello" in "C1"

Both state have diverged. This can't be good...

That's when operational transform can help.

`OB` on Alice's side is no longer valid since column B was moved to column C. The operation should be adapted to
reflect that. To do that, we apply a transformation to `OB`, to target the column C instead of column B. `OB` becomes "Update "C1" with the content `Hello`". With this transformation, Bob's intention is preserved and the states converge.

In order to identify and resolve which operations conflict, we need a way to detect two concurrent actions, and a way to order them.

To detect concurrency, we introduce a revision log, which is a unique identifier to indicate on which state the action is executed.
Each time an action is received and accepted by the server (the revision log of the server is the same as the action), the revision log is incremented.

Now, we need a way to transform the commands. An easy way would be to transform commands on the server, like [Google Drive](https://drive.googleblog.com/2010/09/whats-different-about-new-google-docs.html). But, in the context of using o-spreadsheet with Odoo, we didn't want to duplicate the transformations functions in both client and server, as the two are implemented in different language.

When a client executes an action, it's locally executed, sent to the server and kept in the pending actions of the user.
If the action is accepted by the server, the action is removed from the pending ones. In the other case, the pending actions are reverted, transformed with the action received from the server, re-applied locally and resent to the server until they are accepted.

Local undo is implemented by keeping locally the actions of the user, revert to just before the undo-ed action, transform the next actions as if the undo-ed action was not executed and re-apply them. Local redo follow the same logic.

To keep a synchronous state, we only need to share the commands which impacts the state of spreadsheet (columns, grid, ...) but not the local state (selection of the user, composer state, ...)

This solution has a lot of pros, but also some cons:

1. We need to write a transformation function for each command we create, which could theoretically becomes huge. However, in practice, the transformations only concerns commands which changes the grid (add/remove columns, remove a sheet, merge).
1. Undo/Redo is synchronous, i.e. it should be accepted by the server before being executed locally.

## Extension

To extend o-spreadsheet without breaking realtime collaborative edition, there are some points to keep in mind.

### Commands

There are two types of [commands](add_command.md): `CoreCommands` and `Commands`. Only `CoreCommands` are synchronized.
Here is the way to register a `CoreCommand` to o-spreadsheet.

```ts
const { coreTypes } = o_spreadsheet;

coreTypes.add("MY_COMMAND_NAME");
```

### Transformations

For each new `CoreCommand`, a transformation function could be required for each other `CoreCommands`.

A transformation function takes as arguments the already executed command, and the command to transform. It should return a `CoreCommands` or `undefined` if the command should be skipped.

If a transformation is required, here is the way to declare it. The transformation check that the command is on the same sheet of the deleted sheet. If true, the command should be skipped.

```ts
const { otRegistry } = o_spreadsheet.registries;

otRegistry.addTransformation("DELETE_SHEET", ["MY_COMMAND"], (myCommand, deleteSheet) => {
  // MY_COMMAND should takes DELETE_SHEET into account as DELETE_SHEET is arrived first
  if (myCommand.sheetId === deleteSheet.sheetId) {
    return undefined;
  }
  return myCommand;
});
```

### History

In addition to a transformation, an "inverse function" is required for commands which transforms other commands. The inverse function takes as input a `CoreCommand` and should return a list of `CoreCommands`. Those commands should have the inverse behavior as the original commands when used in transformation.

```txt
Given:
  A = a command
  B = another command
  A' = A transformed with B
  B⁻¹ = inverse of B
The inverse function should yield a command B⁻¹ such that:
  A === (A' transformed with B⁻¹)
```

In other words, transforming with `B` then transforming the result with `B⁻¹` should have no effect and yield the original command.

The inverse function is used during a selective undo to transform commands executed after the undo-ed command as if the command had never been executed.

Here is the way to declare it.

```ts
const { inverseCommandRegistry } = o_spreadsheet.registries;

inverseCommandRegistry.add("CREATE_SHEET", (cmd) => {
  return [{ type: "DELETE_SHEET", sheetId: cmd.sheetId }];
});
```
