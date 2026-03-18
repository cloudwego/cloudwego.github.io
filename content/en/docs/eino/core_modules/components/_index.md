---
Description: ""
date: "2026-01-20"
lastmod: ""
tags: []
title: 'Eino: Components'
weight: 1
---

The most significant difference between LLM application development and traditional application development lies in the two core capabilities of large language models:

- **Semantic text processing**: the ability to understand and generate human language, handling semantic relationships in unstructured content.
- **Intelligent decision-making**: the ability to reason and make judgments based on context, and make corresponding behavioral decisions.

These two core capabilities have given rise to three main application patterns:

1. **Direct conversation mode**: process user input and generate corresponding responses.
2. **Knowledge processing mode**: semantically process, store, and retrieve textual documents.
3. **Tool calling mode**: make decisions based on context and call corresponding tools.

These patterns highly summarize the main scenarios of current LLM applications and provide a foundation for abstraction and standardization. Based on this, Eino abstracts these common capabilities into reusable "Components".

The relationship between component abstractions and these patterns is as follows:

**Conversation processing components:**

1. Component abstractions for templated processing and LLM interaction parameters: `ChatTemplate`, `AgenticChatTemplate`

   > See [Eino: ChatTemplate Guide](/docs/eino/core_modules/components/chat_template_guide), [Eino: AgenticChatTemplate Guide [Beta]](/docs/eino/core_modules/components/agentic_chat_template_guide)
   >
2. Component abstractions for direct LLM interaction: `ChatModel`, `AgenticModel`

   > See [Eino: ChatModel Guide](/docs/eino/core_modules/components/chat_model_guide), [Eino: AgenticModel Guide [Beta]](/docs/eino/core_modules/components/agentic_chat_model_guide)
   >

**Text semantic processing components:**

1. Component abstractions for acquiring and processing text documents: `Document.Loader`, `Document.Transformer`

   > See [Eino: Document Loader Guide](/docs/eino/core_modules/components/document_loader_guide), [Eino: Document Transformer Guide](/docs/eino/core_modules/components/document_transformer_guide)
   >
2. Component abstraction for semantic processing of text documents: `Embedding`

   > See [Eino: Embedding Guide](/docs/eino/core_modules/components/embedding_guide)
   >
3. Component abstraction for storing data indexes after embedding: `Indexer`

   > See [Eino: Indexer Guide](/docs/eino/core_modules/components/indexer_guide)
   >
4. Component abstraction for indexing and retrieving semantically related text documents: `Retriever`

   > See [Eino: Retriever Guide](/docs/eino/core_modules/components/retriever_guide)
   >

**Decision and execution components:**

1. Component abstractions for LLM decision-making and tool calling: `ToolsNode`, `AgenticToolsNode`

   > See [Eino: ToolsNode&Tool Guide](/docs/eino/core_modules/components/tools_node_guide), [Eino: AgenticToolsNode&Tool Guide [Beta]](/docs/eino/core_modules/components/agentic_tools_node_guide)
   >

**Custom components:**

1. Component abstraction for user-defined code logic: `Lambda`

   > See [Eino: Lambda Guide](/docs/eino/core_modules/components/lambda_guide)
   >

Components are the capability providers for LLM applications, serving as the bricks and mortar in the construction process of LLM applications. The quality of component abstractions determines the complexity of LLM application development. Eino's component abstractions adhere to the following design principles:

1. **Modularity and standardization**: abstract a series of capabilities with the same functionality into unified modules, with clear responsibilities and boundaries between components, supporting flexible composition.
2. **Extensibility**: keep the interface design with minimal constraints on module capabilities, allowing component developers to easily implement custom component development.
3. **Reusability**: encapsulate the most commonly used capabilities and implementations, providing developers with ready-to-use tools.

Component abstractions enable LLM application development to form relatively fixed paradigms, reducing cognitive complexity and enhancing collaboration efficiency. Component encapsulation allows developers to focus on implementing business logic, avoiding reinventing the wheel, and quickly building high-quality LLM applications.
