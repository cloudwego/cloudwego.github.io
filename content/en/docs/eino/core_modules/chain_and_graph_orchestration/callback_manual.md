---
Description: ""
date: "2025-03-12"
lastmod: ""
tags: []
title: 'Eino: Callback Manual'
weight: 0
---

## **Problem Solved**

Components (including Lambda) and Graph orchestration together solve the problem of "defining business logic." However, cross-cutting features such as logging, tracing, metrics, and on-screen display need mechanisms to inject functionality into Components (including Lambda) and Graphs.

On the other hand, users might want to obtain intermediate information during the execution process of a specific Component implementation. For instance, VikingDBRetriever might provide additional query DB Names, and ArkChatModel might provide additional parameters like the requested temperature. There needs to be a mechanism to expose intermediate states.

Callbacks support both "**cross-cutting feature injection**" and "**intermediate state exposure**". Specifically, users provide and register "functions" (Callback Handlers). Components and Graphs call back these functions at designated "times" (or cut points, locations) and provide the corresponding information.

## **Core Concepts**

The core concepts interconnected within Eino include entities such as Components and Graphs, which at specific **timings** (Callback Timing), callback user-provided **functions** (Callback Handlers), conveying **what they are** (RunInfo), and **what happened** at that moment (Callback Input & Output).

### **Trigger Entities**

Component (including types defined officially and Lambda), Graph Node (as well as Chain Node), and the Graph itself (including Chain). These three types of entities require cross-cutting functionality injection and intermediate state exposure, thus they all trigger callbacks. See the section on “[Trigger Methods](/en/docs/eino/core_modules/chain_and_graph_orchestration/callback_manual)” below for details.

### **Trigger Timings**

```go
// CallbackTiming enumerates all the timing of callback aspects.
type CallbackTiming = callbacks.CallbackTiming

const (
    TimingOnStart CallbackTiming = iota // Enter and begin execution
    TimingOnEnd // Successfully complete and about to return
    TimingOnError // Fail and about to return an error
    TimingOnStartWithStreamInput // OnStart, but the input is StreamReader
    TimingOnEndWithStreamOutput // OnEnd, but the output is StreamReader
)
```

Different trigger entities, in various scenarios, determine whether to trigger OnStart or OnStartWithStreamInput (similarly, OnEnd/OnEndWithStreamOutput). Specific rules are detailed in the section on “[Trigger Methods](/en/docs/eino/core_modules/chain_and_graph_orchestration/callback_manual)” below.

### **Callback Handler**

```go
type Handler interface {
    OnStart(ctx context.Context, info *RunInfo, input CallbackInput) context.Context
    OnEnd(ctx context.Context, info *RunInfo, output CallbackOutput) context.Context
    OnError(ctx context.Context, info *RunInfo, err error) context.Context
    OnStartWithStreamInput(ctx context.Context, info *RunInfo,
       input *schema.StreamReader[CallbackInput]) context.Context
    OnEndWithStreamOutput(ctx context.Context, info *RunInfo,
       output *schema.StreamReader[CallbackOutput]) context.Context
}
```

A Handler is a struct that implements the 5 methods above (corresponding to the 5 trigger timings). Each method receives three pieces of information:

- Context: Used for **receiving custom information** that might be set by previous trigger timings of the same Handler.
- RunInfo: Metadata of the entity triggering the callback.
- Input/Output/InputStream/OutputStream: Business information at the time of triggering the callback.

Each method also returns a new context: used for **passing information between different trigger timings** of the same Handler.

If a Handler does not want to focus on all 5 trigger timings but only a subset, for example, just OnStart, it is recommended to use `NewHandlerBuilder().OnStartFn(...).Build()`. If it only wants to focus on specific components, such as ChatModel, it is recommended to use `NewHandlerHelper().ChatModel(...).Handler()`, which receives callbacks from only ChatModel and obtains a specific type of CallbackInput/CallbackOutput. See the section on “[Handler Implementation Methods](/en/docs/eino/core_modules/chain_and_graph_orchestration/callback_manual)” for details.

