---
Description: ""
date: "2026-05-17"
lastmod: ""
tags: []
title: "Chapter 8: Graph Tool (Complex Workflows)"
weight: 8
---

Goal of this chapter: understand the Graph Tool concept, implement parallel chunk retrieval for large files, and introduce the compose package to build complex workflows.

## Code Location

- Entry code: [cmd/ch08/main.go](https://github.com/cloudwego/eino-examples/blob/main/quickstart/chatwitheino/cmd/ch08/main.go)
- RAG implementation: [rag/rag.go](https://github.com/cloudwego/eino-examples/blob/main/quickstart/chatwitheino/rag/rag.go)

## Prerequisites

Same as Chapter 1: you need a configured ChatModel (OpenAI or Ark).

## Running

In the `examples/quickstart/chatwitheino` directory, run:

```bash
# Set project root directory
export PROJECT_ROOT=/path/to/your/project

go run ./cmd/ch08
```

Output example:

```
you> Please analyze the WebSocket handshake section in the RFC6455 document
[assistant] Let me analyze the document for you...
[tool call] answer_from_document(file_path: "rfc6455.txt", question: "WebSocket handshake process")
[tool result] Found 3 relevant fragments, generating answer...
[assistant] According to the RFC6455 document, the WebSocket handshake process is as follows...
```

## From Simple Tools to Graph Tools: Why Complex Workflows Are Needed

In Chapter 4 we created simple Tools, each performing a single task. But in real-world scenarios, many tasks require multiple steps working together.

**Limitations of simple Tools:**

- Single responsibility: each Tool does only one thing
- No parallelism: multiple independent tasks cannot execute simultaneously
- Hard to reuse: complex logic is difficult to split and recombine

**Important note: This chapter only showcases a small portion of compose/graph/workflow capabilities.**

From a broader perspective, Eino's `compose` package provides very general, deterministic orchestration capabilities: you can organize any system requiring "deterministic business flows" into executable pipelines using `compose`'s Graph/Chain/Workflow, and it can **natively orchestrate all Eino components** (such as ChatModel, Prompt, Tools, Retriever, Embedding, Indexer, etc.), with a complete **callback** system, as well as **interrupt/resume + checkpoint** support.

**The role of Graph Tools:**

- **Graph Tool is the Tool-ified wrapper of compose workflows**: wraps `compose.Graph / compose.Chain / compose.Workflow` compiled orchestration artifacts as a Tool callable by the Agent
- **Supports parallel/branching/composition**: provided by compose (parallelism, branching, field mapping, subgraphs, etc.); Graph Tool simply exposes them as a Tool entry point
- **Supports state management and persistence**: passes data between nodes, and saves/restores running state via checkpoints
- **Supports interrupt and resume**: both workflow-internal interrupts (triggering interrupt within a node) and tool-level interrupt wrapping (nested interrupt scenarios)

**Simple analogy:**

- **Simple Tool** = "single-step operation" (read a file)
- **Graph Tool** = "pipeline" (read → chunk → score → filter → generate answer)

## Key Concepts

### compose.Workflow

`compose.Workflow` is the core component for building workflows in Eino:

```go
wf := compose.NewWorkflow[Input, Output]()

// Add nodes
wf.AddLambdaNode("load", loadFunc).AddInput(compose.START)
wf.AddLambdaNode("chunk", chunkFunc).AddInput("load")
wf.AddLambdaNode("score", scoreFunc).AddInput("chunk")
wf.AddLambdaNode("answer", answerFunc).AddInput("score")

// Connect to end node
wf.End().AddInput("answer")
```

**Core concepts:**

- **Node**: a processing unit in the workflow
- **Edge**: data flow direction between nodes
- **START**: the workflow entry point
- **END**: the workflow exit point

### BatchNode

`BatchNode` is used for parallel processing of multiple tasks:

```go
scorer := batch.NewBatchNode(&batch.NodeConfig[Task, Result]{
    Name:           "ChunkScorer",
    InnerTask:      scoreOneChunk,  // Processing function for a single task
    MaxConcurrency: 5,              // Maximum concurrency
})
```

**How it works:**

1. Receives a task list as input
2. Executes each task in parallel (limited by MaxConcurrency)
3. Collects all results and returns them

### FieldMapping

`FieldMapping` is used to pass data across nodes:

```go
wf.AddLambdaNode("answer", answerFunc).
    AddInputWithOptions("filter",  // Get data from the filter node
        []*compose.FieldMapping{compose.ToField("TopK")},
        compose.WithNoDirectDependency()).
    AddInputWithOptions(compose.START,  // Get data from the START node
        []*compose.FieldMapping{compose.MapFields("Question", "Question")},
        compose.WithNoDirectDependency())
```

**Why FieldMapping is needed:**

- Pass data between non-adjacent nodes
- Merge multiple data sources into a single node
- Rename data fields

## Graph Tool Implementation

### 1. Define Input/Output Structures

```go
type Input struct {
    FilePath string `json:"file_path" jsonschema:"description=Absolute path to the uploaded document file"`
    Question string `json:"question"  jsonschema:"description=The question to answer from the document"`
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

    // score: parallel scoring
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

    // filter: sort descending by score, keep up to top-3 chunks with score ≥ 3.
    wf.AddLambdaNode("filter", compose.InvokableLambda(
        func(ctx context.Context, scored []scoredChunk) ([]scoredChunk, error) {
            sort.Slice(scored, func(i, j int) bool {
                return scored[i].Score > scored[j].Score
            })
            const maxK = 3
            var top []scoredChunk
            for _, c := range scored {
                if c.Score < 3 {
                    break
                }
                top = append(top, c)
                if len(top) == maxK {
                    break
                }
            }
            return top, nil
        },
    )).AddInput("score")

    // answer: synthesize a response from top-k chunks, or return a not-found message if empty.
    wf.AddLambdaNode("answer", compose.InvokableLambda(
        func(ctx context.Context, in synthIn) (Output, error) {
            if len(in.TopK) == 0 {
                return Output{
                    Answer: fmt.Sprintf("No relevant content found in the document for: %q", in.Question),
                }, nil
            }
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
        "Search a large uploaded document for content relevant to a question and synthesize a "+
            "cited answer from the most relevant passages. "+
            "Use this instead of read_file when the document may be too large to fit in context.",
    )
}
```

**Key code snippet (**Note: this is a simplified snippet that cannot run directly. See** [rag/rag.go](https://github.com/cloudwego/eino-examples/blob/main/quickstart/chatwitheino/rag/rag.go) for the complete code):

```go
// Build workflow
wf := compose.NewWorkflow[Input, Output]()

// Add nodes
wf.AddLambdaNode("load", loadFunc).AddInput(compose.START)
wf.AddLambdaNode("chunk", chunkFunc).AddInput("load")
wf.AddLambdaNode("score", scoreFunc).
    AddInputWithOptions("chunk", []*compose.FieldMapping{compose.ToField("Chunks")}, compose.WithNoDirectDependency()).
    AddInputWithOptions(compose.START, []*compose.FieldMapping{compose.MapFields("Question", "Question")}, compose.WithNoDirectDependency())

// Wrap as Tool
return graphtool.NewInvokableGraphTool[Input, Output](wf, "answer_from_document", "...")
```

## Graph Tool Execution Flow

```
┌─────────────────────────────────────────┐
│  Input: file_path, question             │
└─────────────────────────────────────────┘
                   ↓
        ┌──────────────────────┐
        │  load: Read file     │
        │  Output: []*Document │
        └──────────────────────┘
                   ↓
        ┌──────────────────────┐
        │  chunk: Split into   │
        │  chunks              │
        │  Output: []*Document │
        └──────────────────────┘
                   ↓
        ┌──────────────────────┐
        │  score: Parallel     │
        │  scoring             │
        │  (MaxConcurrency=5)  │
        │  Output:             │
        │  []scoredChunk       │
        └──────────────────────┘
                   ↓
        ┌──────────────────────┐
        │  filter: Select      │
        │  top-k               │
        │  Output:             │
        │  []scoredChunk       │
        └──────────────────────┘
                   ↓
        ┌──────────────────────┐
        │  answer: Generate    │
        │  answer              │
        │  Output: Output      │
        └──────────────────────┘
                   ↓
        ┌──────────────────────┐
        │  Return result       │
        │  {answer, sources}   │
        └──────────────────────┘
```

## Chapter Summary

- **Graph Tool**: wraps complex workflows as a Tool, supporting multi-step coordination
- **compose.Workflow**: the core component for building workflows
- **BatchNode**: parallel processing of multiple tasks
- **FieldMapping**: passes data across nodes
- **Interrupt and resume**: Graph Tool supports the Checkpoint mechanism

## Further Reading

**Other Graph Tool applications:**

- Multi-document RAG: process multiple documents in parallel
- Multi-model collaboration: different models handle different tasks
- Complex decision trees: choose different branches based on conditions

**Performance optimization:**

- Adjust MaxConcurrency to control parallelism
- Use caching to avoid redundant computation
- Streaming output to improve user experience
