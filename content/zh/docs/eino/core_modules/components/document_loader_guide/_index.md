---
Description: ""
date: "2025-02-19"
lastmod: ""
tags: []
title: 'Eino: Document Loader 使用说明'
weight: 6
---

## **基本介绍**

Document Loader 是一个用于加载文档的组件。它的主要作用是从不同来源（如网络 URL、本地文件等）加载文档内容，并将其转换为标准的文档格式。这个组件在处理需要从各种来源获取文档内容的场景中发挥重要作用，比如:

- 从网络 URL 加载网页内容
- 读取本地 PDF、Word 等格式的文档

## **组件定义**

### **接口定义**

> 代码位置：eino/components/document/parser/interface.go

```go
type Loader interface {
    Load(ctx context.Context, src Source, opts ...LoaderOption) ([]*schema.Document, error)
}
```

#### **Load 方法**

- 功能：从指定的数据源加载文档
- 参数：
  - ctx：上下文对象，用于传递请求级别的信息，同时也用于传递 Callback Manager
  - src：文档来源，包含文档的 URI 信息
  - opts：加载选项，用于配置加载行为
- 返回值：
  - `[]*schema.Document`：加载的文档列表
  - error：加载过程中的错误信息

### **Source 结构体**

```go
type Source struct {
    URI string
}
```

Source 结构体定义了文档的来源信息：

- URI：文档的统一资源标识符，可以是网络 URL 或本地文件路径

### **Document 结构体**

```go
type Document struct {
    // ID 是文档的唯一标识符
    ID string
    // Content 是文档的内容
    Content string
    // MetaData 用于存储文档的元数据信息
    MetaData map[string]any
}
```

Document 结构体是文档的标准格式，包含以下重要字段：

- ID：文档的唯一标识符，用于在系统中唯一标识一个文档
- Content：文档的实际内容
- MetaData：文档的元数据，可以存储如下信息：
  - 文档的来源信息
  - 文档的向量表示（用于向量检索）
  - 文档的分数（用于排序）
  - 文档的子索引（用于分层检索）
  - 其他自定义元数据

### **公共选项**

Loader 组件使用 `LoaderOption` 来定义加载选项。Loader 目前没有公共的 Option，每个具体的实现可以定义自己的特定选项，通过 `WrapLoaderImplSpecificOptFn` 函数包装成统一的 `LoaderOption` 类型。

## **使用方式**

### **单独使用**

> 代码位置：eino-ext/components/document/loader/file/examples/fileloader

```go
import (
    "github.com/cloudwego/eino/components/document"
    "github.com/cloudwego/eino-ext/components/document/loader/file"
)

// 初始化 loader (以file loader为例)
loader, _ := file.NewFileLoader(ctx, &file.FileLoaderConfig{
    // 配置参数
    UseNameAsID: true,
})

// 加载文档
filePath := "../../testdata/test.md"
docs, _ := loader.Load(ctx, document.Source{
    URI: filePath,
})

log.Printf("doc content: %v", docs[0].Content)
```

### **在编排中使用**

```go
// 在 Chain 中使用
chain := compose.NewChain[string, []*schema.Document]()
chain.AppendLoader(loader)

// 编译并运行
runnable, _ := chain.Compile()

result, _ := runnable.Invoke(ctx, input)

// 在 Graph 中使用
graph := compose.NewGraph[string, []*schema.Document]()
graph.AddLoaderNode("loader_node", loader)
```

## **Option 和 Callback 使用**

### **Callback 使用示例**

> 代码位置：eino-ext/components/document/loader/file/examples/fileloader

```go
import (
    "github.com/cloudwego/eino/callbacks"
    "github.com/cloudwego/eino/components/document"
    "github.com/cloudwego/eino/compose"
    "github.com/cloudwego/eino/schema"
    callbacksHelper "github.com/cloudwego/eino/utils/callbacks"

    "github.com/cloudwego/eino-ext/components/document/loader/file"
)

// 创建 callback handler
handler := &callbacksHelper.LoaderCallbackHandler{
    OnStart: func(ctx context.Context, info *callbacks.RunInfo, input *document.LoaderCallbackInput) context.Context {
       log.Printf("start loading docs...: %s\n", input.Source.URI)
       return ctx
    },
    OnEnd: func(ctx context.Context, info *callbacks.RunInfo, output *document.LoaderCallbackOutput) context.Context {
       log.Printf("complete loading docs，total loaded docs: %d\n", len(output.Docs))
       return ctx
    },
    // OnError
}

// 使用 callback handler
helper := callbacksHelper.NewHandlerHelper().
    Loader(handler).
    Handler()

chain := compose.NewChain[document.Source, []*schema.Document]()
chain.AppendLoader(loader)
// 在运行时使用
run, _ := chain.Compile(ctx)

outDocs, _ := run.Invoke(ctx, document.Source{
    URI: filePath,
}, compose.WithCallbacks(helper))

log.Printf("doc content: %v", outDocs[0].Content)
```

