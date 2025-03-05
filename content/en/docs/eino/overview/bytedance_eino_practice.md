---
Description: ""
date: "2025-03-04"
lastmod: ""
tags: []
title: Bytedance LLM Application Go Development Framework-Eino Practice
weight: 0
---

## **Preface**

Developing software applications based on LLMs is like coaching a soccer team: **components** are players with various abilities, **orchestration** is the flexible and versatile tactics, and **data** is the flowing soccer ball. Eino is an open-source LLM application development framework by ByteDance. It features a stable core, flexible extensibility, comprehensive tool ecosystem, and is reliable and easy to maintain, backed by rich practical experience from applications like Doubao and TikTok. Using Eino for the first time is like taking over a powerful soccer team. Even if the coach is a promising newcomer, they can still lead high-quality and content-rich matches.

So, let's embark on this journey together!

## **Meet the Players**

The basic building blocks of Eino applications are components with various functionalities, just like a soccer team consists of players in different positions:

<table>
<tr><td>Component name</td><td>Component function</td></tr>
<tr><td>ChatModel</td><td>Interacts with the large model, inputs the Message context, and obtains the model's output Message</td></tr>
<tr><td>Tool</td><td>Interacts with the world, and executes the corresponding action based on the model's output</td></tr>
<tr><td>Retriever</td><td>Obtains relevant context to enable the model's output to be based on high-quality facts</td></tr>
<tr><td>ChatTemplate</td><td>Receives external input and converts it into a preset format prompt for the model</td></tr>
<tr><td>Document Loader</td><td>Loads the specified text</td></tr>
<tr><td>DocumentTransformer</td><td>Transforms the specified text according to specific rules</td></tr>
<tr><td>Indexer</td><td>Stores files and builds an index for subsequent use by the Retriever</td></tr>
<tr><td>Embedding</td><td>A common dependency of the Retriever and Indexer, converting text into vectors to capture text semantics</td></tr>
<tr><td>Lambda</td><td>User-defined function</td></tr>
</table>

These components abstractly represent fixed input/output types, Option types, and method signatures:

```go
type ChatModel interface {
    Generate(ctx context.Context, input []*schema.Message, opts ...Option) (*schema.Message, error)
    Stream(ctx context.Context, input []*schema.Message, opts ...Option) (
       *schema.StreamReader[*schema.Message], error)
    BindTools(tools []*schema.ToolInfo) error
}
```

Actual operation requires specific component **implementations**:

<table>
<tr><td>Component name</td><td>Official component implementation</td></tr>
<tr><td>ChatModel</td><td>OpenAI, Claude, Gemini, Ark, Ollama...</td></tr>
<tr><td>Tool</td><td>Google Search, Duck Duck Go...</td></tr>
<tr><td>Retriever</td><td>Elastic Search, Volc VikingDB...</td></tr>
<tr><td>ChatTemplate</td><td>DefaultChatTemplate...</td></tr>
<tr><td>Document Loader</td><td>WebURL, Amazon S3, File...</td></tr>
<tr><td>Document Transformer</td><td>HTMLSplitter, ScoreReranker...</td></tr>
<tr><td>Indexer</td><td>Elastic Search, Volc VikingDB...</td></tr>
<tr><td>Embedding</td><td>OpenAI, Ark...</td></tr>
<tr><td>Lambda</td><td>JSONMessageParser...</td></tr>
</table>

In the process of developing with Eino, the first thing to do is to decide "which component abstraction do I need to use," and then decide "which specific component implementation do I need to use." It's like a soccer team first decides "I need a forward," and then selects "who will be the forward."

Components can be used individually like any Go interface. However, to truly unleash the power of the Eino team, multiple components need to be orchestrated together, forming an interconnected whole.

## Devising Tactics

In the Eino orchestration scenario, each component becomes a "Node", the one-to-one flow relationship between nodes becomes an "Edge", and the N-to-1 flow relationship becomes a "Branch". Applications developed based on Eino, through the flexible orchestration of various components, can support infinitely rich business scenarios, much like a football team can adopt various formations.

