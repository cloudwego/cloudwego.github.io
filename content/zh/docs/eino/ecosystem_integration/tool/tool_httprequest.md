---
Description: ""
date: "2025-12-11"
lastmod: ""
tags: []
title: Tool - HTTPRequest
weight: 0
---

## **HTTP 请求工具**

一组为 [Eino](https://github.com/cloudwego/eino) 实现的 HTTP 请求工具，遵循 `InvokableTool` 接口。这些工具允许你轻松执行 GET、POST、PUT 和 DELETE 请求，并可与 Eino 的聊天模型交互系统及 `ToolsNode` 集成，实现更强大的功能。

## **功能**

- 实现了 `github.com/cloudwego/eino/components/tool.InvokableTool` 接口
- 支持 GET、POST、PUT 和 DELETE 请求
- 可配置请求头和 HttpClient
- 可与 Eino 工具系统简单集成

## **安装**

使用 `go get` 安装该包（请根据你的项目结构调整模块路径）：

```bash
go get github.com/cloudwego/eino-ext/components/tool/httprequest
```

## **快速开始**

下面分别展示了如何单独使用 GET 和 POST 工具的示例。

### **GET 请求示例**

```go
package main

import (
        "context"
        "fmt"
        "log"
        "time"

        "github.com/bytedance/sonic"
        req "github.com/cloudwego/eino-ext/components/tool/httprequest/get"
)

func main() {
        // Configure the GET tool
        config := &req.Config{
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
        tool, err := req.NewTool(ctx, config)
        if err != nil {
                log.Fatalf("Failed to create tool: %v", err)
        }

        // Prepare the GET request payload
        request := &req.GetRequest{
                URL: "https://jsonplaceholder.typicode.com/posts",
        }

        jsonReq, err := sonic.Marshal(request)
        if err != nil {
                log.Fatalf("Error marshaling JSON: %v", err)
        }

        // Execute the GET request using the InvokableTool interface
        resp, err := tool.InvokableRun(ctx, string(jsonReq))
        if err != nil {
                log.Fatalf("GET request failed: %v", err)
        }

        fmt.Println(resp)
}
```

### **POST 请求示例**

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

        jsonReq, err := sonic.Marshal(request)

        if err != nil {
                log.Fatalf("Error marshaling JSON: %v", err)
        }

        resp, err := tool.InvokableRun(ctx, string(jsonReq))
        if err != nil {
                log.Fatalf("Post failed: %v", err)
        }

        fmt.Println(resp)
}
```

## **配置**

GET、POST、PUT 和 DELETE 工具共享类似的配置参数，这些参数在各自的 `Config` 结构体中定义。例如：

```go
// Config 表示 HTTP 请求工具的通用配置。
type Config struct {
        // 灵感来源于 LangChain 项目的 "Requests" 工具，特别是 RequestsGetTool。
        // 详情请见：https://python.langchain.com/docs/integrations/tools/requests/
        // 可选。默认值: "request_get"。
        ToolName string `json:"tool_name"`
        // 可选。默认值: "A portal to the internet. Use this tool when you need to fetch specific content from a website.
        // Input should be a URL (e.g., https://www.google.com). The output will be the text response from the GET request."
        ToolDesc string `json:"tool_desc"`

        // Headers 是 HTTP 头部名称与对应值的映射。
        // 这些头部会包含在工具发起的每个请求中。
        Headers map[string]string `json:"headers"`

        // HttpClient 用于执行请求的 HTTP 客户端。
        // 如果未提供，将初始化并使用一个默认的 30 秒超时和标准传输的客户端。
        HttpClient *http.Client
}
```

对于 GET 工具，请求结构如下：

```go
type GetRequest struct {
        URL string `json:"url" jsonschema_description:"要执行 GET 请求的 URL"`
}
```

对于 POST 工具，请求结构如下：

```go
type PostRequest struct {
        URL  string `json:"url" jsonschema_description:"要执行 POST 请求的 URL"`
        Body string `json:"body" jsonschema_description:"POST 请求要发送的请求体"`
}
```

## **与 agent 集成示例**

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
        req "github.com/cloudwego/eino-ext/components/tool/httprequest/get"
        "github.com/cloudwego/eino/components/tool"
        "github.com/cloudwego/eino/compose"
        "github.com/cloudwego/eino/schema"
)

// float32Ptr is a helper to return a pointer for a float32 value.
func float32Ptr(f float32) *float32 {
        return &f
}

func main() {
        // Load OpenAI API key from environment variables.
        openAIAPIKey := os.Getenv("OPENAI_API_KEY")
        if openAIAPIKey == "" {
                log.Fatal("OPENAI_API_KEY not set")
        }

        ctx := context.Background()

        // Setup GET tool configuration.
        config := &req.Config{
                Headers: map[string]string{
                        "User-Agent": "MyCustomAgent",
                },
        }

        // Instantiate the GET tool.
        getTool, err := req.NewTool(ctx, config)
        if err != nil {
                log.Fatalf("Failed to create GET tool: %v", err)
        }

        // Retrieve the tool info to bind it to the ChatModel.
        toolInfo, err := getTool.Info(ctx)
        if err != nil {
                log.Fatalf("Failed to get tool info: %v", err)
        }

        // Create the ChatModel using OpenAI.
        chatModel, err := openai.NewChatModel(ctx, &openai.ChatModelConfig{
                Model:       "gpt-4o", // or another supported model
                APIKey:      openAIAPIKey,
                Temperature: float32Ptr(0.7),
        })
        if err != nil {
                log.Fatalf("Failed to create ChatModel: %v", err)
        }

        // Bind the tool to the ChatModel.
        err = chatModel.BindTools([]*schema.ToolInfo{toolInfo})
        if err != nil {
                log.Fatalf("Failed to bind tool to ChatModel: %v", err)
        }

        // Create the Tools node with the GET tool.
        toolsNode, err := compose.NewToolNode(ctx, &compose.ToolsNodeConfig{
                Tools: []tool.BaseTool{getTool},
        })
        if err != nil {
                log.Fatalf("Failed to create ToolNode: %v", err)
        }

        // Build the chain with the ChatModel and the Tools node.
        chain := compose.NewChain[[]*schema.Message, []*schema.Message]()
        chain.
                AppendChatModel(chatModel, compose.WithNodeName("chat_model")).
                AppendToolsNode(toolsNode, compose.WithNodeName("tools"))

        // Compile the chain to obtain the agent.
        agent, err := chain.Compile(ctx)
        if err != nil {
                log.Fatalf("Failed to compile chain: %v", err)
        }

        // Define the API specification (api_spec) in OpenAPI (YAML) format.
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

        // Create a system message that includes the API documentation.
        systemMessage := fmt.Sprintf(`You have access to an API to help answer user queries.
Here is documentation on the API:
%s`, apiSpec)

        // Define initial messages (system and user).
        messages := []*schema.Message{
                {
                        Role:    schema.System,
                        Content: systemMessage,
                },
                {
                        Role:    schema.User,
                        Content: "Fetch the top two posts. What are their titles?",
                },
        }

        // Invoke the agent with the messages.
        resp, err := agent.Invoke(ctx, messages)
        if err != nil {
                log.Fatalf("Failed to invoke agent: %v", err)
        }

        // Output the response messages.
        for idx, msg := range resp {
                fmt.Printf("Message %d: %s: %s\n", idx, msg.Role, msg.Content)
        }
}
```

## **更多详情**

- [Eino 文档](https://github.com/cloudwego/eino)
- [InvokableTool 接口参考](https://pkg.go.dev/github.com/cloudwego/eino/components/tool)
- [langchain_community 参考](https://python.langchain.com/docs/integrations/tools/requests/)
