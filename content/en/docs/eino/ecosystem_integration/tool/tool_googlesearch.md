---
Description: ""
date: "2025-11-20"
lastmod: ""
tags: []
title: Tool - Googlesearch
weight: 0
---

## **Overview**

Google search tool is an implementation of Eino’s InvokableTool that performs web searches via Google Custom Search API. Follows [ToolsNode guide](/docs/eino/core_modules/components/tools_node_guide).

## **Usage**
### **Initialization**

Google search tool is initialized via `NewGoogleSearchTool` with core parameters:

```go
import "github.com/cloudwego/eino-ext/components/tool/googlesearch"

tool, err := googlesearch.NewTool(ctx, &googlesearch.Config{
    APIKey:         "your-api-key",        // Google API key
    SearchEngineID: "your-engine-id",      // Search engine ID
    BaseURL:        "custom-base-url",     // Optional: custom API base URL, default: https://customsearch.googleapis.com
    Num:            5,                      // Optional: results per page
    Lang:           "zh-CN",               // Optional: UI language
    ToolName:       "google_search",       // Optional: tool name
    ToolDesc:       "google search tool",  // Optional: tool description
})
```

Note: obtain APIKey and SearchEngineID from Google Programmable Search Engine: https://programmablesearchengine.google.com/controlpanel/all

### **Search Parameters**

```go
type SearchRequest struct {
    Query  string `json:"query"`
    Num    int    `json:"num"`
    Offset int    `json:"offset"`
    Lang   string `json:"lang"`
}
```

### **Complete Example**

```go
package main

import (
    "context"
    "encoding/json"
    "fmt"
    "log"
    "os"

    "github.com/cloudwego/eino-ext/components/tool/googlesearch"
)

func main() {
    ctx := context.Background()

    googleAPIKey := os.Getenv("GOOGLE_API_KEY")
    googleSearchEngineID := os.Getenv("GOOGLE_SEARCH_ENGINE_ID")

    if googleAPIKey == "" || googleSearchEngineID == "" {
        log.Fatal("[GOOGLE_API_KEY] and [GOOGLE_SEARCH_ENGINE_ID] must set")
    }

    // create tool
    searchTool, err := googlesearch.NewTool(ctx, &googlesearch.Config{
        APIKey:         googleAPIKey,
        SearchEngineID: googleSearchEngineID,
        Lang:           "zh-CN",
        Num:            5,
    })
    if err != nil {
        log.Fatal(err)
    }

    // prepare params
    req := googlesearch.SearchRequest{
        Query: "Golang concurrent programming",
        Num:   3,
        Lang:  "en",
    }

    args, err := json.Marshal(req)
    if err != nil {
        log.Fatal(err)
    }

    // do search
    resp, err := searchTool.InvokableRun(ctx, string(args))
    if err != nil {
        log.Fatal(err)
    }

    var searchResp googlesearch.SearchResult
    if err := json.Unmarshal([]byte(resp), &searchResp); err != nil {
        log.Fatal(err)
    }

    // Print results
    fmt.Println("Search Results:")
    fmt.Println("==============")
    for i, result := range searchResp.Items {
        fmt.Printf("\n%d. Title: %s\n", i+1, result.Title)
        fmt.Printf("   Link: %s\n", result.Link)
        fmt.Printf("   Desc: %s\n", result.Desc)
    }
    fmt.Println("")
    fmt.Println("==============")

    // seems like:
    // Search Results:
    // ==============
    // 1. Title: My Concurrent Programming book is finally PUBLISHED!!! : r/golang
    //    Link: https://www.reddit.com/r/golang/comments/18b86aa/my_concurrent_programming_book_is_finally/
    //    Desc: Posted by u/channelselectcase - 398 votes and 46 comments
    // 2. Title: Concurrency — An Introduction to Programming in Go | Go Resources
    //    Link: https://www.golang-book.com/books/intro/10
    //    Desc:
    // 3. Title: The Comprehensive Guide to Concurrency in Golang | by Brandon ...
    //    Link: https://bwoff.medium.com/the-comprehensive-guide-to-concurrency-in-golang-aaa99f8bccf6
    //    Desc: Update (November 20, 2023) — This article has undergone a comprehensive revision for enhanced clarity and conciseness. I’ve streamlined the…

    // ==============
}
```

### **Search Result Example**

```json
{
    "query": "Golang concurrent programming",
    "items": [
        {
            "link": "https://example.com/article1",
            "title": "Go 并发编程实践",
            "snippet": "An article about Go concurrent programming...",
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

## **References**

- [ToolsNode guide](/docs/eino/core_modules/components/tools_node_guide)
- [Google Custom Search API](https://developers.google.com/custom-search/v1/overview)
- [Tool - DuckDuckGoSearch](/docs/eino/ecosystem_integration/tool/tool_duckduckgo_search)
