---
Description: ""
date: "2025-03-20"
lastmod: ""
tags: []
title: Tool - httprequest
weight: 0
---

## HTTP Request Tool

A set of HTTP request tools for [Eino](https://github.com/cloudwego/eino) implementing the `InvokableTool` interface. These tools let you easily perform GET/POST/PUT/DELETE requests and integrate with Eino’s ChatModel interaction system and `ToolsNode` for powerful capabilities.

## Features

- Implements `github.com/cloudwego/eino/components/tool.InvokableTool`
- Supports GET, POST, PUT, and DELETE requests
- Configurable headers and `http.Client`
- Simple integration with Eino’s tool system

## Installation

```bash
go get github.com/cloudwego/eino-ext/components/tool/httprequest
```

## Quick Start
Below are standalone examples for GET and POST tools.

### GET Example

```go
package main

import (
    "context"
    "fmt"
    "log"
    "time"

    "github.com/bytedance/sonic"
    get "github.com/cloudwego/eino-ext/components/tool/httprequest/get"
)

func main() {
    // Configure the GET tool
    config := &get.Config{
        // Headers is optional
        Headers: map[string]string{
            "User-Agent": "MyCustomAgent",
        },
        // HttpClient is optional
        HttpClient: &http.Client{
            Timeout:   30 * time.Second,
            Transport: &http.Transport{},
        },
    }

    ctx := context.Background()

    // Create the GET tool
    tool, err := get.NewTool(ctx, config)
    if err != nil {
        log.Fatalf("Failed to create tool: %v", err)
    }

    // Prepare the GET request payload
    request := &get.GetRequest{
        URL: "https://jsonplaceholder.typicode.com/posts",
    }

    args, err := sonic.Marshal(request)
    if err != nil {
        log.Fatalf("Error marshaling JSON: %v", err)
    }

    // Execute the GET request via InvokableTool
    resp, err := tool.InvokableRun(ctx, string(args))
    if err != nil {
        log.Fatalf("GET request failed: %v", err)
    }

    fmt.Println(resp)
}
```

### POST Example

```go
package main

import (
    "context"
    "fmt"
    "log"
    "time"

    "github.com/bytedance/sonic"
    post "github.com/cloudwego/eino-ext/components/tool/httprequest/post"
)

func main() {
    config := &post.Config{}

    ctx := context.Background()

    tool, err := post.NewTool(ctx, config)
    if err != nil {
        log.Fatalf("Failed to create tool: %v", err)
    }

    request := &post.PostRequest{
        URL:  "https://jsonplaceholder.typicode.com/posts",
        Body: `{"title": "my title","body": "my body","userId": 1}`,
    }

    args, err := sonic.Marshal(request)
    if err != nil {
        log.Fatalf("Error marshaling JSON: %v", err)
    }

    resp, err := tool.InvokableRun(ctx, string(args))
    if err != nil {
        log.Fatalf("Post failed: %v", err)
    }

    fmt.Println(resp)
}
```

## Configuration

Shared `Config` fields (example):

```go
// Config represents common settings for HTTP request tools.
type Config struct {
    // Inspired by LangChain's Requests tools, especially RequestsGetTool.
    // See: https://python.langchain.com/docs/integrations/tools/requests/
    // Optional. Default: "request_get".
    ToolName string `json:"tool_name"`
    // Optional. Default:
    // "A portal to the internet. Use this tool when you need to fetch specific content from a website.
    // Input should be a URL (e.g., https://www.google.com). The output will be the text response from the GET request."
    ToolDesc string `json:"tool_desc"`

    // Headers maps header names to values added on each request.
    Headers map[string]string `json:"headers"`

    // HttpClient executes HTTP requests.
    // If not provided, a default client with 30s timeout and standard transport is used.
    HttpClient *http.Client
}
```

Request Schemas:

```go
type GetRequest struct {
    URL string `json:"url" jsonschema_description:"URL to perform GET request on"`
}

type PostRequest struct {
    URL  string `json:"url" jsonschema_description:"URL to perform POST request on"`
    Body string `json:"body" jsonschema_description:"Request body to send for POST"`
}
```

## Agent Integration Example

Bind tool info to a `ToolCallingChatModel` and run via `ToolsNode`. Full example:

```go
package main

import (
    "context"
    "fmt"
    "log"
    "os"
    "time"

    "github.com/bytedance/sonic"
    "github.com/cloudwego/eino-ext/components/model/openai"
    get "github.com/cloudwego/eino-ext/components/tool/httprequest/get"
    "github.com/cloudwego/eino/components/tool"
    "github.com/cloudwego/eino/compose"
    "github.com/cloudwego/eino/schema"
)

func float32Ptr(f float32) *float32 { return &f }

func main() {
    openAIAPIKey := os.Getenv("OPENAI_API_KEY")
    if openAIAPIKey == "" { log.Fatal("OPENAI_API_KEY not set") }

    ctx := context.Background()

    cfg := &get.Config{ Headers: map[string]string{ "User-Agent": "MyCustomAgent" } }
    getTool, err := get.NewTool(ctx, cfg)
    if err != nil { log.Fatalf("Failed to create GET tool: %v", err) }

    info, err := getTool.Info(ctx)
    if err != nil { log.Fatalf("Failed to get tool info: %v", err) }

    chatModel, err := openai.NewChatModel(ctx, &openai.ChatModelConfig{ Model: "gpt-4o", APIKey: openAIAPIKey, Temperature: float32Ptr(0.7) })
    if err != nil { log.Fatalf("Failed to create ChatModel: %v", err) }

    err = chatModel.BindTools([]*schema.ToolInfo{info})
    if err != nil { log.Fatalf("Failed to bind tool: %v", err) }

    toolsNode, err := compose.NewToolNode(ctx, &compose.ToolsNodeConfig{ Tools: []tool.BaseTool{getTool} })
    if err != nil { log.Fatalf("Failed to create ToolNode: %v", err) }

    chain := compose.NewChain[[]*schema.Message, []*schema.Message]()
    chain.AppendChatModel(chatModel, compose.WithNodeName("chat_model")).AppendToolsNode(toolsNode, compose.WithNodeName("tools"))

    agent, err := chain.Compile(ctx)
    if err != nil { log.Fatalf("Failed to compile chain: %v", err) }

    apiSpec := `
openapi: "3.0.0"
info:
  title: JSONPlaceholder API
  version: "1.0.0"
servers:
  - url: https://jsonplaceholder.typicode.com
paths:
  /posts:
    get:
      summary: Get posts
      parameters:
        - name: _limit
          in: query
          required: false
          schema:
            type: integer
            example: 2
          description: Limit the number of results
      responses:
        "200":
          description: Successful response
          content:
            application/json:
              schema:
                type: array
                items:
                  type: object
                  properties:
                    userId:
                      type: integer
                    id:
                      type: integer
                    title:
                      type: string
                    body:
                      type: string
  /comments:
    get:
      summary: Get comments
      parameters:
        - name: _limit
          in: query
          required: false
          schema:
            type: integer
            example: 2
          description: Limit the number of results
      responses:
        "200":
          description: Successful response
          content:
            application/json:
              schema:
                type: array
                items:
                  type: object
                  properties:
                    postId:
                      type: integer
                    id:
                      type: integer
                    name:
                      type: string
                    email:
                      type: string
                    body:
                      type: string
`

    systemMessage := fmt.Sprintf("You have access to an API to help answer user queries.\nHere is documentation on the API:\n%s", apiSpec)

    messages := []*schema.Message{ { Role: schema.System, Content: systemMessage }, { Role: schema.User, Content: "Fetch the top two posts. What are their titles?" } }
    resp, err := agent.Invoke(ctx, messages)
    if err != nil { log.Fatalf("Failed to invoke agent: %v", err) }
    for idx, msg := range resp { fmt.Printf("Message %d: %s: %s\n", idx, msg.Role, msg.Content) }
}
```

## More Information

- [Eino Documentation](https://github.com/cloudwego/eino)
- [InvokableTool Reference](https://pkg.go.dev/github.com/cloudwego/eino/components/tool)
- [LangChain Requests Tool](https://python.langchain.com/docs/integrations/tools/requests/)