## **已有实现**

1. File Loader: 用于加载本地文件系统中的文档 [Loader - local file](/zh/docs/eino/ecosystem_integration/document/loader_local_file)
2. Web Loader: 用于加载网络 URL 指向的文档 [Loader - web url](/zh/docs/eino/ecosystem_integration/document/loader_web_url)
3. S3 Loader: 用于加载存储在 S3 兼容存储系统中的文档 [Loader - amazon s3](/zh/docs/eino/ecosystem_integration/document/loader_amazon_s3)

## **自行实现参考**

自行实现 loader 组件时，需要注意 option 机制和 callback 的处理。

### option **机制**

自定义 Loader 需要实现自己的 Option 参数机制：

```go
// 定义选项结构体
type MyLoaderOptions struct {
    Timeout time.Duration
    RetryCount int
}

// 定义选项函数
func WithTimeout(timeout time.Duration) document.LoaderOption {
    return document.WrapLoaderImplSpecificOptFn(func(o *MyLoaderOptions) {
        o.Timeout = timeout
    })
}

func WithRetryCount(count int) document.LoaderOption {
    return document.WrapLoaderImplSpecificOptFn(func(o *MyLoaderOptions) {
        o.RetryCount = count
    })
}
```

### **Callback 处理**

Loader 实现需要在适当的时机触发回调：

> 代码位置：eino/components/document/callback_extra_loader.go

```go
// 这是由loader组件定义的回调输入输出, 在实现时需要满足参数的含义
type LoaderCallbackInput struct {
    Source Source
    Extra map[string]any
}

type LoaderCallbackOutput struct {
    Source Source
    Docs []*schema.Document
    Extra map[string]any
}
```

### **完整实现示例**

```go
import (
    "github.com/cloudwego/eino/callbacks"
    "github.com/cloudwego/eino/components/document"
    "github.com/cloudwego/eino/schema"
)

func NewCustomLoader(config *Config) (*CustomLoader, error) {
    return &CustomLoader{
       timeout:    config.DefaultTimeout,
       retryCount: config.DefaultRetryCount,
    }, nil
}

type CustomLoader struct {
    timeout    time.Duration
    retryCount int
}

type Config struct {
    DefaultTimeout    time.Duration
    DefaultRetryCount int
}

func (l *CustomLoader) Load(ctx context.Context, src document.Source, opts ...document.LoaderOption) ([]*schema.Document, error) {
    // 1. 处理 option
    options := &customLoaderOptions{
       Timeout:    l.timeout,
       RetryCount: l.retryCount,
    }
    options = document.GetLoaderImplSpecificOptions(options, opts...)
    var err error

    // 2. 处理错误，并进行错误回调方法
    defer func() {
       if err != nil {
          callbacks.OnError(ctx, err)
       }
    }()

    // 3. 开始加载前的回调
    ctx = callbacks.OnStart(ctx, &document.LoaderCallbackInput{
       Source: src,
    })

    // 4. 执行加载逻辑
    docs, err := l.doLoad(ctx, src, options)

    if err != nil {
       return nil, err
    }

    ctx = callbacks.OnEnd(ctx, &document.LoaderCallbackOutput{
       Source: src,
       Docs:   docs,
    })

    return docs, nil
}

func (l *CustomLoader) doLoad(ctx context.Context, src document.Source, opts *customLoaderOptions) ([]*schema.Document, error) {
    // 实现文档加载逻辑
    // 1. 加载文档内容
    // 2. 构造 Document 对象，注意可在 MetaData 中保存文档来源等重要信息
    return []*schema.Document{{
       Content: "Hello World",
    }}, nil
}
```

### **注意事项**

- MetaData 是文档的重要组成部分，用于保存文档的各种元信息
- 文档加载失败时返回有意义的错误信息，便于做错误的排查

## 其他参考文档

- [[🚧]Eino: Document Transformer 使用说明](/zh/docs/eino/core_modules/components/document_transformer_guide)
- [[🚧]Eino: Embedding 使用说明](/zh/docs/eino/core_modules/components/embedding_guide)
- [[🚧]Eino: Indexer 使用说明](/zh/docs/eino/core_modules/components/indexer_guide)
- [[🚧]Eino: Retriever 使用说明](/zh/docs/eino/core_modules/components/retriever_guide)
