---
Description: ""
date: "2025-03-12"
lastmod: ""
tags: []
title: 'Eino: Flow 集成'
weight: 3
---

大模型应用是存在**通用场景和模式**的，若把这些场景进行抽象，就能提供一些可以帮助开发者快速构建大模型应用的模版。Eino 的 Flow 模块就是在做这件事。

目前 Eino 已经集成了 `react agent`、`host multi agent` 两个常用的 Agent 模式，以及 MultiQueryRetriever, ParentIndexer 等。

- React Agent: [Eino: React Agent 使用手册](/zh/docs/eino/core_modules/flow_integration_components/react_agent_manual)
- Multi Agent: [Eino Tutorial: Host Multi-Agent ](/zh/docs/eino/core_modules/flow_integration_components/multi_agent_hosting)

## Flow 进编排

Flow 集成组件自身一般是由一个或多个 graph 编排而成。同时，这些 flow 也可以作为节点进入其他 graph 的编排之中，方式有三种：

1. 如果一个 flow 实现了某个组件的 interface，可用该组件对应的 AddXXXNode 等方法加入编排，如 multiquery retriever：

   ```go
   // instantiate the flow: multiquery.NewRetriever

   vk, err := newVikingDBRetriever(ctx, vikingDBHost, vikingDBRegion, vikingDBAK, vikingDBSK)
   if err != nil {
       logs.Errorf("newVikingDBRetriever failed, err=%v", err)
       return
   }

   llm, err := newChatModel(ctx, openAIBaseURL, openAIAPIKey, openAIModelName)
   if err != nil {
       logs.Errorf("newChatModel failed, err=%v", err)
       return
   }

   // rewrite query by llm
   mqr, err := multiquery.NewRetriever(ctx, &multiquery.Config{
       RewriteLLM:      llm,
       RewriteTemplate: nil, // use default
       QueryVar:        "",  // use default
       LLMOutputParser: nil, // use default
       MaxQueriesNum:   3,
       OrigRetriever:   vk,
       FusionFunc:      nil, // use default fusion, just deduplicate by doc id
   })
   if err != nil {
       logs.Errorf("NewMultiQueryRetriever failed, err=%v", err)
       return
   }

   // add the flow to graph
   graph := compose.NewGraph[string, *schema.Message]()
   _ = graph.AddRetrieverNode("multi_query_retriever", mqr, compose.WithOutputKey("context"))
   _ = graph.AddEdge(compose._START_, "multi_query_retriever")
   _ = graph.AddChatTemplateNode("template", prompt.FromMessages(schema._FString_, schema.UserMessage("{context}")))

   // ...
   ```
2. 如果一个 flow 内部是由单个 graph 编排而成，且 flow 的功能可完全等价于这个 graph 的运行（没有不能转化成 graph run 的定制逻辑），则可以将该 flow 的 graph 导出，通过 AddGraphNode 等方法加入编排，如 ReAct Agent 和 Host Multi-Agent：

   ```go
   // instantiate the host multi-agent
   hostMA, err := NewMultiAgent(ctx, &MultiAgentConfig{
       Host: Host{
          ChatModel: mockHostLLM,
       },
       Specialists: []*Specialist{
          specialist1,
          specialist2,
       },
   })
   assert.Nil(t, err)

   // export graph and []GraphAddNodeOption from host multi-agent
   maGraph, opts := hostMA.ExportGraph()

   // add to another graph 
   fullGraph, err := compose.NewChain[map[string]any, *schema.Message]().
       AppendChatTemplate(prompt.FromMessages(schema._FString_, schema.UserMessage("what's the capital city of {country_name}"))).
       AppendGraph(maGraph, append(opts, compose.WithNodeKey("host_ma_node"))...).
       Compile(ctx)
   assert.Nil(t, err)

   // invoke the other graph
   // convert the flow's own option to compose.Option if needed
   // assign options to flow's nodes if needed
   out, err := fullGraph.Invoke(ctx, map[string]any{"country_name": "China"}, 
       compose.WithCallbacks(ConvertCallbackHandlers(mockCallback)).
           DesignateNodeWithPath(compose.NewNodePath("host_ma_node", hostMA.HostNodeKey())))
   ```
3. 所有 flow 应当都可以封装成 Lambda，通过 AddLambdaNode 等方法加入编排。目前所有的 flow 都可以通过 1 或 2 加入编排，所以不需要降级到使用 Lambda。如果要用，使用姿势是：

   ```go
   // instantiate the flow
   a, err := NewAgent(ctx, &AgentConfig{
       Model: cm,
       ToolsConfig: compose.ToolsNodeConfig{
          Tools: []tool.BaseTool{fakeTool, &fakeStreamToolGreetForTest{}},
       },

       MaxStep: 40,
   })
   assert.Nil(t, err)

   chain := compose.NewChain[[]*schema.Message, string]()

   // convert the flow to Lambda
   agentLambda, err := compose.AnyLambda(a.Generate, a.Stream, nil, nil)
   assert.Nil(t, err)

   // add lambda to another graph
   chain.
       AppendLambda(agentLambda).
       AppendLambda(compose.InvokableLambda(func(ctx context.Context, input *schema.Message) (string, error) {
          t.Log("got agent response: ", input.Content)
          return input.Content, nil
       }))
   r, err := chain.Compile(ctx)
   assert.Nil(t, err)

   // invoke the graph
   res, err := r.Invoke(ctx, []*schema.Message{{Role: schema._User_, Content: "hello"}},
       compose.WithCallbacks(callbackForTest))
   ```

三个方法的对比如下：

<table>
<tr><td>方式</td><td>适用场景</td><td>优势</td></tr>
<tr><td>作为组件</td><td>需实现组件的 interface</td><td>简单直接，语义清晰</td></tr>
<tr><td>作为 Graph</td><td>由单个 graph 编排而成，功能不超出这个 graph 的范围</td><td>graph 内节点对外层 graph 暴露，可统一分配运行时 option，相比 Lambda 少一层转化，可通过 GraphCompileCallback 获取上下级 graph 关系</td></tr>
<tr><td>作为 Lambda</td><td>所有</td><td>普适</td></tr>
</table>
