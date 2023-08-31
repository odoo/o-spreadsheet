# The why

## Decouple UI state from Components hierarchy

Main goals:

1. Centralize the state used by several components across the UI.
1. Move as much business logic as possible out of components (easier/faster to test).
1. Interact with UI from the outside world (example: we currently cannot open a sidepanel from the outside of the app.)

## Why not in plugins?

While these goals could be addressed by relocating state and business logic to plugins, several disadvantages are associated with this approach:

- Excessive rendering occurs (deep rendering, the entire app is rendered with each command) even when only a single UI-only component has changed.

- Introducing boilerplate code to add getters, commands, and plugins can be cumbersome, particularly for small components.

- When the state is specific to a single component (such as find & replace, composer, or selection input), commands are solely handled by one plugin. This means that the advantages of multi-casting and shared getters, isn't used.

- If the state/logic belongs to a single component, it introduces unnecessary noise to getters and commands, all for the sake of a single component.

- Unlike plugins, a single component can be mounted multiple times. Each component should possess its own state. Look at the mess with SelectionInput component/plugins.

Another issue with local/UI state in plugins comes with the "repeatable commands" feature. Let's say a UI command is dispatched which in turns
dispatches a core command based on the plugin's local state (STOP_EDITION). The main command (STOP_EDITION) cannot be repeated in its original form. Specific/custom logic is required to extract the underlying changes within all dispatched commands in the revision.

## Notes en vrac

with access to getters and handle commands
but exposes methods and attributes to components
What about dispatch (e.g. find & replace) ?
UI state needs model state (getters) and react to model changes (commands)

Local store arguments should be config only => readonly stuff
