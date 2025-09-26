---
Description: ""
date: "2025-03-18"
lastmod: ""
tags: []
title: 'Eino: Lambda guide'
weight: 0
---

## **Introduction**

Lambda is the most fundamental component type in Eino, allowing users to embed custom function logic in the workflow. The underlying Lambda component consists of 4 types of running functions, corresponding to 4 interaction modes: Invoke, Stream, Collect, and Transform.

When users build Lambda, they can only implement one of them or more, and the framework will perform conversion according to certain rules. For detailed introduction, please refer to: [Eino: Overview](/docs/eino/overview) (see at Runnable)

## **Component Definition and Implementation**

The core of the Lambda component is the `Lambda` structure, which wraps the lambda function provided by the user. Users can create a Lambda component through the construction method:

```go
// definition at: https://github.com/cloudwego/eino/blob/main/compose/types_lambda.go
type Lambda struct {
    executor *composableRunnable
}
```

The four function types supported by Lambda are defined as follows. That is, the lambda function provided by the user needs to satisfy these function signatures:

```go
type Invoke[I, O, TOption any] func(ctx context.Context, input I, opts ...TOption) (output O, err error)

type Stream[I, O, TOption any] func(ctx context.Context, input I, opts ...TOption) (output *schema.StreamReader[O], err error)

type Collect[I, O, TOption any] func(ctx context.Context, input *schema.StreamReader[I], opts ...TOption) (output O, err error)

type Transform[I, O, TOption any] func(ctx context.Context, input *schema.StreamReader[I], opts ...TOption) (output *schema.StreamReader[O], err error)
```

## **Usage**

### **Construction method**

From the perspective of the unified specification of Eino's component interface, a callable method of a component needs to have 3 parameters and 2 return values: func (ctx, input,... option) (output, error). However, in scenarios where Lambda is used, it is often desirable to provide only a simple function. Therefore, the construction methods are divided into 3 categories:

- Functions that provide only one interaction method
  - Without Option
  - Handling custom Option
- Functions that fully customize each interaction method: AnyLambda

#### Without custom options

- InvokableLambda

```go
// The types of input and output types can be any types.
lambda := compose.InvokableLambda(func(ctx context.Context, input string) (output string, err error) {
    // some logic
})
```

- StreamableLambda

```go
// The type of input can be any custom type and the type of output must be *schema.StreamReader[O]，O can be any type.
lambda := compose.StreamableLambda(func(ctx context.Context, input string) (output *schema.StreamReader[string], err error) {
    // some logic
})
```

- CollectableLambda

```go
// The type of input must be *schema.StreamReader[I]，I can be any type and the type of output can be any custom type. 
lambda := compose.CollectableLambda(func(ctx context.Context, input *schema.StreamReader[string]) (output string, err error) {
    // some logic
})
```

- TransformableLambda

```go
// The type of input must be *schema.StreamReader[I]，I can be any type and the type of output must be *schema.StreamReader[O]，O can be any type.
lambda := compose.TransformableLambda(func(ctx context.Context, input *schema.StreamReader[string]) (output *schema.StreamReader[string], err error) {
    // some logic
})
```

#### **Using custom options**

Each interaction method corresponds to a construction method. The following takes Invoke as an example:

```go
type Options struct {
    Field1 string
}
type MyOption func(*Options)

lambda := compose.InvokableLambdaWithOption(
    func(ctx context.Context, input string, opts ...MyOption) (output string, err error) {
        // handle opts
        // some logic
    }
)
```

#### **AnyLambda**

AnyLambda allows for the implementation of multiple types of Lambda functions with different interaction patterns simultaneously.

```go
type Options struct {
    Field1 string
}

type MyOption func(*Options)

// The types of 'input' and 'output' are any custom types. 
lambda, err := compose.AnyLambda(
    // Invoke Function
    func(ctx context.Context, input string, opts ...MyOption) (output string, err error) {
        // some logic
    },
    // Stream Function
    func(ctx context.Context, input string, opts ...MyOption) (output *schema.StreamReader[string], err error) {
        // some logic
    },
    // Collect Function
    func(ctx context.Context, input *schema.StreamReader[string], opts ...MyOption) (output string, err error) {
        // some logic
    },
    // Transform Function
    func(ctx context.Context, input *schema.StreamReader[string], opts ...MyOption) (output *schema.StreamReader[string], err error) {
        // some logic
    },
)
```

### **Used in orchestration**

#### In Graph

In Graph, a Lambda node can be added through AddLambdaNode:

```go
graph := compose.NewGraph[string, *MyStruct]()
graph.AddLambdaNode(
    "node1",
    compose.InvokableLambda(func(ctx context.Context, input string) (*MyStruct, error) {
        // some logic
    }),
)
```

#### In Chain

In Chain, Lambda nodes can be added through AppendLambda:

```go
chain := compose.NewChain[string, string]()
chain.AppendLambda(compose.InvokableLambda(func(ctx context.Context, input string) (string, error) {
    // some logic
}))
```

### Two built-in Lambda nodes

#### ToList

`ToList` is a built-in lambda that is used to convert a single input into a list:

```go
// Create a ToList Lambda
lambda := compose.ToList[*schema.Message]()

// add to Chain
chain := compose.NewChain[[]*schema.Message, []*schema.Message]()
chain.AppendChatModel(chatModel)  // chatModel returns *schema.Message
chain.AppendLambda(lambda)        // convert *schema.Message to []*schema.Message
```

#### MessageParser

MessageParser is a built-in Lambda used to parse JSON messages into the specified structure (mostly generate by LLM).

```go
// Define the parsing target structure body 
type MyStruct struct {
    ID int `json:"id"`
}

// Create a parser
parser := schema.NewMessageJSONParser[*MyStruct](&schema.MessageJSONParseConfig{
    ParseFrom: schema.MessageParseFromContent,
    ParseKeyPath: "", // If you only need to parse the sub-field, you can use "key.sub.grandsub"
})

// Create a parsing Lambda
parserLambda := compose.MessageParser(parser)

// Used in Chain 
chain := compose.NewChain[*schema.Message, *MyStruct]()
chain.AppendLambda(parserLambda)

// Invoke example
runner, err := chain.Compile(context.Background())
parsed, err := runner.Invoke(context.Background(), &schema.Message{
    Content: `{"id": 1}`,
})
// parsed.ID == 1
```

MessageParser supports parsing data from the message content (Content) or the result of tool invocation (ToolCall), which is commonly used in scenarios such as intent recognition:

```go
// Parsing from the result of the tool invocation 
parser := schema.NewMessageJSONParser[*MyStruct](&schema.MessageJSONParseConfig{
    ParseFrom: schema.MessageParseFromToolCall,
})
```