The order of triggering between different Handlers is **not** guaranteed.

### **RunInfo**

Describes the metadata of the entity that triggers the Callback.

```go
// RunInfo contains information about the running component that triggers callbacks.
type RunInfo struct {
    Name      string               // the 'Name' with semantic meaning for the running component, specified by end-user
    Type      string               // the specific implementation 'Type' of the component, e.g. 'OpenAI'
    Component components.Component // the component abstract type, e.g. 'ChatModel'
}
```

- Name: Meaningful business name, to be specified by the user; if not specified, it defaults to an empty string. For different triggering entities:
  - Component: When in Graph, use Node Name. When used standalone outside Graph, user sets it manually. See "Injecting RunInfo" and "Using Component Standalone" for details.
  - Graph Node: Use Node Name `func WithNodeName(n string) GraphAddNodeOpt`
  - Graph itself:
    - For the top-level graph, use Graph Name `func WithGraphName(graphName string) GraphCompileOption`
    - For nested graphs, use the Node Name added when joining the upper-level graph.
- Type: Specified by the component's specific implementation:
  - Component with interface: If it implements Typer interface, use the result of the GetType() method. Otherwise, use reflection to get the Struct/Func name.
  - Lambda: If Type is specified using `func WithLambdaType(t string) LambdaOpt`, use it, otherwise it defaults to an empty string.
  - Graph Node: Use the value of the internal Component/Lambda/Graph.
  - Graph itself: Defaults to an empty string.
- Component:
  - Component with interface: Corresponds to its interface.
  - Lambda: Fixed value Lambda.
  - Graph Node: Use the value of the internal Component/Lambda/Graph.
  - Graph itself: Fixed values Graph / Chain. (Previously had StateGraph / StateChain, now consolidated into Graph / Chain.)

### **Callback Input & Output**

Essentially of any type, as the input, output, and internal state of different Components can vary greatly.

```go
type CallbackInput any
type CallbackOutput any
```

For a specific component, there are more specific types, such as Chat Model.

```go
// CallbackInput is the input for the model callback.
type CallbackInput struct {
    // Messages is the messages to be sent to the model.
    Messages []*schema.Message
    // Tools is the tools to be used in the model.
    Tools []*schema.ToolInfo
    // Config is the config for the model.
    Config *Config
    // Extra is the extra information for the callback.
    Extra map[string]any
}

// CallbackOutput is the output for the model callback.
type CallbackOutput struct {
    // Message is the message generated by the model.
    Message *schema.Message
    // Config is the config for the model.
    Config *Config
    // TokenUsage is the token usage of this request.
    TokenUsage *TokenUsage
    // Extra is the extra information for the callback.
    Extra map[string]any
}
```

In the specific implementation of Chat Model, such as OpenAI Chat Model, it is recommended that component authors pass specific Input/Output types to the Callback Handler instead of Any. This allows for more specific, customized intermediate state information to be exposed.

If a Graph Node triggers the Callback, since the Node cannot obtain the internal intermediate state information of the component, it can only get the input and output specified by the component interface. For Chat Model, this would be []*schema.Message and *schema.Message.

When the Graph itself triggers the Callback, the input and output are the overall input and output of the Graph.

## Injecting Handlers

Handlers need to be injected into the Context to be triggered.

### **Globally Injecting Handlers**

Use `callbacks.InitCallbackHandlers` to inject global Handlers. Once injected, all triggered callback actions will automatically trigger these global Handlers. Typical scenarios include tracing, logging, and other globally consistent, business-agnostic functions.

It is not thread-safe. It is recommended to inject it once during service initialization.

### **Injecting Handlers into the Graph**

Use `compose.WithCallbacks` to inject Handlers at runtime within the graph. These Handlers will be effective throughout the current execution of the graph, including each Node within the Graph and the Graph itself (as well as any nested graphs).

