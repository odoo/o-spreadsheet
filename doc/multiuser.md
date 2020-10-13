# Spreadsheet multiuser

This document contains our throughts and reflexion about how to implement the multiuser feature in o-spreadsheet.

Branches (for now it's only experimental code):

- https://github.com/odoo-dev/enterprise/tree/master-spreadsheet-multiuser-pro-lul
- https://github.com/odoo/o-spreadsheet/tree/master-multiuser-pro-lul

There are three main points to address:

- How to share the information between clients ? (both in o-spreadsheet and Odoo)
- Which piece of information we should share ?
- How to manage concurrency and conflicts (ex: update a cell in a removed sheet)

## Share informations: Command dispatcher

- Receive and dispatch command to all clients
- Responsible of order of commands
- A user should be allowed to open a spreadsheet, currently edited by someone else, with all the changes applied. (See https://www.factorio.com/blog/post/fff-149, https://factorio.com/blog/post/fff-302)

## Which commands should be shared

- Update cell (content, format, style, border)
- Merge
- Grid manipulation (add/remove cols/rows)
- CF (add, edit, remove)
- Sheets (add, rename, remove, move)
- Selection (to display the selection of other users)
- Figure (Create/Remove/Update)
- Chart (Create/Update)
- (Odoo) Pivots (add, remove?, edit?)
- (Odoo) Global Filters (add, remove)

## Operational transform

We explored three possible options: do nothing, CRDT and OT

### Do nothing

Option quickly abandoned, as it's not possible to manage conflicts

### CRDT

Conclusion: Les CRDT c'est très smart (et probablement supérieur à OT). Mais ça ne colle pas bien à notre use case car les plugins sont des structures de données assez complexes (+ les relations entre elles). CRDT = top pour structures simples (number, string, arrays, objects), mais probablement pas pour nous, ça serait trop compliqué à implémenter correctement et impliquerait de gros changements de structure de données.

Basé sur:

- https://josephg.com/blog/crdts-are-the-future/
- https://martin.kleppmann.com/2020/07/06/crdt-hard-parts-hydra.html
- https://hal.inria.fr/hal-01287738/document
- https://www.youtube.com/watch?v=OOlnp2bZVRs&ab_channel=CurryOn%21
- https://github.com/automerge/automerge
- Yjs foundation paper: https://www.researchgate.net/publication/310212186_Near_Real-Time_Peer-to-Peer_Shared_Editing_on_Extensible_Data_Types

### Operational Transform

Two options: client-side or server-side.
We chose client-side to be able to re-use the code already written.
Server-side is required for two reasons:
- manage client involuntary disconnections
- allow new clients to catch up new commands since the last snapshot.
Client-side is required because of concurrent local commands.

Based on :
- https://citeseerx.ist.psu.edu/viewdoc/download?doi=10.1.1.56.8244&rep=rep1&type=pdf
- https://tel.archives-ouvertes.fr/tel-00684167/document
- https://drive.googleblog.com/2010/09/whats-different-about-new-google-docs.html
- https://drive.googleblog.com/2010/09/whats-different-about-new-google-docs_21.html
- https://drive.googleblog.com/2010/09/whats-different-about-new-google-docs_22.html
- https://medium.com/coinmonks/operational-transformations-as-an-algorithm-for-automatic-conflict-resolution-3bf8920ea447

## Misc

- on Google Spreadsheet, if two clients update the same cell, it's the last arrived who wins
- Ensure the ids for sheets are the same: open an empty model on two clients => ids are different. Note that it should not happen in Odoo
- History:
  - https://www.researchgate.net/publication/228350278_Tombstone_Transformation_Functions_for_Ensuring_Consistency_in_Collaborative_Editing_Systems/link/09e4150c8508e461a3000000/download
