---
Description: ""
date: "2026-03-02"
lastmod: ""
tags: []
title: How to Create a Tool
weight: 1
---

## Tool Structure Basics

An agent calling a tool involves two steps: (1) the LLM constructs parameters according to the tool definition; (2) the tool is actually called.

These two basic steps require that a tool contains two parts:

- Tool functionality description and parameter information needed to call the tool
- Interface to call the tool

In Eino, the BaseTool interface requires any tool to have an Info() interface that returns tool information:

```go
type BaseTool interface {
    Info(ctx context.Context) (*schema.ToolInfo, error)
}
```

### Standard Tool Interface

Based on whether the tool's return structure is streaming, tools can be divided into InvokableTool and StreamableTool, also defined as interfaces:

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

### Enhanced Tool Interface

In addition to standard tool interfaces, Eino also provides enhanced tool interfaces that support returning structured multimodal results. Enhanced tools are suitable for scenarios that need to return images, audio, video, files, and other rich media content:

```go
// EnhancedInvokableTool is a tool interface that supports returning structured multimodal results
// Unlike InvokableTool which returns a string, this interface returns *schema.ToolResult
// which can contain text, images, audio, video, and files
type EnhancedInvokableTool interface {
    BaseTool
    InvokableRun(ctx context.Context, toolArgument *schema.ToolArgument, opts ...Option) (*schema.ToolResult, error)
}

// EnhancedStreamableTool is a streaming tool interface that supports returning structured multimodal results
type EnhancedStreamableTool interface {
    BaseTool
    StreamableRun(ctx context.Context, toolArgument *schema.ToolArgument, opts ...Option) (*schema.StreamReader[*schema.ToolResult], error)
}
```

#### Enhanced Tool Data Structures

```go
// ToolArgument contains the input information for a tool call
type ToolArgument struct {
    TextArgument string  // Tool call parameters in JSON format
}

// ToolResult represents the structured multimodal output of tool execution
type ToolResult struct {
    Parts []ToolOutputPart `json:"parts,omitempty"`
}

// ToolPartType defines the content type of a tool output part
type ToolPartType string

const (
    ToolPartTypeText  ToolPartType = "text"   // Text
    ToolPartTypeImage ToolPartType = "image"  // Image
    ToolPartTypeAudio ToolPartType = "audio"  // Audio
    ToolPartTypeVideo ToolPartType = "video"  // Video
    ToolPartTypeFile  ToolPartType = "file"   // File
)

// ToolOutputPart represents a part of the tool execution output
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

## ToolInfo Representations

In the LLM function call process, the LLM generates the parameters for the function call, which requires the LLM to understand whether the generated parameters meet constraints. In Eino, based on developer habits and domain standards, two parameter constraint representations are provided: `params map[string]*ParameterInfo` and `*jsonschema.Schema`.

### Method 1 - map[string]*ParameterInfo

In many developers' intuitive habits, parameters can be described using a map where the key is the parameter name and the value is the detailed constraint for that parameter. Eino defines ParameterInfo to represent a parameter description:

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

For example, a parameter representing a User can be expressed as:

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

This representation is very simple and intuitive, commonly used when parameters are manually maintained by developers through coding.

### Method 2 - JSON Schema

Another common way to represent parameter constraints is JSON Schema ([https://json-schema.org/draft/2020-12](https://json-schema.org/draft/2020-12)).

The JSON Schema standard provides very rich ways to constrain parameters. In practice, developers generally don't construct this structure themselves but use methods to generate it.

#### Using GoStruct2ParamsOneOf

Eino provides a way to describe parameter constraints through go tags in structs, and provides the GoStruct2ParamsOneOf method to generate parameter constraints for a struct:

```go
func GoStruct2ParamsOneOf[T any](opts ...Option) (*schema.ParamsOneOf, error)
```

The tags used to extract parameter field names and descriptions from T are:

- `jsonschema_description:"xxx"` [recommended] or `jsonschema:"description=xxx"`
  - Descriptions often contain commas, and commas in tags are separators for different fields and cannot be escaped. It's strongly recommended to use the separate jsonschema_description tag.
- `jsonschema:"enum=xxx,enum=yyy,enum=zzz"`
- `jsonschema:"required"`
- `json:"xxx,omitempty"` => can use json tag's omitempty to represent non-required

Use `utils.WithSchemaModifier` to implement custom parsing methods, see the example below:

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

This method is generally not called directly by developers. Instead, use `utils.GoStruct2ToolInfo()` to build ToolInfo, or use `utils.InferTool()` directly to build a tool. See the "Converting local functions to tools" section below for details.

## Ways to Implement a Tool

### Method 1 - Implement Interfaces Directly

Since tool definitions are all interfaces, the most direct way to implement a tool is to implement the interface.

#### Implementing Standard Tool Interface

Using InvokableTool as an example:

```go
type AddUser struct{}

