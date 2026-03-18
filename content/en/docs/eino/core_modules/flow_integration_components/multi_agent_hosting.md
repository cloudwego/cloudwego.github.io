---
Description: ""
date: "2026-01-20"
lastmod: ""
tags: []
title: 'Eino Tutorial: Host Multi-Agent'
weight: 2
---

Host Multi-Agent is a pattern where a Host recognizes intent and hands off to a specialist agent to perform the actual generation. It only forwards requests, without generating subtasks.

Example: a "journal assistant" that can write journal, read journal, and answer questions based on journal.

Full sample: [https://github.com/cloudwego/eino-examples/tree/main/flow/agent/multiagent/host/journal](https://github.com/cloudwego/eino-examples/tree/main/flow/agent/multiagent/host/journal)

Host:

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

Write-journal specialist: after the host recognizes that the user's intent is to write a journal, it hands off to this specialist to write the content to a file.

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

Read-journal specialist: after the host recognizes that the user's intent is to read a journal, it hands off to this specialist to read the journal file content and output it line by line. This is a local function.

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

Answer-with-journal specialist: answers questions based on journal content.

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

Compose host multi-agent and run a CLI:

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

    for { // multi-turn conversation, loops until user enters "exit"
       println("\n\nYou: ") // prompt for user input

       var message string
       scanner := bufio.NewScanner(os.Stdin) // read user input from CLI
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

Console output example:

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

### No streaming when Host outputs directly

Host Multi-Agent provides `StreamToolCallChecker` to determine whether Host outputs directly.

Different providers in streaming mode may output tool calls differently: some output tool calls directly (e.g., OpenAI); some output text first then tool calls (e.g., Claude). Configure a checker accordingly.

Optional. If not set, the default checks whether the first "non-empty chunk" contains a tool call:

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

The default implementation is suitable for: models whose Tool Call Message contains only Tool Calls.

The default implementation is NOT suitable for: cases where there are non-empty content chunks before the Tool Call output. In such cases, you need to define a custom tool call checker:

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

The custom StreamToolCallChecker above may need to check **all chunks** for ToolCalls in extreme cases, which can cause the "streaming decision" effect to be lost. To preserve the "streaming decision" effect as much as possible, the recommendation is:

> 💡
> Try adding a prompt to constrain the model not to output additional text when calling tools, for example: "If you need to call a tool, output the tool directly, do not output text."
>
> Different models may be affected differently by prompts, so you need to adjust the prompt and verify the effect in actual use.

### Host selects multiple Specialists

Host selects Specialists in the form of Tool Calls, so it may select multiple Specialists simultaneously as a list of Tool Calls. In this case, Host Multi-Agent routes the request to all selected Specialists simultaneously, and after all Specialists complete, it summarizes multiple Messages into one Message through the Summarizer node as the final output of Host Multi-Agent.

Users can configure a Summarizer by specifying a ChatModel and SystemPrompt to customize the Summarizer's behavior. If not specified, Host Multi-Agent will concatenate the Message Contents from multiple Specialists and return them.
