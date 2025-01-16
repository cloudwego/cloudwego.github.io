---
Description: ""
date: "2025-01-16"
lastmod: ""
tags: []
title: 复杂业务逻辑的利器-编排
weight: 4
---

## **使用 Chain 优雅地组织代码**

> 💡
> 本文中示例的代码片段详见：[eino-examples/quickstart/legalchain](https://github.com/cloudwego/eino-examples/blob/main/quickstart/legalchain/main.go)

## **什么是 Chain？**

Chain 是 Eino 框架中用于组织和管理代码流程的核心功能。它让你可以像搭积木一样，把不同的组件串联起来，构建复杂的处理流程。

## **为什么需要 Chain？**

让我们先看一个常见的场景。在 RAG（检索增强生成）系统中，一个典型的处理流程是这样的：

```go
// 1. 使用检索器查找相关文档
docs, err := retriever.Retrieve(ctx, userQuery)

// 2. 处理检索结果，整理成字符串
var docsContext string
for _, doc := range docs {
    docsContext += doc.Content + "\n"
}

// 3. 使用模板生成 prompt
messages, err := template.Format(ctx, map[string]interface{}{
    "docsContext": docsContext,
    "question":    userQuery,
})

// 4. 使用 ChatModel 生成回答
resp, err := chatModel.Generate(ctx, messages)
```

这种写法虽然可以工作，但存在一些明显的问题：

- 代码结构松散，每个步骤都需要**手动处理错误和类型转换**
- **难以复用**，如果其他地方也需要类似的处理流程，就得复制一遍代码
- 缺乏**统一的监控和日志机制**等

使用 Chain，我们可以做到：

- 用清晰的结构定义处理流程，代码更**清晰易读**
- 轻松添加调试日志，查看每个节点的输入输出
  - 可参考 [Eino: 公共切面 - Callbacks](/zh/docs/eino/core_modules/chain_and_graph_orchestration/callbacks_common_aspects) 和 [Eino IDE 插件使用指南](/zh/docs/eino/core_modules/application_development_toolchain/ide_plugin_guide)
- 添加通用的切面能力，比如 tracing、metrics 等
  - 更多详细信息可以参考： [Eino: 公共切面 - Callbacks](/zh/docs/eino/core_modules/chain_and_graph_orchestration/callbacks_common_aspects)
- **复用**已有的处理流程，在此基础上扩展新功能 (把流程拆分成可复用的组件)

## **示例 - 使用 Chain 重构 RAG 逻辑**

在 [🚧 和幻觉说再见-RAG 召回再回答](/zh/docs/eino/quick_start/rag_retrieval_qa) 示例中，我们实现了一个 RAG 系统，让我们看看如何用 Chain 来重构这个 RAG 系统，使其更加优雅和易于维护。

```go
package main

import (
    "context"
    "fmt"
    "os"

    "github.com/cloudwego/eino-ext/components/model/openai"
    "github.com/cloudwego/eino-ext/components/retriever/fornaxknowledge"
    "github.com/cloudwego/eino/components/prompt"
    "github.com/cloudwego/eino/compose"
    "github.com/cloudwego/eino/schema"
)

const (
    DefaultSystemPrompt = `你是一个法律助手，请基于以下内容回答用户的问题：

=====参考内容=====
{context}
====FINISH====
`
    DefaultUserPrompt = `问题：{query}`
)

func main() {
    ctx := context.Background()
    // 1. 创建 retriever
    retriever, err := fornaxknowledge.NewKnowledgeRetriever(ctx, &fornaxknowledge.Config{
        AK:            os.Getenv("FORNAX_AK"),
        SK:            os.Getenv("FORNAX_SK"),
        KnowledgeKeys: []string{os.Getenv("FORNAX_KNOWLEDGE_KEY")},
    })
    if err != nil {
        panic(err)
    }

    // 2. 创建 ChatModel
    temp := float32(0.7)
    chatModel, err := openai.NewChatModel(ctx, &openai.ChatModelConfig{
        Model:       "gpt-4",
        APIKey:      os.Getenv("OPENAI_API_KEY"),
        Temperature: &temp,
    })
    if err != nil {
        panic(err)
    }

    // 3. 创建一个 Chain，用于处理知识库检索和问答
    chain := compose.NewChain[string, *schema.Message]()
    chain.
        // 并行节点，用于同时准备多个参数
        AppendParallel(compose.NewParallel().
            // 透传 query 参数
            AddLambda("query", compose.InvokableLambda(func(ctx context.Context, input string) (string, error) {
                return input, nil
            }), compose.WithNodeName("PassthroughQuery")).
            // 处理上下文信息
            AddGraph("context",
                // 创建一个子 Chain 用于获取上下文
                compose.NewChain[string, string]().
                    // 使用检索器获取相关文档
                    AppendRetriever(retriever, compose.WithNodeName("KnowledgeRetriever")).
                    // 将文档转换为字符串
                    AppendLambda(compose.InvokableLambda(func(ctx context.Context, docs []*schema.Document) (string, error) {
                        var context string
                        for _, doc := range docs {
                            context += doc.Content + "\n"
                        }
                        return context, nil
                    }), compose.WithNodeName("DocumentConverter")),
                compose.WithNodeName("ContextPreparer"),
            ),
        ).
        // 此处的 input 为 {"query": "什么是合同？", "context": "xxx"}
        // 使用模板生成 prompt
        AppendChatTemplate(
            prompt.FromMessages(
                schema.FString,
                schema.SystemMessage(DefaultSystemPrompt),
                schema.UserMessage(DefaultUserPrompt),
            ),
            compose.WithNodeName("QAPromptTemplate"),
        ).
        // 此处的 input 为两条消息的 []*schema.Message, 第一条为系统消息，第二条为用户消息。
        // 使用 ChatModel 生成回答
        AppendChatModel(chatModel, compose.WithNodeName("QAChatModel"))

    // 3. 编译
    r, err := chain.Compile(ctx, compose.WithGraphName("RAGChain"))
    if err != nil {
        panic(err)
    }

    // 4. 调用 chain
    resp, err := r.Invoke(ctx, "什么是合同？")
    if err != nil {
        panic(err)
    }

    fmt.Println(resp.Content)
}
```

## **使用编排的优点**

Eino 的编排系统是一种简单而直观的方式来组织你的代码逻辑。

它的核心思想是把一个个节点前后连接起来，就**像搭积木**一样，你可以一块接一块地把不同的功能组件连接起来。每个节点都会处理数据，然后把结果传给下一个节点，形成一个完整的处理链条。

> 更多详细信息可参考： [Eino: 编排的设计理念](/zh/docs/eino/core_modules/chain_and_graph_orchestration/orchestration_design_principles)

Chain 有一些特征：

- 基于 Go 的泛型系统，这意味着你在写代码的时候就能确保数据类型是正确的，不用担心运行时会出现意外的类型错误，可极大降低开发时的心智负担。
- 提供了简洁的链式调用接口，让你可以像搭积木一样，轻松地把不同的节点连接在一起。

编排能力解决了复杂逻辑开发过程中的一部分复杂性，但依然在调试时具备复杂性，因此，我们也提供了 `eino-dev` 的工具，能够可视化的查看编排的情况。

> 更多详细信息可以查看： [Eino IDE 插件使用指南](/zh/docs/eino/core_modules/application_development_toolchain/ide_plugin_guide)

## 其他编排方式

虽然 Chain 只能处理简单的串行逻辑(DAG)，但这已经能满足大多数日常开发的需求了。更复杂的业务逻辑需要使用 `Graph` 或者 `StateChain`、`StateGraph` 等。编排的详细介绍，可以参考：[Eino: Chain/Graph 编排功能](/zh/docs/eino/core_modules/chain_and_graph_orchestration/chain_graph_introduction)

## **关联阅读**

- 快速开始
  - [实现一个最简 LLM 应用-ChatModel](/zh/docs/eino/quick_start/simple_llm_application)
  - [Agent-让大模型拥有双手](/zh/docs/eino/quick_start/agent_llm_with_tools)
  - [和幻觉说再见-RAG 召回再回答](/zh/docs/eino/quick_start/rag_retrieval_qa)
