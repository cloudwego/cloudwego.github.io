---
Description: ""
date: "2025-11-20"
lastmod: ""
tags: []
title: ByteDance LLM Application Go Framework — Eino in Practice
weight: 2
---

## Preface

Building LLM-powered applications is like coaching a football team: **components** are players, **orchestration** is the strategy, and **data** is the ball flowing through the team. Eino is ByteDance’s open-source framework for LLM application development — stable core, flexible extensions, full tooling, and battle-tested in real apps like Doubao and TikTok. Picking up Eino feels like inheriting a strong team: even a new coach can lead a meaningful game quickly.

Let’s kick off the ramp-up journey.

## Meet the Players

Eino applications are built from versatile components:

<table>
<tr><td>Component</td><td>Purpose</td></tr>
<tr><td>ChatModel</td><td>Interact with LLM: input `Message[]`, output `Message`</td></tr>
<tr><td>Tool</td><td>Interact with the world: execute actions based on model output</td></tr>
<tr><td>Retriever</td><td>Fetch context so answers are grounded</td></tr>
<tr><td>ChatTemplate</td><td>Convert external input into prompt messages</td></tr>
<tr><td>Document Loader</td><td>Load text</td></tr>
<tr><td>Document Transformer</td><td>Transform text</td></tr>
<tr><td>Indexer</td><td>Store and index documents for retrieval</td></tr>
<tr><td>Embedding</td><td>Shared dependency of Retriever/Indexer: text → vector</td></tr>
<tr><td>Lambda</td><td>Custom function</td></tr>
</table>

Each abstraction defines input/output types, options, and method signatures:

```go
type ChatModel interface {
    Generate(ctx context.Context, input []*schema.Message, opts ...Option) (*schema.Message, error)
    Stream(ctx context.Context, input []*schema.Message, opts ...Option) (*schema.StreamReader[*schema.Message], error)
    BindTools(tools []*schema.ToolInfo) error
}
```

Implementations make them concrete:

<table>
<tr><td>Component</td><td>Official implementations</td></tr>
<tr><td>ChatModel</td><td>OpenAI, Claude, Gemini, Ark, Ollama...</td></tr>
<tr><td>Tool</td><td>Google Search, DuckDuckGo...</td></tr>
<tr><td>Retriever</td><td>ElasticSearch, Volc VikingDB...</td></tr>
<tr><td>ChatTemplate</td><td>DefaultChatTemplate...</td></tr>
<tr><td>Document Loader</td><td>WebURL, Amazon S3, File...</td></tr>
<tr><td>Document Transformer</td><td>HTMLSplitter, ScoreReranker...</td></tr>
<tr><td>Indexer</td><td>ElasticSearch, Volc VikingDB...</td></tr>
<tr><td>Embedding</td><td>OpenAI, Ark...</td></tr>
<tr><td>Lambda</td><td>JSONMessageParser...</td></tr>
</table>

Decide the abstraction first (“we need a forward”), then pick an implementation (“who plays forward”). Components can be used standalone, but Eino shines when components are orchestrated.

## Plan the Strategy

In Eino, each component becomes a **Node**; 1→1 connections are **Edges**; N→1 conditional flow is a **Branch**. Orchestration supports rich business logic:

<table>
<tr><td>Style</td><td>Use cases</td></tr>
<tr><td>Chain</td><td>Simple forward-only DAG; ideal for linear flows</td></tr>
<tr><td>Graph</td><td>Directed (cyclic or acyclic) graphs for maximal flexibility</td></tr>
</table>

Chain: simple `ChatTemplate → ChatModel` chain.

<a href="/img/eino/simple_template_and_chatmodel.png" target="_blank"><img src="/img/eino/simple_template_and_chatmodel.png" width="80%" /></a>

```go
chain, _ := NewChain[map[string]any, *Message]().
           AppendChatTemplate(prompt).
           AppendChatModel(model).
           Compile(ctx)
chain.Invoke(ctx, map[string]any{"query": "what's your name?"})
```

