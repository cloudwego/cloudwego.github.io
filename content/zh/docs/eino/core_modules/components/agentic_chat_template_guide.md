---
Description: ""
date: "2026-01-20"
lastmod: ""
tags: []
title: 'Eino: AgenticChatTemplate 使用说明[Beta]'
weight: 11
---

## **基本介绍**

Prompt 组件是一个用于处理和格式化提示模板的组件，其中 AgenticChatTemplate 是专为 AgenticMessage 定义组件抽象，定义与用法与现存的 ChatTemplate 抽象基本相同。它的主要作用是将用户提供的变量值填充到预定义的消息模板中，生成用于与语言模型交互的标准消息格式。这个组件可用于以下场景：

- 构建结构化的系统提示
- 处理多轮对话的模板 (包括 history)
- 实现可复用的提示模式

## **组件定义**

### **接口定义**

> 代码位置：[https://github.com/cloudwego/eino/tree/main/components/prompt/interface.go](https://github.com/cloudwego/eino/tree/main/components/prompt/interface.go)

```go
type AgenticChatTemplate interface {
    Format(ctx context.Context, vs map[string]any, opts ...Option) ([]*schema.AgenticMessage, error)
}
```

#### **Format 方法**

- 功能：将变量值填充到消息模板中
- 参数：
  - ctx：上下文对象，用于传递请求级别的信息，同时也用于传递 Callback Manager
  - vs：变量值映射，用于填充模板中的占位符
  - opts：可选参数，用于配置格式化行为
- 返回值：
  - `[]*schema.AgenticMessage`：格式化后的消息列表
  - error：格式化过程中的错误信息

### **内置模板化方式**

Prompt 组件内置支持三种模板化方式：

1. FString 格式 (schema.FString)

   - 使用 `{variable}` 语法进行变量替换
   - 简单直观，适合基础文本替换场景
   - 示例：`"你是一个{role}，请帮我{task}。"`
2. GoTemplate 格式 (schema.GoTemplate)

   - 使用 Go 标准库的 text/template 语法
   - 支持条件判断、循环等复杂逻辑
   - 示例：`"{{if .expert}}作为专家{{end}}请{{.action}}"`
3. Jinja2 格式 (schema.Jinja2)

   - 使用 Jinja2 模板语法
   - 示例：`"{% if level == 'expert' %}以专家的角度{% endif %}分析{{topic}}"`

### **公共 Option**

AgenticChatTemplate 与 ChatTemplate 共用一组公共 Option 。

## **使用方式**

AgenticChatTemplate 一般用于 AgenticModel 之前做上下文准备的。

### 创建方法

- `prompt.FromAgenticMessages()`
  - 用于把多个 message 变成一个 agentic chat template。
- `schema.AgenticMessage{}`
  - schema.AgenticMesasge 是实现了 Format 接口的结构体，因此可直接构建 `schema.AgenticMesasge{}` 作为 template
- `schema.DeveloperAgenticMessage()`
  - 此方法是构建 role 为 "developer" 的 message 快捷方法
- `schema.SystemAgenticMessage()`
  - 此方法是构建 role 为 "system" 的 message 快捷方法
- `schema.UserAgenticMessage()`
  - 此方法是构建 role 为 "user" 的 message 快捷方法
- `schema.FunctionToolResultAgenticMessage()`
  - 此方法是构建 role 为 "user" 的 tool call message 快捷方法
- `schema.AgenticMessagesPlaceholder()`
  - 可用于把一个 `[]*schema.AgenticMessage` 插入到 message 列表中，常用于插入历史对话

### **单独使用**

```go
import (
    "github.com/cloudwego/eino/components/prompt"
    "github.com/cloudwego/eino/schema"
)

// 创建模板
template := prompt.FromAgenticMessages(schema.FString,
    schema.SystemAgenticMessage("你是一个{role}。"),
    schema.AgenticMessagesPlaceholder("history_key", false),
    schema.UserAgenticMessage("请帮我{task}")
)

// 准备变量
variables := map[string]any{
    "role": "专业的助手",
    "task": "写一首诗",
    "history_key": []*schema.AgenticMessage{
       {
          Role: schema.AgenticRoleTypeUser,
          ContentBlocks: []*schema.ContentBlock{
             schema.NewContentBlock(&schema.UserInputText{Text: "告诉我油画是什么?"}),
          },
       },
       {
          Role: schema.AgenticRoleTypeAssistant,
          ContentBlocks: []*schema.ContentBlock{
             schema.NewContentBlock(&schema.AssistantGenText{Text: "油画是xxx"}),
          },
       },
    },
}

// 格式化模板
messages, err := template.Format(context.Background(), variables)
```

### **在编排中使用**

```go
import (
    "github.com/cloudwego/eino/components/prompt"
    "github.com/cloudwego/eino/schema"
    "github.com/cloudwego/eino/compose"
)

// 在 Chain 中使用
chain := compose.NewChain[map[string]any, []*schema.AgenticMessage]()
chain.AppendAgenticChatTemplate(template)

// 编译并运行
runnable, err := chain.Compile()
if err != nil {
    return err
}
result, err := runnable.Invoke(ctx, variables)

// 在 Graph 中使用
graph := compose.NewGraph[map[string]any, []*schema.AgenticMessage]()
graph.AddAgenticChatTemplateNode("template_node", template)
```

### 从前驱节点的输出中获取数据

在 AddNode 时，可以通过添加 WithOutputKey 这个 Option 来把节点的输出转成 Map：

```go
// 这个节点的输出，会从 string 改成 map[string]any，
// 且 map 中只有一个元素，key 是 your_output_key，value 是实际的的节点输出的 string
graph.AddLambdaNode("your_node_key", compose.InvokableLambda(func(ctx context.Context, input []*schema.AgenticMessage) (str string, err error) {
    // your logic
    return
}), compose.WithOutputKey("your_output_key"))
```

把前驱节点的输出转成 map[string]any 并设置好 key 后，在后置的 AgenticChatTemplate 节点中使用该 key 对应的 value。

## **Option 和 Callback 使用**

### **Callback 使用示例**

```go
import (
    "context"

    callbackHelper "github.com/cloudwego/eino/utils/callbacks"
    "github.com/cloudwego/eino/callbacks"
    "github.com/cloudwego/eino/compose"
    "github.com/cloudwego/eino/components/prompt"
)

// 创建 callback handler
handler := &callbackHelper.AgenticPromptCallbackHandler{
    OnStart: func(ctx context.Context, info *callbacks.RunInfo, input *prompt.AgenticCallbackInput) context.Context {
        fmt.Printf("开始格式化模板，变量: %v\n", input.Variables)
        return ctx
    },
    OnEnd: func(ctx context.Context, info *callbacks.RunInfo, output *prompt.AgenticCallbackOutput) context.Context {
        fmt.Printf("模板格式化完成，生成消息数量: %d\n", len(output.Result))
        return ctx
    },
}

// 使用 callback handler
helper := callbackHelper.NewHandlerHelper().
    AgenticPrompt(handler).
    Handler()

// 在运行时使用
runnable, err := chain.Compile()
if err != nil {
    return err
}
result, err := runnable.Invoke(ctx, variables, compose.WithCallbacks(helper))
```

## **自行实现参考**

### Option **机制**

若有需要，组件实现者可实现自定义 prompt option：

```go
import (
    "github.com/cloudwego/eino/components/prompt"
)

// 定义 Option 结构体
type MyPromptOptions struct {
    StrictMode bool
    DefaultValues map[string]string
}

// 定义 Option 函数
func WithStrictMode(strict bool) prompt.Option {
    return prompt.WrapImplSpecificOptFn(func(o *MyPromptOptions) {
        o.StrictMode = strict
    })
}

func WithDefaultValues(values map[string]string) prompt.Option {
    return prompt.WrapImplSpecificOptFn(func(o *MyPromptOptions) {
        o.DefaultValues = values
    })
}
```

### **Callback 处理**

Prompt 实现需要在适当的时机触发回调，以下结构是组件定义好的：

> 代码位置：[github.com/cloudwego/eino/tree/main/components/prompt/agentic_callback_extra.go](http://github.com/cloudwego/eino/tree/main/components/prompt/agentic_callback_extra.go)

```go
// AgenticCallbackInput is the input for the callback.
type AgenticCallbackInput struct {
    // Variables is the variables for the callback.
    Variables map[string]any
    // Templates is the agentic templates for the callback.
    Templates []schema.AgenticMessagesTemplate
    // Extra is the extra information for the callback.
    Extra map[string]any
}

// AgenticCallbackOutput is the output for the callback.
type AgenticCallbackOutput struct {
    // Result is the agentic result for the callback.
    Result []*schema.AgenticMessage
    // Templates is the agentic templates for the callback.
    Templates []schema.AgenticMessagesTemplate
    // Extra is the extra information for the callback.
    Extra map[string]any
}
```

### **完整实现示例**

```go
type MyPrompt struct {
    templates []schema.AgenticMessagesTemplate
    formatType schema.FormatType
    strictMode bool
    defaultValues map[string]string
}

func NewMyPrompt(config *MyPromptConfig) (*MyPrompt, error) {
    return &MyPrompt{
        templates: config.Templates,
        formatType: config.FormatType,
        strictMode: config.DefaultStrictMode,
        defaultValues: config.DefaultValues,
    }, nil
}

func (p *MyPrompt) Format(ctx context.Context, vs map[string]any, opts ...prompt.Option) ([]*schema.AgenticMessage, error) {
    // 1. 处理 Option
    options := &MyPromptOptions{
        StrictMode: p.strictMode,
        DefaultValues: p.defaultValues,
    }
    options = prompt.GetImplSpecificOptions(options, opts...)
    
    // 2. 获取 callback manager
    cm := callbacks.ManagerFromContext(ctx)
    
    // 3. 开始格式化前的回调
    ctx = cm.OnStart(ctx, info, &prompt.AgenticCallbackInput{
        Variables: vs,
        Templates: p.templates,
    })
    
    // 4. 执行格式化逻辑
    messages, err := p.doFormat(ctx, vs, options)
    
    // 5. 处理错误和完成回调
    if err != nil {
        ctx = cm.OnError(ctx, info, err)
        return nil, err
    }
    
    ctx = cm.OnEnd(ctx, info, &prompt.AgenticCallbackOutput{
        Result: messages,
        Templates: p.templates,
    })
    
    return messages, nil
}

func (p *MyPrompt) doFormat(ctx context.Context, vs map[string]any, opts *MyPromptOptions) ([]*schema.AgenticMessage, error) {
    // 实现自己定义逻辑
    return messages, nil
}
```
