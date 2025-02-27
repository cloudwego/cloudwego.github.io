---
Description: ""
date: "2025-01-22"
lastmod: ""
tags: []
title: 'Eino: Document Parser 接口使用说明'
weight: 1
---

## **基本介绍**

Document Parser 是一个用于解析文档内容的工具包。它不是一个独立的组件，而是作为 Document Loader 的内部工具，用于将不同格式的原始内容解析成标准的文档格式。Parser 支持：

- 解析不同格式的文档内容（如文本、PDF、Markdown 等）
- 根据文件扩展名自动选择合适的解析器 (eg：ExtParser)
- 为解析后的文档添加元数据信息

## **接口定义**

### **Parser 接口**

> 代码位置：eino/components/document/parser/interface.go

```go
import (
    "github.com/cloudwego/eino/schema"
)

// Parser is a document parser, can be used to parse a document from a reader.
type Parser interface {
    Parse(ctx context.Context, reader io.Reader, opts ...Option) ([]*schema.Document, error)
}
```

#### **Parse 方法**

- 功能：从 Reader 中解析文档内容
- 参数：
  - ctx：上下文对象
  - reader：提供原始内容的 Reader
  - opts：解析选项
- 返回值：
  - `[]*schema.Document`：解析后的文档列表
  - error：解析过程中的错误

### **公共 Option 定义**

```go
type Options struct {
    // URI 表示文档的来源
    URI string

    // ExtraMeta 会被合并到每个解析出的文档的元数据中
    ExtraMeta map[string]any
}
```

提供了两个基础的选项函数：

- WithURI：设置文档的 URI，在 ExtParser 中用于选择解析器
- WithExtraMeta：设置额外的元数据

## **内置解析器**

### **TextParser**

最基础的文本解析器，将输入内容直接作为文档内容：

> 代码位置：eino-examples/components/document/parser/textparser

```go
import "github.com/cloudwego/eino/components/document/parser"

textParser := parser.TextParser{}
docs, _ := textParser.Parse(ctx, strings.NewReader("hello world"))

logs.Infof("text content: %v", docs[0].Content)
```

### **ExtParser**

基于文件扩展名的解析器，可以根据文件扩展名自动选择合适的解析器：

> 代码位置：eino-examples/components/document/parser/extparser

```go
package main

import (
    "context"
    "os"

    "github.com/cloudwego/eino-ext/components/document/parser/html"
    "github.com/cloudwego/eino-ext/components/document/parser/pdf"
    "github.com/cloudwego/eino/components/document/parser"

    "github.com/cloudwego/eino-examples/internal/gptr"
    "github.com/cloudwego/eino-examples/internal/logs"
)

func main() {
    ctx := context.Background()

    textParser := parser.TextParser{}

    htmlParser, _ := html.NewParser(ctx, &html.Config{
       Selector: gptr.Of("body"),
    })

    pdfParser, _ := pdf.NewPDFParser(ctx, &pdf.Config{})

    // 创建扩展解析器
    extParser, _ := parser.NewExtParser(ctx, &parser.ExtParserConfig{
       // 注册特定扩展名的解析器
       Parsers: map[string]parser.Parser{
          ".html": htmlParser,
          ".pdf":  pdfParser,
       },
       // 设置默认解析器，用于处理未知格式
       FallbackParser: textParser,
    })

    // 使用解析器
    filePath := "./testdata/test.html"
    file, _ := os.Open(filePath)
    
    docs, _ := extParser.Parse(ctx, file,
       // 必须提供 URI ExtParser 选择正确的解析器进行解析
       parser.WithURI(filePath),
       parser.WithExtraMeta(map[string]any{
          "source": "local",
       }),
    )

    for idx, doc := range docs {
       logs.Infof("doc_%v content: %v", idx, doc.Content)
    }
}
```

### 其他实现

- pdf parser, 用于提取和 parse pdf 格式的文件: [[🚧]Parser - pdf](/zh/docs/eino/ecosystem_integration/document/parser_pdf)
- html parser, 用于提取和 parse html 格式的内容:  [[🚧]Parser - html](/zh/docs/eino/ecosystem_integration/document/parser_html)

## **在 Document Loader 中使用**

Parser 主要在 Document Loader 中使用，用于解析加载的文档内容。以下是一些典型的使用场景：

### **文件加载器**

> 代码位置：eino-ext/components/document/loader/file/examples/fileloader

```go
import (
    "github.com/cloudwego/eino/components/document"
    "github.com/cloudwego/eino/schema"
    "github.com/cloudwego/eino-ext/components/document/loader/file"
)

// 使用 FileLoader 加载本地文件
ctx := context.Background()

log.Printf("===== call File Loader directly =====")
// 初始化 loader (以file loader为例)
loader, err := file.NewFileLoader(ctx, &file.FileLoaderConfig{
    // 配置参数
    UseNameAsID: true,
})
if err != nil {
    log.Fatalf("file.NewFileLoader failed, err=%v", err)
}

// 加载文档
filePath := "../../testdata/test.md"
docs, err := loader.Load(ctx, document.Source{
    URI: filePath,
})
if err != nil {
    log.Fatalf("loader.Load failed, err=%v", err)
}

log.Printf("doc content: %v", docs[0].Content)
log.Printf("Extension: %s\n", docs[0].MetaData[file._MetaKeyExtension_]) // 输出: Extension: .txt
log.Printf("Source: %s\n", docs[0].MetaData[file._MetaKeySource_])       // 输出: Source: ./document.txt
```

## **自定义解析器实现**

### option **机制**

自定义解析器可以定义自己的 option：

```go
// options
// 定制实现自主定义的 option 结构体
type options struct {
    Encoding string
    MaxSize  int64
}

// WithEncoding
// 定制实现自主定义的 Option 方法
func WithEncoding(encoding string) parser.Option {
    return parser.WrapImplSpecificOptFn(func(o *options) {
       o.Encoding = encoding
    })
}

func WithMaxSize(size int64) parser.Option {
    return parser.WrapImplSpecificOptFn(func(o *options) {
       o.MaxSize = size
    })
}
```

### **完整实现示例**

> 代码位置：eino-examples/components/document/parser/customparser/custom_parser.go

```go
import (
    "github.com/cloudwego/eino/components/document/parser"
    "github.com/cloudwego/eino/schema"
)

type Config struct {
    DefaultEncoding string
    DefaultMaxSize  int64
}

type CustomParser struct {
    defaultEncoding string
    defaultMaxSize  int64
}

func NewCustomParser(config *Config) (*CustomParser, error) {
    return &CustomParser{
       defaultEncoding: config.DefaultEncoding,
       defaultMaxSize:  config.DefaultMaxSize,
    }, nil
}

func (p *CustomParser) Parse(ctx context.Context, reader io.Reader, opts ...parser.Option) ([]*schema.Document, error) {
    // 1. 处理通用选项
    commonOpts := parser.GetCommonOptions(&parser.Options{}, opts...)
    _ = commonOpts

    // 2. 处理特定选项
    myOpts := &options{
       Encoding: p.defaultEncoding,
       MaxSize:  p.defaultMaxSize,
    }
    myOpts = parser.GetImplSpecificOptions(myOpts, opts...)
    _ = myOpts
    // 3. 实现解析逻辑

    return []*schema.Document{{
       Content: "Hello World",
    }}, nil
}
```

### **注意事项**

1. 注意对公共 option 抽象的处理
2. 注意 metadata 的设置和传递