Graph: an agent that makes at most one tool call.

<a href="/img/eino/eino_practice_graph_tool_call.png" target="_blank"><img src="/img/eino/eino_practice_graph_tool_call.png" width="100%" /></a>

```go
graph := NewGraph[map[string]any, *schema.Message]()
_ = graph.AddChatTemplateNode("node_template", chatTpl)
_ = graph.AddChatModelNode("node_model", chatModel)
_ = graph.AddToolsNode("node_tools", toolsNode)
_ = graph.AddLambdaNode("node_converter", takeOne)
_ = graph.AddEdge(START, "node_template")
_ = graph.AddEdge("node_template", "node_model")
_ = graph.AddBranch("node_model", branch)
_ = graph.AddEdge("node_tools", "node_converter")
_ = graph.AddEdge("node_converter", END)
compiledGraph, err := graph.Compile(ctx)
out, err := compiledGraph.Invoke(ctx, map[string]any{"query":"Beijing's weather this weekend"})
```

## Operational Tools

Callbacks capture node start/end (and stream variants) for cross-cutting concerns like logging, tracing, metrics:

```go
handler := NewHandlerBuilder().
  OnStartFn(func(ctx context.Context, info *RunInfo, input CallbackInput) context.Context {
      log.Printf("onStart, runInfo: %v, input: %v", info, input); return ctx }).
  OnEndFn(func(ctx context.Context, info *RunInfo, output CallbackOutput) context.Context {
      log.Printf("onEnd, runInfo: %v, out: %v", info, output); return ctx }).
  Build()
compiledGraph.Invoke(ctx, input, WithCallbacks(handler))
```

Call options target all nodes, nodes of a specific type, or a specific node:

```go
compiledGraph.Invoke(ctx, input, WithCallbacks(handler))
compiledGraph.Invoke(ctx, input, WithChatModelOption(model.WithTemperature(0.5)))
compiledGraph.Invoke(ctx, input, WithCallbacks(handler).DesignateNode("node_1"))
```

## Streaming Mastery

Some components output streams (fragments of a final value), others consume streams. Components implement the paradigms that match real business semantics:

```go
// ChatModel supports Invoke and Stream
type ChatModel interface {
    Generate(ctx context.Context, input []*Message, opts ...Option) (*Message, error)
    Stream(ctx context.Context, input []*Message, opts ...Option) (*schema.StreamReader[*Message], error)
}

// Lambda can implement any of the four
type Invoke[I, O, TOption any] func(ctx context.Context, input I, opts ...TOption) (O, error)
type Stream[I, O, TOption any] func(ctx context.Context, input I, opts ...TOption) (*schema.StreamReader[O], error)
type Collect[I, O, TOption any] func(ctx context.Context, input *schema.StreamReader[I], opts ...TOption) (O, error)
type Transform[I, O, TOption any] func(ctx context.Context, input *schema.StreamReader[I], opts ...TOption) (*schema.StreamReader[O], error)
```

Orchestration automatically handles:

1) Concat streams when downstream only accepts non-streaming.
2) Box non-streaming values into single-frame streams when downstream expects streaming.
3) Merge/copy streams as needed.

## A Scrimmage — Eino Assistant

Goal: retrieve from a knowledge base and use tools as needed. Tools:

- DuckDuckGo search
- EinoTool (repo/docs metadata)
- GitClone (clone repo)
- TaskManager (add/view/delete tasks)
- OpenURL (open links/files)

<iframe height="400px" width="100%" src="https://player.bilibili.com/player.html?autoplay=0&bvid=BV1VZNRenEDs&t=0.4" ></iframe>

Two parts:

- Knowledge Indexing: split/encode Markdown docs into vectors
- Eino Agent: decide actions, call tools, iterate until the goal is met

### Workflow

