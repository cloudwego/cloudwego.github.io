---
Description: ""
date: "2025-01-15"
lastmod: ""
tags: []
title: 'Eino: Chain/Graph 编排介绍'
weight: 1
---

# Graph 编排

## Graph

```go
import (
    "github.com/cloudwego/eino/compose"
)

const (
    _nodeOfModel  _= "model"
    _nodeOfPrompt _= "prompt"
)

func main() {
    ctx := context.Background()
    g := compose.NewGraph[map[string]any, *schema.Message]()
    
    pt := prompt.FromMessages(
        schema.HumanMessage("what's the weather in {location}?"),
    )
    
    err := g.AddChatTemplateNode(_nodeOfPrompt_, pt)
    assert.NoError(t, err)
    
    cm := &chatModel{
        msgs: []*schema.Message{
           {
              Role:    schema._AI_,
              Content: "the weather is good",
           },
        },
    }
    
    err = g.AddChatModelNode(_nodeOfModel_, cm, WithNodeName("MockChatModel"))
    assert.NoError(t, err)
    
    err = g.AddEdge(_START_, _nodeOfPrompt_)
    assert.NoError(t, err)
    
    err = g.AddEdge(_nodeOfPrompt_, _nodeOfModel_)
    assert.NoError(t, err)
    
    err = g.AddEdge(_nodeOfModel_, _END_)
    assert.NoError(t, err)
    
    r, err := g.Compile(WithMaxRunSteps(10))
    assert.NoError(t, err)
    
    in := map[string]any{"location": "beijing"}
    ret, err := r.Invoke(ctx, in)
    assert.NoError(t, err)
    t.Logf("invoke result: %v", ret)
    
    // stream
    s, err := r.Stream(ctx, in)
    assert.NoError(t, err)
}
```

## ToolCallAgent

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
)

