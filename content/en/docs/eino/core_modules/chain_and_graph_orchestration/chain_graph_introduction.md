---
Description: ""
date: "2025-03-28"
lastmod: ""
tags: []
title: 'Eino: Chain/Graph Orchestration Introduction'
weight: 0
---

> All code examples in this document can be found at: [https://github.com/cloudwego/eino-examples/tree/main/compose](https://github.com/cloudwego/eino-examples/tree/main/compose)

## Graph Orchestration

### Graph

```go
package main

import (
    "context"
    "fmt"
    "io"

    "github.com/cloudwego/eino/components/model"
    "github.com/cloudwego/eino/components/prompt"
    "github.com/cloudwego/eino/compose"
    "github.com/cloudwego/eino/schema"
)

const (
    nodeOfModel  = "model"
    nodeOfPrompt = "prompt"
)

func main() {
    ctx := context.Background()
    g := compose.NewGraph[map[string]any, *schema.Message]()

    pt := prompt.FromMessages(
       schema.FString,
       schema.UserMessage("what's the weather in {location}?"),
    )

    _ = g.AddChatTemplateNode(nodeOfPrompt, pt)
    _ = g.AddChatModelNode(nodeOfModel, &mockChatModel{}, compose.WithNodeName("ChatModel"))
    _ = g.AddEdge(compose.START, nodeOfPrompt)
    _ = g.AddEdge(nodeOfPrompt, nodeOfModel)
    _ = g.AddEdge(nodeOfModel, compose.END)

    r, err := g.Compile(ctx, compose.WithMaxRunSteps(10))
    if err != nil {
       panic(err)
    }

    in := map[string]any{"location": "beijing"}
    ret, err := r.Invoke(ctx, in)
    fmt.Println("invoke result: ", ret)

    // stream
    s, err := r.Stream(ctx, in)
    if err != nil {
       panic(err)
    }

    defer s.Close()
    for {
       chunk, err := s.Recv()
       if err != nil {
          if err == io.EOF {
             break
          }
          panic(err)
       }

       fmt.Println("stream chunk: ", chunk)
    }
}

type mockChatModel struct{}

func (m *mockChatModel) Generate(ctx context.Context, input []*schema.Message, opts ...model.Option) (*schema.Message, error) {
    return schema.AssistantMessage("the weather is good", nil), nil
}

func (m *mockChatModel) Stream(ctx context.Context, input []*schema.Message, opts ...model.Option) (*schema.StreamReader[*schema.Message], error) {
    sr, sw := schema.Pipe[*schema.Message](0)
    go func() {
       defer sw.Close()
       sw.Send(schema.AssistantMessage("the weather is", nil), nil)
       sw.Send(schema.AssistantMessage("good", nil), nil)
    }()
    return sr, nil
}

func (m *mockChatModel) BindTools(tools []*schema.ToolInfo) error {
    panic("implement me")
}
```

### ToolCallAgent

```bash
go get github.com/cloudwego/eino-ext/components/model/openai@latest
go get github.com/cloudwego/eino@latest
```

```go
package main

import (
    "context"
    "os"

    "github.com/cloudwego/eino-ext/components/model/openai"
    "github.com/cloudwego/eino/callbacks"
    "github.com/cloudwego/eino/components/prompt"
    "github.com/cloudwego/eino/components/tool"
    "github.com/cloudwego/eino/components/tool/utils"
    "github.com/cloudwego/eino/compose"
    "github.com/cloudwego/eino/schema"

    "github.com/cloudwego/eino-examples/internal/gptr"
    "github.com/cloudwego/eino-examples/internal/logs"
)

func main() {

    openAIBaseURL := os.Getenv("OPENAI_BASE_URL")
    openAIAPIKey := os.Getenv("OPENAI_API_KEY")
    modelName := os.Getenv("MODEL_NAME")

    ctx := context.Background()

    callbacks.AppendGlobalHandlers(&loggerCallbacks{})

    // 1. create an instance of ChatTemplate as 1st Graph Node
    systemTpl := `你是一名房产经纪人，结合用户的薪酬和工作，使用 user_info API，为其提供相关的房产信息。邮箱是必须的`
    chatTpl := prompt.FromMessages(schema.FString,
       schema.SystemMessage(systemTpl),
       schema.MessagesPlaceholder("message_histories", true),
       schema.UserMessage("{user_query}"),
    )

    modelConf := &openai.ChatModelConfig{
       BaseURL:     openAIBaseURL,
       APIKey:      openAIAPIKey,
       ByAzure:     true,
       Model:       modelName,
       Temperature: gptr.Of(float32(0.7)),
       APIVersion:  "2024-06-01",
    }

    // 2. create an instance of ChatModel as 2nd Graph Node
    chatModel, err := openai.NewChatModel(ctx, modelConf)
    if err != nil {
       logs.Errorf("NewChatModel failed, err=%v", err)
       return
    }

    // 3. create an instance of tool.InvokableTool for Intent recognition and execution
    userInfoTool := utils.NewTool(
       &schema.ToolInfo{
          Name: "user_info",
          Desc: "Query the user's company, position, and salary information based on the user's name and email. ",
          ParamsOneOf: schema.NewParamsOneOfByParams(map[string]*schema.ParameterInfo{
             "name": {
                Type: "string",
                Desc: "The user's name",
             },
             "email": {
                Type: "string",
                Desc: "User's mailbox",
             },
          }),
       },
       func(ctx context.Context, input *userInfoRequest) (output *userInfoResponse, err error) {
          return &userInfoResponse{
             Name:     input.Name,
             Email:    input.Email,
             Company:  "Bytedance",
             Position: "CEO",
             Salary:   "9999",
          }, nil
       })

    info, err := userInfoTool.Info(ctx)
    if err != nil {
       logs.Errorf("Get ToolInfo failed, err=%v", err)
       return
    }

    // 4. bind ToolInfo to ChatModel. ToolInfo will remain in effect until the next BindTools.
    err = chatModel.BindForcedTools([]*schema.ToolInfo{info})
    if err != nil {
       logs.Errorf("BindForcedTools failed, err=%v", err)
       return
    }

    // 5. create an instance of ToolsNode as 3rd Graph Node
    toolsNode, err := compose.NewToolNode(ctx, &compose.ToolsNodeConfig{
       Tools: []tool.BaseTool{userInfoTool},
    })
    if err != nil {
       logs.Errorf("NewToolNode failed, err=%v", err)
       return
    }

    const (
       nodeKeyOfTemplate  = "template"
       nodeKeyOfChatModel = "chat_model"
       nodeKeyOfTools     = "tools"
    )

    // 6. create an instance of Graph
    // input type is 1st Graph Node's input type, that is ChatTemplate's input type: map[string]any
    // output type is last Graph Node's output type, that is ToolsNode's output type: []*schema.Message
    g := compose.NewGraph[map[string]any, []*schema.Message]()

    // 7. add ChatTemplate into graph
    _ = g.AddChatTemplateNode(nodeKeyOfTemplate, chatTpl)

    // 8. add ChatModel into graph
    _ = g.AddChatModelNode(nodeKeyOfChatModel, chatModel)

    // 9. add ToolsNode into graph
    _ = g.AddToolsNode(nodeKeyOfTools, toolsNode)

    // 10. add connection between nodes
    _ = g.AddEdge(compose.START, nodeKeyOfTemplate)

    _ = g.AddEdge(nodeKeyOfTemplate, nodeKeyOfChatModel)

    _ = g.AddEdge(nodeKeyOfChatModel, nodeKeyOfTools)

    _ = g.AddEdge(nodeKeyOfTools, compose.END)

    // 9. compile Graph[I, O] to Runnable[I, O]
    r, err := g.Compile(ctx)
    if err != nil {
       logs.Errorf("Compile failed, err=%v", err)
       return
    }

    out, err := r.Invoke(ctx, map[string]any{
       "message_histories": []*schema.Message{},
       "user_query":        "My name is zhangsan, and my email is [zhangsan@bytedance.com](mailto:zhangsan@bytedance.com). Please recommend a property for me.",
    })
    if err != nil {
       logs.Errorf("Invoke failed, err=%v", err)
       return
    }
    logs.Infof("Generation: %v Messages", len(out))
    for _, msg := range out {
       logs.Infof("    %v", msg)
    }
}

type userInfoRequest struct {
    Name  string `json:"name"`
    Email string `json:"email"`
}

type userInfoResponse struct {
    Name     string `json:"name"`
    Email    string `json:"email"`
    Company  string `json:"company"`
    Position string `json:"position"`
    Salary   string `json:"salary"`
}

type loggerCallbacks struct{}

func (l *loggerCallbacks) OnStart(ctx context.Context, info *callbacks.RunInfo, input callbacks.CallbackInput) context.Context {
    logs.Infof("name: %v, type: %v, component: %v, input: %v", info.Name, info.Type, info.Component, input)
    return ctx
}

func (l *loggerCallbacks) OnEnd(ctx context.Context, info *callbacks.RunInfo, output callbacks.CallbackOutput) context.Context {
    logs.Infof("name: %v, type: %v, component: %v, output: %v", info.Name, info.Type, info.Component, output)
    return ctx
}

func (l *loggerCallbacks) OnError(ctx context.Context, info *callbacks.RunInfo, err error) context.Context {
    logs.Infof("name: %v, type: %v, component: %v, error: %v", info.Name, info.Type, info.Component, err)
    return ctx
}

func (l *loggerCallbacks) OnStartWithStreamInput(ctx context.Context, info *callbacks.RunInfo, input *schema.StreamReader[callbacks.CallbackInput]) context.Context {
    return ctx
}

func (l *loggerCallbacks) OnEndWithStreamOutput(ctx context.Context, info *callbacks.RunInfo, output *schema.StreamReader[callbacks.CallbackOutput]) context.Context {
    return ctx
}
```

### Graph with state

Graph can own a 'global' state, created by using the WithGenLocalState Option during NewGraph:

```go
// compose/generic_graph.go

// type GenLocalState[S any] func(ctx context.Context) (state S)

func WithGenLocalState[S any](gls GenLocalState[S]) NewGraphOption {
    // --snip--
}
```

When adding nodes, add Pre/Post Handlers to process this State：

```go
// compose/graph_add_node_options.go

// type StatePreHandler[I, S any] func(ctx context.Context, in I, state S) (I, error)
// type StatePostHandler[O, S any] func(ctx context.Context, out O, state S) (O, error)

func WithStatePreHandler[I, S any](pre StatePreHandler[I, S]) GraphAddNodeOpt {
    // --snip--
}

func WithStatePostHandler[O, S any](post StatePostHandler[O, S]) GraphAddNodeOpt {
    // --snip--
}
```

Within nodes, use `ProcessState` to process State by passing in a function that can read/write state：

```go
// flow/agent/react/react.go

var msg *schema.Message
err = compose.ProcessState[*state](ctx, func(_ context.Context, state *state) error {
    for i := range msgs {
       if msgs[i] != nil && msgs[i].ToolCallID == state.ReturnDirectlyToolCallID {
          msg = msgs[i]
          return nil
       }
    }
    return nil
})
```

Full example:

```go
package main

import (
    "context"
    "errors"
    "io"
    "runtime/debug"
    "strings"
    "unicode/utf8"

    "github.com/cloudwego/eino/compose"
    "github.com/cloudwego/eino/schema"
    "github.com/cloudwego/eino/utils/safe"

    "github.com/cloudwego/eino-examples/internal/logs"
)

func main() {
    ctx := context.Background()

    const (
       nodeOfL1 = "invokable"
       nodeOfL2 = "streamable"
       nodeOfL3 = "transformable"
    )

    type testState struct {
       ms []string
    }

    gen := func(ctx context.Context) *testState {
       return &testState{}
    }

    sg := compose.NewGraph[string, string](compose.WithGenLocalState(gen))

    l1 := compose.InvokableLambda(func(ctx context.Context, in string) (out string, err error) {
       return "InvokableLambda: " + in, nil
    })

    l1StateToInput := func(ctx context.Context, in string, state *testState) (string, error) {
       state.ms = append(state.ms, in)
       return in, nil
    }

    l1StateToOutput := func(ctx context.Context, out string, state *testState) (string, error) {
       state.ms = append(state.ms, out)
       return out, nil
    }

    _ = sg.AddLambdaNode(nodeOfL1, l1,
       compose.WithStatePreHandler(l1StateToInput), compose.WithStatePostHandler(l1StateToOutput))

    l2 := compose.StreamableLambda(func(ctx context.Context, input string) (output *schema.StreamReader[string], err error) {
       outStr := "StreamableLambda: " + input

       sr, sw := schema.Pipe[string](utf8.RuneCountInString(outStr))

       go func() {
          for _, field := range strings.Fields(outStr) {
             sw.Send(field+" ", nil)
          }
          sw.Close()
       }()

       return sr, nil
    })

    l2StateToOutput := func(ctx context.Context, out string, state *testState) (string, error) {
       state.ms = append(state.ms, out)
       return out, nil
    }

    _ = sg.AddLambdaNode(nodeOfL2, l2, compose.WithStatePostHandler(l2StateToOutput))

    l3 := compose.TransformableLambda(func(ctx context.Context, input *schema.StreamReader[string]) (
       output *schema.StreamReader[string], err error) {

       prefix := "TransformableLambda: "
       sr, sw := schema.Pipe[string](20)

       go func() {

          defer func() {
             panicErr := recover()
             if panicErr != nil {
                err := safe.NewPanicErr(panicErr, debug.Stack())
                logs.Errorf("panic occurs: %v\n", err)
             }

          }()

          for _, field := range strings.Fields(prefix) {
             sw.Send(field+" ", nil)
          }

          for {
             chunk, err := input.Recv()
             if err != nil {
                if err == io.EOF {
                   break
                }
                // TODO: how to trace this kind of error in the goroutine of processing sw
                sw.Send(chunk, err)
                break
             }

             sw.Send(chunk, nil)

          }
          sw.Close()
       }()

       return sr, nil
    })

    l3StateToOutput := func(ctx context.Context, out string, state *testState) (string, error) {
       state.ms = append(state.ms, out)
       logs.Infof("state result: ")
       for idx, m := range state.ms {
          logs.Infof("    %vth: %v", idx, m)
       }
       return out, nil
    }

    _ = sg.AddLambdaNode(nodeOfL3, l3, compose.WithStatePostHandler(l3StateToOutput))

    _ = sg.AddEdge(compose.START, nodeOfL1)

    _ = sg.AddEdge(nodeOfL1, nodeOfL2)

    _ = sg.AddEdge(nodeOfL2, nodeOfL3)

    _ = sg.AddEdge(nodeOfL3, compose.END)

    run, err := sg.Compile(ctx)
    if err != nil {
       logs.Errorf("sg.Compile failed, err=%v", err)
       return
    }

    out, err := run.Invoke(ctx, "how are you")
    if err != nil {
       logs.Errorf("run.Invoke failed, err=%v", err)
       return
    }
    logs.Infof("invoke result: %v", out)

    stream, err := run.Stream(ctx, "how are you")
    if err != nil {
       logs.Errorf("run.Stream failed, err=%v", err)
       return
    }

    for {

       chunk, err := stream.Recv()
       if err != nil {
          if errors.Is(err, io.EOF) {
             break
          }
          logs.Infof("stream.Recv() failed, err=%v", err)
          break
       }

       logs.Tokenf("%v", chunk)
    }
    stream.Close()

    sr, sw := schema.Pipe[string](1)
    sw.Send("how are you", nil)
    sw.Close()

    stream, err = run.Transform(ctx, sr)
    if err != nil {
       logs.Infof("run.Transform failed, err=%v", err)
       return
    }

    for {

       chunk, err := stream.Recv()
       if err != nil {
          if errors.Is(err, io.EOF) {
             break
          }
          logs.Infof("stream.Recv() failed, err=%v", err)
          break
       }

       logs.Infof("%v", chunk)
    }
    stream.Close()
}
```

## Chain

> Chain can be regarded as a simplified encapsulation of Graph.

```go
package main

import (
    "context"
    "fmt"
    "log"
    "math/rand"
    "os"

    "github.com/cloudwego/eino-ext/components/model/openai"
    "github.com/cloudwego/eino/components/prompt"
    "github.com/cloudwego/eino/compose"
    "github.com/cloudwego/eino/schema"

    "github.com/cloudwego/eino-examples/internal/gptr"
    "github.com/cloudwego/eino-examples/internal/logs"
)

func main() {
    openAPIBaseURL := os.Getenv("OPENAI_BASE_URL")
    openAPIAK := os.Getenv("OPENAI_API_KEY")
    modelName := os.Getenv("MODEL_NAME")

    ctx := context.Background()
    // build branch func
    const randLimit = 2
    branchCond := func(ctx context.Context, input map[string]any) (string, error) {
       if rand.Intn(randLimit) == 1 {
          return "b1", nil
       }

       return "b2", nil
    }

    b1 := compose.InvokableLambda(func(ctx context.Context, kvs map[string]any) (map[string]any, error) {
       logs.Infof("hello in branch lambda 01")
       if kvs == nil {
          return nil, fmt.Errorf("nil map")
       }

       kvs["role"] = "cat"
       return kvs, nil
    })

    b2 := compose.InvokableLambda(func(ctx context.Context, kvs map[string]any) (map[string]any, error) {
       logs.Infof("hello in branch lambda 02")
       if kvs == nil {
          return nil, fmt.Errorf("nil map")
       }

       kvs["role"] = "dog"
       return kvs, nil
    })

    // build parallel node
    parallel := compose.NewParallel()
    parallel.
       AddLambda("role", compose.InvokableLambda(func(ctx context.Context, kvs map[string]any) (string, error) {
          // may be change role to others by input kvs, for example (dentist/doctor...)
          role, ok := kvs["role"].(string)
          if !ok || role == "" {
             role = "bird"
          }

          return role, nil
       })).
       AddLambda("input", compose.InvokableLambda(func(ctx context.Context, kvs map[string]any) (string, error) {
          return "What is your cry like? ", nil
       }))

    modelConf := &openai.ChatModelConfig{
       BaseURL:     openAPIBaseURL,
       APIKey:      openAPIAK,
       ByAzure:     true,
       Model:       modelName,
       Temperature: gptr.Of(float32(0.7)),
       APIVersion:  "2024-06-01",
    }

    // create chat model node
    cm, err := openai.NewChatModel(context.Background(), modelConf)
    if err != nil {
       log.Panic(err)
       return
    }

    rolePlayerChain := compose.NewChain[map[string]any, *schema.Message]()
    rolePlayerChain.
       AppendChatTemplate(prompt.FromMessages(schema.FString, schema.SystemMessage(`You are a {role}.`), schema.UserMessage(`{input}`))).
       AppendChatModel(cm)

    // =========== build chain ===========
    chain := compose.NewChain[map[string]any, string]()
    chain.
       AppendLambda(compose.InvokableLambda(func(ctx context.Context, kvs map[string]any) (map[string]any, error) {
          // do some logic to prepare kv as input val for next node
          // just pass through
          logs.Infof("in view lambda: %v", kvs)
          return kvs, nil
       })).
       AppendBranch(compose.NewChainBranch(branchCond).AddLambda("b1", b1).AddLambda("b2", b2)). // nolint: byted_use_receiver_without_nilcheck
       AppendPassthrough().
       AppendParallel(parallel).
       AppendGraph(rolePlayerChain).
       AppendLambda(compose.InvokableLambda(func(ctx context.Context, m *schema.Message) (string, error) {
          // do some logic to check the output or something
          logs.Infof("in view of messages: %v", m.Content)
          return m.Content, nil
       }))

    // compile
    r, err := chain.Compile(ctx)
    if err != nil {
       log.Panic(err)
       return
    }

    output, err := r.Invoke(context.Background(), map[string]any{})
    if err != nil {
       log.Panic(err)
       return
    }

    logs.Infof("output is : %v", output)
}
```
