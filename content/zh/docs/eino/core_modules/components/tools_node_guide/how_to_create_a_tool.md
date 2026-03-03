---
Description: ""
date: "2026-03-03"
lastmod: ""
tags: []
title: 如何创建一个 tool ?
weight: 1
---

## **Tool 的基本结构**

一个 agent 要调用 tool，需要有两步：① 大模型根据 tool 的功能和参数需求构建调用参数 ② 实际调用 tool

这两个基本步骤也就要求了 tool 需要包含两个部分：

- tool 的功能介绍和调用这个 tool 所需要的参数信息
- 调用这个 tool 的接口

在 Eino 中，BaseTool 接口要求任何一个 tool 都要有 Info() 接口返回 tool 信息，如下：

```go
type BaseTool interface {
    Info(ctx context.Context) (*schema.ToolInfo, error)
}
```

### **标准工具接口**

根据一个 tool 被调用后的返回结构是否是流式的，可以分为 InvokableTool 和 StreamableTool，也同样是以接口方式定义：

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

### **增强型工具接口（Enhanced Tool）**

除了标准工具接口外，Eino 还提供了增强型工具接口，支持返回结构化的多模态结果。增强型工具适用于需要返回图片、音频、视频、文件等富媒体内容的场景：

```go
// EnhancedInvokableTool 是支持返回结构化多模态结果的工具接口
// 与返回字符串的 InvokableTool 不同，此接口返回 *schema.ToolResult
// 可以包含文本、图片、音频、视频和文件
type EnhancedInvokableTool interface {
    BaseTool
    InvokableRun(ctx context.Context, toolArgument *schema.ToolArgument, opts ...Option) (*schema.ToolResult, error)
}

// EnhancedStreamableTool 是支持返回结构化多模态结果的流式工具接口
type EnhancedStreamableTool interface {
    BaseTool
    StreamableRun(ctx context.Context, toolArgument *schema.ToolArgument, opts ...Option) (*schema.StreamReader[*schema.ToolResult], error)
}
```

#### **增强型工具相关数据结构**

```go
// ToolArgument 包含工具调用的输入信息
type ToolArgument struct {
    TextArgument string  // JSON 格式的工具调用参数
}

// ToolResult 表示工具执行的结构化多模态输出
type ToolResult struct {
    Parts []ToolOutputPart `json:"parts,omitempty"`
}

// ToolPartType 定义工具输出部分的内容类型
type ToolPartType string

const (
    ToolPartTypeText  ToolPartType = "text"   // 文本
    ToolPartTypeImage ToolPartType = "image"  // 图片
    ToolPartTypeAudio ToolPartType = "audio"  // 音频
    ToolPartTypeVideo ToolPartType = "video"  // 视频
    ToolPartTypeFile  ToolPartType = "file"   // 文件
)

// ToolOutputPart 表示工具执行输出的一部分
type ToolOutputPart struct {
    Type  ToolPartType     `json:"type"`
    Text  string           `json:"text,omitempty"`
    Image *ToolOutputImage `json:"image,omitempty"`
    Audio *ToolOutputAudio `json:"audio,omitempty"`
    Video *ToolOutputVideo `json:"video,omitempty"`
    File  *ToolOutputFile  `json:"file,omitempty"`
    Extra map[string]any   `json:"extra,omitempty"`
}
```

## **ToolInfo 的表示方式**

在大模型的 function call 调用过程中，由大模型生成需要调用的 function call 的参数，这就要求大模型能理解生成的参数是否符合约束。在 Eino 中，根据开发者的使用习惯和领域标准两方面因素，提供了 `params map[string]*ParameterInfo` 和 `*jsonschema.Schema` 两种参数约束的表达方式。

### **方式 1 - map[string]*ParameterInfo**

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

### **方式 2 - JSON Schema**

