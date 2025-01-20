---
Description: ""
date: "2025-01-20"
lastmod: ""
tags: []
title: Loader - web url
weight: 0
---

## **基本介绍**

URL 文档加载器是 Document Loader 接口的一个实现，用于从网络 URL 中加载文档内容。该组件实现了 [Eino: Document Loader 使用说明](/zh/docs/eino/core_modules/components/document_loader_guide)。

### **特性介绍**

URL 文档加载器具有以下特点：

- 默认支持 HTML 网页内容的解析
- 可自定义 HTTP 客户端配置 (eg: 自定义代理等)
- 支持自定义内容解析器 (eg: body、或其他特定的容器)

## **使用方式**

### **组件初始化**

URL 文档加载器通过 `NewLoader` 函数进行初始化，主要配置参数如下：

```go
import (
  "github.com/cloudwego/eino-ext/components/document/loader/url"
)

func main() {
    loader, err := url.NewLoader(ctx, &url.LoaderConfig{
        Parser:         parser,
        Client:         httpClient,
        RequestBuilder: requestBuilder,
    })
}
```

配置参数说明：

- `Parser`：文档解析器，默认使用 HTML 解析器，会提取网页正文内容
- `Client`：HTTP 客户端，可以自定义超时、代理等配置
- `RequestBuilder`：请求构建器，用于自定义请求方法、请求头等

### **加载文档**

文档加载通过 `Load` 方法实现：

```go
docs, err := loader.Load(ctx, document.Source{
    URI: "https://example.com/document",
})
```

注意事项：

- URI 必须是有效的 HTTP/HTTPS URL
- 默认使用 GET 方法请求
- 如果需要其他 HTTP 方法或自定义请求头，需要配置 RequestBuilder，例如 鉴权 场景

### **完整使用示例**

#### **基本使用**

```go
package main

import (
    "context"
    
    "github.com/cloudwego/eino-ext/components/document/loader/url"
    "github.com/cloudwego/eino/components/document"
)

func main() {
    ctx := context.Background()
    
    // 使用默认配置初始化加载器
    loader, err := url.NewLoader(ctx, nil)
    if err != nil {
        panic(err)
    }
    
    // 加载文档
    docs, err := loader.Load(ctx, document.Source{
        URI: "https://example.com/article",
    })
    if err != nil {
        panic(err)
    }
    
    // 使用文档内容
    for _, doc := range docs {
        println(doc.Content)
    }
}
```

#### **自定义配置示例**

```go
package main

import (
    "context"
    "net/http"
    "time"
    
    "github.com/cloudwego/eino-ext/components/document/loader/url"
    "github.com/cloudwego/eino/components/document"
)

func main() {
    ctx := context.Background()
    
    // 自定义 HTTP 客户端
    client := &http.Client{
        Timeout: 10 * time.Second,
    }
    
    // 自定义请求构建器
    requestBuilder := func(ctx context.Context, src document.Source, opts ...document.LoaderOption) (*http.Request, error) {
        req, err := http.NewRequestWithContext(ctx, "GET", src.URI, nil)
        if err != nil {
            return nil, err
        }
        // 添加自定义请求头
        req.Header.Add("User-Agent", "MyBot/1.0")
        return req, nil
    }
    
    // 初始化加载器
    loader, err := url.NewLoader(ctx, &url.LoaderConfig{
        Client:         client,
        RequestBuilder: requestBuilder,
    })
    if err != nil {
        panic(err)
    }
    
    // 加载文档
    docs, err := loader.Load(ctx, document.Source{
        URI: "https://example.com/article",
    })
    if err != nil {
        panic(err)
    }
    
    // 使用文档内容
    for _, doc := range docs {
        println(doc.Content)
    }
}
```

## **相关文档**

- [Eino: Document Loader 使用说明](/zh/docs/eino/core_modules/components/document_loader_guide)
- [Eino: Document Parser 接口使用说明](/zh/docs/eino/core_modules/components/document_loader_guide/document_parser_interface_guide)