Football team tactics are ever-changing but follow certain patterns; some focus on ball control, while others are straightforward. For Eino, there are also more suitable orchestration methods for different business forms:

<table>
<tr><td>Arrangement Method</td><td>Characteristics and Scenarios</td></tr>
<tr><td>Chain</td><td>A chained directed graph that always moves forward, simple. Suitable for scenarios where data flows in one direction without complex branches.</td></tr>
<tr><td>Graph</td><td>A directed graph with maximum flexibility; or a directed acyclic graph that does not support branches but has a clear ancestral relationship.</td></tr>
</table>

Chain, such as the simple Chain of ChatTemplate + ChatModel:

```go
chain, _ := NewChain[map[string]any, *Message]().
           AppendChatTemplate(prompt).
           AppendChatModel(model).
           Compile(ctx)
chain.Invoke(ctx, map[string]any{"query": "what's your name?"})
```

Graph, where an Agent executes ToolCall at most once:

<a href="/img/eino/en_eino_agent_graph.png" target="_blank"><img src="/img/eino/en_eino_agent_graph.png" width="100%" /></a>

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
if err != nil {
    return err
}
out, err := r.Invoke(ctx, map[string]any{"query":"Beijing's weather this weekend"})
```

## **Understanding Tools**

Now, imagine the soccer team you are managing uses some high-tech solutions. For instance, at the moment of receiving and passing the ball, each player's jersey can automatically record the speed and angle of the ball, and transmit this information to the server on the sidelines. This way, after the match, you can compile statistics on each player's ball-handling and decision-making time.

In Eino, the start and end of each component's operation can also use the Callbacks mechanism to capture inputs, outputs, and some additional information, handling cross-cutting concerns. For example, a simple logging capability:

```go
handler := NewHandlerBuilder().
    OnStartFn(
       func(ctx context.Context, info *RunInfo, input CallbackInput) context.Context {
           log.Printf("onStart, runInfo: %v, input: %v", info, input)
           return ctx
    }).
    OnEndFn(
        func(ctx context.Context, info *RunInfo, output CallbackOutput) context.Context {
           log.Printf("onEnd, runInfo: %v, out: %v", info, output)
           return ctx
    }).
    Build()

// inject into graph
compiledGraph.Invoke(ctx, input, WithCallbacks(handler))
```

Now imagine this soccer team has more than one high-tech feature. For instance, the coach can create "strategy pouches" before the match and hide them in the jerseys. When a player receives the ball, the pouch plays a pre-recorded tip from the coach, such as "Don't hesitate, shoot directly!". Sounds interesting, but there's a challenge: some pouches are meant for all players, some are meant for a specific group of players (such as forwards), and some pouches are meant for individual players. How can the distribution of these strategy pouches be effectively managed?

In Eino, a similar issue is the distribution of call options during the graph run:

```go
// Call option effective for all nodes
compiledGraph.Invoke(ctx, input, WithCallbacks(handler))

// Call option effective only for specific types of nodes
compiledGraph.Invoke(ctx, input, WithChatModelOption(model.WithTemperature(0.5)))

// Call option effective only for specific nodes
compiledGraph.Invoke(ctx, input, WithCallbacks(handler).DesignateNode("node_1"))
```

## **Discovering the Secret Trick**

Now, imagine that your team has some star players (the midfield brain ChatModel and the forward ace StreamableTool) with incredible skills. The balls they kick move so fast that there are afterimages, making it look like a whole soccer ball has been sliced into many pieces! Facing such "streamed" soccer balls, the opponent players are at a loss on how to catch them, but all the players on your team can perfectly catch the ball—either catching each piece of the "streamed" soccer ball directly and processing it instantly, or automatically assembling all the pieces into a complete soccer ball before handling it. With such a secret trick, your team can overwhelm other teams!

In Eino, developers only need to focus on whether a component can handle streamed input and generate streamed output in "real business scenarios." Based on the real scenario, the specific component implementation (including Lambda Functions) should implement methods that conform to this streaming paradigm:

```go
// ChatModel implements the Invoke (non-stream input and output) and Stream (non-stream input, stream output) paradigms
type ChatModel interface {
    Generate(ctx context.Context, input []*Message, opts ...Option) (*Message, error)
    Stream(ctx context.Context, input []*Message, opts ...Option) (
       *schema.StreamReader[*Message], error)
}