func (t *AddUser) Info(_ context.Context) (*schema.ToolInfo, error) {
    return &schema.ToolInfo{
        Name: "add_user",
        Desc: "add user",
        ParamsOneOf: schema.NewParamsOneOfByParams(map[string]*schema.ParameterInfo{
            // omit, refer to the above method for building params constraints
        }),
    }, nil
}

func (t *AddUser) InvokableRun(_ context.Context, argumentsInJSON string, _ ...tool.Option) (string, error) {
    // 1. Deserialize argumentsInJSON, handle options, etc.
    user, _ := json.Unmarshal([]byte(argumentsInJSON))
    // 2. Handle business logic
    // 3. Serialize the result to string and return

    return `{"msg": "ok"}`, nil
}
```

Since the LLM's function call parameters are always a string, corresponding to the Eino framework, the tool's call parameter input is also a JSON serialized into a string. Therefore, this method requires developers to handle parameter deserialization themselves, and the call result is also returned as a string.

#### Implementing Enhanced Tool Interface

When you need to return multimodal content (such as images, audio, video, files, etc.), you can implement the EnhancedInvokableTool interface:

```go
type ImageSearchTool struct{}

func (t *ImageSearchTool) Info(_ context.Context) (*schema.ToolInfo, error) {
    return &schema.ToolInfo{
        Name: "image_search",
        Desc: "Search and return related images",
        ParamsOneOf: schema.NewParamsOneOfByParams(map[string]*schema.ParameterInfo{
            "query": {
                Type:     schema.String,
                Desc:     "Search keyword",
                Required: true,
            },
        }),
    }, nil
}

