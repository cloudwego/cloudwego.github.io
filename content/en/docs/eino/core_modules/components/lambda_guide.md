---
Description: ""
date: "2025-11-20"
lastmod: ""
tags: []
title: 'Eino: Lambda Guide'
weight: 5
---

## Introduction

`Lambda` is the simplest component type, allowing you to embed custom function logic in a workflow. Lambdas can implement one or more of the four paradigms formed by streaming/non-streaming input/output: `Invoke`, `Stream`, `Collect`, `Transform`.

The framework converts among paradigms under defined rules. See [Overview](/docs/eino/overview) for details (Runnable section).

## Definition and Construction

> Code: `eino/compose/types_lambda.go`

```go
type Lambda struct { executor *composableRunnable }
```

Lambda function signatures:

```go
type Invoke[I, O, TOption any] func(ctx context.Context, input I, opts ...TOption) (output O, err error)
type Stream[I, O, TOption any] func(ctx context.Context, input I, opts ...TOption) (output *schema.StreamReader[O], err error)
type Collect[I, O, TOption any] func(ctx context.Context, input *schema.StreamReader[I], opts ...TOption) (output O, err error)
type Transform[I, O, TOption any] func(ctx context.Context, input *schema.StreamReader[I], opts ...TOption) (output *schema.StreamReader[O], err error)
```

## Usage

> Examples: [https://github.com/cloudwego/eino-examples/blob/main/components/lambda](https://github.com/cloudwego/eino-examples/blob/main/components/lambda)

### Constructors

Eino components generally accept `func(ctx, input, ...option) (output, error)`. For lambdas, simpler constructors are provided:

- Provide exactly one paradigm function
  - Without custom options
  - With custom options
- Provide any subset of the four paradigms via `AnyLambda`

#### Without Custom Options

- `InvokableLambda`

```go
// input and output can be any custom types
lambda := compose.InvokableLambda(func(ctx context.Context, input string) (string, error) {
    // some logic
})
```

- `StreamableLambda`

```go
// input is any type; output must be *schema.StreamReader[O]
lambda := compose.StreamableLambda(func(ctx context.Context, input string) (*schema.StreamReader[string], error) {
    // some logic
})
```

- `CollectableLambda`

```go
// input must be *schema.StreamReader[I]; output can be any type
lambda := compose.CollectableLambda(func(ctx context.Context, input *schema.StreamReader[string]) (string, error) {
    // some logic
})
```

- `TransformableLambda`

```go
// input and output must be *schema.StreamReader[I]
lambda := compose.TransformableLambda(func(ctx context.Context, input *schema.StreamReader[string]) (*schema.StreamReader[string], error) {
    // some logic
})
```

Shared options:

- `compose.WithLambdaType()` — change component type (default: Lambda)
- `compose.WithLambdaCallbackEnable()` — disable default node callbacks in Graph

#### With Custom Options

```go
type Options struct { Field1 string }
type MyOption func(*Options)

lambda := compose.InvokableLambdaWithOption(
    func(ctx context.Context, input string, opts ...MyOption) (string, error) {
        // handle opts
        // some logic
    },
)
```

#### AnyLambda

Implement multiple paradigms at once:

```go
type Options struct { Field1 string }
type MyOption func(*Options)

lambda, err := compose.AnyLambda(
    func(ctx context.Context, input string, opts ...MyOption) (string, error) { /* ... */ },
    func(ctx context.Context, input string, opts ...MyOption) (*schema.StreamReader[string], error) { /* ... */ },
    func(ctx context.Context, input *schema.StreamReader[string], opts ...MyOption) (string, error) { /* ... */ },
    func(ctx context.Context, input *schema.StreamReader[string], opts ...MyOption) (*schema.StreamReader[string], error) { /* ... */ },
)
```

### In Orchestration

#### Graph

```go
graph := compose.NewGraph[string, *MyStruct]()
graph.AddLambdaNode(
    "node1",
    compose.InvokableLambda(func(ctx context.Context, input string) (*MyStruct, error) {
        // some logic
    }),
)
```

#### Chain

```go
chain := compose.NewChain[string, string]()
chain.AppendLambda(compose.InvokableLambda(func(ctx context.Context, input string) (string, error) {
    // some logic
}))
```

### Built-in Lambdas

#### ToList

Convert a single element into a one-item slice:

```go
lambda := compose.ToList[*schema.Message]()
chain := compose.NewChain[[]*schema.Message, []*schema.Message]()
chain.AppendChatModel(chatModel)
chain.AppendLambda(lambda)
```

#### MessageParser

Parse a JSON message (often from an LLM) into a struct:

```go
// define target struct
type MyStruct struct {
    ID int `json:"id"`
}

// create parser
parser := schema.NewMessageJSONParser[*MyStruct](&schema.MessageJSONParseConfig{
    ParseFrom: schema.MessageParseFromContent,
    ParseKeyPath: "", // use "key.sub.grandsub" to parse subfields
})

// create parser lambda
parserLambda := compose.MessageParser(parser)

// use in Chain
chain := compose.NewChain[*schema.Message, *MyStruct]()
chain.AppendLambda(parserLambda)

// example
runner, err := chain.Compile(context.Background())
parsed, err := runner.Invoke(context.Background(), &schema.Message{
    Content: `{"id": 1}`,
})
// parsed.ID == 1
```

Parsing from tool call results is also supported:

```go
// parse from tool call results
parser := schema.NewMessageJSONParser[*MyStruct](&schema.MessageJSONParseConfig{
    ParseFrom: schema.MessageParseFromToolCall,
})
```
