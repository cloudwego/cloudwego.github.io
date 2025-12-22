---
title: "埋点粒度"
date: 2021-08-26
weight: 1
keywords: ["Kitex", "埋点"]
description: Kitex 支持灵活启用基本埋点和细粒度埋点。
---

埋点粒度：

1. LevelDisabled 禁用埋点
2. LevelBase 仅启用基本埋点
3. LevelDetailed 启用基本埋点和细粒度埋点

## 埋点策略 & 埋点粒度控制

默认埋点策略：

1. 无 tracer 时，默认 LevelDisabled
2. 有 tracer 时，默认 LevelDetailed

客户端埋点粒度控制：

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

服务端埋点粒度控制：

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

## 埋点说明

基本埋点：

1. RPCStart，（客户端 / 服务端）RPC 调用开始
2. RPCFinish，（客户端 / 服务端）RPC 调用结束

细粒度埋点（客户端）：

1. ClientConnStart，连接建立开始
2. ClientConnFinish，连接建立结束
3. WriteStart，请求发送（含编码）开始
4. WriteFinish，请求发送（含编码）结束
5. ReadStart，响应接收（含解码）开始
6. WaitReadStart，响应二进制读取开始（仅适用于 `Fast Codec`）
7. WaitReadFinish，响应二进制读取完毕（仅适用于 `Fast Codec`）
8. ReadFinish，响应接收（含解码）完毕

细粒度埋点（服务端）：

1. ReadStart，请求接收（含解码）开始
2. WaitReadStart，请求二进制读取开始（仅适用于 `Fast Codec`）
3. WaitReadFinish，请求二进制读取完毕（仅适用于 `Fast Codec`）
4. ReadFinish，请求接收（含解码）完毕
5. ServerHandleStart，handler 处理开始
6. ServerHandleFinish，handler 处理完毕
7. WriteStart，响应发送（含编码）开始
8. WriteFinish，响应发送（含编码）结束

时序图：

客户端埋点时序图

```mermaid
%%{init: {'theme': 'base', 'flowchart': {'nodeSpacing': 10, 'rankSpacing': 20}}}%%
flowchart TD
    A[发起调用] --> B[RPCStart]
    B --> C[中间件]
    C --> D[ClientConnStart]
    D --> E[ClientConnFinish]
    E --> F[WriteStart]
    F --> G[请求编码]
    G --> H[WriteFinish]
    H --> I[等待响应]
    I --> J[ReadStart]
    J --> K[WaitReadStart]
    K --> L[WaitReadFinish]
    L --> M[响应解码]
    M --> N[ReadFinish]
    N --> O[中间件]
    O --> P[RPCFinish]
    classDef event fill:#fff,stroke:#ff0000,stroke-width:2px,color:#000
    classDef process fill:#fff,stroke:#000000,stroke-width:2px,color:#000
    class B,D,E,F,H,J,K,L,N,P event
    class A,C,G,I,M,O process
```

服务端埋点时序图

```mermaid
%%{init: {'theme': 'base', 'flowchart': {'nodeSpacing': 10, 'rankSpacing': 20}}}%%
flowchart TD
    A[调用开始] --> B[RPCStart]
    B --> C[ReadStart]
    C --> D[WaitReadStart]
    D --> E[WaitReadFinish]
    E --> F[请求解码]
    F --> G[ReadFinish]
    G --> H[中间件]
    H --> I[ServerHandleStart]
    I --> J[handler处理]
    J --> K[ServerHandleFinish]
    K --> L[中间件]
    L --> M[WriteStart]
    M --> N[响应编码]
    N --> O[WriteFinish]
    O --> P[RPCFinish]
    classDef event fill:#fff,stroke:#ff0000,stroke-width:2px,color:#000
    classDef process fill:#fff,stroke:#000000,stroke-width:2px,color:#000
    class B,C,D,E,G,I,K,M,O,P event
    class A,F,H,J,L,N process
```
