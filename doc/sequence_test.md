```mermaid
sequenceDiagram
    participant User 1
    participant User 2
    User 1->>+Server: Hello Server, how are you?
    loop Healthcheck
        Server->>Server: Fight against hypochondria
    end
    Note right of Server: Rational thoughts <br/>prevail!
    Server-->>-User 1: Great!
    Server-->>User 1: Get away from me !
    Server->>+User 2: How about you?
    User 2-->>-Server: Jolly good!
```