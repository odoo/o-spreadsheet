The solution we implement is based on Operation Transform (OT).

To separate which commands should be shared, we introduce a separation of the commands:

- CoreCommands: all the commands handled by a CorePlugin
- Commands: all the CoreCommands and the Commands handled by a UIPlugin (i.e. all the commands of spreadsheet)

For each new CoreCommand, a check should be done if transformation and inverse functions should be written (a test is present to force this check).

Here is our thoughts and reflection about how to implement the multi user feature
in o-spreadsheet.

Here is the main points to address:

1. How to have a synchronized between multiple clients
2. The spreadsheet should be reactive, i.e. the actions the user do should be immediately executed locally
3. Which piece of information should be shared?
4. How to manage concurrency and conflicts (ex: update a cell in a removed sheet)
5. How to handle local Undo/Redo

We explored multiple options:

1. Do nothing

With this option, the clients send their changes to others without taking care of concurrency and conflicts. The last arrived wins. This required to send all changes, so adding a columns (which moves all the cells to the right) is quite huge.
This option was quickly abandoned as it's not possible to handle conflicts and Undo/Redo.

2. CRDT

CRDT is smarter and probably better than OT in terms of synchronization, but is actually much more complex (in terms of code and data).
Working with CRDT is a good option with lightweight data structure with not much relation between them. In the context of spreadsheet with the use of plugins which communicates with each others, this option would have required a lot of changes in the way spreadsheet works.

This option was explored but abandoned due to the high complexity.

3. Operational Transform

The aim of operation transform is to keep the intention of the users, even when the actions are executed concurrently.
This required to transform the operation which comes after with the transformation which comes before. To do that, we need a global order, which will be explained later.
Let's take an example:

Alice and Bob works on the same sheet. At the same time, Alice wants to add a column before "B" while Bob wants to update the cell "B1" with the content "Hello". Let's say that the action of Alice is the first one.

When the action of Bob arrives (update the cell), it's not longer valid as the column B was moved to the column C. So, his action should be updated to reflect that. To do that, we will apply a transformation to the action of B, to target the column C. The action of Bob becomes "Update the cell 'C1' with the content 'Hello'". With that transformation, the intention of Bob is preserved, and the state is fully synchronized.

In order to identity and resolve conflicts, we need a way to detect two concurrent actions, and a way to order them.

The first option we explored to resolve that is the implement a state vector, which allows detecting conflicts and order commands client-side. This option was quickly abandoned as it's required bi-directional transformation.

The second option (the which we keep) was to introduce a server-based scheduling. The first command the server received is considered as the first command. To detect concurrency, we introduce a revision log, which is a unique identifier to indicate on which state the action is executed.
Each time an action is received and accepted by the server (the revision log of the server is the same as the action), the revision log is incremented.

Now, we need a way to transform the commands. An easy way would be to transform commands on the server, like [Google Drive](https://drive.googleblog.com/2010/09/whats-different-about-new-google-docs.html). However, in the context of using o-spreadsheet with Odoo, we didn't want to duplicate the transformations functions in both client and server, as the two are implemented in different language.

When a client executes an action, it's locally executed, sent to the server and kept in the pending actions of the user.
If the action is accepted by the server, the action is removed from the pending ones. In the other case, the pending actions are reverted, transformed with the action received from the server, re-applied locally and resent to the server until they are accepted.

Local undo is implemented by keeping locally the actions of the user, revert to just before the undo-ed action, transform the next actions as if the undo-ed action was not executed and re-apply them. Local redo follow the same logic.

To keep a synchronous state, we only need to share the commands which impacts the state of spreadsheet (columns, grid, ...) but not the local state (selection of the user, composer state, ...)

This solution has a lot of pros, but also some cons:

1. We need to write a transformation function for each command we create, which could theoretically becomes huge. However, in practice, the transformations only concerns commands which changes the grid (add/remove columns, remove a sheet, merge).
2. Undo/Redo is synchronous, i.e. it should be accepted by the server before being executed locally.

For more detailed documentation and how to integrate collaborative editing with o-spreadsheet, please consult the documentation of o-spreadsheet.

Sources:

- https://josephg.com/blog/crdts-are-the-future/
- https://martin.kleppmann.com/2020/07/06/crdt-hard-parts-hydra.html
- https://hal.inria.fr/hal-01287738/document
- https://www.youtube.com/watch?v=OOlnp2bZVRs&ab_channel=CurryOn%21
- https://github.com/automerge/automerge
- Yjs foundation paper: https://www.researchgate.net/publication/310212186_Near_Real-Time_Peer-to-Peer_Shared_Editing_on_Extensible_Data_Types
- https://drive.googleblog.com/2010/09/whats-different-about-new-google-docs.html
- https://drive.googleblog.com/2010/09/whats-different-about-new-google-docs_21.html
- https://drive.googleblog.com/2010/09/whats-different-about-new-google-docs-22.html

3. Operational Transform inverse commands/events

Undo/Redo with inverse command, but actually inverse events

- can snapshot every time someone leaves (since we don't need the history)
- no need to keep and apply history when joining a session
- reduce the risk of mutating plugin data and fuck the history
- history is easy
- concurrent undo/redo are allowed

* more work to introduce a new command => need to introduce events as well
* more bandwidth/data. e.g. ADD_ROW becomes "row-added", "cell-updated", "cell-updated", "cell-updated", "cell-updated"...
* need to trigger an event to change the state (same as this.history.update)
