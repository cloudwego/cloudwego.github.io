---
Description: ""
date: "2025-01-22"
lastmod: ""
tags: []
title: 'Eino: Components 组件'
weight: 1
---

大模型应用开发和传统应用开发最显著的区别在于大模型所具备的两大核心能力：

- **基于语义的文本处理能力**：能够理解和生成人类语言，处理非结构化的内容语义关系
- **智能决策能力**：能够基于上下文进行推理和判断，做出相应的行为决策

这两项核心能力催生了三种主要的应用模式：

1. **直接对话模式**：处理用户输入并生成相应回答
2. **知识处理模式**：对文本文档进行语义化处理、存储和检索
3. **工具调用模式**：基于上下文做出决策并调用相应工具

这些模式高度概括了当前大模型应用的主要场景，为我们提供了抽象和标准化的基础。基于此，Eino 将这些常用能力抽象为可复用的「组件」（Components）

组件抽象和这几种模式关系对应如下：

**对话处理类组件：**

1. 模板化处理和大模型交互参数的组件抽象： `ChatTemplate`

   > 详见 [Eino: ChatTemplate 使用说明](/zh/docs/eino/core_modules/components/chat_template_guide)
   >
2. 直接和大模型交互的组件抽象： `ChatModel`

   > 详见 [Eino: ChatModel 使用说明](/zh/docs/eino/core_modules/components/chat_model_guide)
   >

**文本语义处理类组件：**

1. 获取和处理文本文档的组件抽象： `Document.Loader` 、`Document.Transformer`

   > 详见 [Eino: Document Loader 使用说明](/zh/docs/eino/core_modules/components/document_loader_guide)、[Eino: Document Transformer 使用说明](/zh/docs/eino/core_modules/components/document_transformer_guide)
   >
2. 文本文档语义化处理的组件抽象： `Embedding`

   > 详见 [Eino: Embedding 使用说明](/zh/docs/eino/core_modules/components/embedding_guide)
   >
3. Embedding 之后将数据索引进行存储的组件抽象： `Indexer`

   > 详见 [Eino: Indexer 使用说明](/zh/docs/eino/core_modules/components/indexer_guide)
   >
4. 将语义相关文本文档进行索引和召回的组件抽象： `Retriever`

   > 详见 [Eino: Retriever 使用说明](/zh/docs/eino/core_modules/components/retriever_guide)
   >

**决策执行类组件**：

1. 大模型能够做决策并调用工具的组件抽象：`ToolsNode`

   > 详见 [Eino: ToolsNode 使用说明](/zh/docs/eino/core_modules/components/tools_node_guide)
   >

**自定义组件：**

1. 用户自定义代码逻辑的组件抽象：`Lambda`

   > 详见 [Eino: Lambda 使用说明](/zh/docs/eino/core_modules/components/lambda_guide)
   >

组件是大模型应用能力的提供者，是大模型应用构建过程中的砖和瓦，组件抽象的优劣决定了大模型应用开发的复杂度，Eino 的组件抽象秉持着以下设计原则：

1. **模块化和标准化**，将一系列功能相同的能力抽象成统一的模块，组件间职能明确、边界清晰，支持灵活地组合。
2. **可扩展性**，接口的设计保持尽可能小的模块能力约束，让组件的开发者能方便地实现自定义组件的开发。
3. **可复用性**，把最常用的能力和实现进行封装，提供给开发者开箱即用的工具使用。

组件的抽象可以让大模型应用开发形成比较固定的范式，降低认知复杂度，增强共同协作的效率。让组件的封装让开发者可以专注于业务逻辑的实现，避免重复造轮子，以快速构建高质量的大模型应用。