Use `compose.WithCallbacks(...).DesignateNode(...)` to inject a Handler into a specific Node of the top-level Graph. If this Node itself is a nested Graph, it will be injected into the nested Graph itself and each Node within it.

Use `compose.WithCallbacks(...).DesignateNodeForPath(...)` to inject a Handler into a specific Node of a nested Graph.

### **Injecting Handlers Outside the Graph**

If you do not want to use the Graph but still want to use Callbacks:

Use `InitCallbacks(ctx context.Context, info *RunInfo, handlers ...Handler)` to get a new Context and inject Handlers and RunInfo.

### **Handler Inheritance**

Similar to how a child Context inherits all Values from its parent Context, a child Context will also inherit all Handlers from its parent Context. For example, if Handlers are already present in the Context passed into the Graph at runtime, these Handlers will be inherited and effective throughout the entire execution of the Graph.

## **Injecting RunInfo**

RunInfo also needs to be injected into the Context to be available to Handlers when callbacks are triggered.

### **RunInfo Managed by the Graph**

The Graph will automatically inject RunInfo for all internal Nodes. The mechanism is that each Node's execution is a new child Context, and the Graph injects the corresponding Node's RunInfo into this new Context.

### **Injecting RunInfo Outside the Graph**

If you do not want to use the Graph but still want to use Callbacks:

Use `InitCallbacks(ctx context.Context, info *RunInfo, handlers ...Handler)` to get a new Context and inject Handlers and RunInfo.

Use `ReuseHandlers(ctx context.Context, info *RunInfo)` to get a new Context, reuse the Handlers from the previous Context, and set the new RunInfo.

## **Trigger Methods**

<a href="/img/eino/graph_node_callback_run_place.png" target="_blank"><img src="/img/eino/graph_node_callback_run_place.png" width="100%" /></a>

### **Component Callback**

In the implementation code of the component, call `OnStart(), OnEnd(), OnError(), OnStartWithStreamInput(), OnEndWithStreamOutput()`  from the callbacks package. Taking Ark's ChatModel implementation as an example, in the Generate method:

```go
func (cm *ChatModel) Generate(ctx context.Context, in []*schema.Message, opts ...fmodel.Option) (
    outMsg *schema.Message, err error) {

    defer func() {
       if err != nil {
          _ = callbacks.OnError(ctx, err)
       }
    }()

    // omit multiple lines... instantiate req conf
        
    ctx = callbacks.OnStart(ctx, &fmodel.CallbackInput{
       Messages:   in,
       Tools:      append(cm.rawTools), // join tool info from call options
       ToolChoice: nil,                 // not support in api
       Config:     reqConf,
    })

    // omit multiple lines... invoke Ark chat API and get the response
    
    _ = callbacks.OnEnd(ctx, &fmodel.CallbackOutput{
       Message:    outMsg,
       Config:     reqConf,
       TokenUsage: toModelCallbackUsage(outMsg.ResponseMeta),
    })

    return outMsg, nil
}
```

In the Stream method:

```go
func (cm *ChatModel) Stream(ctx context.Context, in []*schema.Message, opts ...fmodel.Option) (
    outStream *schema.StreamReader[*schema.Message], err error) {

    defer func() {
       if err != nil {
          _ = callbacks.OnError(ctx, err)
       }
    }()
    
    // omit multiple lines... instantiate req conf

    ctx = callbacks.OnStart(ctx, &fmodel.CallbackInput{
       Messages:   in,
       Tools:      append(cm.rawTools), // join tool info from call options
       ToolChoice: nil,                 // not support in api
       Config:     reqConf,
    })
    
    // omit multiple lines... make request to Ark API and convert response stream to StreamReader[model.*CallbackOutput]

    _, sr = callbacks.OnEndWithStreamOutput(ctx, sr)

    return schema.StreamReaderWithConvert(sr,
       func(src *fmodel.CallbackOutput) (*schema.Message, error) {
          if src.Message == nil {
             return nil, schema.ErrNoValue
          }

          return src.Message, nil
       },
    ), nil
}
```

