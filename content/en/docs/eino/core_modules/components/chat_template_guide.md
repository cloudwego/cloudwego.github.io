---
Description: ""
date: "2025-11-20"
lastmod: ""
tags: []
title: 'Eino: ChatTemplate Guide'
weight: 2
---

## Introduction

The `Prompt` component formats message templates by filling user-provided variables into predefined message structures. It’s used to generate standardized messages for model interaction and is useful for:

- Structured system prompts
- Multi-turn dialogue templates (including history)
- Reusable prompt patterns

## Component Definition

### Interface

> Code: `eino/components/prompt/interface.go`

```go
type ChatTemplate interface {
    Format(ctx context.Context, vs map[string]any, opts ...Option) ([]*schema.Message, error)
}
```

#### Format

- Purpose: fill variables into the message template
- Params:
  - `ctx`: request-scoped info and callback manager
  - `vs`: variables map used to fill placeholders
  - `opts`: optional formatting controls
- Returns:
  - `[]*schema.Message`: formatted messages
  - `error`

### Built-in Templating

Prompt supports three built-in templating modes:

1. `FString` (`schema.FString`)
   - `{variable}` syntax for substitution
   - Simple and direct for basic text replacement
   - Example: `"You are a {role}. Please help me {task}."`
2. `GoTemplate` (`schema.GoTemplate`)
   - Go `text/template` syntax
   - Supports conditionals, loops, etc.
   - Example: `"{{if .expert}}As an expert{{end}} please {{.action}}"`
3. `Jinja2` (`schema.Jinja2`)
   - Jinja2 template syntax
   - Example: `"{% if level == 'expert' %}From an expert perspective{% endif %} analyze {{topic}}"`

### Options

Prompt includes an `Option` mechanism; there’s no global option abstraction. Each implementation may define its own specific options and wrap them via `WrapImplSpecificOptFn`.

## Usage

`ChatTemplate` is typically used before `ChatModel` to prepare context.

### Creation Methods

- `prompt.FromMessages()` — compose multiple messages into a template.
- `schema.Message{}` — since `Message` implements `Format`, you can use it directly as a template.
- `schema.SystemMessage()` — create a system-role message.
- `schema.AssistantMessage()` — create an assistant-role message.
- `schema.UserMessage()` — create a user-role message.
- `schema.ToolMessage()` — create a tool-role message.
- `schema.MessagesPlaceholder()` — insert a `[]*schema.Message` (e.g., history) into the message list.

### Standalone Usage

```go
import (
    "github.com/cloudwego/eino/components/prompt"
    "github.com/cloudwego/eino/schema"
)

// Create template
template := prompt.FromMessages(schema.FString,
    schema.SystemMessage("你是一个{role}。"),
    schema.MessagesPlaceholder("history_key", false),
    &schema.Message{ Role: schema.User, Content: "请帮我{task}。" },
)

// Variables
variables := map[string]any{
    "role": "专业的助手",
    "task": "写一首诗",
    "history_key": []*schema.Message{{Role: schema.User, Content: "告诉我油画是什么?"}, {Role: schema.Assistant, Content: "油画是xxx"}},
}

// Format
messages, err := template.Format(context.Background(), variables)
```

### In Orchestration

```go
import (
    "github.com/cloudwego/eino/components/prompt"
    "github.com/cloudwego/eino/schema"
    "github.com/cloudwego/eino/compose"
)

// Use in Chain
chain := compose.NewChain[map[string]any, []*schema.Message]()
chain.AppendChatTemplate(template)

// Compile and run
runnable, err := chain.Compile()
if err != nil {
    return err
}
result, err := runnable.Invoke(ctx, variables)

// Use in Graph
graph := compose.NewGraph[map[string]any, []*schema.Message]()
graph.AddChatTemplateNode("template_node", template)
```

### Pull Data from a Predecessor Node

Use `WithOutputKey` to map a node’s output into a keyed `map[string]any`:

```go
graph.AddLambdaNode("your_node_key", compose.InvokableLambda(func(ctx context.Context, input []*schema.Message) (str string, err error) {
    // your logic
    return
}), compose.WithOutputKey("your_output_key"))
```

Then refer to that key within a downstream `ChatTemplate` node.

## Options and Callbacks

### Callback Example

```go
import (
    "context"

    callbackHelper "github.com/cloudwego/eino/utils/callbacks"
    "github.com/cloudwego/eino/callbacks"
    "github.com/cloudwego/eino/compose"
    "github.com/cloudwego/eino/components/prompt"
)

handler := &callbackHelper.PromptCallbackHandler{
    OnStart: func(ctx context.Context, info *callbacks.RunInfo, input *prompt.CallbackInput) context.Context {
        fmt.Printf("Formatting template; variables: %v\n", input.Variables)
        return ctx
    },
    OnEnd: func(ctx context.Context, info *callbacks.RunInfo, output *prompt.CallbackOutput) context.Context {
        fmt.Printf("Template formatted; messages: %d\n", len(output.Result))
        return ctx
    },
}

helper := callbackHelper.NewHandlerHelper().
    Prompt(handler).
    Handler()

runnable, err := chain.Compile()
result, err := runnable.Invoke(ctx, variables, compose.WithCallbacks(helper))
```

## Implementation Notes

### Option Mechanism

If needed, define custom prompt options:

```go
import (
    "github.com/cloudwego/eino/components/prompt"
)

type MyPromptOptions struct {
    StrictMode bool
    DefaultValues map[string]string
}

func WithStrictMode(strict bool) prompt.Option {
    return prompt.WrapImplSpecificOptFn(func(o *MyPromptOptions) { o.StrictMode = strict })
}

func WithDefaultValues(values map[string]string) prompt.Option {
    return prompt.WrapImplSpecificOptFn(func(o *MyPromptOptions) { o.DefaultValues = values })
}
```

### Callback Structures

> Code: `eino/components/prompt/callback_extra.go`

```go
type CallbackInput struct {
    Variables map[string]any
    Templates []schema.MessagesTemplate
    Extra map[string]any
}

type CallbackOutput struct {
    Result []*schema.Message
    Templates []schema.MessagesTemplate
    Extra map[string]any
}
```

### Complete Implementation Example

```go
type MyPrompt struct {
    templates []schema.MessagesTemplate
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

func (p *MyPrompt) Format(ctx context.Context, vs map[string]any, opts ...prompt.Option) ([]*schema.Message, error) {
    options := &MyPromptOptions{
        StrictMode: p.strictMode,
        DefaultValues: p.defaultValues,
    }
    options = prompt.GetImplSpecificOptions(options, opts...)
    cm := callbacks.ManagerFromContext(ctx)
    ctx = cm.OnStart(ctx, info, &prompt.CallbackInput{
        Variables: vs,
        Templates: p.templates,
    })
    messages, err := p.doFormat(ctx, vs, options)
    if err != nil {
        ctx = cm.OnError(ctx, info, err)
        return nil, err
    }
    ctx = cm.OnEnd(ctx, info, &prompt.CallbackOutput{
        Result: messages,
        Templates: p.templates,
    })
    return messages, nil
}

func (p *MyPrompt) doFormat(ctx context.Context, vs map[string]any, opts *MyPromptOptions) ([]*schema.Message, error) {
    // 实现自己定义逻辑
    return messages, nil
}
```
