---
Description: ""
date: "2025-02-11"
lastmod: ""
tags: []
title: Loader - web url
weight: 0
---

## **Basic Introduction**

The URL Document Loader is an implementation of the Document Loader interface, used to load document content from web URLs. This component implements the [Eino: Document Loader guide](/en/docs/eino/core_modules/components/document_loader_guide).

### **Feature Introduction**

The URL Document Loader has the following features:

- Default support for HTML web content parsing
- Customizable HTTP client configurations (e.g., custom proxies, etc.)
- Supports custom content parsers (e.g., body, or other specific containers)

## **Usage**

### **Component Initialization**

The URL Document Loader is initialized using the `NewLoader` function with the main configuration parameters as follows:

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

Explanation of configuration parameters:

- `Parser`: Document parser, defaults to the HTML parser, which extracts the main content of the web page
- `Client`: HTTP client which can be customized with timeout, proxy, and other configurations
- `RequestBuilder`: Request builder used to customize request methods, headers, etc.

### **Loading Documents**

Documents are loaded through the `Load` method:

```go
docs, err := loader.Load(ctx, document.Source{
    URI: "https://example.com/document",
})
```

Note:

- The URI must be a valid HTTP/HTTPS URL
- The default request method is GET
- If other HTTP methods or custom headers are needed, configure the RequestBuilder, for example in authentication scenarios

### **Complete Usage Example**

#### **Basic Usage**

```go
package main

import (
    "context"
    
    "github.com/cloudwego/eino-ext/components/document/loader/url"
    "github.com/cloudwego/eino/components/document"
)

func main() {
    ctx := context.Background()
    
    // Initialize the loader with default configuration
    loader, err := url.NewLoader(ctx, nil)
    if (err != nil) {
        panic(err)
    }
    
    // Load documents
    docs, err := loader.Load(ctx, document.Source{
        URI: "https://example.com/article",
    })
    if (err != nil) {
        panic(err)
    }
    
    // Use document content
    for _, doc := range docs {
        println(doc.Content)
    }
}
```

#### **Custom Configuration Example**

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
    
    // Custom HTTP client
    client := &http.Client{
        Timeout: 10 * time.Second,
    }
    
    // Custom request builder
    requestBuilder := func(ctx context.Context, src document.Source, opts ...document.LoaderOption) (*http.Request, error) {
        req, err := http.NewRequestWithContext(ctx, "GET", src.URI, nil)
        if err != nil {
            return nil, err
        }
        // Add custom headers
        req.Header.Add("User-Agent", "MyBot/1.0")
        return req, nil
    }
    
    // Initialize the loader
    loader, err := url.NewLoader(ctx, &url.LoaderConfig{
        Client:         client,
        RequestBuilder: requestBuilder,
    })
    if (err != nil) {
        panic(err)
    }
    
    // Load documents
    docs, err := loader.Load(ctx, document.Source{
        URI: "https://example.com/article",
    })
    if (err != nil) {
        panic(err)
    }
    
    // Use document content
    for _, doc := range docs {
        println(doc.Content)
    }
}
```

## **Related Documentation**

- [Eino: Document Loader guide](/en/docs/eino/core_modules/components/document_loader_guide)
- [Eino: Document Parser guide](/en/docs/eino/core_modules/components/document_loader_guide/document_parser_interface_guide)
