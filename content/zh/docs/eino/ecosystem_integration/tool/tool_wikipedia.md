---
Description: ""
date: "2025-03-13"
lastmod: ""
tags: []
title: Tool - Wikipedia
weight: 0
---

## **基本介绍**

维基百科搜索工具是 Eino InvokableTool 接口的一个实现，用于通过维基百科 Search API 进行搜索。该组件实现了 [Eino: ToolsNode 使用说明](/zh/docs/eino/core_modules/components/tools_node_guide)。

## **使用方式**

### **组件初始化**

维基百科搜索工具通过 `NewTool` 函数进行初始化，主要配置参数如下：

```go
import "github.com/cloudwego/eino-ext/components/tool/wikipedia"

tool, err := wikipedia.NewTool(ctx, &wikipedia.Config{
    UserAgent:   "eino (https://github.com/cloudwego/eino)",    // 可选：HTTP 客户端使用的用户代理
    DocMaxChars: 2000,                                          // 可选：返回页面内容的最大字符数
    Timeout:     15 * time.Second,                              // 可选：HTTP 客户端返回响应的最大等待时间
    TopK:        3,                                             // 可选：返回的搜索结果数量
    MaxRedirect: 3,                                             // 可选：最大允许的重定向次数
    Language:    "en",                                          // 可选：Wikipedia 搜索的语言
    ToolName:    "wikipedia_search",                            // 可选：工具名称
    ToolDesc:    "this tool provides quick and efficient access to information from the Wikipedia", // 可选：工具描述
})
```

### **搜索参数**

搜索请求支持以下参数：

```go
type SearchRequest struct {
    // Query 是搜索的查询字符串。
    Query string `json:"query" jsonschema_description:"The query to search the web for"`
}
```

### **完整使用示例**

```go
package main

import (
    "context"
    "fmt"
    "log"
    "time"

    "github.com/bytedance/sonic"
    "github.com/cloudwego/eino-ext/components/tool/wikipedia"
)

func main() {
    ctx := context.Background()

    // Create configuration
    config := &wikipedia.Config{
        UserAgent:   "eino",
        DocMaxChars: 2000,
        Timeout:     15 * time.Second,
        TopK:        3,
        MaxRedirect: 3,
        Language:    "en",
    }

    // Create wikipedia tool
    tool, err := wikipedia.NewTool(ctx, config)
    if err != nil {
        log.Fatal("Failed to create tool:", err)
    }

    // Create search request
    m, err := sonic.MarshalString(wikipedia.SearchRequest{"bytedance"})
    if err != nil {
        log.Fatal("Failed to marshal search request:", err)
    }

    // Execute search
    resp, err := tool.InvokableRun(ctx, m)
    if err != nil {
        log.Fatal("Search failed:", err)
    }

    var searchResponse wikipedia.SearchResponse
    if err = sonic.Unmarshal([]byte(resp), &searchResponse); err != nil {
        log.Fatal("Failed to unmarshal search response:", err)
    }

    // Print results
    fmt.Println("Search Results:")
    fmt.Println("==============")
    for _, r := range searchResponse.Results {
        fmt.Printf("Title: %s\n", r.Title)
        fmt.Printf("URL: %s\n", r.URL)
        fmt.Printf("Summary: %s\n", r.Extract)
        fmt.Printf("Snippet: %s\n", r.Snippet)
    }
    fmt.Println("")
    fmt.Println("==============")

}
```

### **搜索结果示例**

```json
{
  "results": [
    {
      "title": "ByteDance",
      "url": "https://en.wikipedia.org/wiki/ByteDance",
      "extract": "ByteDance Ltd. is a Chinese internet technology company headquartered in Haidian...",
      "snippet": "ByteDance Ltd. is a Chinese internet technology company headquartered in Haidian..."
    },
    {
      "title": "TikTok",
      "url": "https://en.wikipedia.org/wiki/TikTok",
      "extract": "TikTok, known in mainland China and Hong Kong as Douyin (Chinese: 抖音; pinyin: Dǒuyīn; lit. 'Shaking Sound')...",
      "snippet": "a short-form video-hosting service owned by Chinese Internet company ByteDance. It hosts user-submitted videos..."
    },
    {
      "title": "Zhang Yiming",
      "url": "https://en.wikipedia.org/wiki/Zhang%20Yiming",
      "extract": "Zhang Yiming (Chinese: 张一鸣; born 1 April 1983) is a Chinese Internet entrepreneur...",
      "snippet": "张一鸣; born 1 April 1983) is a Chinese Internet entrepreneur. He founded ByteDance in 2012..."
    }
  ]
}
```

## **相关文档**

- [Eino: ToolsNode 使用说明](/zh/docs/eino/core_modules/components/tools_node_guide)
- [Wikipedia API 文档](https://www.mediawiki.org/wiki/API:Search)
