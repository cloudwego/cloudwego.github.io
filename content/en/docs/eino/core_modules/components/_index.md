---
Description: ""
date: "2025-02-11"
lastmod: ""
tags: []
title: 'Eino: Components'
weight: 0
---

The most significant difference between LLM application development and traditional application development lies in the two core capabilities of LLMs:

- **Semantic Text Processing Capability**: The ability to understand and generate human language, handling the semantic relationships of unstructured content
- **Intelligent Decision-Making Capability**: The ability to reason and judge based on context, making corresponding behavioral decisions

These two core capabilities have given rise to three main application models:

1. **Direct Dialogue Model**: Processing user input and generating corresponding responses
2. **Knowledge Processing Model**: Semantic processing, storage, and retrieval of text documents
3. **Tool Invocation Model**: Making decisions based on context and invoking corresponding tools

These models succinctly summarize the current major scenarios of LLM applications, providing us with a foundation for abstraction and standardization. Based on this, Eino abstracts these commonly used capabilities into reusable "Components."

The relationship between component abstraction and these models corresponds as follows:

**Dialogue Processing Components:**

1. The component abstraction for templated processing and LLM interaction parameters: `ChatTemplate`

> See [Eino: ChatTemplate guide](/en/docs/eino/core_modules/components/chat_template_guide)

1. The component abstraction for direct interaction with LLMs: `ChatModel`

> See [Eino: ChatModel guide](/en/docs/eino/core_modules/components/chat_model_guide)

**Text Semantic Processing Components:**

1. The component abstraction for obtaining and processing text documents: `Document.Loader`, `Document.Transformer`

> See [Eino: Document Loader guide](/en/docs/eino/core_modules/components/document_loader_guide), [Eino: Document Transformer guide](/en/docs/eino/core_modules/components/document_transformer_guide)

1. The component abstraction for semantic processing of text documents: `Embedding`

> See [Eino: Embedding guide](/en/docs/eino/core_modules/components/embedding_guide)

1. The component abstraction for storing the indexed data after embedding: `Indexer`

> See [Eino: Indexer guide](/en/docs/eino/core_modules/components/indexer_guide)

1. Component abstraction for indexing and retrieving semantically related text documents: `Retriever`

> See [Eino: Retriever guide](/en/docs/eino/core_modules/components/retriever_guide)

**Decision Execution Components**:

1. Component abstraction allowing the LLM to make decisions and call tools: `ToolsNode`

> See [Eino: ToolsNode guide](/en/docs/eino/core_modules/components/tools_node_guide)

**Custom Components**:

1. Component abstraction for user-defined code logic: `Lambda`

> See [Eino: Lambda guide](/en/docs/eino/core_modules/components/lambda_guide)

Components are the providers of LLM application capabilities and serve as the building blocks in the construction of LLM applications. The quality of component abstraction determines the complexity of developing LLM applications. Eino's component abstractions adhere to the following design principles:

1. **Modularity and Standardization**: Abstract a series of capabilities with similar functions into unified modules. The components have clear responsibilities and boundaries, supporting flexible composition.
2. **Extensibility**: The interface design maintains minimal module capability constraints, making it convenient for developers to create custom components.
3. **Reusability**: Encapsulate the most commonly used capabilities and implementations, providing developers with out-of-the-box tools.

Component abstraction allows the development of LLM applications to form a relatively fixed paradigm, reducing cognitive complexity, and enhancing collaborative efficiency. By encapsulating components, developers can focus on implementing business logic, avoiding the reinvention of the wheel, and quickly building high-quality LLM applications.
