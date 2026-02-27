---
Description: ""
date: "2025-01-20"
lastmod: ""
tags: []
title: Loader - web url
weight: 0
---

## **Overview**

URL document loader is an implementation of the Document Loader interface that loads content from web URLs. It follows [Eino: Document Loader Guide](/docs/eino/core_modules/components/document_loader_guide).

### **Features**

- HTML page parsing by default
- Customizable HTTP client configuration (e.g., proxy)
- Custom content parser (e.g., body or specific container)

## **Usage**

### **Initialization**

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

Parameters:

- `Parser`: document parser; default HTML parser extracts main body content
- `Client`: HTTP client; customize timeout, proxy, etc.
- `RequestBuilder`: request builder for method/headers customization

### **Load Documents**

```go
docs, err := loader.Load(ctx, document.Source{ URI: "https://example.com/document" })
```

Notes:

- URI must be a valid HTTP/HTTPS URL
- Default method is GET
- For other methods or custom headers (e.g., auth), configure `RequestBuilder`

### **Complete Examples**

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

    loader, err := url.NewLoader(ctx, nil)
    if err != nil { panic(err) }

    docs, err := loader.Load(ctx, document.Source{ URI: "https://example.com/article" })
    if err != nil { panic(err) }
    for _, doc := range docs { println(doc.Content) }
}
```

#### **Custom Configuration**

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

    client := &http.Client{ Timeout: 10 * time.Second }

    requestBuilder := func(ctx context.Context, src document.Source, opts ...document.LoaderOption) (*http.Request, error) {
        req, err := http.NewRequestWithContext(ctx, "GET", src.URI, nil)
        if err != nil { return nil, err }
        req.Header.Add("User-Agent", "MyBot/1.0")
        return req, nil
    }

    loader, err := url.NewLoader(ctx, &url.LoaderConfig{ Client: client, RequestBuilder: requestBuilder })
    if err != nil { panic(err) }

    docs, err := loader.Load(ctx, document.Source{ URI: "https://example.com/article" })
    if err != nil { panic(err) }
    for _, doc := range docs { println(doc.Content) }
}
```

## **References**

- [Eino: Document Loader Guide](/docs/eino/core_modules/components/document_loader_guide)
- [Eino: Document Parser Interface Guide](/docs/eino/core_modules/components/document_loader_guide/document_parser_interface_guide)
