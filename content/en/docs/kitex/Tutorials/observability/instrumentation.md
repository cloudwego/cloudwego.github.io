---
title: "Instrumentation Control"
date: 2021-08-31
weight: 1
keywords: ["Kitex", "Stats", "Instrumentation"]
description: Kitex supports flexible enabling of basic and fine-grained Instrumentation.
---

Stats Level:

1. LevelDisabled, disable all events
2. LevelBase, enable basic events
3. LevelDetailed, enable basic events and detailed events.

## Stats Level

Default Stats Level:

1. No tracer is available, LevelDisabled by default
2. At least one tracer is available, LevelDetailed by default

Client tracing stats level control:

```go
import "github.com/cloudwego/kitex/client"
import "github.com/cloudwego/kitex/pkg/stats"
...
baseStats := client.WithStatsLevel(stats.LevelBase)
client, err := echo.NewClient("echo", baseStats)
if err != nil {
	log.Fatal(err)
}
```

Server tracing stats level control:

```go
import "github.com/cloudwego/kitex/server"
import "github.com/cloudwego/kitex/pkg/stats"
...
baseStats := server.WithStatsLevel(stats.LevelBase)
svr, err := echo.NewServer(baseStats)
if err := svr.Run(); err != nil {
	log.Println("server stopped with error:", err)
} else {
	log.Println("server stopped")
}
```

## Stats introduction

Basic Stats Event:

1. RPCStart，（client/server）RPC call start
2. RPCFinish，（client）RPC call finish

Detailed Stats Event(client):

1. ClientConnStart, connection establishment start
2. ClientConnFinish，connection establishment finish
3. WriteStart, request send (serialization including) start
4. WriteFinish, request send (serialization including) finish
5. ReadStart, response receive (deserialization including) start
6. WaitReadStart, response stream read start (`Fast Codec` only)
7. WaitReadFinish, response stream read finish (`Fast Codec` only)
8. ReadFinish, response receive (deserialization including) finish

Detailed Stats Event(server):

1. ReadStart, request receive (deserialization including) start
2. WaitReadStart, request stream read start (`Fast Codec` only)
3. WaitReadFinish, request stream read finish (`Fast Codec` only)
4. ReadFinish, request receive (deserialization including) start
5. ServerHandleStart, handler process start
6. ServerHandleFinish, handler process finish
7. WriteStart, response send (serialization including) start
8. WriteFinish, response send (serialization including) start

Timeline:

client stats events timeline:

```mermaid
%%{init: {'theme': 'base', 'flowchart': {'nodeSpacing': 10, 'rankSpacing': 20}}}%%
flowchart TD
    A[Start Invocation] --> B[RPCStart]
    B --> C[Middlewares]
    C --> D[ClientConnStart]
    D --> E[ClientConnFinish]
    E --> F[WriteStart]
    F --> G[Marshal Request]
    G --> H[WriteFinish]
    H --> I[Wait for Response]
    I --> J[ReadStart]
    J --> K[WaitReadStart]
    K --> L[WaitReadFinish]
    L --> M[Unmarshal Response]
    M --> N[ReadFinish]
    N --> O[Middlewares]
    O --> P[RPCFinish]
    classDef event fill:#fff,stroke:#ff0000,stroke-width:2px,color:#000
    classDef process fill:#fff,stroke:#000000,stroke-width:2px,color:#000
    class B,D,E,F,H,J,K,L,N,P event
    class A,C,G,I,M,O process
```

server stats events timeline:

```mermaid
%%{init: {'theme': 'base', 'flowchart': {'nodeSpacing': 10, 'rankSpacing': 20}}}%%
flowchart TD
    A[Invocation Started] --> B[RPCStart]
    B --> C[ReadStart]
    C --> D[WaitReadStart]
    D --> E[WaitReadFinish]
    E --> F[Unmarshal Request]
    F --> G[ReadFinish]
    G --> H[Middlewares]
    H --> I[ServerHandleStart]
    I --> J[Handler Process]
    J --> K[ServerHandleFinish]
    K --> L[Middlewares]
    L --> M[WriteStart]
    M --> N[Marshal Response]
    N --> O[WriteFinish]
    O --> P[RPCFinish]
    classDef event fill:#fff,stroke:#ff0000,stroke-width:2px,color:#000
    classDef process fill:#fff,stroke:#000000,stroke-width:2px,color:#000
    class B,C,D,E,G,I,K,M,O,P event
    class A,F,H,J,L,N process
```
