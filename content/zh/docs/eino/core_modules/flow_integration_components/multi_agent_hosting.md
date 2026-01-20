---
Description: ""
date: "2026-01-20"
lastmod: ""
tags: []
title: 'Eino Tutorial: Host Multi-Agent'
weight: 2
---

Host Multi-Agent 是一个 Host 做意图识别后，跳转到某个专家 agent 做实际的生成。只转发，不生成子任务。

以一个简单的“日记助手”做例子：可以写日记、读日记、根据日记回答问题。

完整样例参见：[https://github.com/cloudwego/eino-examples/tree/main/flow/agent/multiagent/host/journal](https://github.com/cloudwego/eino-examples/tree/main/flow/agent/multiagent/host/journal)

Host：

```go
func newHost(ctx context.Context, baseURL, apiKey, modelName string) (*host.Host, error) {
    chatModel, err := openai.NewChatModel(ctx, &openai.ChatModelConfig{
       BaseURL: baseURL,
       Model:   modelName,
       ByAzure: true,
       APIKey:  apiKey,
    })
    if err != nil {
       return nil, err
    }

    return &host.Host{
       ChatModel:    chatModel,
       SystemPrompt: "You can read and write journal on behalf of the user. When user asks a question, always answer with journal content.",
    }, nil
}
```

写日记的“专家”：host 识别出用户意图是写日记后，会跳转到这里，把用户想要写的内容写到文件里。

```go
func newWriteJournalSpecialist(ctx context.Context) (*host.Specialist, error) {
    chatModel, err := ollama.NewChatModel(ctx, &ollama.ChatModelConfig{
       BaseURL: "http://localhost:11434",
       Model:   "llama3-groq-tool-use",

       Options: &api.Options{
          Temperature: 0.000001,
       },
    })
    if err != nil {
       return nil, err
    }

    // use a chat model to rewrite user query to journal entry
    // for example, the user query might be:
    //
    // write: I got up at 7:00 in the morning.
    // 
    // should be rewritten to:
    //
    // I got up at 7:00 in the morning.
    chain := compose.NewChain[[]*schema.Message, *schema.Message]()
    chain.AppendLambda(compose.InvokableLambda(func(ctx context.Context, input []*schema.Message) ([]*schema.Message, error) {
       systemMsg := &schema.Message{
          Role:    schema._System_,
          Content: "You are responsible for preparing the user query for insertion into journal. The user's query is expected to contain the actual text the user want to write to journal, as well as convey the intention that this query should be written to journal. You job is to remove that intention from the user query, while preserving as much as possible the user's original query, and output ONLY the text to be written into journal",
       }
       return append([]*schema.Message{systemMsg}, input...), nil
    })).
       AppendChatModel(chatModel).
       AppendLambda(compose.InvokableLambda(func(ctx context.Context, input *schema.Message) (*schema.Message, error) {
          err := appendJournal(input.Content)
          if err != nil {
             return nil, err
          }
          return &schema.Message{
             Role:    schema._Assistant_,
             Content: "Journal written successfully: " + input.Content,
          }, nil
       }))

    r, err := chain.Compile(ctx)
    if err != nil {
       return nil, err
    }

    return &host.Specialist{
       AgentMeta: host.AgentMeta{
          Name:        "write_journal",
          IntendedUse: "treat the user query as a sentence of a journal entry, append it to the right journal file",
       },
       Invokable: func(ctx context.Context, input []*schema.Message, opts ...agent.AgentOption) (*schema.Message, error) {
          return r.Invoke(ctx, input, agent.GetComposeOptions(opts...)...)
       },
    }, nil
}
```

读日记的“专家”：host 识别出用户意图是读日记后，会跳转到这里，读日记文件内容并一行行的输出。就是一个本地的 function。

```go
func newReadJournalSpecialist(ctx context.Context) (*host.Specialist, error) {
    // create a new read journal specialist
    return &host.Specialist{
       AgentMeta: host.AgentMeta{
          Name:        "view_journal_content",
          IntendedUse: "let another agent view the content of the journal",
       },
       Streamable: func(ctx context.Context, input []*schema.Message, opts ...agent.AgentOption) (*schema.StreamReader[*schema.Message], error) {
          now := time.Now()
          dateStr := now.Format("2006-01-02")

          journal, err := readJournal(dateStr)
          if err != nil {
             return nil, err
          }

          reader, writer := schema.Pipe[*schema.Message](0)
          go func() {
             scanner := bufio.NewScanner(journal)
             scanner.Split(bufio.ScanLines)

             for scanner.Scan() {
                line := scanner.Text()
                message := &schema.Message{
                   Role:    schema._Assistant_,
                   Content: line + "\n",
                }
                writer.Send(message, nil)
             }

             if err := scanner.Err(); err != nil {
                writer.Send(nil, err)
             }

             writer.Close()
          }()

          return reader, nil
       },
    }, nil
}
```

根据日记回答问题的"专家"：

```go
func newAnswerWithJournalSpecialist(ctx context.Context) (*host.Specialist, error) {
    chatModel, err := ollama.NewChatModel(ctx, &ollama.ChatModelConfig{
       BaseURL: "http://localhost:11434",
       Model:   "llama3-groq-tool-use",

       Options: &api.Options{
          Temperature: 0.000001,
       },
    })
    if err != nil {
       return nil, err
    }

    // create a graph: load journal and user query -> chat template -> chat model -> answer

    graph := compose.NewGraph[[]*schema.Message, *schema.Message]()

    if err = graph.AddLambdaNode("journal_loader", compose.InvokableLambda(func(ctx context.Context, input []*schema.Message) (string, error) {
       now := time.Now()
       dateStr := now.Format("2006-01-02")

       return loadJournal(dateStr)
    }), compose.WithOutputKey("journal")); err != nil {
       return nil, err
    }

    if err = graph.AddLambdaNode("query_extractor", compose.InvokableLambda(func(ctx context.Context, input []*schema.Message) (string, error) {
       return input[len(input)-1].Content, nil
    }), compose.WithOutputKey("query")); err != nil {
       return nil, err
    }

    systemTpl := `Answer user's query based on journal content: {journal}'`
    chatTpl := prompt.FromMessages(schema._FString_,
       schema.SystemMessage(systemTpl),
       schema.UserMessage("{query}"),
    )
    if err = graph.AddChatTemplateNode("template", chatTpl); err != nil {
       return nil, err
    }

    if err = graph.AddChatModelNode("model", chatModel); err != nil {
       return nil, err
    }

    if err = graph.AddEdge("journal_loader", "template"); err != nil {
       return nil, err
    }

    if err = graph.AddEdge("query_extractor", "template"); err != nil {
       return nil, err
    }

    if err = graph.AddEdge("template", "model"); err != nil {
       return nil, err
    }

    if err = graph.AddEdge(compose._START_, "journal_loader"); err != nil {
       return nil, err
    }

    if err = graph.AddEdge(compose._START_, "query_extractor"); err != nil {
       return nil, err
    }

    if err = graph.AddEdge("model", compose._END_); err != nil {
       return nil, err
    }

    r, err := graph.Compile(ctx)
    if err != nil {
       return nil, err
    }

    return &host.Specialist{
       AgentMeta: host.AgentMeta{
          Name:        "answer_with_journal",
          IntendedUse: "load journal content and answer user's question with it",
       },
       Invokable: func(ctx context.Context, input []*schema.Message, opts ...agent.AgentOption) (*schema.Message, error) {
          return r.Invoke(ctx, input, agent.GetComposeOptions(opts...)...)
       },
    }, nil
}
```

编排成 host multi agent 并在命令行启动：

```go
func main() {
    ctx := context.Background()
    h, err := newHost(ctx)
    if err != nil {
       panic(err)
    }

    writer, err := newWriteJournalSpecialist(ctx)
    if err != nil {
       panic(err)
    }

    reader, err := newReadJournalSpecialist(ctx)
    if err != nil {
       panic(err)
    }

    answerer, err := newAnswerWithJournalSpecialist(ctx)
    if err!= nil {
        panic(err)
    }

    hostMA, err := host.NewMultiAgent(ctx, &host.MultiAgentConfig{
       Host: *h,
       Specialists: []*host.Specialist{
          writer,
          reader,
          answerer,
       },
    })
    if err != nil {
       panic(err)
    }

    cb := &logCallback{}

    for { // 多轮对话，除非用户输入了 "exit"，否则一直循环
       println("\n\nYou: ") // 提示轮到用户输入了

       var message string
       scanner := bufio.NewScanner(os.Stdin) // 获取用户在命令行的输入
       for scanner.Scan() {
          message += scanner.Text()
          break
       }

       if err := scanner.Err(); err != nil {
          panic(err)
       }

       if message == "exit" {
          return
       }

       msg := &schema.Message{
          Role:    schema._User_,
          Content: message,
       }

       out, err := hostMA.Stream(ctx, []*schema.Message{msg}, host.WithAgentCallbacks(cb))
       if err != nil {
          panic(err)
       }

       defer out.Close()

       println("\nAnswer:")

       for {
          msg, err := out.Recv()
          if err != nil {
             if err == io.EOF {
                break
             }
          }

          print(msg.Content)
       }
    }
}
```

运行 console 输出：

```go
You: 
write journal: I got up at 7:00 in the morning

HandOff to write_journal with argument {"reason":"I got up at 7:00 in the morning"}

Answer:
Journal written successfully: I got up at 7:00 in the morning

You: 
read journal

HandOff to view_journal_content with argument {"reason":"User wants to read the journal content."}

Answer:
I got up at 7:00 in the morning


You: 
when did I get up in the morning?

HandOff to answer_with_journal with argument {"reason":"To find out the user's morning wake-up times"}

Answer:
You got up at 7:00 in the morning.
```

## FAQ

### Host 直接输出时没有流式

Host Multi-Agent 提供了一个 StreamToolCallChecker 的配置，用于判断 Host 是否直接输出。

不同的模型在流式模式下输出工具调用的方式可能不同: 某些模型(如 OpenAI) 会直接输出工具调用；某些模型 (如 Claude) 会先输出文本，然后再输出工具调用。因此需要使用不同的方法来判断，这个字段用来指定判断模型流式输出中是否包含工具调用的函数。

可选填写，未填写时使用“非空包”是否包含工具调用判断：

```go
func firstChunkStreamToolCallChecker(_ context.Context, sr *schema.StreamReader[*schema.Message]) (bool, error) {
    defer sr.Close()

    for {
       msg, err := sr.Recv()
       if err == io.EOF {
          return false, nil
       }
       if err != nil {
          return false, err
       }

       if len(msg.ToolCalls) > 0 {
          return true, nil
       }

       if len(msg.Content) == 0 { // skip empty chunks at the front
          continue
       }

       return false, nil
    }
}
```

上述默认实现适用于：模型输出的 Tool Call Message 中只有 Tool Call。

默认实现不适用的情况：在输出 Tool Call 前，有非空的 content chunk。此时，需要自定义 tool Call checker 如下：

```go
toolCallChecker := func(ctx context.Context, sr *schema.StreamReader[*schema.Message]) (bool, error) {
    defer sr.Close()
    for {
       msg, err := sr.Recv()
       if err != nil {
          if errors.Is(err, io.EOF) {
             // finish
             break
          }

          return false, err
       }

       if len(msg.ToolCalls) > 0 {
          return true, nil
       }
    }
    return false, nil
}
```

上面这个自定义 StreamToolCallChecker，在极端情况下可能需要判断**所有包**是否包含 ToolCall，从而导致“流式判断”的效果丢失。如果希望尽可能保留“流式判断”效果，解决这一问题的建议是：

> 💡
> 尝试添加 prompt 来约束模型在工具调用时不额外输出文本，例如：“如果需要调用 tool，直接输出 tool，不要输出文本”。
>
> 不同模型受 prompt 影响可能不同，实际使用时需要自行调整 prompt 并验证效果。

### Host 同时选择多个 Specialist

Host 以 Tool Call 的形式给出对 Specialist 的选择，因此可能以 Tool Call 列表的形式同时选中多个 Specialist。此时 Host Multi-Agent 会同时将请求路由到这多个 Specialist，并在多个 Specialist 完成后，通过 Summarizer 节点总结多条 Message 为一条 Message，作为 Host Multi-Agent 的最终输出。

用户可通过配置 Summarizer，指定一个 ChatModel 以及 SystemPrompt，来定制化 Summarizer 的行为。如未指定，Host Multi-Agent 会将多个 Specialist 的输出 Message Content 拼接后返回。
