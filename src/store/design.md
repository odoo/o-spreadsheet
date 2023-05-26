# Design

## Decouple UI state from Components hierarchy

=> centralize state used by several components across the UI.

=> move as much as possible out of components

Repeatable commands: UI command should not depend on local UI plugin state

## Why not in plugins?

UI state needs model state (getters) and react to model changes (commands)

- boiler plate to add getters/command/plugin
- render too much (deep render)
- specific commands would be handled by this command only (multi-casting useless)
- add mess to getters/commands

## Ideas en vrac

"real" UI plugins ?
with access to getters and handle commands
but exposes methods and attributes to components
What about dispatch (e.g. find & replace) ?