// Lambda can implement any of the four streaming paradigms

// Invoke is the type of the invokable lambda function.
type Invoke[I, O, TOption any] func(ctx context.Context, input I, opts ...TOption) (
    output O, err error)

// Stream is the type of the streamable lambda function.
type Stream[I, O, TOption any] func(ctx context.Context,
    input I, opts ...TOption) (output *schema.StreamReader[O], err error)

// Collect is the type of the collectable lambda function.
type Collect[I, O, TOption any] func(ctx context.Context,
    input *schema.StreamReader[I], opts ...TOption) (output O, err error)

// Transform is the type of the transformable lambda function.
type Transform[I, O, TOption any] func(ctx context.Context,
    input *schema.StreamReader[I], opts ...TOption) (output *schema.StreamReader[O], err error)
```

Eino's orchestration capability automatically performs two important tasks:

1. When the upstream is a stream, but the downstream can only accept non-stream, it automatically concatenates.
2. When the upstream is non-stream, but the downstream can only accept a stream, it automatically streams (T -> StreamReader[T]).

In addition, Eino's orchestration capability also automatically handles stream merging, replication, and other details, bringing the core of LLM applications—stream processing—to perfection.

## A Training Match -- Eino Smart Assistant

Alright, now that you have a preliminary understanding of the main capabilities of Eino, it's time to have a training match using components, orchestration, and tools (aspects, visualization) to personally experience its power.

### **Scenario Setup**

Eino Smart Assistant: According to user requests, retrieve necessary information from the knowledge base and invoke various tools as needed to process the user's request. The list of tools is as follows:

- DuckDuckGo: Search the internet for information using DuckDuckGo
- EinoTool: Obtain engineering information about Eino, such as repository links, document links, etc.
- GitClone: Clone the specified repository locally
- TaskManager: Add, view, remove tasks
- OpenURL: Open files, web, and other types of links using the system's default application

This article primarily presents a demo sample; users can replace their knowledge base and tools according to their scenarios to build the smart assistant they need.

First, let's see what kind of effects can be achieved with an Agent assistant built on Eino.

<iframe height="400px" width="100%" src="https://player.bilibili.com/player.html?autoplay=0&bvid=BV1VZNRenEDs&t=0" ></iframe>

We will construct this Eino Smart Assistant in two steps:

- Knowledge Indexing: Using various methods such as tokenization and vectorization, we construct an index from our accumulated knowledge in a specific field, so that when receiving user requests, we can index the appropriate context. This article uses vectorized indexing to build the knowledge base.
- Eino Agent: Based on the user's request information and the pre-constructed callable tools, let the ChatModel decide the next action to be performed or output the final result. The execution results of the Tool will be inputted to the ChatModel again, allowing the ChatModel to judge the next action until the user's request is completed.

### **Task Workflow**

#### **Knowledge Indexing**

Split and vectorize the Eino User Guide in Markdown format using appropriate strategies and store it in RedisSearch's VectorStore as the Eino knowledge base.

<a href="/img/eino/en_eino_practice_graph.png" target="_blank"><img src="/img/eino/en_eino_practice_graph.png" width="100%" /></a>

#### **Eino Agent**

Retrieve information from the Eino knowledge base in response to user requests, construct messages using the ChatTemplate, request the React Agent, and loop through the corresponding tools as needed until the user's request is processed.

<a href="/img/eino/en_eino_practice_agent_graph.png" target="_blank"><img src="/img/eino/en_eino_practice_agent_graph.png" width="100%" /></a>

### Required Tools

In the practice scenario of building the "Eino Smart Assistant" from scratch, the following tools are needed:

<table>
<tr><td>Toolkit</td><td>Required or not</td><td>Function and role</td><td>Resource list</td></tr>
<tr><td>Eino framework</td><td>Required</td><td><li>A framework for full-code development of AI applications - Provides various atomic components and orchestration capabilities related to AI</li></td><td><li><a href="https://github.com/cloudwego/eino">https://github.com/cloudwego/eino</a> - <a href="https://github.com/cloudwego/eino-ext">https://github.com/cloudwego/eino-ext</a> </li><li><a href="https://www.cloudwego.io/zh/docs/eino/">「Eino User Manual」</a></li></td></tr>
<tr><td>EinoDev plugin (Goland)</td><td>Not required</td><td><li>Visual drag-and-drop orchestration of AI applications and generation of full code - Visual debugging of orchestrated AI applications - EinoDev currently only has a Goland version, and a VSCode version will be provided later</li></td><td><li><a href="https://www.cloudwego.io/zh/docs/eino/core_modules/devops/ide_plugin_guide/">「Installation of EinoDev plugin」</a></li><li><a href="https://www.cloudwego.io/zh/docs/eino/core_modules/devops/visual_orchestration_plugin_guide/">「Function guide of EinoDev visual orchestration plugin」</a></li></td></tr>
<tr><td>Volcano Engine Doubao model/vectorization</td><td>Required</td><td><li>Doubao model: ArkChatModel, providing online conversation text reasoning capabilities - Vectorization: Vectorizing text for vector index construction of Eino knowledge base</li></td><td>「Volcano Engine Doubao model」: <li><a href="https://console.volcengine.com/ark">https://console.volcengine.com/ark</a> </li><li>After real-name authentication, it needs to be purchased for use, and each person has a free token quota of 500,000</li><a href="/img/eino/eino_practice_ark_create_model.png" target="_blank"><img src="/img/eino/eino_practice_ark_create_model.png" width="100%" /></a></td></tr>
<tr><td>Docker</td><td>Not required</td><td><li>Provides RedisSearch component through Docker - Can also be manually deployed independently</li></td><td><li><a href="https://docs.docker.com/get-started/">Docker docs</a></li></td></tr>
<tr><td>Eino intelligent assistant code example</td><td>Required</td><td><li>The complete example code of this article</li></td><td><li><a href="https://github.com/cloudwego/eino-examples/tree/main/quickstart/eino_assistant">https://github.com/cloudwego/eino-examples/tree/main/quickstart/eino_assistant</a></li></td></tr>
</table>

### **Index Knowledge Base**

> Example repository path: [https://github.com/cloudwego/eino-examples/tree/main/quickstart/eino_assistant](https://github.com/cloudwego/eino-examples/tree/main/quickstart/eino_assistant)
>
> In the following text, relative paths to this directory are used to identify resource locations.

Build a command-line tool that recursively traverses all Markdown files in a specified directory. Split the content of the Markdown files into different segments according to the headings, and vectorize each text segment using Volcengine's Doubao embedding model, storing them in Redis VectorStore.

> Command-line tool directory: cmd/knowledge_indexing
>
> Markdown files directory: cmd/knowledge_indexing/eino-dcos

When developing the "Index Knowledge Base" application, first use the Goland EinoDev plugin provided by the Eino framework to visually drag and arrange the core application logic of KnowledgeIndexing, generating code into the eino_graph/knowledge_indexing directory.

After the code is generated, first manually complete the construction methods of each component in this directory, and then call the BuildKnowledgeIndexing method in the business scenario to build and use the Eino Graph instance.

Next, the development process of KnowledgeIndexing will be introduced step by step.

#### LLM Resource Creation

Volcengine is ByteDance's cloud service platform, from which you can register and call Doubao LLMs (there is a large amount of free quota).

- Create doubao-embedding-large as the vectorization model for building the knowledge base, and create doubao-pro-4k resources as the model when the agent is in conversation.
- "Volcengine Online Inference": [https://console.volcengine.com/ark](https://console.volcengine.com/ark)

<a href="/img/eino/model_create.gif" target="_blank"><img src="/img/eino/model_create.gif" width="100%" /></a>

#### **Launch Redis Stack**

This article will use Redis as the Vector Database. For users' convenience in building the environment, we provide Docker's quick command.

- Provide docker-compose.yml in eino-examples/quickstart/eino_assistant
- Provide Redis's initial knowledge base in the eino-examples/quickstart/eino_assistant/data directory

Start directly with the official redis stack image

```bash
# go to eino_assistant dir
cd xxx/eino-examples/quickstart/eino_assistant

