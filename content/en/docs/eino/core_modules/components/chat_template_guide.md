---
Description: ""
date: "2025-11-20"
lastmod: ""
tags: []
title: 'Eino: ChatTemplate User Guide'
weight: 7
---

## **Introduction**

The Prompt component is a component for processing and formatting prompt templates. Its main purpose is to fill user-provided variable values into predefined message templates to generate standard message formats for interacting with language models. This component can be used in the following scenarios:

- Building structured system prompts
- Handling multi-turn dialogue templates (including history)
- Implementing reusable prompt patterns

## **Component Definition**

### **Interface Definition**

> Code location: eino/components/prompt/interface.go

```go
type ChatTemplate interface {
    Format(ctx context.Context, vs map[string]any, opts ...Option) ([]*schema.Message, error)
}
```

#### **Format Method**

- Function: Fill variable values into message templates
- Parameters:
  - ctx: Context object for passing request-level information and Callback Manager
  - vs: Variable value mapping for filling template placeholders
  - opts: Optional parameters for configuring formatting behavior
- Return values:
  - `[]*schema.Message`: Formatted message list
  - error: Error information during formatting

### **Built-in Templating Methods**

The Prompt component has built-in support for three templating methods:

1. FString format (schema.FString)

   - Uses `{variable}` syntax for variable substitution
   - Simple and intuitive, suitable for basic text replacement scenarios
   - Example: `"You are a {role}, please help me {task}."`
2. GoTemplate format (schema.GoTemplate)

   - Uses Go standard library text/template syntax
   - Supports conditional logic, loops, and other complex logic
   - Example: `"{{if .expert}}As an expert{{end}} please {{.action}}"`
3. Jinja2 format (schema.Jinja2)

   - Uses Jinja2 template syntax
   - Example: `"{% if level == 'expert' %}From an expert perspective{% endif %} analyze {{topic}}"`

### **Common Options**

The Prompt component uses Option to define optional parameters. ChatTemplate has no common option abstraction. Each specific implementation can define its own specific Options, wrapped into a unified Option type through the WrapImplSpecificOptFn function.

## **Usage**

ChatTemplate is generally used before ChatModel for context preparation.

### Creation Methods

- `prompt.FromMessages()`
  - Used to turn multiple messages into a chat template.
- `schema.Message{}`
  - schema.Message is a struct that implements the Format interface, so you can directly construct `schema.Message{}` as a template
- `schema.SystemMessage()`
  - This method is a shortcut for constructing a message with role "system"
- `schema.AssistantMessage()`
  - This method is a shortcut for constructing a message with role "assistant"
- `schema.UserMessage()`
  - This method is a shortcut for constructing a message with role "user"
- `schema.ToolMessage()`
  - This method is a shortcut for constructing a message with role "tool"
- `schema.MessagesPlaceholder()`
  - Can be used to insert a `[]*schema.Message` into the message list, commonly used for inserting conversation history

### **Standalone Usage**

```go
import (
    "github.com/cloudwego/eino/components/prompt"
    "github.com/cloudwego/eino/schema"
)

// Create template
template := prompt.FromMessages(schema.FString,
    schema.SystemMessage("You are a {role}."),
    schema.MessagesPlaceholder("history_key", false),
    &schema.Message{
        Role:    schema.User,
        Content: "Please help me {task}.",
    },
)

// Prepare variables
variables := map[string]any{
    "role": "professional assistant",
    "task": "write a poem",
    "history_key": []*schema.Message{{Role: schema.User, Content: "Tell me what is oil painting?"}, {Role: schema.Assistant, Content: "Oil painting is xxx"}},
}

// Format template
messages, err := template.Format(context.Background(), variables)
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

### Getting Data from Predecessor Node Output

When using AddNode, you can add the WithOutputKey Option to convert the node's output to a Map:

```go
// This node's output will be changed from string to map[string]any,
// and the map will have only one element with key "your_output_key" and value being the actual string output from the node
graph.AddLambdaNode("your_node_key", compose.InvokableLambda(func(ctx context.Context, input []*schema.Message) (str string, err error) {
    // your logic
    return
}), compose.WithOutputKey("your_output_key"))
```

After converting the predecessor node's output to map[string]any and setting the key, use the value corresponding to that key in the subsequent ChatTemplate node.

## **Option and Callback Usage**

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
        fmt.Printf("Template formatting complete, generated message count: %d\n", len(output.Result))
        return ctx
    },
}

// Use callback handler
helper := callbackHelper.NewHandlerHelper().
    Prompt(handler).
    Handler()

// Use at runtime
runnable, err := chain.Compile()
if err != nil {
    return err
}
result, err := runnable.Invoke(ctx, variables, compose.WithCallbacks(helper))
```

## **Implementation Reference**

### Option **Mechanism**

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

### **Callback Handling**

Prompt implementations need to trigger callbacks at appropriate times. The following structures are defined by the component:

> Code location: eino/components/prompt/callback_extra.go

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
    // 1. Handle Options
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
    // Implement your own defined logic
    return messages, nil
}
```
