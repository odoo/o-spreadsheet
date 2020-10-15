```mermaid
sequenceDiagram
    participant Alice UI
    participant Alice Model
    participant Alice History
    participant server
    participant Bob
    Alice UI->>Alice Model: Dispatch Command (1: update B4)
    Alice Model->>Alice Model: Validate Command (1: update B4)
    Alice Model->>Alice Model: Dispatch Event (1: B4 Updated)
    Alice Model->>server: Dispatch Event
    server->>Alice Model: done


```