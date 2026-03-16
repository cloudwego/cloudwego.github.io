---
Description: ""
date: "2026-03-12"
lastmod: ""
tags: []
title: "Chapter 8: Graph Tool (complex workflows)"
weight: 8
---

Goal of this chapter: understand the Graph Tool concept and build more complex workflows using the compose package.

## Code location

- Entry code: [cmd/ch08/main.go](https://github.com/cloudwego/eino-examples/blob/main/quickstart/chatwitheino/cmd/ch08/main.go)
- RAG implementation: [rag/rag.go](https://github.com/cloudwego/eino-examples/blob/main/quickstart/chatwitheino/rag/rag.go)

## Full tutorial

- [ch08_graph_tool.md](https://github.com/cloudwego/eino-examples/blob/main/quickstart/chatwitheino/docs/ch08_graph_tool.md)

## What you learn

- How to decompose a complex task into a deterministic execution graph.
- How to parallelize “chunking + retrieval” for large files and aggregate results back into a final answer.