func main() {

    accessKey := os.Getenv("OPENAI_API_KEY")

    ctx := context.Background()
    
    callbacks.InitCallbackHandlers([]callbacks.Handler{&loggerCallbacks{}})

    const (
       _messageHistories _= "message_histories"
       _messageUserQuery _= "user_query"
    )

    // 1. create an instance of ChatTemplate as 1st Graph Node
    systemTpl := `你是一名房产经纪人，结合用户的薪酬和工作，使用 user_info API，为其提供相关的房产信息。邮箱是必须的`
    chatTpl := prompt.FromMessages(schema._FString_,
       schema.SystemMessage(systemTpl),
       schema.MessagesPlaceholder(_messageHistories_, true),
       schema.MessagesPlaceholder(_messageUserQuery_, false),
    )

    baseURL := "https://search.bytedance.net/gpt/openapi/online/multimodal/crawl"

    modelConf := &openai.ChatModelConfig{
       BaseURL:     baseURL,
       APIKey:      accessKey,
       ByAzure:     true,
       Model:       "gpt-4o-2024-05-13",
       Temperature: 0.7,
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
          Desc: "根据用户的姓名和邮箱，查询用户的公司、职位、薪酬信息",
          Params: map[string]*schema.ParameterInfo{
             "name": {
                Type: "string",
                Desc: "用户的姓名",
             },
             "email": {
                Type: "string",
                Desc: "用户的邮箱",
             },
          },
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
       _nodeKeyOfTemplate  _= "template"
       _nodeKeyOfChatModel _= "chat_model"
       _nodeKeyOfTools     _= "tools"
    )

    // 6. create an instance of Graph
    // input type is 1st Graph Node's input type, that is ChatTemplate's input type: map[string]any
    // output type is last Graph Node's output type, that is ToolsNode's output type: []*schema.Message
    g := compose.NewGraph[map[string]any, []*schema.Message]()

    // 7. add ChatTemplate into graph
    err = g.AddChatTemplateNode(_nodeKeyOfTemplate_, chatTpl)
    if err != nil {
       logs.Errorf("AddChatTemplateNode failed, err=%v", err)
       return
    }

    // 8. add ChatModel into graph
    err = g.AddChatModelNode(_nodeKeyOfChatModel_, chatModel)
    if err != nil {
       logs.Errorf("AddChatModelNode failed, err=%v", err)
       return
    }

    // 9. add ToolsNode into graph
    err = g.AddToolsNode(_nodeKeyOfTools_, toolsNode)
    if err != nil {
       logs.Errorf("AddToolsNode failed, err=%v", err)
       return
    }

    // 10. add connection between nodes
    err = g.AddEdge(compose._START_, _nodeKeyOfTemplate_)
    if err != nil {
       logs.Errorf("AddEdge failed,start=%v, end=%v, err=%v", compose._START_, _nodeKeyOfTemplate_, err)
       return
    }

    err = g.AddEdge(_nodeKeyOfTemplate_, _nodeKeyOfChatModel_)
    if err != nil {
       logs.Errorf("AddEdge failed,start=%v, end=%v, err=%v", _nodeKeyOfTemplate_, _nodeKeyOfChatModel_, err)
       return
    }

    err = g.AddEdge(_nodeKeyOfChatModel_, _nodeKeyOfTools_)
    if err != nil {
       logs.Errorf("AddEdge failed,start=%v, end=%v, err=%v", _nodeKeyOfChatModel_, _nodeKeyOfTools_, err)
       return
    }

    err = g.AddEdge(_nodeKeyOfTools_, compose._END_)
    if err != nil {
       logs.Errorf("AddEdge failed,start=%v, end=%v, err=%v", _nodeKeyOfTools_, compose._END_, err)
       return
    }

    // 9. compile Graph[I, O] to Runnable[I, O]
    r, err := g.Compile(ctx)
    if err != nil {
       logs.Errorf("Compile failed, err=%v", err)
       return
    }

    out, err := r.Invoke(ctx, map[string]any{
       _messageHistories_: []*schema.Message{},
       _messageUserQuery_: []*schema.Message{
          schema.UserMessage("我叫 zhangsan, 邮箱是 zhangsan@bytedance.com, 帮我推荐一处房产"),
       },
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

## State Graph

```go
package main

import (
    "context"
    "errors"
    "io"
    "log"
    "strings"
    "unicode/utf8"

    "github.com/cloudwego/eino/compose"
    "github.com/cloudwego/eino/schema"
)

func main() {
    ctx := context.Background()

    const (
       _nodeOfL1 _= "invokable"
       _nodeOfL2 _= "streamable"
       _nodeOfL3 _= "transformable"
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

    err := sg.AddLambdaNode(_nodeOfL1_, l1,
       compose.WithStatePreHandler(l1StateToInput), compose.WithStatePostHandler(l1StateToOutput))
    if err != nil {
       log.Printf("sg.AddLambdaNode failed, err=%v", err)
       return
    }

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

    err = sg.AddLambdaNode(_nodeOfL2_, l2, compose.WithStatePostHandler(l2StateToOutput))
    if err != nil {
       log.Printf("sg.AddLambdaNode failed, err=%v", err)
       return
    }

    l3 := compose.TransformableLambda(func(ctx context.Context, input *schema.StreamReader[string]) (
       output *schema.StreamReader[string], err error) {

       prefix := "TransformableLambda: "
       sr, sw := schema.Pipe[string](20)

       go func() {
          for _, field := range strings.Fields(prefix) {
             sw.Send(field+" ", nil)
          }

          for {
             chunk, err := input.Recv()
             if err != nil {
                if err == io.EOF {
                   break
                }
                // _TODO: how to trace this kind of error in the goroutine of processing sw_
_                _sw.Send(chunk, err)
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
       log.Printf("state result: ")
       for idx, m := range state.ms {
          log.Printf("    %vth: %v", idx, m)
       }
       return out, nil
    }

    err = sg.AddLambdaNode(_nodeOfL3_, l3, compose.WithStatePostHandler(l3StateToOutput))
    if err != nil {
       log.Printf("sg.AddLambdaNode failed, err=%v", err)
       return
    }

    err = sg.AddEdge(compose._START_, _nodeOfL1_)
    if err != nil {
       log.Printf("sg.AddEdge failed, err=%v", err)
       return
    }

    err = sg.AddEdge(_nodeOfL1_, _nodeOfL2_)
    if err != nil {
       log.Printf("sg.AddEdge failed, err=%v", err)
       return
    }

    err = sg.AddEdge(_nodeOfL2_, _nodeOfL3_)
    if err != nil {
       log.Printf("sg.AddEdge failed, err=%v", err)
       return
    }

    err = sg.AddEdge(_nodeOfL3_, compose._END_)
    if err != nil {
       log.Printf("sg.AddEdge failed, err=%v", err)
       return
    }

    run, err := sg.Compile(ctx)
    if err != nil {
       log.Printf("sg.Compile failed, err=%v", err)
       return
    }

    out, err := run.Invoke(ctx, "how are you")
    if err != nil {
       log.Printf("run.Invoke failed, err=%v", err)
       return
    }
    log.Printf("invoke result: %v", out)

    stream, err := run.Stream(ctx, "how are you")
    if err != nil {
       log.Printf("run.Stream failed, err=%v", err)
       return
    }

    for {

       chunk, err := stream.Recv()
       if err != nil {
          if errors.Is(err, io.EOF) {
             break
          }
          log.Printf("stream.Recv() failed, err=%v", err)
          break
       }

       log.Printf(chunk)
    }
    stream.Close()

    sr, sw := schema.Pipe[string](1)
    sw.Send("how are you", nil)
    sw.Close()

    stream, err = run.Transform(ctx, sr)
    if err != nil {
       log.Printf("run.Transform failed, err=%v", err)
       return
    }
    
    for {

       chunk, err := stream.Recv()
       if err != nil {
          if errors.Is(err, io.EOF) {
             break
          }
          log.Printf("stream.Recv() failed, err=%v", err)
          break
       }

       log.Printf(chunk)
    }
    stream.Close()
}
```

# Chain

> Chain 可以视为是 Graph 的简化封装

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
)

func init() {
    apiKey := os.Getenv("OPENAI_API_KEY")
    baseURL := os.Getenv("OPENAI_BASE_URL") // using azure

    if apiKey == "" || baseURL != "" {
       return
    }
}

func main() {
    ctx := context.Background()
    // 分支节点
    const _randLimit _= 2
    branchCond := func(ctx context.Context, input map[string]any) (string, error) { // nolint: byted_all_nil_return
       if rand.Intn(_randLimit_) == 1 {
          return "b1", nil
       }

       return "b2", nil
    }

    b1 := compose.InvokableLambda(func(ctx context.Context, kvs map[string]any) (map[string]any, error) {
       fmt.Println("hello in branch lambda 01")
       if kvs == nil {
          return nil, fmt.Errorf("nil map")
       }

       kvs["role"] = "cat"
       return kvs, nil
    })

    b2 := compose.InvokableLambda(func(ctx context.Context, kvs map[string]any) (map[string]any, error) {
       fmt.Println("hello in branch lambda 02")
       if kvs == nil {
          return nil, fmt.Errorf("nil map")
       }

       kvs["role"] = "dog"
       return kvs, nil
    })

    // 并发节点
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
          return "你的叫声是怎样的？", nil
       }))

    // 顺序节点
    cm, err := openai.NewChatModel(context.Background(), nil)
    if err != nil {
       log.Panic(err)
       return
    }

    rolePlayerChain := compose.NewChain[map[string]any, *schema.Message]()
    rolePlayerChain.
       AppendChatTemplate(prompt.FromMessages(schema._FString_, schema.SystemMessage(`You are a {role}.`), schema.UserMessage(`{input}`))).
       AppendChatModel(cm)

    // =========== 构建 chain ===========
    chain := compose.NewChain[map[string]any, string]()
    chain.
       AppendLambda(compose.InvokableLambda(func(ctx context.Context, kvs map[string]any) (map[string]any, error) {
          // do some logic to prepare kv as input val for next node
          // just pass through
          fmt.Println("in view lambda: ", kvs)
          return kvs, nil
       })).
       AppendBranch(compose.NewChainBranch(branchCond).AddLambda("b1", b1).AddLambda("b2", b2)). // nolint: byted_use_receiver_without_nilcheck
       AppendParallel(parallel).
       AppendGraph(rolePlayerChain).
       AppendLambda(compose.InvokableLambda(func(ctx context.Context, m *schema.Message) (string, error) {
          // do some logic to check the output or something
          fmt.Println("in view of messages: ", m.Content)

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

    fmt.Println("output is : ", output)

}
```
