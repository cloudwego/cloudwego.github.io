---
Description: ""
date: "2025-11-20"
lastmod: ""
tags: []
title: Tool - MCP
weight: 0
---

## Overview

Model Context Protocol (MCP) standardizes model access to external resources. Eino provides wrappers so you can directly use resources exposed by an existing MCP Server.

This section introduces the `MCPTool` wrapper, which implements Eino’s `InvokableTool` interface ([Eino: ToolsNode guide](/docs/eino/core_modules/components/tools_node_guide)).

<a href="/img/eino/eino_mcp_tool_architecture.png" target="_blank"><img src="/img/eino/eino_mcp_tool_architecture.png" width="100%" /></a>

Also see: [ChatTemplate - MCP](/docs/eino/ecosystem_integration/chat_template/chat_template_mcp)

## Usage

### QuickStart

First create an MCP client. Eino leverages the open-source SDK `mark3labs/mcp-go`:

```go
import "github.com/mark3labs/mcp-go/client"

// stdio
cli, _ := client.NewStdioMCPClient(cmd, envs, args...)
// sse
cli, _ := client.NewSSEMCPClient(baseURL)
// sse client needs to manually start asynchronous communication
// while stdio does not require it.
_ = cli.Start(ctx)
```

Considering client reuse, the wrapper assumes the client has finished `Initialize` with the Server; you need to perform client initialization yourself:

```go
import "github.com/mark3labs/mcp-go/mcp"

init := mcp.InitializeRequest{}
init.Params.ProtocolVersion = mcp.LATEST_PROTOCOL_VERSION
init.Params.ClientInfo = mcp.Implementation{ Name: "example-client", Version: "1.0.0" }
_, _ = cli.Initialize(ctx, init)
```

Then create Eino tools using the Client:

```go
import "github.com/cloudwego/eino-ext/components/tool/mcp"

tools, _ := mcp.GetTools(ctx, &mcp.Config{ Cli: cli })
```

Tools can be called directly:

```
for i, mcpTool := range tools {
    fmt.Println(i, ":")
    info, err := mcpTool.Info(ctx)
    if err != nil { log.Fatal(err) }
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
    Model:       llm,
    ToolsConfig: compose.ToolsNodeConfig{Tools: tools},
})
```

### Specify Tool by Name

`GetTools` supports filtering by tool names to avoid unintended tools:

```go
tools, _ := mcp.GetTools(ctx, &mcp.Config{ Cli: cli, ToolNameList: []string{"name"} })
```

Or use tools within any Eino Agent; for example with [ReAct Agent](/docs/eino/core_modules/flow_integration_components/react_agent_manual):

```go
agent, _ := react.NewAgent(ctx, &react.AgentConfig{ Model: llm, ToolsConfig: compose.ToolsNodeConfig{ Tools: tools } })
```

## More Information

Practice example: https://github.com/cloudwego/eino-ext/blob/main/components/tool/mcp/examples/mcp.go
