---
Description: ""
date: "2026-03-12"
lastmod: ""
tags: []
title: "Chapter 8: Graph Tool (Complex Workflows)"
weight: 8
---

Goal of this chapter: understand the concept of Graph Tools, implement parallel chunk retrieval for large files, and introduce the `compose` package to build complex workflows.

## Code Location

- Entry code: [cmd/ch08/main.go](https://github.com/cloudwego/eino-examples/blob/main/quickstart/chatwitheino/cmd/ch08/main.go)
- RAG implementation: [rag/rag.go](https://github.com/cloudwego/eino-examples/blob/main/quickstart/chatwitheino/rag/rag.go)

## Prerequisites

Same as Chapter 1: configure a working ChatModel (OpenAI or Ark).

## Run

From `examples/quickstart/chatwitheino`:

```bash
# set project root
export PROJECT_ROOT=/path/to/your/project

go run ./cmd/ch08
```

Example output:

```
you> Please analyze the WebSocket handshake section in RFC6455
[assistant] Sure, let me analyze the document...
[tool call] answer_from_document(file_path: "rfc6455.txt", question: "WebSocket handshake")
[tool result] Found 3 relevant chunks; generating an answer...
[assistant] According to RFC6455, the WebSocket handshake works as follows...
```

## From Simple Tools to Graph Tools: Why Complex Workflows

In Chapter 4 we created simple tools where each Tool does a single task. In real scenarios, many tasks require multiple steps working together.

**Limitations of simple tools:**

- single responsibility: each Tool does only one thing
- no parallelism: independent tasks cannot run concurrently
- hard to reuse: complex logic is difficult to decompose and recombine

Important note: this chapter shows only a small slice of the compose/graph/workflow capabilities.

From a broader view, Eino’s `compose` package provides a general, deterministic orchestration capability: you can organize any “deterministic business process” into executable pipelines via Graph/Chain/Workflow, and it can **natively orchestrate all Eino components** (ChatModel, Prompt, Tools, Retriever, Embedding, Indexer, etc.), with full **callback** support and **interrupt/resume + checkpoint** support.

**What a Graph Tool is for:**

- **Graph Tool is a Tool wrapper around compose workflows**: wrap compiled `compose.Graph / compose.Chain / compose.Workflow` into a Tool that an Agent can call
- **Parallelism/branching/composition**: provided by compose (parallel, branches, field mapping, sub-graphs, etc.); Graph Tool just exposes an entry point
- **State management and persistence**: pass data between nodes, and save/restore run state via checkpoints
- **Interrupt/resume**: both inside the workflow (interrupt triggered in nodes) and at the Tool wrapping layer (nested interrupt scenarios)

**Analogy:**

- **simple tool** = “single-step operation” (read file)
- **Graph Tool** = “pipeline” (read → chunk → score → filter → synthesize answer)

## Key Concepts

### compose.Workflow

`compose.Workflow` is the core building block for workflows in Eino:

```go
wf := compose.NewWorkflow[Input, Output]()

// Add nodes.
wf.AddLambdaNode("load", loadFunc).AddInput(compose.START)
wf.AddLambdaNode("chunk", chunkFunc).AddInput("load")
wf.AddLambdaNode("score", scoreFunc).AddInput("chunk")
wf.AddLambdaNode("answer", answerFunc).AddInput("score")

// Connect to END.
wf.End().AddInput("answer")
```

**Core concepts:**

- **Node**: a processing unit in the workflow
- **Edge**: data-flow connections between nodes
- **START**: workflow entry
- **END**: workflow exit

### BatchNode

`BatchNode` processes multiple tasks in parallel:

```go
scorer := batch.NewBatchNode(&batch.NodeConfig[Task, Result]{
    Name:           "ChunkScorer",
    InnerTask:      scoreOneChunk,  // function to process a single task
    MaxConcurrency: 5,              // max concurrency
})
```

**How it works:**

1. takes a list of tasks as input
2. runs tasks in parallel (limited by MaxConcurrency)
3. collects and returns results

### FieldMapping

`FieldMapping` passes data across nodes:

```go
wf.AddLambdaNode("answer", answerFunc).
    AddInputWithOptions("filter",  // get data from the filter node
        []*compose.FieldMapping{compose.ToField("TopK")},
        compose.WithNoDirectDependency()).
    AddInputWithOptions(compose.START,  // get data from START
        []*compose.FieldMapping{compose.MapFields("Question", "Question")},
        compose.WithNoDirectDependency())
```

**Why FieldMapping?**

- pass data between non-adjacent nodes
- merge multiple data sources into one node
- rename fields

## Implementing a Graph Tool

### 1. Define Input and Output Types

```go
type Input struct {
    FilePath string `json:"file_path" jsonschema:"description=Absolute path to the document"`
    Question string `json:"question"  jsonschema:"description=The question to answer"`
}

type Output struct {
    Answer  string   `json:"answer"`
    Sources []string `json:"sources"`
}
```

### 2. Build the Workflow

```go
func buildWorkflow(cm model.BaseChatModel) *compose.Workflow[Input, Output] {
    wf := compose.NewWorkflow[Input, Output]()

    // load: read file
    wf.AddLambdaNode("load", compose.InvokableLambda(
        func(ctx context.Context, in Input) ([]*schema.Document, error) {
            data, err := os.ReadFile(in.FilePath)
            if err != nil {
                return nil, err
            }
            return []*schema.Document{{Content: string(data)}}, nil
        },
    )).AddInput(compose.START)

    // chunk: split into chunks
    wf.AddLambdaNode("chunk", compose.InvokableLambda(
        func(ctx context.Context, docs []*schema.Document) ([]*schema.Document, error) {
            var out []*schema.Document
            for _, d := range docs {
                out = append(out, splitIntoChunks(d.Content, 800)...)
            }
            return out, nil
        },
    )).AddInput("load")

    // score: score in parallel
    scorer := batch.NewBatchNode(&batch.NodeConfig[scoreTask, scoredChunk]{
        Name:           "ChunkScorer",
        InnerTask:      newScoreWorkflow(cm),
        MaxConcurrency: 5,
    })

    wf.AddLambdaNode("score", compose.InvokableLambda(
        func(ctx context.Context, in scoreIn) ([]scoredChunk, error) {
            tasks := make([]scoreTask, len(in.Chunks))
            for i, c := range in.Chunks {
                tasks[i] = scoreTask{Text: c.Content, Question: in.Question}
            }
            return scorer.Invoke(ctx, tasks)
        },
    )).
        AddInputWithOptions("chunk", []*compose.FieldMapping{compose.ToField("Chunks")}, compose.WithNoDirectDependency()).
        AddInputWithOptions(compose.START, []*compose.FieldMapping{compose.MapFields("Question", "Question")}, compose.WithNoDirectDependency())

    // filter: select top-k
    wf.AddLambdaNode("filter", compose.InvokableLambda(
        func(ctx context.Context, scored []scoredChunk) ([]scoredChunk, error) {
            sort.Slice(scored, func(i, j int) bool {
                return scored[i].Score > scored[j].Score
            })
            // keep top-3
            if len(scored) > 3 {
                scored = scored[:3]
            }
            return scored, nil
        },
    )).AddInput("score")

    // answer: synthesize answer
    wf.AddLambdaNode("answer", compose.InvokableLambda(
        func(ctx context.Context, in synthIn) (Output, error) {
            return synthesize(ctx, cm, in)
        },
    )).
        AddInputWithOptions("filter", []*compose.FieldMapping{compose.ToField("TopK")}, compose.WithNoDirectDependency()).
        AddInputWithOptions(compose.START, []*compose.FieldMapping{compose.MapFields("Question", "Question")}, compose.WithNoDirectDependency())

    wf.End().AddInput("answer")

    return wf
}
```

### 3. Wrap as a Tool

```go
func BuildTool(ctx context.Context, cm model.BaseChatModel) (tool.BaseTool, error) {
    wf := buildWorkflow(cm)
    return graphtool.NewInvokableGraphTool[Input, Output](
        wf,
        "answer_from_document",
        "Search a large document for relevant content and synthesize an answer.",
    )
}
```

Key snippet (note: this is a simplified excerpt and not directly runnable; see [rag/rag.go](https://github.com/cloudwego/eino-examples/blob/main/quickstart/chatwitheino/rag/rag.go)):

```go
// Build workflow.
wf := compose.NewWorkflow[Input, Output]()

// Add nodes.
wf.AddLambdaNode("load", loadFunc).AddInput(compose.START)
wf.AddLambdaNode("chunk", chunkFunc).AddInput("load")
wf.AddLambdaNode("score", scoreFunc).
    AddInputWithOptions("chunk", []*compose.FieldMapping{compose.ToField("Chunks")}, compose.WithNoDirectDependency()).
    AddInputWithOptions(compose.START, []*compose.FieldMapping{compose.MapFields("Question", "Question")}, compose.WithNoDirectDependency())

// Wrap as a Tool.
return graphtool.NewInvokableGraphTool[Input, Output](wf, "answer_from_document", "...")
```

## Graph Tool Execution Flow

```
┌─────────────────────────────────────────┐
│  input: file_path, question              │
└─────────────────────────────────────────┘
                   ↓
        ┌──────────────────────┐
        │  load: read file      │
        │  out: []*Document     │
        └──────────────────────┘
                   ↓
        ┌──────────────────────┐
        │  chunk: split         │
        │  out: []*Document     │
        └──────────────────────┘
                   ↓
        ┌──────────────────────┐
        │  score: parallel      │
        │  (MaxConcurrency=5)   │
        │  out: []scoredChunk   │
        └──────────────────────┘
                   ↓
        ┌──────────────────────┐
        │  filter: top-k        │
        │  out: []scoredChunk   │
        └──────────────────────┘
                   ↓
        ┌──────────────────────┐
        │  answer: synthesize   │
        │  out: Output          │
        └──────────────────────┘
                   ↓
        ┌──────────────────────┐
        │  return result        │
        │  {answer, sources}    │
        └──────────────────────┘
```

## Summary

- **Graph Tool**: wrap complex workflows as a Tool for multi-step collaboration
- **compose.Workflow**: core component for building workflows
- **BatchNode**: parallel task processing
- **FieldMapping**: pass data across nodes
- **Interrupt/resume**: Graph Tools support checkpoints

## Further Thoughts

**Other Graph Tool applications:**

- multi-document RAG: process multiple documents in parallel
- multi-model collaboration: different models handle different tasks
- complex decision trees: choose branches by conditions

**Performance optimization:**

- tune MaxConcurrency to control parallelism
- use caching to avoid recomputation
- stream outputs to improve user experience
