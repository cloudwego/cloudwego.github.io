---
Description: ""
date: "2025-03-12"
lastmod: ""
tags: []
title: 'Eino: ChatTemplate guide'
weight: 0
---

## **Basic Introduction**

The Prompt component is a tool for processing and formatting prompt templates. Its primary function is to fill user-provided variable values into predefined message templates, generating standard message formats for interacting with language models. This component can be used in the following scenarios:

- Constructing structured system prompts
- Handling templates for multi-turn conversations (including history)
- Implementing reusable prompt patterns

## **Component Definition**

### **Interface Definition**

> Code Location：eino/components/prompt/interface.go

```go
type ChatTemplate interface {
    Format(ctx context.Context, vs map[string]any, opts ...Option) ([]*schema.Message, error)
}
```

#### **Format Method**

- Function: Fills variable values into message templates.
- Parameters:
  - ctx: Context object used to pass request-level information as well as the Callback Manager
  - vs: Variable value map used to fill placeholders in the template
  - opts: Optional parameters to configure formatting behavior
- Return Values:
  - `[]*schema.Message`: Formatted message list
  - error: Error information during the formatting process

### **Built-in Template Formats**

The Prompt component supports three built-in template formats:

1. FString Format (schema.FString)
   - Uses `{variable}` syntax for variable replacement
   - Simple and intuitive, suitable for basic text replacement scenarios
   - Example: `"You are a {role}, please help me {task}."`
2. GoTemplate Format (schema.GoTemplate)
   - Uses Go standard library's text/template syntax
   - Supports conditional judgments, loops, and other complex logic
   - Example: `"{{if .expert}}As an expert{{end}}, please {{.action}}"`
3. Jinja2 Format (schema.Jinja2)
   - Uses Jinja2 template syntax
   - Example: `"{% if level == 'expert' %}From an expert's perspective{% endif %} analyze {{topic}}"`

### **Common Options**

The Prompt component uses Options to define optional parameters. ChatTemplate does not have a common option abstraction. Each specific implementation can define its own specific Options, which can be wrapped into a unified Option type via the WrapImplSpecificOptFn function.

## **Usage**

ChatTemplate is generally used for context preparation before ChatModel.

### **Standalone Usage**

```go
import (
    "github.com/cloudwego/eino/components/prompt"
    "github.com/cloudwego/eino/schema"
)

// Create template
template := prompt.FromMessages(schema.FString,
  &schema.Message{
    Role:    schema.System,
    Content: "You are a {role}.",
  },
  &schema.Message{
    Role:    schema.User,
    Content: "Please help me {task}.",
  },
)

// Prepare variables
variables := map[string]any{
  "role": "professional assistant",
  "task": "write a poem",
}

// Format template
messages, err := template.Format(ctx, variables)
if err != nil {
  return err
}
```

### **Usage in Orchestration**

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

## **Usage of Option and Callback**

### **Callback Usage Example**

```go
import (
    "context"

    callbackHelper "github.com/cloudwego/eino/utils/callbacks"
    "github.com/cloudwego/eino/callbacks"
    "github.com/cloudwego/eino/compose"
    "github.com/cloudwego/eino/components/prompt"
)

// Create callback handler
handler := &callbackHelper.PromptCallbackHandler{
    OnStart: func(ctx context.Context, info *callbacks.RunInfo, input *prompt.CallbackInput) context.Context {
        fmt.Printf("Starting template formatting, variables: %v\n", input.Variables)
        return ctx
    },
    OnEnd: func(ctx context.Context, info *callbacks.RunInfo, output *prompt.CallbackOutput) context.Context {
        fmt.Printf("Template formatting completed, number of generated messages: %d\n", len(output.Result))
        return ctx
    },
}

// Use callback handler
helper := template.NewHandlerHelper().
    Prompt(handler).
    Handler()

// Use at runtime
runnable, err := chain.Compile()
if err != nil {
    return err
}
result, err := runnable.Invoke(ctx, variables, compose.WithCallbacks(helper))
```

## **Reference for Custom Implementation**

### **Option Mechanism**

If necessary, component implementers can create custom prompt options:

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

### **Callback Handling**

Prompt implementation needs to trigger callbacks at the appropriate times. The following structure is predefined by the component:

> Code Location: eino/components/prompt/callback_extra.go

```go
// Define callback input and output
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

### **Complete Implementation Example**

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
    // 1. Handle Option
    options := &MyPromptOptions{
        StrictMode: p.strictMode,
        DefaultValues: p.defaultValues,
    }
    options = prompt.GetImplSpecificOptions(options, opts...)
    
    // 2. Get callback manager
    cm := callbacks.ManagerFromContext(ctx)
    
    // 3. Callback before formatting starts
    ctx = cm.OnStart(ctx, info, &prompt.CallbackInput{
        Variables: vs,
        Templates: p.templates,
    })
    
    // 4. Execute formatting logic
    messages, err := p.doFormat(ctx, vs, options)
    
    // 5. Handle errors and completion callback
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
    // Implement custom logic
    return messages, nil
}
```
