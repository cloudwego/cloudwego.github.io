---
Description: ""
date: "2025-03-12"
lastmod: ""
tags: []
title: Tool - MCP
weight: 0
---

## Introduction

Model Context Protocol(MCP) is a standardized open protocol for model access introduced by Anthropic. Eino provides adapters, which can directly access resources on existing MCP Servers.

This section introduces the adapter of MCPTool, which implements the [Eino Tool](/en/docs/eino/core_modules/components/tools_node_guide).

<a href="/img/eino/HotzbOFL6oZFQWxWP10caT9Wnuc.png" target="_blank"><img src="/img/eino/HotzbOFL6oZFQWxWP10caT9Wnuc.png" width="100%" /></a>

Other adapters：

[ChatTemplate - MCP](/en/docs/eino/ecosystem/chat_template/chat_template_mcp)

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

Then use the Client to create the adapter , which implements Eino Tool:

```go
import "github.com/cloudwego/eino-ext/components/tool/mcp"

tools, err := mcp.GetTools(ctx, &mcp.Config{Cli: cli})
```

You can call this adapter directly:

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

It can also be used in any Eino Agent, taking the  [ReAct Agent](/en/docs/eino/core_modules/flow_integration_components/react_agent_manual) as an example:

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

### SpecifyToolName

You can use the field ToolNameList in config to specify the tools you want to call, avoiding calling unexpected tools：

```go
import "github.com/cloudwego/eino-ext/components/tool/mcp"

tools, err := mcp.GetTools(ctx, &mcp.Config{
    Cli: cli,
    ToolNameList: []string{"your tool name"},
})
```

## More Information

Examples can be referred to: [https://github.com/cloudwego/eino-ext/blob/main/components/tool/mcp/examples/mcp.go](https://github.com/cloudwego/eino-ext/blob/main/components/tool/mcp/examples/mcp.go)
