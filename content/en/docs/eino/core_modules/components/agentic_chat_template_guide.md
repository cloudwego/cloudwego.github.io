---
Description: ""
date: "2026-01-20"
lastmod: ""
tags: []
title: 'Eino: AgenticChatTemplate Guide [Beta]'
weight: 11
---

## Introduction

The Prompt component is used for processing and formatting prompt templates. AgenticChatTemplate is a component abstraction specifically designed for AgenticMessage, with definitions and usage essentially the same as the existing ChatTemplate abstraction. Its main purpose is to fill user-provided variable values into predefined message templates, generating standardized message formats for interacting with language models. This component can be used in the following scenarios:

- Building structured system prompts
- Processing multi-turn dialogue templates (including history)
- Implementing reusable prompt patterns

## Component Definition

### Interface

> Code: [https://github.com/cloudwego/eino/tree/main/components/prompt/interface.go](https://github.com/cloudwego/eino/tree/main/components/prompt/interface.go)

```go
type AgenticChatTemplate interface {
    Format(ctx context.Context, vs map[string]any, opts ...Option) ([]*schema.AgenticMessage, error)
}
```

#### Format Method

- Purpose: Fill variable values into the message template
- Params:
  - ctx: Context object for passing request-level information, also used to pass the Callback Manager
  - vs: Variable value mapping used to fill placeholders in the template
  - opts: Optional parameters for configuring formatting behavior
- Returns:
  - `[]*schema.AgenticMessage`: Formatted message list
  - error: Error information during formatting

### Built-in Templating Methods

The Prompt component has built-in support for three templating methods:

1. FString Format (schema.FString)

   - Uses `{variable}` syntax for variable substitution
   - Simple and intuitive, suitable for basic text replacement scenarios
   - Example: `"You are a {role}, please help me {task}."`
2. GoTemplate Format (schema.GoTemplate)

   - Uses Go standard library's text/template syntax
   - Supports conditional statements, loops, and other complex logic
   - Example: `"{{if .expert}}As an expert{{end}} please {{.action}}"`
3. Jinja2 Format (schema.Jinja2)

   - Uses Jinja2 template syntax
   - Example: `"{% if level == 'expert' %}From an expert perspective{% endif %} analyze {{topic}}"`

### Common Options

AgenticChatTemplate shares a common set of Options with ChatTemplate.

## Usage

AgenticChatTemplate is typically used before AgenticModel to prepare context.

### Creation Methods

- `prompt.FromAgenticMessages()`
  - Used to combine multiple messages into an agentic chat template.
- `schema.AgenticMessage{}`
  - schema.AgenticMessage is a struct that implements the Format interface, so you can directly construct `schema.AgenticMessage{}` as a template
- `schema.DeveloperAgenticMessage()`
  - A shortcut method for building a message with role "developer"
- `schema.SystemAgenticMessage()`
  - A shortcut method for building a message with role "system"
- `schema.UserAgenticMessage()`
  - A shortcut method for building a message with role "user"
- `schema.FunctionToolResultAgenticMessage()`
  - A shortcut method for building a tool call message with role "user"
- `schema.AgenticMessagesPlaceholder()`
  - Can be used to insert a `[]*schema.AgenticMessage` into the message list, commonly used for inserting conversation history

### Standalone Usage

```go
import (
    "github.com/cloudwego/eino/components/prompt"
    "github.com/cloudwego/eino/schema"
)

// Create template
template := prompt.FromAgenticMessages(schema.FString,
    schema.SystemAgenticMessage("You are a {role}."),
    schema.AgenticMessagesPlaceholder("history_key", false),
    schema.UserAgenticMessage("Please help me {task}")
)

// Prepare variables
variables := map[string]any{
    "role": "professional assistant",
    "task": "write a poem",
    "history_key": []*schema.AgenticMessage{
       {
          Role: schema.AgenticRoleTypeUser,
          ContentBlocks: []*schema.ContentBlock{
             schema.NewContentBlock(&schema.UserInputText{Text: "Tell me what is oil painting?"}),
          },
       },
       {
          Role: schema.AgenticRoleTypeAssistant,
          ContentBlocks: []*schema.ContentBlock{
             schema.NewContentBlock(&schema.AssistantGenText{Text: "Oil painting is xxx"}),
          },
       },
    },
}

// Format template
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
chain := compose.NewChain[map[string]any, []*schema.AgenticMessage]()
chain.AppendAgenticChatTemplate(template)

// Compile and run
runnable, err := chain.Compile()
if err != nil {
    return err
}
result, err := runnable.Invoke(ctx, variables)

// Use in Graph
graph := compose.NewGraph[map[string]any, []*schema.AgenticMessage]()
graph.AddAgenticChatTemplateNode("template_node", template)
```

### Pull Data from Predecessor Node Output

When using AddNode, you can add the WithOutputKey Option to convert the node's output to a Map:

```go
// This node's output will change from string to map[string]any,
// and the map will have only one element with key "your_output_key" and value being the actual string output from the node
graph.AddLambdaNode("your_node_key", compose.InvokableLambda(func(ctx context.Context, input []*schema.AgenticMessage) (str string, err error) {
    // your logic
    return
}), compose.WithOutputKey("your_output_key"))
```

After converting the predecessor node's output to map[string]any and setting the key, use the value corresponding to that key in the downstream AgenticChatTemplate node.

## Options and Callback Usage

### Callback Usage Example

```go
import (
    "context"

    callbackHelper "github.com/cloudwego/eino/utils/callbacks"
    "github.com/cloudwego/eino/callbacks"
    "github.com/cloudwego/eino/compose"
    "github.com/cloudwego/eino/components/prompt"
)

// Create callback handler
handler := &callbackHelper.AgenticPromptCallbackHandler{
    OnStart: func(ctx context.Context, info *callbacks.RunInfo, input *prompt.AgenticCallbackInput) context.Context {
        fmt.Printf("Starting template formatting, variables: %v\n", input.Variables)
        return ctx
    },
    OnEnd: func(ctx context.Context, info *callbacks.RunInfo, output *prompt.AgenticCallbackOutput) context.Context {
        fmt.Printf("Template formatting complete, number of messages generated: %d\n", len(output.Result))
        return ctx
    },
}

// Use callback handler
helper := callbackHelper.NewHandlerHelper().
    AgenticPrompt(handler).
    Handler()

// Use at runtime
runnable, err := chain.Compile()
if err != nil {
    return err
}
result, err := runnable.Invoke(ctx, variables, compose.WithCallbacks(helper))
```

## Implementation Reference

### Option Mechanism

If needed, component implementers can implement custom prompt options:

```go
import (
    "github.com/cloudwego/eino/components/prompt"
)

// Define Option struct
type MyPromptOptions struct {
    StrictMode bool
    DefaultValues map[string]string
}

// Define Option functions
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

### Callback Handling

Prompt implementations need to trigger callbacks at appropriate times. The following structures are defined by the component:

> Code: [github.com/cloudwego/eino/tree/main/components/prompt/agentic_callback_extra.go](http://github.com/cloudwego/eino/tree/main/components/prompt/agentic_callback_extra.go)

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

### Complete Implementation Example

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
    // 1. Handle Options
    options := &MyPromptOptions{
        StrictMode: p.strictMode,
        DefaultValues: p.defaultValues,
    }
    options = prompt.GetImplSpecificOptions(options, opts...)
    
    // 2. Get callback manager
    cm := callbacks.ManagerFromContext(ctx)
    
    // 3. Callback before starting formatting
    ctx = cm.OnStart(ctx, info, &prompt.AgenticCallbackInput{
        Variables: vs,
        Templates: p.templates,
    })
    
    // 4. Execute formatting logic
    messages, err := p.doFormat(ctx, vs, options)
    
    // 5. Handle error and completion callbacks
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
    // Implement your custom logic
    return messages, nil
}
```