func (t *ImageSearchTool) InvokableRun(_ context.Context, toolArgument *schema.ToolArgument, _ ...tool.Option) (*schema.ToolResult, error) {
    // 1. Parse parameters (toolArgument.TextArgument contains JSON format parameters)
    var input struct {
        Query string `json:"query"`
    }
    json.Unmarshal([]byte(toolArgument.TextArgument), &input)
    
    // 2. Execute search logic...
    imageURL := "https://example.com/image.png"
    
    // 3. Return multimodal result
    return &schema.ToolResult{
        Parts: []schema.ToolOutputPart{
            {Type: schema.ToolPartTypeText, Text: "Found the following images:"},
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

### Method 2 - Convert Local Functions to Tools

During development, we often need to wrap a local function into an Eino tool. For example, our code already has an AddUser method, but to let the LLM autonomously decide how to call this method, we need to turn this method into a tool and bind it to the LLM.

Eino provides the NewTool method to convert a function into a tool. Additionally, for scenarios where parameter constraints are expressed through struct tags, the InferTool method is provided to make the construction process simpler.

For examples of the methods below, refer to unit tests in `cloudwego/eino/components/tool/utils/invokable_func_test.go` and `cloudwego/eino/components/tool/utils/streamable_func_test.go`.

#### Standard Tool: Using NewTool Method

When a function has the following signature, you can use NewTool to turn it into an InvokableTool:

```go
type InvokeFunc[T, D any] func(ctx context.Context, input T) (output D, err error)
```

The NewTool method is:

```go
// Code: github.com/cloudwego/eino/components/tool/utils/invokable_func.go
func NewTool[T, D any](desc *schema.ToolInfo, i InvokeFunc[T, D], opts ...Option) tool.InvokableTool
```

Similarly, NewStreamTool can create a StreamableTool.

Using AddUser as an example, it can be built as follows:

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

#### Standard Tool: Using InferTool Method

From NewTool, we can see that building a tool requires separately passing ToolInfo and InvokeFunc, where ToolInfo contains the ParamsOneOf part representing the function's input parameter constraints, and InvokeFunc's signature also has an input parameter. This means: the ParamsOneOf part and InvokeFunc's input parameter need to be consistent.

When a function is entirely implemented by developers themselves, developers need to manually maintain the input parameter and ParamsOneOf to keep them consistent. A more elegant solution is "maintaining parameter constraints directly in the input parameter type definition", refer to the GoStruct2ParamsOneOf introduction above.

When parameter constraint information is contained in the input parameter type definition, you can use InferTool to implement it:

```go
func InferTool[T, D any](toolName, toolDesc string, i InvokeFunc[T, D], opts ...Option) (tool.InvokableTool, error)
```

Using AddUser as an example:

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

#### Enhanced Tool: Using NewEnhancedTool Method

When you need to return multimodal results, you can use the NewEnhancedTool method:

```go
type EnhancedInvokeFunc[T any] func(ctx context.Context, input T) (output *schema.ToolResult, err error)

func NewEnhancedTool[T any](desc *schema.ToolInfo, i EnhancedInvokeFunc[T], opts ...Option) tool.EnhancedInvokableTool
```

Example:

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
    // Execute image search logic...
    imageURL := "https://example.com/image.png"
    
    return &schema.ToolResult{
        Parts: []schema.ToolOutputPart{
            {Type: schema.ToolPartTypeText, Text: "Found the following images:"},
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
        Desc: "Search and return related images",
        ParamsOneOf: schema.NewParamsOneOfByParams(map[string]*schema.ParameterInfo{
            "query": {Type: schema.String, Desc: "Search keyword", Required: true},
        }),
    }, searchImages)
}
```

#### Enhanced Tool: Using InferEnhancedTool Method

Similar to InferTool, InferEnhancedTool can automatically infer parameter constraints from function signatures:

```go
func InferEnhancedTool[T any](toolName, toolDesc string, i EnhancedInvokeFunc[T], opts ...Option) (tool.EnhancedInvokableTool, error)
```

Example:

```go
import (
    "context"
    "github.com/cloudwego/eino/components/tool"
    "github.com/cloudwego/eino/components/tool/utils"
    "github.com/cloudwego/eino/schema"
)

type ImageSearchInput struct {
    Query string `json:"query" jsonschema:"required" jsonschema_description:"Search keyword"`
}

func searchImages(ctx context.Context, input *ImageSearchInput) (*schema.ToolResult, error) {
    imageURL := "https://example.com/image.png"
    
    return &schema.ToolResult{
        Parts: []schema.ToolOutputPart{
            {Type: schema.ToolPartTypeText, Text: "Found the following images:"},
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
    return utils.InferEnhancedTool("image_search", "Search and return related images", searchImages)
}
```

#### Enhanced Streaming Tool: Using InferEnhancedStreamTool Method

For scenarios that need to stream multimodal content, you can use InferEnhancedStreamTool:

```go
func InferEnhancedStreamTool[T any](toolName, toolDesc string, s EnhancedStreamFunc[T], opts ...Option) (tool.EnhancedStreamableTool, error)
```

Example:

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
        {Parts: []schema.ToolOutputPart{{Type: schema.ToolPartTypeText, Text: "Searching..."}}},
        {Parts: []schema.ToolOutputPart{{Type: schema.ToolPartTypeText, Text: "Found results"}}},
    }
    return schema.StreamReaderFromArray(results), nil
}

func createEnhancedStreamTool() (tool.EnhancedStreamableTool, error) {
    return utils.InferEnhancedStreamTool("stream_search", "Streaming search tool", streamSearch)
}
```

#### Enhanced Tool: Using InferOptionableEnhancedTool Method

When you need custom option parameters, you can use InferOptionableEnhancedTool:

```go
func InferOptionableEnhancedTool[T any](toolName, toolDesc string, i OptionableEnhancedInvokeFunc[T], opts ...Option) (tool.EnhancedInvokableTool, error)
```

Example:

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
    
    // Use option.MaxResults and option.Quality to execute search...
    imageURL := "https://example.com/image.png"
    
    return &schema.ToolResult{
        Parts: []schema.ToolOutputPart{
            {Type: schema.ToolPartTypeText, Text: fmt.Sprintf("Returning %d images:", option.MaxResults)},
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
    return utils.InferOptionableEnhancedTool("image_search", "Search images", searchImagesWithOption)
}
```

#### Using InferOptionableTool Method (Standard Tool)

The Option mechanism is a mechanism provided by Eino for passing dynamic parameters at runtime. For details, see Eino: CallOption Capabilities and Conventions. This mechanism also applies to custom tools.

When developers need custom option parameters, they can use InferOptionableTool. Compared to InferTool's function signature requirements, this method adds an option parameter:

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

### Method 3 - Use Tools from eino-ext

Besides various custom tools that need to be implemented yourself, the eino-ext project has many general-purpose tool implementations that can be used out of the box, such as Tool - Googlesearch, Tool - DuckDuckGoSearch, wikipedia, httprequest, etc. See various implementations at [https://github.com/cloudwego/eino-ext/tree/main/components/tool](https://github.com/cloudwego/eino-ext/tree/main/components/tool).

### Method 4 - Use MCP Protocol

MCP (Model Context Protocol) is an open model context protocol. More and more tools and platforms are exposing their capabilities to LLMs based on this protocol. Eino can use tools provided via MCP as regular tools, greatly expanding the variety of tools available.

Using MCP-provided tools in Eino is very convenient:

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

Code reference: [https://github.com/cloudwego/eino-ext/blob/main/components/tool/mcp/examples/mcp.go](https://github.com/cloudwego/eino-ext/blob/main/components/tool/mcp/examples/mcp.go)

## Tool Type Selection Guide

> **Note**: When a tool implements both standard and enhanced interfaces, ToolsNode will prioritize using the enhanced interface.
