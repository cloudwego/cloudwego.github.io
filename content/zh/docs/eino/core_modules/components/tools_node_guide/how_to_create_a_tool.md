---
Description: ""
date: "2025-12-03"
lastmod: ""
tags: []
title: 如何创建一个 tool ?
weight: 1
---

## Tool 的基本结构

一个 agent 要调用 tool，需要有两步： ① 大模型根据 tool 的功能和参数需求构建调用参数 ② 实际调用 tool

这两个基本步骤也就要求了 tool 需要包含两个部分：

- tool 的功能介绍和调用这个 tool 所需要的参数信息
- 调用这个 tool 的接口

在 Eino 中，BaseTool 接口要求任何一个 tool 都要有 `Info()` 接口返回 tool 信息，如下：

```go
type BaseTool interface {
    Info(ctx context.Context) (*schema.ToolInfo, error)
}
```

而根据一个 tool 被调用后的返回结构是否是流式的，可以分为 InvokableTool 和 StreamableTool，也同样是以接口方式定义：

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

## ToolInfo 的表示方式

在大模型的 function call 调用过程中，由大模型生成需要调用的 function call 的参数，这就要求大模型能理解生成的参数是否符合约束。在 Eino 中，根据开发者的使用习惯和领域标准两方面因素，提供了 `params map[string]*ParameterInfo` 和 `*openapi3.Schema` 两种参数约束的表达方式。

### 方式 1 - map[string]*ParameterInfo

在很多开发者的直观习惯中，对于参数的描述方式可以用一个 map 来表示，key 即为参数名，value 则是这个参数的详细约束。Eino 中定义了 ParameterInfo 来表示一个参数的描述，如下：

```go
// 结构定义详见: https://github.com/cloudwego/eino/blob/main/schema/tool.go
type ParameterInfo struct {
    Type DataType    // The type of the parameter.
    ElemInfo *ParameterInfo    // The element type of the parameter, only for array.
    SubParams map[string]*ParameterInfo    // The sub parameters of the parameter, only for object.
    Desc string    // The description of the parameter.
    Enum []string    // The enum values of the parameter, only for string.
    Required bool    // Whether the parameter is required.
}
```

比如，一个表示 User 的参数可以表示为：

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

这样的表示方式非常简单直观，当参数由开发者通过编码的方式手动维护时常用。

### 方式 2 - openapi3.Schema

