---
Description: ""
date: "2026-01-20"
lastmod: ""
tags: []
title: How to Create a Tool
weight: 1
---

## Tool Structure Basics

An agent calling a tool involves two steps: (1) the LLM constructs parameters according to the tool definition; (2) the tool executes with those parameters. A tool therefore needs:

- Tool metadata and parameter constraints
- An execution interface

In Eino, any tool must implement `Info()` to return tool metadata:

```go
type BaseTool interface {
    Info(ctx context.Context) (*schema.ToolInfo, error)
}
```

Execution interfaces depend on whether the result is streaming:

```go
type InvokableTool interface {
    BaseTool

    // InvokableRun call function with arguments in JSON format
    InvokableRun(ctx context.Context, argumentsInJSON string, opts ...Option) (string, error)
}

type StreamableTool interface {
    BaseTool

    StreamableRun(ctx context.Context, argumentsInJSON string, opts ...Option) (*schema.StreamReader[string], error)
}
```

## ToolInfo Representations

In LLM function-call flows, the model must understand whether generated parameters satisfy constraints. Eino supports two representations: `params map[string]*ParameterInfo` and `*openapi3.Schema`.

### 1) `map[string]*ParameterInfo`

Intuitive map-based parameter descriptions:

```go
// Full definition: https://github.com/cloudwego/eino/blob/main/schema/tool.go
type ParameterInfo struct {
    Type DataType    // The type of the parameter.
    ElemInfo *ParameterInfo    // The element type of the parameter, only for array.
    SubParams map[string]*ParameterInfo    // The sub parameters of the parameter, only for object.
    Desc string    // The description of the parameter.
    Enum []string    // The enum values of the parameter, only for string.
    Required bool    // Whether the parameter is required.
}
```

Example:

```go
map[string]*schema.ParameterInfo{
    "name": &schema.ParameterInfo{
        Type: schema.String,
        Required: true,
    },
    "age": &schema.ParameterInfo{
        Type: schema.Integer,
    },
    "gender": &schema.ParameterInfo{
        Type: schema.String,
        Enum: []string{"male", "female"},
    },
}
```

### 2) JSON Schema (2020-12)

JSON Schema’s constraint system is rich. In practice, you usually generate it from struct tags or helper functions.

#### `GoStruct2ParamsOneOf`

Describe constraints via Go tags on a struct and generate `ParamsOneOf`:

```go
func GoStruct2ParamsOneOf[T any](opts ...Option) (*schema.ParamsOneOf, error)
```

Supported tags:

- `jsonschema_description:"xxx"` [recommended] or `jsonschema:"description=xxx"`
- Note: descriptions often include commas; tag commas separate fields and cannot be escaped. Prefer `jsonschema_description`.
- `jsonschema:"enum=xxx,enum=yyy,enum=zzz"`
- `jsonschema:"required"`
- `json:"xxx,omitempty"` → `omitempty` implies not required
- Customize via `utils.WithSchemaModifier`

Example:

```go
package main

import (
    "context"
    "github.com/cloudwego/eino/components/tool/utils"
)

type User struct {
    Name   string `json:"name" jsonschema_description=the name of the user jsonschema:"required"`
    Age    int    `json:"age" jsonschema_description:"the age of the user"`
    Gender string `json:"gender" jsonschema:"enum=male,enum=female"`
}

func main() {
    params, err := utils.GoStruct2ParamsOneOf[User]()
}
```

You usually won't call this directly; prefer `utils.GoStruct2ToolInfo()` or `utils.InferTool()`.

## Ways to Implement a Tool

### Approach 1 — Implement Interfaces Directly

Implement `InvokableTool`:

```go
type AddUser struct{}

func (t *AddUser) Info(_ context.Context) (*schema.ToolInfo, error) {
    return &schema.ToolInfo{
        Name: "add_user",
        Desc: "add user",
        ParamsOneOf: schema.NewParamsOneOfByParams(map[string]*schema.ParameterInfo{
            // omitted; see earlier for building params constraints
        }),
    }, nil
}

func (t *AddUser) InvokableRun(_ context.Context, argumentsInJSON string, _ ...tool.Option) (string, error) {
    // 1. Deserialize argumentsInJSON and handle options
    user, _ := json.Unmarshal([]byte(argumentsInJSON))
    // 2. Handle business logic
    // 3. Serialize the result to string and return

    return `{"msg": "ok"}`, nil
}
```

Because the LLM always supplies a JSON string, the tool receives `argumentsInJSON`; you deserialize it and return a JSON string.

### Approach 2 — Wrap a Local Function

Often you have an existing function (e.g., `AddUser`) and want the LLM to decide when/how to call it. Eino provides `NewTool` for this, and `InferTool` for tag-based parameter constraints.

> See tests in `cloudwego/eino/components/tool/utils/invokable_func_test.go` and `streamable_func_test.go`.

#### `NewTool`

For functions of signature:

```go
type InvokeFunc[T, D any] func(ctx context.Context, input T) (output D, err error)
```

Use:

```go
func NewTool[T, D any](desc *schema.ToolInfo, i InvokeFunc[T, D], opts ...Option) tool.InvokableTool
```

Example:

