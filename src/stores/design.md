Architecture design
===================

- allow to share global state across components
- allow local state
- Testable without owl rendering
- split "writes" from "reads"
- When computing state from another state, mutating the original state should not be possible
- decoupled from model/getters ?
- avoid (hidden) side effects: make them explicit "à la" useEffect ?

State - Store - Workflow