另一种常用于表示参数约束的方式是 JSON Schema（[https://json-schema.org/draft/2020-12](https://json-schema.org/draft/2020-12%EF%BC%89%E3%80%82)[）。](https://json-schema.org/draft/2020-12%EF%BC%89%E3%80%82)

JSON Schema 的标准中对参数的约束方式非常丰富。在实际的使用中，一般不由开发者自行构建此结构体，而是使用一些方法来生成。

#### **使用 GoStruct2ParamsOneOf 生成**

Eino 提供了在结构体中通过 go tag 描述参数约束的方式，并提供了 GoStruct2ParamsOneOf 方法来生成一个 struct 的参数约束，其函数签名如下：

```go
func GoStruct2ParamsOneOf[T any](opts ...Option) (*schema.ParamsOneOf, error)
```

其中从 T 中提取参数的字段名称和描述，提取时所用的 Tag 如下：

- `jsonschema_description:"xxx"` [推荐] 或者 `jsonschema:"description=xxx"`
  - description 中一般会有逗号，且 tag 中逗号是不同字段的分隔符，且不可被转义，强烈推荐使用 jsonschema_description 这个单独的 Tag 标签
- `jsonschema:"enum=xxx,enum=yyy,enum=zzz"`
- `jsonschema:"required"`
- `json:"xxx,omitempty"` => 可用 json tag 的 omitempty 代表非 required

使用 `utils.WithSchemaModifier` 实现自定义的解析方法，可参考如下例子：

```go
package main

import (
    "context"
    "github.com/cloudwego/eino/components/tool/utils"
)

type User struct {
    Name   string `json:"name" jsonschema_description:"the name of the user" jsonschema:"required"`
    Age    int    `json:"age" jsonschema_description:"the age of the user"`
    Gender string `json:"gender" jsonschema:"enum=male,enum=female"`
}

func main() {
    params, err := utils.GoStruct2ParamsOneOf[User]()
}
```

这个方法一般不由开发者调用，往往直接使用 `utils.GoStruct2ToolInfo()` 来构建 ToolInfo，或者直接用 `utils.InferTool()` 直接构建 tool，可详见下方把 "本地函数转为 tool" 部分。

## **实现 Tool 的方式**

### **方式 1 - 直接实现接口**

由于 tool 的定义都是接口，因此最直接实现一个 tool 的方式即实现接口。

#### **实现标准工具接口**

以 InvokableTool 为例：

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
    input := &AddUser{}
    // 1. 反序列化 argumentsInJSON，处理 option 等
    err := json.Unmarshal([]byte(argumentsInJSON), input)
    // 2. 处理业务逻辑
    // 3. 把结果序列化为 string 并返回

    return `{"msg": "ok"}`, nil
}
```

由于大模型给出的 function call 参数始终是一个 string，对应到 Eino 框架中，tool 的调用参数入参也就是一个序列化成 string 的 json。因此，这种方式需要开发者自行处理参数的反序列化，并且调用的结果也用 string 的方式返回。

#### **实现增强型工具接口**

当需要返回多模态内容（如图片、音频、视频、文件等）时，可以实现 EnhancedInvokableTool 接口：

```go
type ImageSearchTool struct{}

func (t *ImageSearchTool) Info(_ context.Context) (*schema.ToolInfo, error) {
    return &schema.ToolInfo{
        Name: "image_search",
        Desc: "搜索并返回相关图片",
        ParamsOneOf: schema.NewParamsOneOfByParams(map[string]*schema.ParameterInfo{
            "query": {
                Type:     schema.String,
                Desc:     "搜索关键词",
                Required: true,
            },
        }),
    }, nil
}

func (t *ImageSearchTool) InvokableRun(_ context.Context, toolArgument *schema.ToolArgument, _ ...tool.Option) (*schema.ToolResult, error) {
    // 1. 解析参数（toolArgument.TextArgument 包含 JSON 格式的参数）
    var input struct {
        Query string `json:"query"`
    }
    json.Unmarshal([]byte(toolArgument.TextArgument), &input)
    
    // 2. 执行搜索逻辑...
    imageURL := "https://example.com/image.png"
    
    // 3. 返回多模态结果
    return &schema.ToolResult{
        Parts: []schema.ToolOutputPart{
            {Type: schema.ToolPartTypeText, Text: "找到以下图片："},
            {
                Type: schema.ToolPartTypeImage,
                Image: &schema.ToolOutputImage{
                    MessagePartCommon: schema.MessagePartCommon{
                        URL: &imageURL,
                    },
                },
            },
        },
    }, nil
}
```

### **方式 2 - 把本地函数转为 tool**

在开发过程中，我们经常需要把一个本地函数封装成 Eino 的 tool，比如我们代码中本身已经有了一个 AddUser 的方法，但为了让大模型可以自主决策如何调用这个方法，我们要把这个方法变成一个 tool 并 bind 到大模型上。

Eino 中提供了 NewTool 的方法来把一个函数转成 tool，同时，针对为参数约束通过结构体的 tag 来表示的场景提供了 InferTool 的方法，让构建的过程更加简单。

下方方法的示例可以参考 `cloudwego/eino/components/tool/utils/invokable_func_test.go` 和 `cloudwego/eino/components/tool/utils/streamable_func_test.go` 中的单元测试。

#### **标准工具：使用 NewTool 方法**

当一个函数满足下面这种函数签名时，就可以用 NewTool 把其变成一个 InvokableTool：

```go
type InvokeFunc[T, D any] func(ctx context.Context, input T) (output D, err error)
```

NewTool 的方法如下：

```go
// 代码见: github.com/cloudwego/eino/components/tool/utils/invokable_func.go
func NewTool[T, D any](desc *schema.ToolInfo, i InvokeFunc[T, D], opts ...Option) tool.InvokableTool
```

同理 NewStreamTool 可创建 StreamableTool。

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

#### **标准工具：使用 InferTool 方法**

从 NewTool 中可以看出，构建一个 tool 的过程需要分别传入 ToolInfo 和 InvokeFunc，其中，ToolInfo 中包含 ParamsOneOf 的部分，这代表着函数的入参约束，同时，InvokeFunc 的函数签名中也有 input 的参数，这就意味着：ParamsOneOf 的部分和 InvokeFunc 的 input 参数需要保持一致。

当一个函数完全由开发者自行实现的时候，就需要开发者手动维护 input 参数和 ParamsOneOf 以保持一致。更优雅的解决方法是 "参数约束直接维护在 input 参数类型定义中"，可参考上方 GoStruct2ParamsOneOf 的介绍。

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

#### **增强型工具：使用 NewEnhancedTool 方法**

当需要返回多模态结果时，可以使用 NewEnhancedTool 方法：

```go
type EnhancedInvokeFunc[T any] func(ctx context.Context, input T) (output *schema.ToolResult, err error)

