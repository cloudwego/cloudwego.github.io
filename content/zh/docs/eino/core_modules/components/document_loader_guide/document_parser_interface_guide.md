---
Description: ""
date: "2025-01-06"
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

```go
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

```go
// 使用示例
docs, err := TextParser{}.Parse(ctx, strings.NewReader("hello world"))
if err != nil {
    return err
}
fmt.Println(docs[0].Content) // 输出: hello world
```

### **ExtParser**

基于文件扩展名的解析器，可以根据文件扩展名自动选择合适的解析器：

```go
// 创建扩展解析器
parser, err := NewExtParser(ctx, &ExtParserConfig{
    // 注册特定扩展名的解析器
    Parsers: map[string]Parser{
        ".html": html.NewParser(&html.ParserConfig{
            // HTML 解析器的配置
            RemoveScript: true,  // 移除脚本标签
            RemoveStyle: true,   // 移除样式标签
        }),
        ".pdf": pdf.NewParser(&pdf.ParserConfig{
            // PDF 解析器的配置
            ExtractImages: false,  // 不提取图片
        }),
    },
    // 设置默认解析器，用于处理未知格式
    FallbackParser: TextParser{},
})
if err != nil {
    return err
}

// 使用解析器
file, _ := os.Open("./document.html")
docs, err := parser.Parse(ctx, file, 
    WithURI("./document.html"), // 必须提供 URI 以便选��正确的解析器
    WithExtraMeta(map[string]any{
        "source": "local",
    }),
)
```

### 其他实现

- pdf parser, 用于提取和 parse pdf 格式的文件: [[🚧]Parser - pdf](/zh/docs/eino/ecosystem_integration/document/parser_pdf)
- html parser, 用于提取和 parse html 格式的内容:  [[🚧]Parser - html](/zh/docs/eino/ecosystem_integration/document/parser_html)

## **在 Document Loader 中使用**

Parser 主要在 Document Loader 中使用，用于解析加载的文档内容。以下是一些典型的使用场景：

### **文件加载器**

```go
// 使用 FileLoader 加载本地文件
ctx := context.Background()

// 创建文件加载器，使用文本解析器
loader, err := file.NewFileLoader(ctx, &file.FileLoaderConfig{
    UseNameAsID: true,  // 使用文件名作为文档ID
    Parser: parser.TextParser{},  // 使用文本解析器
})
if err != nil {
    return err
}

// 加载文件
docs, err := loader.Load(ctx, document.Source{
    URI: "./document.txt",
})
if err != nil {
    return err
}

// 处理加载的文档
for _, doc := range docs {
    fmt.Printf("Document ID: %s\n", doc.ID)  // 输出: Document ID: document.txt
    fmt.Printf("Content: %s\n", doc.Content)
    fmt.Printf("Extension: %s\n", doc.MetaData[file.MetaKeyExtension])  // 输出: Extension: .txt
    fmt.Printf("Source: %s\n", doc.MetaData[file.MetaKeySource])  // 输出: Source: ./document.txt
}
```

## **自定义解析器实现**

### option **机制**

自定义解析器可以定义自己的 option：

```go
// 定义选项结构体
type MyParserOptions struct {
    Encoding string
    MaxSize int64
}

// 定义选项函数
func WithEncoding(encoding string) parser.Option {
    return parser.WrapImplSpecificOptFn(func(o *MyParserOptions) {
        o.Encoding = encoding
    })
}

func WithMaxSize(size int64) parser.Option {
    return parser.WrapImplSpecificOptFn(func(o *MyParserOptions) {
        o.MaxSize = size
    })
}
```

### **完整实现示例**

```go
type MyParser struct {
    defaultEncoding string
    defaultMaxSize int64
}

func NewMyParser(config *MyParserConfig) (*MyParser, error) {
    return &MyParser{
        defaultEncoding: config.DefaultEncoding,
        defaultMaxSize: config.DefaultMaxSize,
    }, nil
}

func (p *MyParser) Parse(ctx context.Context, reader io.Reader, opts ...parser.Option) ([]*schema.Document, error) {
    // 1. 处理通用选项
    commonOpts := parser.GetCommonOptions(&parser.Options{}, opts...)
    
    // 2. 处理特定选项
    myOpts := &MyParserOptions{
        Encoding: p.defaultEncoding,
        MaxSize: p.defaultMaxSize,
    }
    myOpts = parser.GetImplSpecificOptions(myOpts, opts...)
    
    // 3. 实现解析逻辑
    
    return docs, nil
}
```

### **注意事项**

1. 注意对公共 option 抽象的处理
2. 注意 metadata 的设置和传递
