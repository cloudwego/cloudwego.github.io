---
Description: ""
date: "2025-07-21"
lastmod: ""
tags: []
title: 'Eino: Components'
weight: 1
---

LLM application development differs from traditional app development primarily due to two core capabilities:

- **Semantic text processing**: understanding and generating human language, handling relationships within unstructured content.
- **Intelligent decision-making**: reasoning from context and making appropriate action decisions.

These capabilities lead to three major application patterns:

1. **Direct conversation**: process user input and produce responses.
2. **Knowledge processing**: semantically process, store, and retrieve textual documents.
3. **Tool calling**: reason from context and call appropriate tools.

These patterns summarize common LLM app scenarios and provide a basis for abstraction and standardization. Eino abstracts these into reusable **components**.

Mapping components to patterns:

**Conversation components:**

1. Template and parameter preparation for LLM interaction: `ChatTemplate`

   - See [Eino: ChatTemplate Guide](/en/docs/eino/core_modules/components/chat_template_guide)

2. Direct LLM interaction: `ChatModel`

   - See [Eino: ChatModel Guide](/en/docs/eino/core_modules/components/chat_model_guide)

**Text semantics components:**

1. Document acquisition and processing: `Document.Loader`, `Document.Transformer`

   - See [Document Loader Guide](/en/docs/eino/core_modules/components/document_loader_guide) and [Document Transformer Guide](/en/docs/eino/core_modules/components/document_transformer_guide)

2. Semantic embedding of documents: `Embedding`

   - See [Embedding Guide](/en/docs/eino/core_modules/components/embedding_guide)

3. Indexing and storage of embeddings: `Indexer`

   - See [Indexer Guide](/en/docs/eino/core_modules/components/indexer_guide)

4. Retrieval of semantically related documents: `Retriever`

   - See [Retriever Guide](/en/docs/eino/core_modules/components/retriever_guide)

**Decision and execution components:**

1. Tool-enabled decision making for LLMs: `ToolsNode`

   - See [ToolsNode Guide](/en/docs/eino/core_modules/components/tools_node_guide)

**Custom logic:**

1. User-defined business logic: `Lambda`

   - See [Lambda Guide](/en/docs/eino/core_modules/components/lambda_guide)

Components provide application capabilities — the bricks and mortar of LLM app construction. Eino’s component abstractions follow these principles:

1. **Modularity and standardization**: unify common capabilities into clear modules with well-defined boundaries for flexible composition.
2. **Extensibility**: keep interfaces minimally constraining so developers can implement custom components easily.
3. **Reusability**: package common capabilities and implementations as ready-to-use tooling.

These abstractions establish consistent development paradigms, reduce cognitive load, and improve collaboration efficiency, letting developers focus on business logic instead of reinventing the wheel.

