---
Description: ""
date: "2025-03-12"
lastmod: ""
tags: []
title: ChatTemplate - MCP
weight: 0
---

## Introduction

Model Context Protocol(MCP) is a standardized open protocol for model access introduced by Anthropic. Eino provides adapters, which can directly access resources on existing MCP Servers.

This section introduces the adapter of MCPPrompt, which implements the [Eino ChatTemplate interface](/en/docs/eino/core_modules/components/chat_template_guide).

<a href="/img/eino/ZiP5b3fivouCBbxCggYcWHqanRv.png" target="_blank"><img src="/img/eino/ZiP5b3fivouCBbxCggYcWHqanRv.png" width="100%" /></a>

Other adapters：

[Tool - MCP](/en/docs/eino/ecosystem/tool/tool_mcp)

## HowToUse

Eino MCP adapters referenced the open-source SDK [mcp-go](https://github.com/mark3labs/mcp-go), first initialize a MCP client：

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

Considering the reusability of multiple adapters for the MCP client, the adapter assumes that the client has completed initialization with the Server's [Initialize](https://spec.modelcontextprotocol.io/specification/2024-11-05/basic/lifecycle/), so users need to complete the client initialization themselves, for example:

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

Then use the Client to create the adapter , which implements Eino ChatTemplate:

```go
import "github.com/cloudwego/eino-ext/components/tool/mcp"

tpl, err := mcp.NewPromptTemplate(ctx, &mcp.Config{
    Cli: cli,
    Name: "your prompt name",     
})
```

You can call this adapter directly:

```
result, err := tpl.Format(ctx, map[string]interface{}{/* input k-v */})
```

It can also be used in any Eino Agent, taking the simplest llm chain as an example:

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

## More Information

Examples can be referred to: [https://github.com/cloudwego/eino-ext/blob/main/components/prompt/mcp/examples/mcp.go](https://github.com/cloudwego/eino-ext/blob/main/components/prompt/mcp/examples/mcp.go)
