---
Description: ""
date: "2025-03-12"
lastmod: ""
tags: []
title: Tool - MCP
weight: 0
---

## 基本介绍

[Model Context Protocol(MCP)](https://modelcontextprotocol.io/introduction)是 Anthropic 推出的供模型访问的资源的标准化开放协议，Eino 提供了相关封装，使用这些封装可以直接访问已有 MCP Server 上的资源。

本节介绍 [MCPTool](https://modelcontextprotocol.io/docs/concepts/tools) 的封装，封装实现了 Eino InvokableTool 接口（[Eino: ToolsNode 使用说明](/zh/docs/eino/core_modules/components/tools_node_guide)）。

<a href="/img/eino/V3NwbrJrvoS4qdxyosscHDnon8b.png" target="_blank"><img src="/img/eino/V3NwbrJrvoS4qdxyosscHDnon8b.png" width="100%" /></a>

其他封装参见：

[ChatTemplate - MCP](/zh/docs/eino/ecosystem_integration/chat_template/chat_template_mcp)

## 使用方式

### QuickStart

首先创建 mcp client，Eino 利用了开源 sdk [mark3labs/mcp-go](https://github.com/mark3labs/mcp-go)：

```go
import "github.com/mark3labs/mcp-go/client"

// stdio client
cli, err := client.NewStdioMCPClient(myCommand, myEnvs, myArgs...)

// sse client
cli, err := client.NewSSEMCPClient(myBaseURL)
// sse client  needs to manually start asynchronous communication
// while stdio does not require it.
err = cli.Start(ctx)
```

考虑到 client 的复用，封装假设 client 已经完成和 Server 的 [Initialize](https://spec.modelcontextprotocol.io/specification/2024-11-05/basic/lifecycle/)，用户需要自行完成 client 初始化：

```go
import "github.com/mark3labs/mcp-go/mcp"

initRequest := mcp.InitializeRequest{}
initRequest.Params.ProtocolVersion = mcp.LATEST_PROTOCOL_VERSION
initRequest.Params.ClientInfo = mcp.Implementation{
    Name:    "example-client",
    Version: "1.0.0",
}
_, err = cli.Initialize(ctx, initRequest)
```

之后使用 Client 创建 Eino Tool：

```go
import "github.com/cloudwego/eino-ext/components/tool/mcp"

tools, err := mcp.GetTools(ctx, &mcp.Config{Cli: cli})
```

tool 可以直接调用：

```
for i, mcpTool := range mcpTools {
    fmt.Println(i, ":")
    info, err := mcpTool.Info(ctx)
    if err != nil {
       log.Fatal(err)
    }
    fmt.Println("Name:", info.Name)
    fmt.Println("Desc:", info.Desc)
    fmt.Println()
}
```

也可以在任意 Eino Agent 中使用，以 [ReAct Agent](/zh/docs/eino/core_modules/flow_integration_components/react_agent_manual) 为例：

```
import (
    "github.com/cloudwego/eino/flow/agent/react"
    "github.com/cloudwego/eino-ext/components/tool/mcp"    
)

llm, err := /*create a chat model*/
tools, err := mcp.GetTools(ctx, &mcp.Config{Cli: cli})

agent, err := react.NewAgent(ctx, &react.AgentConfig{
    Model:                 llm,
    ToolsConfig:           compose.ToolsNodeConfig{Tools: tools},
})
```

### 按 Name 指定 Tool

GetTools 支持使用 Name 筛选 Server 提供的 Tools，避免调用预期外的 Tools：

```go
import "github.com/cloudwego/eino-ext/components/tool/mcp"

tools, err := mcp.GetTools(ctx, &mcp.Config{
    Cli: cli,
    ToolNameList: []string{"name"},
})
```

## 更多信息

实践例子可以参考：[https://github.com/cloudwego/eino-ext/blob/main/components/tool/mcp/examples/mcp.go](https://github.com/cloudwego/eino-ext/blob/main/components/tool/mcp/examples/mcp.go)
