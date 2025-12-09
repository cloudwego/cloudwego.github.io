---
Description: ""
date: "2025-07-30"
lastmod: ""
tags: []
title: Embedding - ollama
weight: 0
---

## Overview

This Ollama Embedding component for [Eino](https://github.com/cloudwego/eino) implements the `Embedder` interface, integrates seamlessly with Eino’s embedding system, and provides text vectorization.

## Features

- Implements `github.com/cloudwego/eino/components/embedding.Embedder` interface
- Easy integration into Eino workflows
- Supports custom Ollama endpoint and model
- Built-in Eino callbacks support

## Installation

```bash
go get github.com/cloudwego/eino-ext/components/embedding/ollama
```

## Quick Start

```go
package main

import (
    "context"
    "log"
    "os"
    "time"

    "github.com/cloudwego/eino-ext/components/embedding/ollama"
)

func main() {
    ctx := context.Background()

    baseURL := os.Getenv("OLLAMA_BASE_URL")
    if baseURL == "" {
        baseURL = "http://localhost:11434" // default local
    }
    model := os.Getenv("OLLAMA_EMBED_MODEL")
    if model == "" {
        model = "nomic-embed-text"
    }

    embedder, err := ollama.NewEmbedder(ctx, &ollama.EmbeddingConfig{
        BaseURL: baseURL,
        Model:   model,
        Timeout: 10 * time.Second,
    })
    if err != nil {
        log.Fatalf("NewEmbedder of ollama error: %v", err)
        return
    }

    log.Printf("===== call Embedder directly =====")

    vectors, err := embedder.EmbedStrings(ctx, []string{"hello", "how are you"})
    if err != nil {
        log.Fatalf("EmbedStrings of Ollama failed, err=%v", err)
    }

    log.Printf("vectors : %v", vectors)

    // you can use WithModel to specify the model
    vectors, err = embedder.EmbedStrings(ctx, []string{"hello", "how are you"}, embedding.WithModel(model))
    if err != nil {
        log.Fatalf("EmbedStrings of Ollama failed, err=%v", err)
    }

    log.Printf("vectors : %v", vectors)
}
```

## Configuration

Configure the embedder via `EmbeddingConfig`:

```go
type EmbeddingConfig struct {
    // Timeout specifies the maximum duration to wait for API responses
    // If HTTPClient is set, Timeout will not be used.
    // Optional. Default: no timeout
    Timeout time.Duration `json:"timeout"`
    
    // HTTPClient specifies the client to send HTTP requests.
    // If HTTPClient is set, Timeout will not be used.
    // Optional. Default &http.Client{Timeout: Timeout}
    HTTPClient *http.Client `json:"http_client"`
    
    // BaseURL specifies the Ollama service endpoint URL
    // Format: http(s)://host:port
    // Optional. Default: "http://localhost:11434"
    BaseURL string `json:"base_url"`
    
    // Model specifies the ID of the model to use for embedding generation
    // Required. You can also set it when calling EmbedStrings with `embedding.WithModel(model)`
    Model string `json:"model"`
    
    // Truncate specifies whether to truncate text to the model's maximum context length
    // When set to true, if text to embed exceeds the model's maximum context length,
    // a call to EmbedStrings will return an error
    // Optional.
    Truncate *bool `json:"truncate,omitempty"`
    
    // KeepAlive controls how long the model will stay loaded in memory following this request.
    // Optional. Default 5 minutes
    KeepAlive *time.Duration `json:"keep_alive,omitempty"`
    
    // Options lists model-specific options.
    // Optional
    Options map[string]any `json:"options,omitempty"`
}
```
