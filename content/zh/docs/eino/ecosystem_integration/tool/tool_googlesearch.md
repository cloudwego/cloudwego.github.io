---
Description: ""
date: "2025-03-20"
lastmod: ""
tags: []
title: Tool - Googlesearch
weight: 0
---

## **基本介绍**

Google 搜索工具是 Eino InvokableTool 接口的一个实现，用于通过 Google Custom Search API 进行网络搜索。该组件实现了 [Eino: ToolsNode 使用说明](/zh/docs/eino/core_modules/components/tools_node_guide)。

## **使用方式**

### **组件初始化**

Google 搜索工具通过 `NewGoogleSearchTool` 函数进行初始化，主要配置参数如下：

```go
import "github.com/cloudwego/eino-ext/components/tool/googlesearch"

tool, err := googlesearch.NewTool(ctx, &googlesearch.Config{
    APIKey:         "your-api-key",        // Google API 密钥
    SearchEngineID: "your-engine-id",      // 搜索引擎 ID
    BaseURL:        "custom-base-url",     // 可选：自定义 API 基础 URL, default: https://customsearch.googleapis.com
    Num:            5,                    // 可选：每页结果数量
    Lang:           "zh-CN",               // 可选：搜索界面语言
    ToolName:       "google_search",       // 可选：工具名称
    ToolDesc:       "google search tool",  // 可选：工具描述
})
```

### **搜索参数**

搜索请求支持以下参数：

```go
type SearchRequest struct {
    Query  string `json:"query"`   // 搜索关键词
    Num    int    `json:"num"`     // 返回结果数量
    Offset int    `json:"offset"`  // 结果起始位置
    Lang   string `json:"lang"`    // 搜索语言
}
```

### **完整使用示例**

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

### **搜索结果示例**

```json
{
    "query": "Golang concurrent programming",
    "items": [
        {
            "link": "https://example.com/article1",
            "title": "Go 并发编程实践",
            "snippet": "这是一篇关于 Go 语言并发编程的文章...",
            "desc": "详细介绍了 Go 语言中的 goroutine 和 channel..."
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

## **相关文档**

- [Eino: ToolsNode 使用说明](/zh/docs/eino/core_modules/components/tools_node_guide)
- [Google Custom Search API 文档](https://developers.google.com/custom-search/v1/overview)
- [Tool - DuckDuckGoSearch](/zh/docs/eino/ecosystem_integration/tool/tool_duckduckgo_search)
