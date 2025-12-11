---
Description: ""
date: "2025-01-20"
lastmod: ""
tags: []
title: Loader - amazon s3
weight: 0
---

## **Overview**

S3 document loader is an implementation of the Document Loader interface that loads content from AWS S3 buckets. It follows [Eino: Document Loader Guide](/docs/eino/core_modules/components/document_loader_guide).

### **AWS S3 Service Overview**

Amazon S3 is an object storage service with high scalability, availability, security, and performance. This component interacts with S3 via AWS SDK for Go v2 and supports authentication via access keys or default credentials.

## **Usage**

### **Initialization**

```go
import (
  "github.com/cloudwego/eino-ext/components/document/loader/s3"
)

func main() {
    loader, err := s3.NewS3Loader(ctx, &s3.LoaderConfig{
        Region:           aws.String("us-east-1"),        // AWS region
        AWSAccessKey:     aws.String("your-access-key"),  // AWS access key ID
        AWSSecretKey:     aws.String("your-secret-key"),  // AWS secret key
        UseObjectKeyAsID: true,                           // use object key as document ID
        Parser:           &parser.TextParser{},           // document parser (default TextParser)
    })
}
```

Parameters:

- `Region`: AWS region of the bucket
- `AWSAccessKey` and `AWSSecretKey`: credentials; use default credential chain if not provided
- `UseObjectKeyAsID`: use S3 object key as document ID
- `Parser`: parser to convert content to text; default TextParser

### **Load Documents**

```go
docs, err := loader.Load(ctx, document.Source{ URI: "s3://bucket-name/path/to/document.txt" })
```

URI format:

- Must start with `s3://`
- Followed by bucket name and object key
- Example: `s3://my-bucket/folder/document.pdf`

Notes:

- Prefix-based bulk loading is not supported
- URI must point to a concrete object (not ending with `/`)
- Ensure sufficient permissions to access the bucket and object

### **Complete Example**

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
    if err != nil { panic(err) }

    docs, err := loader.Load(ctx, document.Source{ URI: "s3://my-bucket/documents/sample.txt" })
    if err != nil { panic(err) }
    for _, doc := range docs { println(doc.Content) }
}
```

## **References**

- [Eino: Document Loader Guide](/docs/eino/core_modules/components/document_loader_guide)
- [Eino: Document Parser Interface Guide](/docs/eino/core_modules/components/document_loader_guide/document_parser_interface_guide)
