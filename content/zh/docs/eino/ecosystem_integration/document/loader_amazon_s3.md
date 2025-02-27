---
Description: ""
date: "2025-01-20"
lastmod: ""
tags: []
title: Loader - amazon s3
weight: 0
---

## **基本介绍**

S3 文档加载器是 Document Loader 接口的一个实现，用于从 AWS S3 存储桶中加载文档内容。该组件实现了 [Eino: Document Loader 使用说明](/zh/docs/eino/core_modules/components/document_loader_guide)

### **AWS S3 服务介绍**

Amazon Simple Storage Service (Amazon S3) 是一种对象存储服务，提供行业领先的可扩展性、数据可用性、安全性和性能。本组件通过 AWS SDK for Go v2 与 S3 服务进行交互，支持通过访问密钥或默认凭证的方式进行认证。

## **使用方式**

### **组件初始化**

S3 文档加载器通过 `NewS3Loader` 函数进行初始化，主要配置参数如下：

```go
import (
  "github.com/cloudwego/eino-ext/components/document/loader/s3"
)

func main() {
    loader, err := s3.NewS3Loader(ctx, &s3.LoaderConfig{
        Region:           aws.String("us-east-1"),        // AWS 区域
        AWSAccessKey:     aws.String("your-access-key"),  // AWS 访问密钥ID
        AWSSecretKey:     aws.String("your-secret-key"),  // AWS 访问密钥
        UseObjectKeyAsID: true,                           // 是否使用对象键作为文档ID
        Parser:           &parser.TextParser{},           // 文档解析器，默认为 TextParser
    })
}
```

配置参数说明：

- `Region`：AWS S3 存储桶所在的区域
- `AWSAccessKey` 和 `AWSSecretKey`：AWS 访问凭证，如果不提供则使用默认凭证链
- `UseObjectKeyAsID`：是否将 S3 对象的键值用作文档 ID
- `Parser`：用于解析文档内容的解析器，默认使用 TextParser 直接将内容转换为字符串

### **加载文档**

文档加载通过 `Load` 方法实现：

```go
docs, err := loader.Load(ctx, document.Source{
    URI: "s3://bucket-name/path/to/document.txt",
})
```

URI 格式说明：

- 必须以 `s3://` 开头
- 后接存储桶名称和对象键
- 示例：`s3://my-bucket/folder/document.pdf`

注意事项：

- 目前不支持通过前缀批量加载文档
- URI 必须指向具体的对象，不能以 `/` 结尾
- 确保有足够的权限访问指定的存储桶和对象

### **完整使用示例**

#### **单独使用**

```go
package main

import (
    "context"
    
    "github.com/aws/aws-sdk-go-v2/aws"
    "github.com/cloudwego/eino-ext/components/document/loader/s3"
    "github.com/cloudwego/eino/components/document"
)

func main() {
    ctx := context.Background()

    loader, err := s3.NewS3Loader(ctx, &s3.LoaderConfig{
        Region:           aws.String("us-east-1"),
        AWSAccessKey:     aws.String("your-access-key"),
        AWSSecretKey:     aws.String("your-secret-key"),
        UseObjectKeyAsID: true,
    })
    if err != nil {
        panic(err)
    }
    
    // 加载文档
    docs, err := loader.Load(ctx, document.Source{
        URI: "s3://my-bucket/documents/sample.txt",
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
