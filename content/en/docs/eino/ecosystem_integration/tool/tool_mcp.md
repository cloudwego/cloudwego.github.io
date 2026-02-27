---
Description: ""
date: "2026-01-20"
lastmod: ""
tags: []
title: Eino Tool - MCP
weight: 0
---

## Overview

[Model Context Protocol (MCP)](https://modelcontextprotocol.io/introduction) is a standardized open protocol introduced by Anthropic for model access to resources. Eino provides wrappers so you can directly use resources exposed by an existing MCP Server.

This section introduces the [MCPTool](https://modelcontextprotocol.io/docs/concepts/tools) wrapper, which implements Eino's `InvokableTool` interface ([Eino: ToolsNode guide](/docs/eino/core_modules/components/tools_node_guide)).

<a href="/img/eino/eino_mcp_tool_architecture.png" target="_blank"><img src="/img/eino/eino_mcp_tool_architecture.png" width="100%" /></a>

Also see:

[ChatTemplate - MCP](/docs/eino/ecosystem_integration/chat_template/chat_template_mcp)

## Usage

### QuickStart

First create an MCP client. Eino leverages the open-source SDK [mark3labs/mcp-go](https://github.com/mark3labs/mcp-go):

```go
import "github.com/mark3labs/mcp-go/client"

// stdio client
cli, err := client.NewStdioMCPClient(myCommand, myEnvs, myArgs...)

// sse client
cli, err := client.NewSSEMCPClient(myBaseURL)
// sse client needs to manually start asynchronous communication
// while stdio does not require it.
err = cli.Start(ctx)
```

mcp-go also supports other methods to create a Client (such as InProcess). For more information, see: [https://mcp-go.dev/transports](https://mcp-go.dev/transports)

Considering client reuse, the wrapper assumes the client has finished [Initialize](https://spec.modelcontextprotocol.io/specification/2024-11-05/basic/lifecycle/) with the Server; you need to perform client initialization yourself:

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

Then create Eino tools using the Client:

```go
import "github.com/cloudwego/eino-ext/components/tool/mcp"

tools, err := mcp.GetTools(ctx, &mcp.Config{Cli: cli})
```

Tools can be called directly:

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

You can also use tools within any Eino Agent; for example with [ReAct Agent](/docs/eino/core_modules/flow_integration_components/react_agent_manual):

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

### Specify Tool by Name

`GetTools` supports filtering by tool names to avoid unintended tools:

```go
import "github.com/cloudwego/eino-ext/components/tool/mcp"

tools, err := mcp.GetTools(ctx, &mcp.Config{
    Cli: cli,
    ToolNameList: []string{"name"},
})
```

## More Information

Practice example: [https://github.com/cloudwego/eino-ext/blob/main/components/tool/mcp/examples/mcp.go](https://github.com/cloudwego/eino-ext/blob/main/components/tool/mcp/examples/mcp.go)
