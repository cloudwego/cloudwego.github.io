---
Description: ""
date: "2025-03-19"
lastmod: ""
tags: []
title: Tool - Googlesearch
weight: 0
---

## **Basic Introduction**

Google Search Tool is an implementation of the Eino InvokableTool interface, used for web search through the Google Custom Search API. This component implements the [Eino: ToolsNode guide](/docs/eino/core_modules/components/tools_node_guide).

## **Usage**

### **Component Initialization**

The Google Search Tool is initialized via the `NewGoogleSearchTool` function, with the primary configuration parameters as follows:

```go
import "github.com/cloudwego/eino-ext/components/tool/googlesearch"

tool, err := googlesearch.NewTool(ctx, &googlesearch.Config{
    APIKey:         "your-api-key",        // Google API key
    SearchEngineID: "your-engine-id",      // Search engine ID
    BaseURL:        "custom-base-url",     // Optional: Custom API base URL, default: https://customsearch.googleapis.com
    Num:            5,                    // Optional: Number of results per page
    Lang:           "zh-CN",               // Optional: Search interface language
    ToolName:       "google_search",       // Optional: Tool name
    ToolDesc:       "google search tool",  // Optional: Tool description
})
```

### **Search Parameters**

The search request supports the following parameters:

```go
type SearchRequest struct {
    Query  string `json:"query"`   // Search keywords
    Num    int    `json:"num"`     // Number of results returned
    Offset int    `json:"offset"`  // Start position of results
    Lang   string `json:"lang"`    // Search language
}
```

### **Complete Usage Example**

```go
package main

import (
    "context"
    "encoding/json"
    "os"

    "github.com/cloudwego/eino-ext/components/tool/googlesearch"
)

func main() {
    ctx := context.Background()

    googleAPIKey := os.Getenv("GOOGLE_API_KEY")
    googleSearchEngineID := os.Getenv("GOOGLE_SEARCH_ENGINE_ID")

    if googleAPIKey == "" || googleSearchEngineID == "" {
        panic("[GOOGLE_API_KEY] and [GOOGLE_SEARCH_ENGINE_ID] must set")
    }

    // create tool
    searchTool, err := googlesearch.NewTool(ctx, &googlesearch.Config{
        APIKey:         googleAPIKey,
        SearchEngineID: googleSearchEngineID,
        Lang:           "zh-CN",
        Num:            5,
    })
    if err != nil {
        panic(err)
    }

    // prepare params
    request := map[string]any{
        "query": "Golang concurrent programming",
        "num":   3,
        "lang":  "en",
    }

    args, err := json.Marshal(request)
    if err != nil {
        panic(err)
    }

    // do search
    result, err := searchTool.InvokableRun(ctx, string(args))
    if err != nil {
        panic(err)
    }

    // res
    println(result) // in JSON
}
```

### **Search Results Example**

```json
{
    "query": "Golang concurrent programming",
    "items": [
        {
            "link": "https://example.com/article1",
            "title": "Go Concurrent Programming Practice",
            "snippet": "This is an article about concurrent programming in Go...",
            "desc": "Detailed introduction to goroutines and channels in Go..."
        },
        {
            "link": "https://example.com/article2",
            "title": "Understanding Concurrency in Go",
            "snippet": "A comprehensive guide to concurrent programming...",
            "desc": "Learn about Go's concurrency model and best practices..."
        }
    ]
}
```

## **Related Documents**

- [Eino: ToolsNode guide](/docs/eino/core_modules/components/tools_node_guide)
- [Google Custom Search API Documentation](https://developers.google.com/custom-search/v1/overview)
- [Tool - DuckDuckGoSearch](/docs/eino/ecosystem/tool/tool_duckduckgo_search)
