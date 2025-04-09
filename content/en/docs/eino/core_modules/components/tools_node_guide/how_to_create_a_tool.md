---
Description: ""
date: "2025-04-09"
lastmod: ""
tags: []
title: How to create a tool?
weight: 0
---

## The basic structure of Tool

An agent needs to take two steps to invoke a tool: ① The large model constructs invocation parameters based on the tool's functions and parameter requirements. ② Actually invokes the tool

These two basic steps also require the tool to include two parts:

- Introduction to the functions of the tool and the parameter information needed to invoke this tool.
- Call the interface of this tool

In Eino, the BaseTool interface requires any tool to have a ` Info()`  interface that returns tool information, as follows:

```go
type BaseTool interface {
    Info(ctx context.Context) (*schema.ToolInfo, error)
}
```

And according to whether the return structure of a tool is streamable after it is invoked, it can be divided into InvokableTool and StreamableTool, which are also defined in the form of interfaces:

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

## The representation of ToolInfo

In the process of function call in a large model, the large model generates the parameters needed for the function call, which requires the large model to understand whether the generated parameters meet the constraints. In Eino, based on the developers' usage habits and domain standards, it provides ` params map[string]*ParameterInfo`  and ` *openapi3.Schema`  two ways to express parameter constraints.

### Method 1 - map[string]*ParameterInfo

In the intuitive habits of many developers, the description of parameters can be represented by a map, where the key is the parameter name and the value is the detailed constraint of this parameter. In Eino, ParameterInfo is defined to represent the description of a parameter, as follows:

```go
// watch at: https://github.com/cloudwego/eino/blob/main/schema/tool.go
type ParameterInfo struct {
    Type DataType    // The type of the parameter.
    ElemInfo *ParameterInfo    // The element type of the parameter, only for array.
    SubParams map[string]*ParameterInfo    // The sub parameters of the parameter, only for object.
    Desc string    // The description of the parameter.
    Enum []string    // The enum values of the parameter, only for string.
    Required bool    // Whether the parameter is required.
}
```

For example, a parameter representing "User" can be expressed as:

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

This representation method is very simple and intuitive, and it is often used when parameters are manually maintained by developers through coding.

### Method 2 - openapi3.Schema