#### Knowledge Indexing

<a href="/img/eino/eino_practice_index_flow.png" target="_blank"><img src="/img/eino/eino_practice_index_flow.png" width="50%" /></a>

#### Eino Agent

<a href="/img/eino/eino_practice_agent_graph.png" target="_blank"><img src="/img/eino/eino_practice_agent_graph.png" width="60%" /></a>

### Required Tools

<table>
<tr><td>Tooling</td><td>Required</td><td>Purpose</td><td>References</td></tr>
<tr><td>Eino</td><td>Yes</td><td>Go-first LLM framework plus components and orchestration</td><td><li>https://github.com/cloudwego/eino</li><li>https://github.com/cloudwego/eino-ext</li><li><a href="https://www.cloudwego.io/docs/eino/">Eino User Manual</a></li></td></tr>
<tr><td>EinoDev (GoLand/VS Code)</td><td>No</td><td>Visual orchestration and debugging</td><td><li><a href="/docs/eino/core_modules/devops/ide_plugin_guide/">Installation</a></li><li><a href="/docs/eino/core_modules/devops/visual_orchestration_plugin_guide/">Orchestration Guide</a></li></td></tr>
<tr><td>Volc Doubao (model/embedding)</td><td>Yes</td><td>Chat model and embedding for indexing</td><td><a href="https://console.volcengine.com/ark">Doubao Console</a></td></tr>
<tr><td>Docker</td><td>No</td><td>Deploy RedisSearch (or install manually)</td><td><a href="https://docs.docker.com/get-started/">Docker Docs</a></td></tr>
<tr><td>Eino Assistant Sample</td><td>Yes</td><td>Complete sample code</td><td><a href="https://github.com/cloudwego/eino-examples/tree/main/quickstart/eino_assistant">Sample repo</a></td></tr>
</table>

### Indexing the Knowledge Base

> Sample repository path: https://github.com/cloudwego/eino-examples/tree/main/quickstart/eino_assistant
>
> Below, paths are relative to this directory

Build a CLI that recursively traverses Markdown files, splits them by headings, vectorizes each chunk with Doubao embedding, and stores vectors in Redis VectorStore.

> Command-line tool directory: `cmd/knowledgeindexing`
>
> Markdown docs directory: `cmd/knowledgeindexing/eino-docs`

Use EinoDev (GoLand/VS Code) to visually compose the core workflow, then generate code into `eino_assistant/eino/knowledgeindexing`. After generation, complete the constructors for each component and call `BuildKnowledgeIndexing` in your business code to build and use the Eino Graph instance.

#### Model Resources

Volcengine Ark hosts Doubao models. Register resources (ample free quota available):

- Create `doubao-embedding-large` for indexing
- Create `doubao-pro-4k` for chat/agent reasoning
- Console: https://console.volcengine.com/ark

<a href="/img/eino/model_create.gif" target="_blank"><img src="/img/eino/model_create.gif" width="100%" /></a>

#### Start Redis Stack

Use Redis Stack as the vector database. The sample provides a quick Docker setup:

- `eino-examples/quickstart/eino_assistant/docker-compose.yml`
- Initial Redis data under `eino-examples/quickstart/eino_assistant/data`

Start with the official Redis Stack image:

```bash
# Switch to eino_assistant
cd xxx/eino-examples/quickstart/eino_assistant

docker-compose up -d
```

<a href="/img/eino/redis_start_up.gif" target="_blank"><img src="/img/eino/redis_start_up.gif" width="100%" /></a>

- After startup, open `http://127.0.0.1:8001` for the Redis Stack web UI

#### Visual Orchestration

> Visual orchestration lowers the learning curve and speeds up development. Experienced users can skip and build directly with Eino APIs.

