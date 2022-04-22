# UI refactoring

## Architecture design

- allow to share global state across components
- allow local state
- Testable without owl rendering
- split "writes" from "reads"
- When computing state from another state, mutating the original state should not be possible
- decoupled from model/getters ?
- avoid (hidden) side effects: make them explicit "à la" useEffect ?

State - Store - Workflow

## Ideas

### Store dependencies

watch another store's state and compute a derived state.
if the watched stored is changed, the store is rebuilt from scratch.

### Workflow

Allow to perform side effects.
e.g. a state change in a store triggers any action, including notifying another store to change its state.
e.g. a command dispatch triggers an action, including notifying another store to change its state.

Multiple sources of "change"? e.g. store, command dispatch
Or explicit dependencies and check changes? like useEffect