Another common way to represent parameter constraints is ` JSON schema` , which is defined by OAI. [ OpenAPI](https://github.com/OAI/OpenAPI-Specification)  is the most commonly used standard, and Eino also supports the use of openapi3.Schema to represent parameter constraints.

The OpenAPI 3 standard offers a wide range of constraints for parameters, and a detailed description can be found in [ OpenAPI 3.03](https://github.com/OAI/OpenAPI-Specification/blob/main/versions/3.0.3.md#schema-object) . In actual use, developers typically do not build this structure themselves, but use some methods to generate it.

#### Generate using GoStruct2ParamsOneOf

Eino provides a way to describe parameter constraints in structures using go tags, and it also offers the GoStruct2ParamsOneOf method to generate parameter constraints for a struct. Its function signature is as follows:

```go
func GoStruct2ParamsOneOf[T any](opts ...Option) (*schema.ParamsOneOf, error)
```

Extract the field name and description of the parameters from T, and the Tag used for extraction is as follows:

- jsonschema: "description=xxx"
- jsonschema: "enum=xxx,enum=yyy,enum=zzz"
- jsonschema: "required"
- json: "xxx,omitempty" => The "omitempty" in json tag represents that it is not required
- Implement a custom parsing method using utils.WithSchemaCustomizer

You can refer to the following examples:

```go
package main

import (
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

This method is generally not invoked by developers, and is often directly used ` utils.GoStruct2ToolInfo()`  to build ToolInfo, or directly use ` utils.InferTool()`  to directly build a tool. You can refer to the "Convert local functions into tools" section below for more details.

#### Generated through the openapi.json file

Since OpenAPI is a very universal standard, many tools or platforms can export OpenAPI.json files, especially in some HTTP interface management tools. If the tool is a wrapper for some OpenAPI, you can use this method.

See the usage examples in [ eino-examples](https://github.com/cloudwego/eino-examples/blob/main/components/tool/openapi3/main.go#L33) 。

## Method 1 - Directly implement the interface

Since the definition of a tool is an interface, the most direct way to implement a tool is to implement the interface. Take InvokableTool as an example:

```go
type AddUser struct{}

func (t *AddUser) Info(_ context.Context) (*schema.ToolInfo, error) {
    return &schema.ToolInfo{
        Name: "add_user",
        Desc: "add user",
        ParamsOneOf: schema.NewParamsOneOfByParams(map[string]*schema.ParameterInfo{
           // omit. Refer to the way of constructing params constraints in the above text.
        }),
    }, nil
}

func (t *AddUser) InvokableRun(_ context.Context, argumentsInJSON string, _ ...tool.Option) (string, error) {
    // 1. Deserialize argumentsInJSON and handle options, etc.
    user, _ := json.Unmarshal([]byte(argumentsInJSON))
    // 2. Handle business logic
    // 3. Serialize the result to a string and return it

    return `{"msg": "ok"}`, nil
}
```

Since the function call parameters given by the large model are always a string, in the Eino framework, the imported parameter of the tool is also a json serialized into a string. Therefore, this approach requires developers to handle the deserialization of parameters themselves, and the result of the call is also returned as a string.

## Method 2 - Convert local functions into tools

During development, we often need to encapsulate a local function into a tool of Eino, for example, we already have an ` AddUser`  method in our code, but to allow the large model to independently decide how to call this method, we need to turn this method into a tool and bind it to the large model.

Eino provides ` NewTool`  methods to convert a function into a tool. Additionally, it offers InferTool methods for scenarios where parameter constraints are represented through the tag of a struct, making the build process simpler.

> You can refer to the examples of the following methods:[ cloudwego/eino/components/tool/utils/invokable_func_test.go](https://github.com/cloudwego/eino/blob/main/components/tool/utils/invokable_func_test.go)  and [ cloudwego/eino/components/tool/utils/streamable_func_test.go](https://github.com/cloudwego/eino/blob/main/components/tool/utils/streamable_func_test.go)  in the unit test. Here, we only take InvokableTool as an example, and StreamableTool also has corresponding construction methods

### Use the NewTool method

When a function satisfies the following function signature, you can use NewTool to turn it into an InvokableTool:

```go
type InvokeFunc[T, D any] func(ctx context.Context, input T) (output D, err error)
```

The method of NewTool is as follows:

```go
// See the code at: github.com/cloudwego/eino/components/tool/utils/invokable_func.go
func NewTool[T, D any](desc *schema.ToolInfo, i InvokeFunc[T, D], opts ...Option) tool.InvokableTool
```

> Similarly, NewStreamTool can create StreamableTool

Take AddUser as an example, you can build it in the following way:

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

### Use the InferTool method

As we can see from NewTool, the process of building a tool requires us to pass in ToolInfo and InvokeFunc separately. Among them, ToolInfo contains the part of ParamsOneOf, which represents the constraint of the imported parameter of the function. At the same time, the function signature of InvokeFunc also has input parameters, which means: The part of ParamsOneOf and the input parameters of InvokeFunc need to be consistent.

When a function is fully implemented by developers themselves, they need to manually maintain the input parameters and ParamsOneOf to keep them consistent. A more elegant solution is to "directly maintain parameter constraints in the input parameter type definition", which can be referred to the introduction of ` GoStruct2ParamsOneOf`  above.

When the parameter constraint information is included in the input parameter type definition, you can use InferTool to implement it. The function signature is as follows:

```go
func InferTool[T, D any](toolName, toolDesc string, i InvokeFunc[T, D], opts ...Option) (tool.InvokableTool, error)
```

Take AddUser as an example:

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

### Use the InferOptionableTool method

The Option mechanism is a feature provided by Eino for passing dynamic parameters at runtime. For more details, you can refer to [Eino: CallOption capabilities and specification](/docs/eino/core_modules/chain_and_graph_orchestration/call_option_capabilities) . This mechanism is also applicable in custom tools.

When developers want to implement a function that requires custom option parameters, they can use the InferOptionableTool method. Compared to the requirements for function signatures in InferTool, this method's signature adds an option parameter, as follows:

```go
func InferOptionableTool[T, D any](toolName, toolDesc string, i OptionableInvokeFunc[T, D], opts ...Option) (tool.InvokableTool, error)
```

Here is an example (adapted from[ cloudwego/eino/components/tool/utils/invokable_func_test.go](https://github.com/cloudwego/eino/blob/main/components/tool/utils/invokable_func_test.go) ):

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

## Method 3 - Use the tool provided in eino-ext

In addition to the various custom tools that need to be implemented by yourself, there are also many general tools implemented in the eino-ext project that can be used out of the box, such [Tool - Googlesearch](/docs/eino/ecosystem/tool/tool_googlesearch) 、[Tool - DuckDuckGoSearch](/docs/eino/ecosystem/tool/tool_duckduckgo_search)   、wikipedia、httprequest , etc. You can refer to [https://github.com/cloudwego/eino-ext/tree/main/components/tool](https://github.com/cloudwego/eino-ext/tree/main/components/tool)  for various implementations.

## Method 4 - Use the MCP protocol

MCP (Model Context Protocol) is an open model context protocol. Now more and more tools and platforms are exposing their own capabilities to large models based on this protocol. eino can use the callable tools provided by MCP as tools, which will greatly expand the variety of tools.

It's very convenient to use the tools provided by MCP in Eino:

```go
import (
    "fmt"
    "log"
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

> Code reference: [https://github.com/cloudwego/eino-ext/blob/main/components/tool/mcp/examples/mcp.go](https://github.com/cloudwego/eino-ext/blob/main/components/tool/mcp/examples/mcp.go)