func NewEnhancedTool[T any](desc *schema.ToolInfo, i EnhancedInvokeFunc[T], opts ...Option) tool.EnhancedInvokableTool
```

示例：

```go
import (
    "context"
    "github.com/cloudwego/eino/components/tool/utils"
    "github.com/cloudwego/eino/schema"
)

type ImageSearchInput struct {
    Query string `json:"query"`
}

func searchImages(ctx context.Context, input *ImageSearchInput) (*schema.ToolResult, error) {
    // 执行图片搜索逻辑...
    imageURL := "https://example.com/image.png"
    
    return &schema.ToolResult{
        Parts: []schema.ToolOutputPart{
            {Type: schema.ToolPartTypeText, Text: "找到以下图片："},
            {
                Type: schema.ToolPartTypeImage,
                Image: &schema.ToolOutputImage{
                    MessagePartCommon: schema.MessagePartCommon{
                        URL: &imageURL,
                    },
                },
            },
        },
    }, nil
}

func createEnhancedTool() tool.EnhancedInvokableTool {
    return utils.NewEnhancedTool(&schema.ToolInfo{
        Name: "image_search",
        Desc: "搜索并返回相关图片",
        ParamsOneOf: schema.NewParamsOneOfByParams(map[string]*schema.ParameterInfo{
            "query": {Type: schema.String, Desc: "搜索关键词", Required: true},
        }),
    }, searchImages)
}
```

#### **增强型工具：使用 InferEnhancedTool 方法**

类似于 InferTool，InferEnhancedTool 可以从函数签名自动推断参数约束：

```go
func InferEnhancedTool[T any](toolName, toolDesc string, i EnhancedInvokeFunc[T], opts ...Option) (tool.EnhancedInvokableTool, error)
```

示例：

```go
import (
    "context"
    "github.com/cloudwego/eino/components/tool"
    "github.com/cloudwego/eino/components/tool/utils"
    "github.com/cloudwego/eino/schema"
)

type ImageSearchInput struct {
    Query string `json:"query" jsonschema:"required" jsonschema_description:"搜索关键词"`
}

func searchImages(ctx context.Context, input *ImageSearchInput) (*schema.ToolResult, error) {
    imageURL := "https://example.com/image.png"
    
    return &schema.ToolResult{
        Parts: []schema.ToolOutputPart{
            {Type: schema.ToolPartTypeText, Text: "找到以下图片："},
            {
                Type: schema.ToolPartTypeImage,
                Image: &schema.ToolOutputImage{
                    MessagePartCommon: schema.MessagePartCommon{
                        URL: &imageURL,
                    },
                },
            },
        },
    }, nil
}

func createEnhancedTool() (tool.EnhancedInvokableTool, error) {
    return utils.InferEnhancedTool("image_search", "搜索并返回相关图片", searchImages)
}
```

#### **增强型流式工具：使用 InferEnhancedStreamTool 方法**

对于需要流式返回多模态内容的场景，可以使用 InferEnhancedStreamTool：

```go
func InferEnhancedStreamTool[T any](toolName, toolDesc string, s EnhancedStreamFunc[T], opts ...Option) (tool.EnhancedStreamableTool, error)
```

示例：

```go
import (
    "context"
    "github.com/cloudwego/eino/components/tool/utils"
    "github.com/cloudwego/eino/schema"
)

