---
Description: ""
date: "2025-02-19"
lastmod: ""
tags: []
title: 'Eino: Lambda 使用说明'
weight: 9
---

## **基本介绍**

Lambda 是 Eino 中最基础的组件类型，它允许用户在工作流中嵌入自定义的函数逻辑。Lambda 组件底层是由输入输出是否流所形成的 4 种运行函数组成，对应 4 种交互模式: Invoke、Stream、Collect、Transform。

用户构建 Lambda 时可实现其中的一种或多种，框架会根据一定的规则进行转换，详细介绍可见: [Eino: 概述](/zh/docs/eino/overview) (见 Runnable 小节)

## **组件定义及实现**

Lambda 组件的核心是 `Lambda` 结构体，它包装了用户提供的 Lambda 函数，用户可通过构建方法创建一个 Lambda 组件：

```go
// 定义见: https://github.com/cloudwego/eino/blob/main/compose/types_lambda.go
type Lambda struct {
    executor *composableRunnable
}
```

Lambda 支持的四种函数类型定义如下，即用户提供的 Lambda 函数需要满足这些函数签名：

```go
type Invoke[I, O, TOption any] func(ctx context.Context, input I, opts ...TOption) (output O, err error)

type Stream[I, O, TOption any] func(ctx context.Context, input I, opts ...TOption) (output *schema.StreamReader[O], err error)

type Collect[I, O, TOption any] func(ctx context.Context, input *schema.StreamReader[I], opts ...TOption) (output O, err error)

type Transform[I, O, TOption any] func(ctx context.Context, input *schema.StreamReader[I], opts ...TOption) (output *schema.StreamReader[O], err error)
```

## 使用方式

> 示例中的代码参考： [https://github.com/cloudwego/eino-examples/blob/main/components/lambda](https://github.com/cloudwego/eino-examples/blob/main/components/lambda)

### 构建方法

从 Eino 的组件接口的统一规范来看，一个组件的可调用方法需要有 3 个入参 和 2 个出参： func (ctx, input, ...option) (output, error), 但在使用 Lambda 的场景中，常希望通过提供一个简单的函数实现来添加一个 Lambda 节点，因此构建方法分成 3 种：

- 仅提供一种已选定输入输出是否为流的交互函数
  - 不带自定义 Option
  - 使用自定义 Option
- 从 4 中交互函数中自定义 n(n<=4) 种的函数： AnyLambda

#### 不带自定义 Option

- InvokableLambda

```go
// input 和 output 类型为自定义的任何类型
lambda := compose.InvokableLambda(func(ctx context.Context, input string) (output string, err error) {
    // some logic
})
```

- StreamableLambda

```go
// input 可以是任意类型，output 必须是 *schema.StreamReader[O]，其中 O 可以是任意类型
lambda := compose.StreamableLambda(func(ctx context.Context, input string) (output *schema.StreamReader[string], err error) {
    // some logic
})
```

- CollectableLambda

```go
// input 必须是 *schema.StreamReader[I]，其中 I 可以是任意类型，output 可以是任意类型
lambda := compose.CollectableLambda(func(ctx context.Context, input *schema.StreamReader[string]) (output string, err error) {
    // some logic
})
```

- TransformableLambda

```go
// input 和 output 必须是 *schema.StreamReader[I]，其中 I 可以是任意类型
lambda := compose.TransformableLambda(func(ctx context.Context, input *schema.StreamReader[string]) (output *schema.StreamReader[string], err error) {
    // some logic
})
```

#### 使用自定义 Option

每一种交互方式都对应了一个构建方法，以下以 Invoke 为例：

```go
type Options struct {
    Filed1 string
}
type MyOption func(*Options)

lambda := compose.InvokableLambdaWithOption(
    func(ctx context.Context, input string, opts ...MyOption) (output string, err error) {
        // 处理 opts
        // some logic
    }
)
```

#### AnyLambda

AnyLambda 允许同时实现多种交互模式的 Lambda 函数类型：

```go
type Options struct {
    Filed1 string
}

type MyOption func(*Options)

// input 和 output 类型为自定义的任何类型
lambda, err := compose.AnyLambda(
    // Invoke 函数
    func(ctx context.Context, input string, opts ...MyOption) (output string, err error) {
        // some logic
    },
    // Stream 函数
    func(ctx context.Context, input string, opts ...MyOption) (output *schema.StreamReader[string], err error) {
        // some logic
    },
    // Collect 函数
    func(ctx context.Context, input *schema.StreamReader[string], opts ...MyOption) (output string, err error) {
        // some logic
    },
    // Transform 函数
    func(ctx context.Context, input *schema.StreamReader[string], opts ...MyOption) (output *schema.StreamReader[string], err error) {
        // some logic
    },
)
```

### **编排中使用**

#### Graph 中使用

在 Graph 中可以通过 AddLambdaNode 添加 Lambda 节点：

```go
graph := compose.NewGraph[string, *MyStruct]()
graph.AddLambdaNode(
    "node1",
    compose.InvokableLambda(func(ctx context.Context, input string) (*MyStruct, error) {
        // some logic
    }),
)
```

#### Chain 中使用

在 Chain 中可以通过 AppendLambda 添加 Lambda 节点：

```go
chain := compose.NewChain[string, string]()
chain.AppendLambda(compose.InvokableLambda(func(ctx context.Context, input string) (string, error) {
    // some logic
}))
```

### 两个内置的 Lambda

#### ToList

ToList 是一个内置的 Lambda，用于将单个输入元素转换为包含该元素的切片（数组）：

```go
// 创建一个 ToList Lambda
lambda := compose.ToList[*schema.Message]()

// 在 Chain 中使用
chain := compose.NewChain[[]*schema.Message, []*schema.Message]()
chain.AppendChatModel(chatModel)  // chatModel 返回 *schema.Message
chain.AppendLambda(lambda)        // 将 *schema.Message 转换为 []*schema.Message
```

#### MessageParser

MessageParser 是一个内置的 Lambda，用于将 JSON 消息（通常由 LLM 生成）解析为指定的结构体：

```go
// 定义解析目标结构体
type MyStruct struct {
    ID int `json:"id"`
}

// 创建解析器
parser := schema.NewMessageJSONParser[*MyStruct](&schema.MessageJSONParseConfig{
    ParseFrom: schema.MessageParseFromContent,
    ParseKeyPath: "", // 如果仅需要 parse 子字段，可用 "key.sub.grandsub"
})

// 创建解析 Lambda
parserLambda := compose.MessageParser(parser)

// 在 Chain 中使用
chain := compose.NewChain[*schema.Message, *MyStruct]()
chain.AppendLambda(parserLambda)

// 使用示例
runner, err := chain.Compile(context.Background())
parsed, err := runner.Invoke(context.Background(), &schema.Message{
    Content: `{"id": 1}`,
})
// parsed.ID == 1
```

MessageParser 支持从消息内容（Content）或工具调用结果（ToolCall）中解析数据，这在意图识别等场景中常用：

```go
// 从工具调用结果解析
parser := schema.NewMessageJSONParser[*MyStruct](&schema.MessageJSONParseConfig{
    ParseFrom: schema.MessageParseFromToolCall,
})
```