docker-compose up -d
```

<a href="/img/eino/redis_start_up.gif" target="_blank"><img src="/img/eino/redis_start_up.gif" width="100%" /></a>

- After starting, open the local port 8001 to access the Redis Stack web interface

> Open the link in your browser: [http://127.0.0.1:8001](http://127.0.0.1:8001)

#### **Visual Development**

> "Eino Visual Development" aims to reduce the learning curve for Eino AI application development and improve development efficiency. Developers familiar with Eino can choose to skip the "Eino Visual Development" phase and directly engage in full-code development based on Eino's API.

1. Install the EinoDev plugin and open the Eino Workflow feature

   - Graph name: KnowledgeIndexing
   - Node trigger mode: Triggered after all predecessor nodes are executed
   - Input type: document.Source
   - Import path of input type: github.com/cloudwego/eino/components/document
   - Output type: []string
   - Leave other items empty

   <a href="/img/eino/eino_practice_debug_panel.png" target="_blank"><img src="/img/eino/eino_practice_debug_panel.png" width="100%" /></a>
2. Following the process described in "**Index Knowledge Base**", select the component library you need from Eino Workflow. The components required in this document are as follows:

   - document/loader/file
     - Load files from the specified URI, parse them into text content, and return them as a list of schema.Document.
   - document/transformer/splitter/markdown
     - Further split the text content loaded from FileLoader into suitable sizes to balance the constraints of vectorization calculation/storage and recall effectiveness.
   - indexer/redis
     - Store the original text and index fields of schema.Document in the Redis Vector Database
   - embedding/ark
     - Use Ark platform's vectorization model to perform vectorization calculation on Content and other contents in schema.Document
3. Arrange the selected components according to the expected topology. After the arrangement is completed, click "Generate Code" to the specified directory.

   - The code for "**Index Knowledge Base**" is generated to: eino_assistant/eino/knowledgeindexing
   - This example can directly copy the Graph Schema from eino/knowledge_indexing.json to quickly build the graph in the example

   <table><tbody><tr>
   <td>
      <a href="/img/eino/eino_practice_indexing_graph.png" target="_blank"><img src="/img/eino/eino_practice_indexing_graph.png" width="100%" /></a>
   </td><td>
      <a href="/img/eino/eino_practice_indexing_show_codes.png" target="_blank"><img src="/img/eino/eino_practice_indexing_show_codes.png" width="100%" /></a>
   </td></tr></tbody></table>
4. Complete the constructors of each component as needed, filling in the configuration content required when creating the component instance

   <table><tbody><tr>
   <td>
      <a href="/img/eino/eino_practice_indexing_config.png" target="_blank"><img src="/img/eino/eino_practice_indexing_config.png" width="100%" /></a>
   </td><td>
      <a href="/img/eino/eino_practice_indexing_index_config.png" target="_blank"><img src="/img/eino/eino_practice_indexing_index_config.png" width="100%" /></a>
   </td></tr></tbody></table>
5. After supplementing the configuration content of the components, you can call the BuildKnowledgeIndexing method to use it in the business scenario

#### **Improve Code**

- The Eino orchestration code generated through visual development cannot be guaranteed to be directly usable; manual reading and checking of the code's integrity are required.
- The core function generated is BuildKnowledgeIndexing(). Users can call this method where needed, create an instance, and use it.

In the "Knowledge Base Indexing" scenario, BuildKnowledgeIndexing needs to be wrapped into a command, read model configuration and other information from environment variables, initialize the configuration content of BuildKnowledgeIndexing, scan the specified directory for Markdown files, and execute the indexing and storage of Markdown files.

> For detailed code, see: cmd/knowledgeindexing/main.go

<a href="/img/eino/eino_practice_indexing_new_runner.png" target="_blank"><img src="/img/eino/eino_practice_indexing_new_runner.png" width="100%" /></a>

#### **Run**

> PS: In the example project, part of the eino document has been vectorized into Redis

1. In the .env file, obtain and fill in the values of ARK_EMBEDDING_MODEL and ARK_API_KEY according to the annotation instructions, and run the KnowledgeIndexing command with the following instructions

   ```bash
   cd xxx/eino-examples/quickstart/eino_assistant # 进入 eino assistant 的 example 中

   # Modify the required environment variables in .env (LLM information, trace platform information)
   source .env

   # As the example Markdown file is stored in the cmd/knowledgeindexing/eino-docs directory, and the code specifies the relative path eino-docs, you need to run the command in the cmd/knowledgeindexing directory
   cd cmd/knowledgeindexing
   go run main.go
   ```

   <a href="/img/eino/knowledgeindexing.gif" target="_blank"><img src="/img/eino/knowledgeindexing.gif" width="100%" /></a>
2. Once the execution is successful, the construction of the Eino knowledge base is completed, and you can see the vectorized content in the Redis Web UI.

> Open the link in the browser： [http://127.0.0.1:8001](http://127.0.0.1:8001)

<a href="/img/eino/redis_keys.jpeg" target="_blank"><img src="/img/eino/redis_keys.jpeg" width="100%" /></a>

### Eino Agent

> Example repository path：[https://github.com/cloudwego/eino-examples/tree/main/quickstart/eino_assistant](https://github.com/cloudwego/eino-examples/tree/main/quickstart/eino_assistant)
>
> Below, relative paths relative to this directory are used to identify resource locations

Construct a ReAct Agent based on Eino that retrieves knowledge from Redis VectorStore to answer user questions and assist users in executing certain operations, i.e., a typical RAG ReAct Agent. It can automatically help users record tasks, clone repositories, open links, etc., based on the dialogue context.

#### LLM Resource Creation

Continue using doubao-embedding-large and doubao-pro-4k created in the "Index Knowledge Base" section

#### Start RedisSearch

Continue using the Redis Stack started in the "Index Knowledge Base" section

#### Visual Development

<iframe height="400px" width="100%" src="https://player.bilibili.com/player.html?autoplay=0&bvid=BV15ZNRenEUf&t=0" ></iframe>
1. Open the EinoDev plugin, navigate to the Eino Workflow page, and create a new canvas.
   - Graph Name: EinoAgent
   - Node Trigger Mode: Trigger after any predecessor node finishes
   - Input Type Name: *UserMessage
   - Input Package Path: ""
   - Output Type Name: *schema.Message
   - Output Import Path: github.com/cloudwego/eino/schema
   - Leave other fields blank
2. According to the process description in the previous section "**Eino Agent**", select the component library needed from Eino Workflow. The following components are used in this document:
   - lambda: Converts any developer function func(ctx context.Context, input I) (output O, err error), into an orchestrable node. In EinoAgent, there are two conversion scenarios:
      - Converts *UserMessage messages into a map[string]any node for ChatTemplate
      - Converts *UserMessage into the input query for RedisRetriever
   - retriever/redis
      - Retrieves and returns context related to the user Query based on semantic relevance from the Redis Vector Database, in the form of schema.Document List.
   - prompt/chatTemplate
      - Constructs a Prompt template using string literals, supporting text and message placeholders, and converts any map[string]any input into a Message List that can be directly input into the model.
   - flow/agent/react
      - Based on the ChatModel provided by the developer and callable toolsets, automatically decides the next Action in response to user queries until a final answer can be generated.
   - model/ark
      - The Ark platform provides LLMs capable of completing conversational texts, such as the Doubao model. This acts as a dependency injection for the ReAct Agent.
   - Callable tool list
      - Internet search tool (DuckDuckGo), EinoTool, GitClone, TaskManager, OpenURL
3. Arrange the selected components according to the desired topology. After arranging, click "Generate Code" to the specified directory.
   - In this example, the code for the "**Eino Agent**" is generated to: eino/einoagent
   - This example can quickly be constructed by copying the Graph Schema from eino/eino_agent.json
      <table><tbody><tr>
      <td>
            <a href="/img/eino/eino_practice_graph.png" target="_blank"><img src="/img/eino/eino_practice_graph.png" width="100%" /></a>
      </td><td>
            <a href="/img/eino/eino_practice_agent_graph_codes.png" target="_blank"><img src="/img/eino/eino_practice_agent_graph_codes.png" width="100%" /></a>
      </td></tr></tbody></table>

4. Complete the construction functions for each component as needed, adding the required configuration content when creating component instances in the construction functions.

   <table><tbody><tr>
   <td>
      <a href="/img/eino/eino_practice_agent_lambda.png" target="_blank"><img src="/img/eino/eino_practice_agent_lambda.png" width="100%" /></a>
   </td><td>
      <a href="/img/eino/eino_practice_agent_model_config.png" target="_blank"><img src="/img/eino/eino_practice_agent_model_config.png" width="100%" /></a>
   </td></tr></tbody></table>
5. Once the configuration content for the components is supplemented, you can call the BuildEinoAgent method to use it in the business scenario.

#### **Improve the Code**

In the context of "Eino Agent," the Graph instance constructed by BuildEinoAgent can: recall context from the Eino knowledge base based on user requests and conversation history, and then combine a list of callable tools, with the ChatModel cyclically deciding the next step, whether to call a tool or output the final result.

The following diagram is an application of the generated BuildEinoAgent function, encapsulating the Eino Agent as an HTTP service interface:

<a href="/img/eino/eino_practice_agent_runner.png" target="_blank"><img src="/img/eino/eino_practice_agent_runner.png" width="100%" /></a>

#### **Running**

1. In the .env file, obtain and fill in the values for each variable according to the comments. Then, start the Eino Agent Server with the following command:

   ```bash
   cd eino-examples/eino_assistant # Enter the example of Eino assistant
   # Modify the required environment variables in .env (LLM information, trace platform information)
   source .env

   # To use the data directory, execute the command in the eino_assistant directory
   go run cmd/einoagent/*.go


   <a href="BYUKbIgtKoL4DaxUBoScPpX4nkd" target="_blank"><img src="BYUKbIgtKoL4DaxUBoScPpX4nkd" /></a>

   6. After starting, you can access the following link to open Eino Agent Web

   Eino Agent Web: http://127.0.0.1:8080/agent/
   ```

   <a href="/img/eino/eino_agent.gif" target="_blank"><img src="/img/eino/eino_agent.gif" width="100%" /></a>
2. After starting, you can access the following link to open Eino Agent Web

> Eino Agent Web：[http://127.0.0.1:8080/agent/](http://127.0.0.1:8080/agent/)

#### **Observation (optional)**

##### APMPlus

If you specify `APMPLUS_APP_KEY` in the .env file during runtime，you can log in to the corresponding account on the [Volcengine APMPlus](https://console.volcengine.com/apmplus-server%22) platform to view the trace and metric details of the requests.

<a href="/img/eino/callback_apmplus.gif" target="_blank"><img src="/img/eino/callback_apmplus.gif" width="100%" /></a>

##### Langfuse

If you specify `LANGFUSE_PUBLIC_KEY` and `LANGFUSE_SECRET_KEY` in the .env file during runtime, you can log in to the corresponding account on the Langfuse platform to view the trace details of the requests.

<a href="/img/eino/langfuse_callback.gif" target="_blank"><img src="/img/eino/langfuse_callback.gif" width="100%" /></a>

## **Relevant Links**

Project address：[https://github.com/cloudwego/eino](https://github.com/cloudwego/eino)，[https://github.com/cloudwego/eino-ext](https://github.com/cloudwego/eino-ext)

Eino User Manual：[https://www.cloudwego.io/zh/docs/eino/](https://www.cloudwego.io/zh/docs/eino/)

Project website: __[https://www.cloudwego.io](https://www.cloudwego.io)__

Scan the QR code to join the Feishu community:

<a href="/img/eino/eino_lark_qr_code.png" target="_blank"><img src="/img/eino/eino_lark_qr_code.png" width="100%" /></a>
