---
Description: ""
date: "2025-02-11"
lastmod: ""
tags: []
title: Loader - amazon s3
weight: 0
---

## **Introduction**

The S3 Document Loader is an implementation of the Document Loader interface, used to load document content from AWS S3 buckets. This component implements the [Eino: Document Loader guide](/en/docs/eino/core_modules/components/document_loader_guide).

### **Introduction to AWS S3 Service**

Amazon Simple Storage Service (Amazon S3) is an object storage service offering industry-leading scalability, data availability, security, and performance. This component interacts with the S3 service using the AWS SDK for Go v2 and supports authentication through access keys or default credentials.

## **Usage**

### **Component Initialization**

The S3 Document Loader is initialized via the `NewS3Loader` function with the following main configuration parameters:

```go
import (
  "github.com/cloudwego/eino-ext/components/document/loader/s3"
)

func main() {
    loader, err := s3.NewS3Loader(ctx, &s3.LoaderConfig{
        Region:           aws.String("us-east-1"),        // AWS Region
        AWSAccessKey:     aws.String("your-access-key"),  // AWS Access Key ID
        AWSSecretKey:     aws.String("your-secret-key"),  // AWS Secret Access Key
        UseObjectKeyAsID: true,                           // Whether to use the object key as the document ID
        Parser:           &parser.TextParser{},           // Document parser, defaults to TextParser
    })
}
```

Configuration parameter descriptions:

- `Region`: The AWS region where the S3 bucket is located
- `AWSAccessKey` and `AWSSecretKey`: AWS access credentials; if not provided, the default credential chain will be used
- `UseObjectKeyAsID`: Whether to use the S3 object's key as the document ID
- `Parser`: The parser used for parsing document content, defaults to TextParser to directly convert content to a string

### **Loading Documents**

Documents are loaded through the `Load` method:

```go
docs, err := loader.Load(ctx, document.Source{
    URI: "s3://bucket-name/path/to/document.txt",
})
```

URI format description:

- Must start with `s3://`
- Followed by the bucket name and object key
- Example: `s3://my-bucket/folder/document.pdf`

Precautions:

- Currently, batch loading of documents via prefix is not supported
- The URI must point to a specific object and cannot end with `/`
- Ensure sufficient permissions to access the specified bucket and object

### **Complete Usage Example**

#### **Standalone Usage**

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
    
    // Loading documents
    docs, err := loader.Load(ctx, document.Source{
        URI: "s3://my-bucket/documents/sample.txt",
    })
    if err != nil {
        panic(err)
    }
    
    // Using document content
    for _, doc := range docs {
        println(doc.Content)
    }
}
```

## **Related Documentation**

- [Eino: Document Loader guide](/en/docs/eino/core_modules/components/document_loader_guide)
- [Eino: Document Parser guide](/en/docs/eino/core_modules/components/document_loader_guide/document_parser_interface_guide)