```go
import (
    "github.com/cloudwego/eino/components/tool"
    "github.com/cloudwego/eino/components/tool/utils"
    "github.com/cloudwego/eino/schema"
)

type User struct {
    Name   string `json:"name"`
    Age    int    `json:"age"`
    Gender string `json:"gender"`
}

type Result struct {
    Msg string `json:"msg"`
}

func AddUser(ctx context.Context, user *User) (*Result, error) {
    // some logic
}

func createTool() tool.InvokableTool {
    addUserTool := utils.NewTool(&schema.ToolInfo{
        Name: "add_user",
        Desc: "add user",
        ParamsOneOf: schema.NewParamsOneOfByParams(
            map[string]*schema.ParameterInfo{
                "name": &schema.ParameterInfo{
                    Type: schema.String,
                    Required: true,
                },
                "age": &schema.ParameterInfo{
                    Type: schema.Integer,
                },
                "gender": &schema.ParameterInfo{
                    Type: schema.String,
                    Enum: []string{"male", "female"},
                },
            },
        ),
    }, AddUser)
    
    return addUserTool
}
```

#### `InferTool`

When parameter constraints live in the input struct tags, use `InferTool`:

```go
func InferTool[T, D any](toolName, toolDesc string, i InvokeFunc[T, D], opts ...Option) (tool.InvokableTool, error)
```

Example:

```go
import (
    "github.com/cloudwego/eino/components/tool"
    "github.com/cloudwego/eino/components/tool/utils"
    "github.com/cloudwego/eino/schema"
)

type User struct {
    Name   string `json:"name" jsonschema:"required,description=the name of the user"`
    Age    int    `json:"age" jsonschema:"description=the age of the user"`
    Gender string `json:"gender" jsonschema:"enum=male,enum=female"`
}

type Result struct {
    Msg string `json:"msg"`
}

func AddUser(ctx context.Context, user *User) (*Result, error) {
    // some logic
}

func createTool() (tool.InvokableTool, error) {
    return utils.InferTool("add_user", "add user", AddUser)
}
```

#### `InferOptionableTool`

Eino’s Option mechanism passes dynamic runtime parameters. Details: `Eino: CallOption capabilities and conventions` at `/docs/eino/core_modules/chain_and_graph_orchestration/call_option_capabilities`. The same mechanism applies to custom tools.

When you need custom option parameters, use `InferOptionableTool`:

```go
func InferOptionableTool[T, D any](toolName, toolDesc string, i OptionableInvokeFunc[T, D], opts ...Option) (tool.InvokableTool, error)
```

Example (adapted from `cloudwego/eino/components/tool/utils/invokable_func_test.go`):

```go
import (
    "fmt"
    "context"
    "github.com/cloudwego/eino/components/tool"
    "github.com/cloudwego/eino/components/tool/utils"
    "github.com/cloudwego/eino/schema"
)

type UserInfoOption struct {
    Field1 string
}

func WithUserInfoOption(s string) tool.Option {
    return tool.WrapImplSpecificOptFn(func(t *UserInfoOption) {
        t.Field1 = s
    })
}

func updateUserInfoWithOption(_ context.Context, input *User, opts ...tool.Option) (output *UserResult, err error) {
    baseOption := &UserInfoOption{
        Field1: "test_origin",
    }
    // handle option
    option := tool.GetImplSpecificOptions(baseOption, opts...)
    return &Result{
        Msg:  option.Field1,
    }, nil
}

func useInInvoke() {
    ctx := context.Background()
    tl, _ := utils.InferOptionableTool("invoke_infer_optionable_tool", "full update user info", updateUserInfoWithOption)

    content, _ := tl.InvokableRun(ctx, `{"name": "bruce lee"}`, WithUserInfoOption("hello world"))

    fmt.Println(content) // Msg is "hello world", because WithUserInfoOption change the UserInfoOption.Field1
}
```

### Approach 3 — Use tools from eino-ext

Beyond custom tools, the `eino-ext` project provides many ready-to-use implementations: `Googlesearch`, `DuckDuckGoSearch`, `wikipedia`, `httprequest`, etc. See implementations at https://github.com/cloudwego/eino-ext/tree/main/components/tool and docs:

- Tool — Googlesearch: `/docs/eino/ecosystem_integration/tool/tool_googlesearch`
- Tool — DuckDuckGoSearch: `/docs/eino/ecosystem_integration/tool/tool_duckduckgo_search`

### Approach 4 — Use MCP protocol

MCP (Model Context Protocol) is an open protocol for exposing tool capabilities to LLMs. Eino can treat tools provided via MCP as regular tools, greatly expanding available capabilities.

Using MCP tools in Eino is straightforward:

```go
import (
    "fmt"
    "log"
    "context"
    "github.com/mark3labs/mcp-go/client"
    mcpp "github.com/cloudwego/eino-ext/components/tool/mcp"
)

func getMCPTool(ctx context.Context) []tool.BaseTool {
        cli, err := client.NewSSEMCPClient("http://localhost:12345/sse")
        if err != nil {
                log.Fatal(err)
        }
        err = cli.Start(ctx)
        if err != nil {
                log.Fatal(err)
        }

        initRequest := mcp.InitializeRequest{}
        initRequest.Params.ProtocolVersion = mcp.LATEST_PROTOCOL_VERSION
        initRequest.Params.ClientInfo = mcp.Implementation{
                Name:    "example-client",
                Version: "1.0.0",
        }

        _, err = cli.Initialize(ctx, initRequest)
        if err != nil {
                log.Fatal(err)
        }

        tools, err := mcpp.GetTools(ctx, &mcpp.Config{Cli: cli})
        if err != nil {
                log.Fatal(err)
        }

        return tools
}
```

Code reference: https://github.com/cloudwego/eino-ext/blob/main/components/tool/mcp/examples/mcp.go
