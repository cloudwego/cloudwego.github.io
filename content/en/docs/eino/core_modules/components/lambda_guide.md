---
Description: ""
date: "2025-11-20"
lastmod: ""
tags: []
title: 'Eino: Lambda User Guide'
weight: 4
---

## **Introduction**

Lambda is the most basic component type in Eino. It allows users to embed custom function logic in workflows. The Lambda component is composed of 4 types of execution functions based on whether input and output are streams, corresponding to 4 interaction modes: Invoke, Stream, Collect, Transform.

Users can implement one or more of these when building Lambda, and the framework will convert them according to certain rules. For detailed introduction, see: [Eino: Overview](/docs/eino/overview) (see the Runnable section)

## **Component Definition and Implementation**

The core of the Lambda component is the `Lambda` struct, which wraps user-provided Lambda functions. Users can create a Lambda component through construction methods:

> Code location: eino/compose/types_lambda.go

```go
type Lambda struct {
    executor *composableRunnable
}
```

The four function types supported by Lambda are defined as follows, meaning user-provided Lambda functions need to satisfy these function signatures:

```go
type Invoke[I, O, TOption any] func(ctx context.Context, input I, opts ...TOption) (output O, err error)

type Stream[I, O, TOption any] func(ctx context.Context, input I, opts ...TOption) (output *schema.StreamReader[O], err error)

type Collect[I, O, TOption any] func(ctx context.Context, input *schema.StreamReader[I], opts ...TOption) (output O, err error)

type Transform[I, O, TOption any] func(ctx context.Context, input *schema.StreamReader[I], opts ...TOption) (output *schema.StreamReader[O], err error)
```

## Usage

> Code in examples references: [https://github.com/cloudwego/eino-examples/blob/main/components/lambda](https://github.com/cloudwego/eino-examples/blob/main/components/lambda)

### Construction Methods

From the unified specification of Eino component interfaces, a component's callable method needs to have 3 input parameters and 2 output parameters: func (ctx, input, ...option) (output, error). However, in scenarios using Lambda, developers often want to add a Lambda node by providing a simple function implementation, so construction methods are divided into 3 types:

- Provide only one selected interaction function with determined input/output stream types
  - Without custom Option
  - Using custom Option
- Customize n (n<=4) of the 4 interaction functions: AnyLambda

#### Without Custom Option

- InvokableLambda

```go
// input and output types can be any custom types
lambda := compose.InvokableLambda(func(ctx context.Context, input string) (output string, err error) {
    // some logic
})
```

- StreamableLambda

```go
// input can be any type, output must be *schema.StreamReader[O], where O can be any type
lambda := compose.StreamableLambda(func(ctx context.Context, input string) (output *schema.StreamReader[string], err error) {
    // some logic
})
```

- CollectableLambda

```go
// input must be *schema.StreamReader[I], where I can be any type, output can be any type
lambda := compose.CollectableLambda(func(ctx context.Context, input *schema.StreamReader[string]) (output string, err error) {
    // some logic
})
```

- TransformableLambda

```go
// input and output must be *schema.StreamReader[I], where I can be any type
lambda := compose.TransformableLambda(func(ctx context.Context, input *schema.StreamReader[string]) (output *schema.StreamReader[string], err error) {
    // some logic
})
```

- The construction methods for the four Lambda methods have the following common Option options:
- compose.WithLambdaType(): Modify the Component type of the Lambda component, default is: Lambda
- compose.WithLambdaCallbackEnable(): Disable the Node Callback that is enabled by default for Lambda component in Graph

#### Using Custom Option

Each interaction mode has a corresponding construction method. Here's an example using Invoke:

```go
type Options struct {
    Field1 string
}
type MyOption func(*Options)

lambda := compose.InvokableLambdaWithOption(
    func(ctx context.Context, input string, opts ...MyOption) (output string, err error) {
        // Handle opts
        // some logic
    }
)
```

#### AnyLambda

AnyLambda allows implementing Lambda function types with multiple interaction modes simultaneously:

```go
type Options struct {
    Field1 string
}

type MyOption func(*Options)

// input and output types can be any custom types
lambda, err := compose.AnyLambda(
    // Invoke function
    func(ctx context.Context, input string, opts ...MyOption) (output string, err error) {
        // some logic
    },
    // Stream function
    func(ctx context.Context, input string, opts ...MyOption) (output *schema.StreamReader[string], err error) {
        // some logic
    },
    // Collect function
    func(ctx context.Context, input *schema.StreamReader[string], opts ...MyOption) (output string, err error) {
        // some logic
    },
    // Transform function
    func(ctx context.Context, input *schema.StreamReader[string], opts ...MyOption) (output *schema.StreamReader[string], err error) {
        // some logic
    },
)
```

### **Usage in Orchestration**

#### Usage in Graph

Lambda nodes can be added in Graph through AddLambdaNode:

```go
graph := compose.NewGraph[string, *MyStruct]()
graph.AddLambdaNode(
    "node1",
    compose.InvokableLambda(func(ctx context.Context, input string) (*MyStruct, error) {
        // some logic
    }),
)
```

#### Usage in Chain

Lambda nodes can be added in Chain through AppendLambda:

```go
chain := compose.NewChain[string, string]()
chain.AppendLambda(compose.InvokableLambda(func(ctx context.Context, input string) (string, error) {
    // some logic
}))
```

### Two Built-in Lambdas

#### ToList

ToList is a built-in Lambda for converting a single input element to a slice containing that element:

```go
// Create a ToList Lambda
lambda := compose.ToList[*schema.Message]()

// Use in Chain
chain := compose.NewChain[[]*schema.Message, []*schema.Message]()
chain.AppendChatModel(chatModel)  // chatModel returns *schema.Message
chain.AppendLambda(lambda)        // Convert *schema.Message to []*schema.Message
```

#### MessageParser

MessageParser is a built-in Lambda for parsing JSON messages (usually generated by LLM) into specified structs:

```go
// Define target struct for parsing
type MyStruct struct {
    ID int `json:"id"`
}

// Create parser
parser := schema.NewMessageJSONParser[*MyStruct](&schema.MessageJSONParseConfig{
    ParseFrom: schema.MessageParseFromContent,
    ParseKeyPath: "", // If you only need to parse sub-fields, use "key.sub.grandsub"
})

// Create parser Lambda
parserLambda := compose.MessageParser(parser)

// Use in Chain
chain := compose.NewChain[*schema.Message, *MyStruct]()
chain.AppendLambda(parserLambda)

// Usage example
runner, err := chain.Compile(context.Background())
parsed, err := runner.Invoke(context.Background(), &schema.Message{
    Content: `{"id": 1}`,
})
// parsed.ID == 1
```

MessageParser supports parsing data from message content (Content) or tool call results (ToolCall), which is commonly used in intent recognition scenarios:

```go
// Parse from tool call results
parser := schema.NewMessageJSONParser[*MyStruct](&schema.MessageJSONParseConfig{
    ParseFrom: schema.MessageParseFromToolCall,
})
```