type StreamSearchInput struct {
    Query string `json:"query" jsonschema:"required"`
}

func streamSearch(ctx context.Context, input *StreamSearchInput) (*schema.StreamReader[*schema.ToolResult], error) {
    results := []*schema.ToolResult{
        {Parts: []schema.ToolOutputPart{{Type: schema.ToolPartTypeText, Text: "搜索中..."}}},
        {Parts: []schema.ToolOutputPart{{Type: schema.ToolPartTypeText, Text: "找到结果"}}},
    }
    return schema.StreamReaderFromArray(results), nil
}

func createEnhancedStreamTool() (tool.EnhancedStreamableTool, error) {
    return utils.InferEnhancedStreamTool("stream_search", "流式搜索工具", streamSearch)
}
```

#### **增强型工具：使用 InferOptionableEnhancedTool 方法**

当需要自定义 option 参数时，可以使用 InferOptionableEnhancedTool：

```go
func InferOptionableEnhancedTool[T any](toolName, toolDesc string, i OptionableEnhancedInvokeFunc[T], opts ...Option) (tool.EnhancedInvokableTool, error)
```

示例：

```go
import (
    "context"
    "github.com/cloudwego/eino/components/tool"
    "github.com/cloudwego/eino/components/tool/utils"
    "github.com/cloudwego/eino/schema"
)

type ImageSearchOption struct {
    MaxResults int
    Quality    string
}

func WithMaxResults(n int) tool.Option {
    return tool.WrapImplSpecificOptFn(func(o *ImageSearchOption) {
        o.MaxResults = n
    })
}

type ImageSearchInput struct {
    Query string `json:"query" jsonschema:"required"`
}

func searchImagesWithOption(ctx context.Context, input *ImageSearchInput, opts ...tool.Option) (*schema.ToolResult, error) {
    baseOption := &ImageSearchOption{MaxResults: 10, Quality: "high"}
    option := tool.GetImplSpecificOptions(baseOption, opts...)
    
    // 使用 option.MaxResults 和 option.Quality 执行搜索...
    imageURL := "https://example.com/image.png"
    
    return &schema.ToolResult{
        Parts: []schema.ToolOutputPart{
            {Type: schema.ToolPartTypeText, Text: fmt.Sprintf("返回 %d 张图片：", option.MaxResults)},
            {
                Type: schema.ToolPartTypeImage,
                Image: &schema.ToolOutputImage{
                    MessagePartCommon: schema.MessagePartCommon{URL: &imageURL},
                },
            },
        },
    }, nil
}

func createOptionableEnhancedTool() (tool.EnhancedInvokableTool, error) {
    return utils.InferOptionableEnhancedTool("image_search", "搜索图片", searchImagesWithOption)
}
```

#### **使用 InferOptionableTool 方法（标准工具）**

Option 机制是 Eino 提供的一种在运行时传递动态参数的机制，详情可以参考 Eino: CallOption 能力与规范，这套机制在自定义 tool 中同样适用。

当开发者要实现一个需要自定义 option 参数时则可使用 InferOptionableTool 这个方法，相比于 InferTool 对函数签名的要求，这个方法的签名增加了一个 option 参数，签名如下：

```go
func InferOptionableTool[T, D any](toolName, toolDesc string, i OptionableInvokeFunc[T, D], opts ...Option) (tool.InvokableTool, error)
```

示例如下（改编自 `cloudwego/eino/components/tool/utils/invokable_func_test.go`）：

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

### **方式 3 - 使用 eino-ext 中提供的 tool**

除了自定义的各种 tool 需要自行实现外，eino-ext 项目中还有很多通用的 tool 实现，可以实现开箱即用，比如 Tool - Googlesearch、Tool - DuckDuckGoSearch、wikipedia、httprequest 等等，可以参考 [https://github.com/cloudwego/eino-ext/tree/main/components/tool](https://github.com/cloudwego/eino-ext/tree/main/components/tool) 中的各种实现。

### **方式 4 - 使用 MCP 协议**

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

代码参考：[https://github.com/cloudwego/eino-ext/blob/main/components/tool/mcp/examples/mcp.go](https://github.com/cloudwego/eino-ext/blob/main/components/tool/mcp/examples/mcp.go)

## **工具类型选择指南**

> **注意**：当工具同时实现了标准接口和增强型接口时，ToolsNode 会优先使用增强型接口。