1) Install EinoDev and open the Eino Workflow panel
   - Installation: `/docs/eino/core_modules/devops/ide_plugin_guide`

   - Graph name: `KnowledgeIndexing`
   - Node trigger mode: triggered after all predecessor nodes are executed
   - Input type: `document.Source`
   - Input type import path: `github.com/cloudwego/eino/components/document`
   - Output type: `[]string`
   - Others: empty

   <a href="/img/eino/eino_practice_debug_panel.png" target="_blank"><img src="/img/eino/eino_practice_debug_panel.png" width="100%" /></a>

2) Select the needed components per the indexing flow:
   - `document/loader/file`: load files from URI into `schema.Document[]`
   - `document/transformer/splitter/markdown`: split content into suitable chunk sizes
   - `indexer/redis`: store raw text and index fields in Redis Vector DB
   - `embedding/ark`: compute embeddings via Ark

3) Compose the topology and click “Generate Code” to a target directory
   - Generate to: `eino_assistant/eino/knowledgeindexing`
   - You can copy the graph schema from `eino/knowledge_indexing.json`

   <table><tbody><tr>
   <td>
      <a href="/img/eino/eino_practice_indexing_graph.png" target="_blank"><img src="/img/eino/eino_practice_indexing_graph.png" width="100%" /></a>
   </td><td>
      <a href="/img/eino/eino_practice_indexing_show_codes.png" target="_blank"><img src="/img/eino/eino_practice_indexing_show_codes.png" width="100%" /></a>
   </td></tr></tbody></table>

4) Complete each component’s constructor with the required configuration

   <table><tbody><tr>
   <td>
      <a href="/img/eino/eino_practice_indexing_config.png" target="_blank"><img src="/img/eino/eino_practice_indexing_config.png" width="100%" /></a>
   </td><td>
      <a href="/img/eino/eino_practice_indexing_index_config.png" target="_blank"><img src="/img/eino/eino_practice_indexing_index_config.png" width="100%" /></a>
   </td></tr></tbody></table>

5) Call `BuildKnowledgeIndexing` from your business code

#### Polish the Code

Generated code may need manual review. The core function is `BuildKnowledgeIndexing()`. Wrap it in a CLI that reads model configuration from environment variables, initializes the graph config, scans the Markdown directory, and performs indexing.

> See: `cmd/knowledgeindexing/main.go`

<a href="/img/eino/eino_practice_indexing_new_runner.png" target="_blank"><img src="/img/eino/eino_practice_indexing_new_runner.png" width="100%" /></a>

#### Run

> The sample already ships with part of the Eino docs pre-indexed in Redis.

1) Populate `.env` with `ARK_EMBEDDING_MODEL` and `ARK_API_KEY`, then:

```bash
cd xxx/eino-examples/quickstart/eino_assistant

# Load env vars (model info, tracing platform info)
source .env

# The sample Markdown lives in cmd/knowledgeindexing/eino-docs.
# Because the code uses the relative path "eino-docs", run from cmd/knowledgeindexing
cd cmd/knowledgeindexing
go run main.go
```

<a href="/img/eino/knowledgeindexing.gif" target="_blank"><img src="/img/eino/knowledgeindexing.gif" width="100%" /></a>

2) After success, open the Redis web UI to inspect the indexed vectors:

> `http://127.0.0.1:8001`

<a href="/img/eino/redis_keys.jpeg" target="_blank"><img src="/img/eino/redis_keys.jpeg" width="100%" /></a>

### Eino Agent

> Sample repository path: https://github.com/cloudwego/eino-examples/tree/main/quickstart/eino_assistant

Build a typical RAG ReAct agent that retrieves context from Redis VectorStore, answers user questions, and executes actions such as task management, repo cloning, and opening links.

#### Model Resources

Reuse `doubao-embedding-large` and `doubao-pro-4k` created earlier.

#### Start RedisSearch

Reuse the Redis Stack from the indexing section.

#### Visual Orchestration

<iframe height="400px" width="100%" src="https://player.bilibili.com/player.html?autoplay=0&bvid=BV15ZNRenEUf&t=1.2" ></iframe>