As can be seen, when the Generate method is called, OnEnd is triggered, whereas in the Stream method, OnEndWithStreamOutput is triggered:

When triggering Callbacks within the component implementation:

- **When the component input is StreamReader, trigger OnStartWithStreamInput, otherwise trigger OnStart**
- **When the component output is StreamReader, trigger OnEndWithStreamOutput, otherwise trigger OnEnd**

Components that internally implement callback triggers should implement the Checker interface, returning true from IsCallbacksEnabled, to convey to the outside that "I have internally implemented callback triggers":

```go
// Checker tells the callback aspect status of the component’s implementation.
// When the Checker interface is implemented and returns true, the framework will not start the default aspect.
// Instead, the component will decide the callback execution location and the information to be injected.
type Checker interface {
    IsCallbacksEnabled() bool
}
```

If a component implementation does not implement the Checker interface, or IsCallbacksEnabled returns false, it can be assumed that the component does not trigger callbacks internally, and Graph Node is needed to handle the injection and triggering (when used within the Graph).

### Graph Node Trigger (Node Callback)

When a Component is organized into a Graph, it becomes a Node. At this time, if the Component itself triggers a callback, the Node will reuse the Component's callback handling. Otherwise, the Node will place a callback handler at the points outside the Component. These points correspond to the streaming paradigm of the Component itself. For example, a ChatModelNode will have OnStart/OnEnd/OnError outside the Generate method, and OnStart/OnEndWithStreamOutput/OnError outside the Stream method.

When the Graph is running, each component will operate in either Invoke or Transform paradigm, and will call the corresponding component methods based on the specific implementation of the component's business streaming paradigm. For example, if the Graph runs in Invoke, the Chat Model Node will run in Invoke, calling the Generate method. However, if the Graph runs in Stream, the Chat Model Node will run in Transform, but since the Chat Model's business streaming paradigm does not include Transform, it will automatically downgrade to calling the Stream method. Therefore:

**Which specific trigger points a Graph Node executes (OnStart or OnStartWithStreamInput) depends on the component's business streaming paradigm and the Graph running mode.**

For a detailed introduction to Eino's streaming programming, refer to [Eino Points of Streaming Orchestration](/en/docs/eino/core_modules/chain_and_graph_orchestration/stream_programming_essentials).

### **Graph Self Trigger (Graph Callback)**

The Graph triggers the Callback Handler at its own start, end, and error moments. If the Graph is called in Invoke form, it triggers OnStart/OnEnd/OnError. If called in Stream/Collect/Transform form, it triggers OnStartWithStreamInput/OnEndWithStreamOutput/OnError. This is because **the Graph will always execute internally in Invoke or Transform**. See [Eino Points of Streaming Orchestration](/en/docs/eino/core_modules/chain_and_graph_orchestration/stream_programming_essentials)

It is worth noting that a graph is also a kind of component, so a graph callback is also a special form of component callback. According to the definition of Node Callback, when the component inside the Node implements the perception and processing of the trigger moments, the Node will directly reuse the Component's implementation and will not implement the Node Callback again. This means when a graph is added to another Graph as a Node through the AddGraphNode method, this Node will reuse the internal graph's graph callback.

## **Parsing Callback Input & Output**

As mentioned earlier, the underlying type of Callback Input & Output is Any, and different component types might pass in their specific types when triggering callbacks. Also, in the interface definition of the Callback Handler, the input parameters of various methods are also Callback Input & Output of type Any.

Therefore, in the specific Handler implementation, two things need to be done:

1. Determine which component type triggered the callback using RunInfo. For example, RunInfo.Component == "ChatModel" or RunInfo.Type == "xxx Chat Model".
2. Convert the Callback Input & Output of type any to the corresponding specific type. For instance, if RunInfo.Component == "ChatModel":

