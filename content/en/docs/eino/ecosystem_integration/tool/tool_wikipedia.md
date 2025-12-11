---
Description: ""
date: "2025-12-11"
lastmod: ""
tags: []
title: Tool - wikipedia
weight: 0
---

## **Overview**

This is a Wikipedia search tool for [Eino](https://github.com/cloudwego/eino) implementing the `InvokableTool` interface. It integrates with Eino’s ChatModel system and `ToolsNode`.

## **Features**

- Implements `github.com/cloudwego/eino/components/tool.InvokableTool`
- Easy integration with Eino’s tool system
- Configurable search parameters

## **Installation**

```bash
go get github.com/cloudwego/eino-ext/components/tool/wikipedia
```

## **Quick Start**

```go
package main

import (
    "context"
    "github.com/cloudwego/eino-ext/components/tool/wikipedia"
    "github.com/cloudwego/eino/components/tool"
    "log"
    "time"
)

func main() {
    ctx := context.Background()

    config := &wikipedia.Config{
        UserAgent:   "eino (https://github.com/cloudwego/eino)",
        DocMaxChars: 2000,
        Timeout:     15 * time.Second,
        TopK:        3,
        MaxRedirect: 3,
        Language:    "en",
    }

    t, err := wikipedia.NewTool(ctx, config)
    if err != nil { log.Fatal("Failed to create tool:", err) }

    tools := []tool.BaseTool{t}
    // ... configure and use ToolsNode
}
```

## **Configuration**

```go
type Config struct {
    // BaseURL is the Wikipedia API base URL.
    // Format: https://<language>.wikipedia.org/w/api.php
    // URL language depends on the Language field.
    // Optional. Default: "https://en.wikipedia.org/w/api.php".
    BaseURL string

    // UserAgent used by the HTTP client.
    // Optional, but recommended to override with project info.
    // Follow Wikipedia bot policy:
    // https://foundation.wikimedia.org/wiki/Policy:Wikimedia_Foundation_User-Agent_Policy
    // Optional. Default: "eino (https://github.com/cloudwego/eino)"
    UserAgent string `json:"user_agent"`

    // DocMaxChars caps returned page content length; longer content is truncated.
    DocMaxChars int `json:"doc_max_chars"`

    // Timeout is the max wait time for HTTP response.
    Timeout time.Duration `json:"timeout"`

    // TopK number of search results to return.
    TopK int `json:"top_k"`

    // MaxRedirect max allowed redirects.
    MaxRedirect int `json:"max_redirect"`

    // Language for Wikipedia search.
    Language string `json:"language"`

    // Optional. Default: "wikipedia_search".
    ToolName string `json:"tool_name"`
    // Optional. Default: "this tool provides quick and efficient access to information from the Wikipedia".
    ToolDesc string `json:"tool_desc"`
}
```

### **Request Schema**

```go
type SearchRequest struct {
    Query string `json:"query" jsonschema_description:"The query to search the web for"`
}
```

### **Response Schema**

```go
type SearchResponse struct {
    Results []*Result `json:"results" jsonschema_description:"The results of the search"`
}
type SearchResult struct {
    Title   string `json:"title" jsonschema_description:"The title of the search result"`
    URL     string `json:"url" jsonschema_description:"The url of the search result"`
    Extract string `json:"extract" jsonschema_description:"The extract of the search result"`
    Snippet string `json:"snippet" jsonschema_description:"The snippet of the search result"`
}
```

## **More Details**

- [Eino Documentation](https://github.com/cloudwego/eino)