另一种常用于表示参数约束的方式是 `JSON schema`，由 OAI 定义的 [OpenAPI](https://github.com/OAI/OpenAPI-Specification) 则是最常用的标准，Eino 中也支持使用 openapi3.Schema 来表示参数的约束。

OpenAPI3 的标准中对参数的约束方式非常丰富，详细描述可以参考 [OpenAPI 3.03](https://github.com/OAI/OpenAPI-Specification/blob/main/versions/3.0.3.md#schema-object)，在实际的使用中，一般不由开发者自行构建此结构体，而是使用一些方法来生成。

#### 使用 GoStruct2ParamsOneOf 生成

Eino 提供了在结构体中通过 go tag 描述参数约束的方式，并提供了 GoStruct2ParamsOneOf 方法来生成一个 struct 的参数约束，其函数签名如下：

```go
func GoStruct2ParamsOneOf[T any](opts ...Option) (*schema.ParamsOneOf, error)
```

其中从 T 中提取参数的字段名称和描述，提取时所用的 Tag 如下：

- jsonschema: "description=xxx"
- jsonschema: "enum=xxx,enum=yyy,enum=zzz"
- jsonschema: "required"
- json: "xxx,omitempty" => 可用 json tag 的 omitempty 代表非 required
- 使用 utils.WithSchemaCustomizer 实现自定义的解析方法

可参考如下例子：

```go
package main

import (
    "context"
    "github.com/cloudwego/eino/components/tool/utils"
)

type User struct {
    Name   string `json:"name" jsonschema:"required,description=the name of the user"`
    Age    int    `json:"age" jsonschema:"description=the age of the user"`
    Gender string `json:"gender" jsonschema:"enum=male,enum=female"`
}

func main() {
    params, err := utils.GoStruct2ParamsOneOf[User]()
}
```

这个方法一般不由开发者调用，往往直接使用 `utils.GoStruct2ToolInfo()` 来构建 ToolInfo，或者直接用 `utils.InferTool()` 直接构建 tool，可详见下方把 “本地函数转为 tool” 部分。

#### 通过 openapi.json 文件生成

由于 openapi 是一个很通用的标准，很多工具或平台都可以导出 openapi.json 文件，尤其是一些 http 的接口管理工具中。如果 tool 是对一些 openapi 的封装，则可以用到这种方式。

使用示例可见 [eino-examples](https://github.com/cloudwego/eino-examples/blob/main/components/tool/openapi3/main.go#L33)。

## 方式 1 - 直接实现接口

由于 tool 的定义都是接口，因此最直接实现一个 tool 的方式即实现接口，以 InvokableTool 为例：

```go
type AddUser struct{}

func (t *AddUser) Info(_ context.Context) (*schema.ToolInfo, error) {
    return &schema.ToolInfo{
        Name: "add_user",
        Desc: "add user",
        ParamsOneOf: schema.NewParamsOneOfByParams(map[string]*schema.ParameterInfo{
            // omit，参考上文中构建 params 约束的方式
        }),
    }, nil
}

func (t *AddUser) InvokableRun(_ context.Context, argumentsInJSON string, _ ...tool.Option) (string, error) {
    // 1. 反序列化 argumentsInJSON，处理 option 等
    user, _ := json.Unmarshal([]byte(argumentsInJSON))
    // 2. 处理业务逻辑
    // 3. 把结果序列化为 string 并返回

    return `{"msg": "ok"}`, nil
}
```

由于大模型给出的 function call 参数始终是一个 string，对应到 Eino 框架中，tool 的调用参数入参也就是一个序列化成 string 的 json。因此，这种方式需要开发者自行处理参数的反序列化，并且调用的结果也用 string 的方式返回。

## 方式 2 - 把本地函数转为 tool

在开发过程中，我们经常需要把一个本地函数封装成 Eino 的 tool，比如我们代码中本身已经有了一个 `AddUser` 的方法，但为了让大模型可以自主决策如何调用这个方法，我们要把这个方法变成一个 tool 并 bind 到大模型上。

Eino 中提供了 `NewTool` 的方法来把一个函数转成 tool，同时，针对为参数约束通过结构体的 tag 来表示的场景提供了 InferTool 的方法，让构建的过程更加简单。

> 下方方法的示例可以参考  [cloudwego/eino/components/tool/utils/invokable_func_test.go](https://github.com/cloudwego/eino/blob/main/components/tool/utils/invokable_func_test.go) 和  [cloudwego/eino/components/tool/utils/streamable_func_test.go](https://github.com/cloudwego/eino/blob/main/components/tool/utils/streamable_func_test.go) 中的单元测试。此处仅以 InvokableTool 为例，StreamableTool 也有对应的构建方法。

### 使用 NewTool 方法

当一个函数满足下面这种函数签名时，就可以用 NewTool 把其变成一个 InvokableTool ：

```go
type InvokeFunc[T, D any] func(ctx context.Context, input T) (output D, err error)
```

NewTool 的方法如下：

```go
// 代码见: github.com/cloudwego/eino/components/tool/utils/invokable_func.go
func NewTool[T, D any](desc *schema.ToolInfo, i InvokeFunc[T, D], opts ...Option) tool.InvokableTool
```

> 同理 NewStreamTool 可创建 StreamableTool

以 AddUser 为例，就可以用如下的方式构建：

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

### 使用 InferTool 方法

从 NewTool 中可以看出，构建一个 tool 的过程需要分别传入 ToolInfo 和 InvokeFunc ，其中，ToolInfo 中包含 ParamsOneOf 的部分，这代表着函数的入参约束，同时，InvokeFunc 的函数签名中也有 input 的参数，这就意味着： ParamsOneOf 的部分和 InvokeFunc 的 input 参数需要保持一致。

当一个函数完全由开发者自行实现的时候，就需要开发者手动维护 input 参数和 ParamsOneOf 以保持一致。更优雅的解决方法是 “参数约束直接维护在 input 参数类型定义中”，可参考上方 `GoStruct2ParamsOneOf` 的介绍。

当参数约束信息包含在 input 参数类型定义中时，就可以使用 InferTool 来实现，函数签名如下：

```go
func InferTool[T, D any](toolName, toolDesc string, i InvokeFunc[T, D], opts ...Option) (tool.InvokableTool, error)
```

以 AddUser 为例:

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

### 使用 InferOptionableTool 方法

Option 机制是 Eino 提供的一种在运行时传递动态参数的机制，详情可以参考 [Eino: CallOption 能力与规范](/zh/docs/eino/core_modules/chain_and_graph_orchestration/call_option_capabilities)，这套机制在自定义 tool 中同样适用。

当开发者要实现一个需要自定义 option 参数时则可使用 InferOptionableTool 这个方法，相比于 InferTool 对函数签名的要求，这个方法的签名增加了一个 option 参数，签名如下：

```go
func InferOptionableTool[T, D any](toolName, toolDesc string, i OptionableInvokeFunc[T, D], opts ...Option) (tool.InvokableTool, error)
```

示例如下（改编自 [cloudwego/eino/components/tool/utils/invokable_func_test.go](https://github.com/cloudwego/eino/blob/main/components/tool/utils/invokable_func_test.go)）：

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

## 方式 3 - 使用 eino-ext 中提供的 tool

除了自定义的各种 tool 需要自行实现外，eino-ext 项目中还有很多通用的 tool 实现，可以实现开箱即用，比如 [Tool - Googlesearch](/zh/docs/eino/ecosystem_integration/tool/tool_googlesearch)、[Tool - DuckDuckGoSearch](/zh/docs/eino/ecosystem_integration/tool/tool_duckduckgo_search) 、wikipedia、httprequest 等等，可以参考 [https://github.com/cloudwego/eino-ext/tree/main/components/tool](https://github.com/cloudwego/eino-ext/tree/main/components/tool) 中的各种实现。

## 方式 4 - 使用 MCP 协议

MCP（Model Context Protocol）是一个开放的模型上下文协议，现在越来越多的工具和平台都在基于这套协议把自身的能力暴露给大模型调用，eino 可以把基于 MCP 提供的可调用工具作为 tool，这将极大扩充 tool 的种类。

在 Eino 中使用 MCP 提供的 tool 非常方便：

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

> 代码参考： [https://github.com/cloudwego/eino-ext/blob/main/components/tool/mcp/examples/mcp.go](https://github.com/cloudwego/eino-ext/blob/main/components/tool/mcp/examples/mcp.go)