```go
// ConvCallbackInput converts the callback input to the model callback input.
func ConvCallbackInput(src callbacks.CallbackInput) *CallbackInput {
    switch t := src.(type) {
    case *CallbackInput: // when callback is triggered within component implementation, the input is usually already a typed *model.CallbackInput
       return t
    case []*schema.Message: // when callback is injected by graph node, not the component implementation itself, the input is the input of Chat Model interface, which is []*schema.Message
       return &CallbackInput{
          Messages: t,
       }
    default:
       return nil
    }
}

// ConvCallbackOutput converts the callback output to the model callback output.
func ConvCallbackOutput(src callbacks.CallbackOutput) *CallbackOutput {
    switch t := src.(type) {
    case *CallbackOutput: // when callback is triggered within component implementation, the output is usually already a typed *model.CallbackOutput
       return t
    case *schema.Message: // when callback is injected by graph node, not the component implementation itself, the output is the output of Chat Model interface, which is *schema.Message
       return &CallbackOutput{
          Message: t,
       }
    default:
       return nil
    }
}
```

If the Handler needs to add switch cases to determine RunInfo.Component and, for each case, call the corresponding conversion function to convert Any to the specific type, it does get somewhat complex. To reduce the repetitive labor of writing glue code, we provide two convenient utility functions for implementing Handlers.

## Handler Implementation

In addition to implementing the Handler interface directly, Eino provides two convenient tools for implementing Handlers.

### **HandlerHelper**

If the user's Handler only focuses on specific types of components, such as in the scenario of ReactAgent, which only focuses on ChatModel and Tool, it is recommended to use HandlerHelper to quickly create a Callback Handler for a specific type:

```go
handler := NewHandlerHelper().ChatModel(modelHandler).Tool(toolHandler).Handler()
```

Where modelHandler is a further encapsulation of the callback handler for the Chat Model component:

```go
// ModelCallbackHandler is the handler for the model callback.
type ModelCallbackHandler struct {
    OnStart               func(ctx context.Context, runInfo *callbacks.RunInfo, input *model.CallbackInput) context.Context
    OnEnd                 func(ctx context.Context, runInfo *callbacks.RunInfo, output *model.CallbackOutput) context.Context
    OnEndWithStreamOutput func(ctx context.Context, runInfo *callbacks.RunInfo, output *schema.StreamReader[*model.CallbackOutput]) context.Context
    OnError               func(ctx context.Context, runInfo *callbacks.RunInfo, err error) context.Context
}
```

The above ModelCallbackHandler encapsulates three operations:

1. No longer needing to determine RunInfo.Component to select the callback triggered by ChatModel, as the filtering is already done automatically.
2. Only requiring the implementation of the trigger timings supported by the Chat Model component, here removing unsupported OnStartWithStreamInput. Additionally, if the user only focuses on specific trigger timings supported by the Chat Model, such as only OnStart, they can only implement OnStart.
3. Input/Output is no longer of any type but has been converted to model.CallbackInput, model.CallbackOutput.

HandlerHelper supports all official components. The current list includes: ChatModel, ChatTemplate, Retriever, Indexer, Embedding, Document.Loader, Document.Transformer, Tool, ToolsNode.

For components like Lambda, Graph, Chain, which have indeterminate input and output types, you can also use HandlerHelper, but it can only achieve the first point mentioned above, i.e., automatic filtering by component type. Points 2 and 3 still need to be implemented by the user themselves:

```go
handler := NewHandlerHelper().Lambda(callbacks.Handler).Graph(callbacks.Handler)...Handler()
```

At this time, NewHandlerHelper().Lambda() needs to pass in callbacks.Handler, which can be achieved using the HandlerBuilder below.

### **HandlerBuilder**

If the user's Handler needs to focus on multiple component types but only on specific trigger timings, HandlerBuilder can be used:

```go
handler := NewHandlerBuilder().OnStartFn(fn)...Build()
```