1) In EinoDev → Eino Workflow, create a canvas:
   - Graph name: `EinoAgent`
   - Node trigger mode: trigger when any predecessor finishes
   - Input type name: `*UserMessage`
   - Input package path: ""
   - Output type name: `*schema.Message`
   - Output import path: `github.com/cloudwego/eino/schema`
   - Others: empty

2) Choose components:
   - `lambda`: wrap `func(ctx context.Context, input I) (O, error)` as nodes
     - Convert `*UserMessage` → `map[string]any` for ChatTemplate
     - Convert `*UserMessage` → query string for RedisRetriever
   - `retriever/redis`: retrieve `schema.Document[]` by semantic similarity
   - `prompt/chatTemplate`: construct prompts from string templates with substitutions
   - `flow/agent/react`: decide next actions with tools and ChatModel
   - `model/ark`: Doubao chat model for ReAct reasoning
   - Tools: DuckDuckGo, EinoTool, GitClone, TaskManager, OpenURL

3) Generate code to `eino/einoagent`; you can copy from `eino/eino_agent.json`

   <table><tbody><tr>
   <td>
      <a href="/img/eino/eino_practice_graph.png" target="_blank"><img src="/img/eino/eino_practice_graph.png" width="100%" /></a>
   </td><td>
      <a href="/img/eino/eino_practice_agent_graph_codes.png" target="_blank"><img src="/img/eino/eino_practice_agent_graph_codes.png" width="100%" /></a>
   </td></tr></tbody></table>

4) Complete constructors with required configuration

   <table><tbody><tr>
   <td>
      <a href="/img/eino/eino_practice_agent_lambda.png" target="_blank"><img src="/img/eino/eino_practice_agent_lambda.png" width="100%" /></a>
   </td><td>
      <a href="/img/eino/eino_practice_agent_model_config.png" target="_blank"><img src="/img/eino/eino_practice_agent_model_config.png" width="100%" /></a>
   </td></tr></tbody></table>

5) Call `BuildEinoAgent` from your business code

#### Polish the Code

`BuildEinoAgent` constructs a graph that, given user input and history, retrieves context from the knowledge base and iteratively decides whether to call a tool or produce the final answer.

Wrap the agent as an HTTP service:

<a href="/img/eino/eino_practice_agent_runner.png" target="_blank"><img src="/img/eino/eino_practice_agent_runner.png" width="100%" /></a>

#### Run

```bash
cd eino-examples/eino_assistant

# Load env vars (model info, tracing platform info)
source .env

# Run from eino_assistant to use the embedded data directory
go run cmd/einoagent/*.go
```

<a href="/img/eino/eino_agent.gif" target="_blank"><img src="/img/eino/eino_agent.gif" width="100%" /></a>

Open the web UI:

> `http://127.0.0.1:8080/agent/`

#### Observability (Optional)

- APMPlus: set `APMPLUS_APP_KEY` in `.env` and view traces/metrics at https://console.volcengine.com/apmplus-server

  <a href="/img/eino/apm_plus_callback.gif" target="_blank"><img src="/img/eino/apm_plus_callback.gif" width="100%" /></a>

- Langfuse: set `LANGFUSE_PUBLIC_KEY` and `LANGFUSE_SECRET_KEY` to inspect trace details

  <a href="/img/eino/langfuse_callback.gif" target="_blank"><img src="/img/eino/langfuse_callback.gif" width="100%" /></a>

## Related Links

Project: https://github.com/cloudwego/eino, https://github.com/cloudwego/eino-ext

Eino User Manual: https://www.cloudwego.io/docs/eino/

Website: __https://www.cloudwego.io__

Join the developer community:

<a href="/img/eino/eino_lark_qr_code_practice.png" target="_blank"><img src="/img/eino/eino_lark_qr_code_practice.png" width="50%" /></a>
