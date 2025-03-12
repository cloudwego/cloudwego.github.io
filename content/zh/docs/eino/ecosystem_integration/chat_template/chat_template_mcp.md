---
Description: ""
date: "2025-03-12"
lastmod: ""
tags: []
title: ChatTemplate - MCP
weight: 0
---

## 基本介绍

Model Context Protocol(MCP)是 Anthropic 推出的供模型访问的资源的标准化开放协议，Eino 提供了相关封装，使用这些封装可以直接访问已有 MCP Server 上的资源。

本节介绍 MCPPrompt 的封装，封装实现了 Eino ChatTemplate 接口（[Eino: ChatTemplate 使用说明](/zh/docs/eino/core_modules/components/chat_template_guide)）。

<a href="/img/eino/N1UgbTQFioeqPaxeL9XcWNqGn5g.png" target="_blank"><img src="/img/eino/N1UgbTQFioeqPaxeL9XcWNqGn5g.png" width="100%" /></a>

其他封装参见：

[[WIP]Tool - MCP](/zh/docs/eino/ecosystem_integration/tool/tool_mcp)

## 使用方式

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

之后使用 Client 创建 Eino ChatTemplate：

```go
import "github.com/cloudwego/eino-ext/components/tool/mcp"

tpl, err := mcp.NewPromptTemplate(ctx, &mcp.Config{
    Cli: cli,
    Name: "your prompt name",     
})
```

template 可以直接调用：

```
result, err := tpl.Format(ctx, map[string]interface{}{/* input k-v */})
```

也可以在任意 Eino Agent 中使用，以最简单的一个 llm chain 为例：

```
import (
    "github.com/cloudwego/eino/compose"
    "github.com/cloudwego/eino-ext/components/prompt/mcp"  
)

llm, err := /*create a chat model*/
tpl, err := mcp.NewPromptTemplate(ctx, &mcp.Config{
    Cli: cli,
    Name: "your prompt name",     
})

runner, err := compose.NewChain[map[string]any, *schema.Message]().
    AppendChatTemplate(tpl).
    AppendChatModel(llm).
    Compile(ctx)
```

## 更多信息

实践例子可以参考：[https://github.com/cloudwego/eino-ext/blob/main/components/prompt/mcp/examples/mcp.go](https://github.com/cloudwego/eino-ext/blob/main/components/prompt/mcp/examples/mcp.go)