## **Best Practices**

### **Usage in Graph**

- Actively use Global Handlers, registering handlers that are always in effect.
- Inject Handlers at runtime using the `WithHandlers` option, and designate the Node, nested internal Graph, or internal Graph's Node where they apply using `DesignateNode` or `DesignateNodeByPath`.

### **Usage Outside of Graph**

Use `InitCallbacks` to inject `RunInfo` and `Handlers`. You need to set the fields of `RunInfo` yourself。Global Handlers will be automatically injected。

```
ctx = callbacks.InitCallbacks(ctx, runInfo, handlers...)
componentA.Invoke(ctx, input)
```

If componentA invokes componentB internally(e.g. ToolsNode invokes Tool), you need to replace `RunInfo` before invoking componentB:

```
func ComponentARun(ctx, inputA) {
    // reuse handlers exist in ctx(including Global Handlers), only replace RunInfo
    ctx = callbacks.ReuseHandlers(ctx, newRunInfo)
    componentB.Invoke(ctx, inputB)
    
    // replace both RunInfo and Handlers
    ctx = callbacks.InitCallbacks(ctx, newRunInfo, newHandlers...)
    componentB.Invoke(ctx, inputB)
}
```

### **Handler Reading/Writing of Input & Output**

When Input & Output flow through a graph, it is a direct variable assignment. As shown in the figure below, NodeA.Output, NodeB.Input, NodeC.Input, as well as the input & output obtained in each Handler, if they are reference types such as structure pointers or Maps, are all the same piece of data. Therefore, whether inside a Node or a Handler, modifying Input & Output is not recommended, as it can lead to concurrency issues. Even in a synchronous situation, Node B and Node C may have concurrency, resulting in concurrency between handler1 and handler2 inside them. When there are asynchronous processing logics, there are even more possible concurrent scenarios.

<a href="/img/eino/eino_callback_start_end_place.png" target="_blank"><img src="/img/eino/eino_callback_start_end_place.png" width="100%" /></a>

In the scenario of stream transmission, the input streams in all successor nodes and their handlers are streams obtained by StreamReader.Copy(n) and can be read independently of each other. However, for each chunk in the stream, it is a direct variable assignment. If the chunk is a reference type such as a struct pointer or a map, the streams after each copy will read the same data. Therefore, within Node and Handler, it is also not recommended to modify the chunk of the stream, as there are concurrency issues.

<a href="/img/eino/eino_callback_stream_place.png" target="_blank"><img src="/img/eino/eino_callback_stream_place.png" width="100%" /></a>

### **Information Transfer Between Handlers**

You can transfer information between different time points of the same Handler through `ctx`. For example, in `OnStart`, use `context.WithValue` to return a new context, and retrieve this value from the context in `OnEnd`.

There's no guaranteed execution order between different Handlers, so it's not advised to transfer information between Handlers via this mechanism. Essentially, you cannot ensure that the context returned by one Handler will definitely be used in the execution function of the next Handler.

Should you need to transfer information between Handlers, it’s recommended to set a global, request-scoped variable in the outermost context (like the context passed during graph execution) as a public information storage space. You can read and update this public variable as needed in each Handler. For streams, extra attention is needed to ensure the thread safety of this public variable.

### **Always Close Streams**

Take a node like `ChatModel`, which has true stream output, for example. When there is a Callback aspect, the output stream from `ChatModel`:

- Must be consumed as input by downstream nodes and also be consumed by the Callback aspect.
- A single frame (Chunk) in a stream can only be consumed by one consumer, meaning the stream is not broadcast.

Thus, the stream needs to be duplicated, with the duplication relationship as follows:

<a href="/img/eino/en_eino_stream_copy_for_callback.png" target="_blank"><img src="/img/eino/en_eino_stream_copy_for_callback.png" width="100%" /></a>

- If one of the Callbacks does not close the corresponding stream, it may result in the original Stream being unable to close and release resources.
