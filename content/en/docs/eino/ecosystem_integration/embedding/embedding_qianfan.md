---
Description: ""
date: "2025-12-11"
lastmod: ""
tags: []
title: Embedding - Qianfan
weight: 0
---


## **Basic Introduction**

Embedding models primarily provide the functionality of converting text into vector representations, thereby facilitating users' subsequent operations based on vector representations, such as vector similarity retrieval (Retriever). Many domestic and international vendors provide related models, and Baidu's Qianfan Large Model Platform offers relevant product options.

`qianfan Embedding` is an implementation of the Embedding interface in the [Eino library](https://github.com/cloudwego/eino), where qianfan is the **abbreviation** for Baidu Qianfan Large Model. Therefore, this module:

```go
"github.com/cloudwego/eino-ext/components/embedding/qianfan"
```

provides the relevant encapsulation to facilitate users' calls to **qianfan provider's** related embedding models.

## **Usage Method**

1. First, import the qianfan provider's related embedding module from the eino-ext library, as follows:

```go
"github.com/cloudwego/eino-ext/components/embedding/qianfan"
```

2. Then, users can configure based on their AK and SK applied for on the Baidu Qianfan official website and the Embedding model they need to call.

3. Finally, users can quickly integrate and use the related models.

#### Core Configuration 1: Regarding AK and SK

Although the example script below directly reads the related variables set in the user's environment variables.

If users want to explicitly specify the related AK and SK, they can also configure them using the following method:

```go
os.Setenv("QIANFAN_ACCESS_KEY", "your Baidu Qianfan AK")
os.Setenv("QIANFAN_SECRET_KEY", "your Baidu Qianfan SK")
```

#### Core Configuration 2: Name of the Embedding Model to Call

```go
emb, err := qianfan.NewEmbedder(ctx, &qianfan.EmbeddingConfig{
    Model: "Embedding-V1", // Specify the name of the Embedding model you're calling here
})
```

### **Complete Usage Example**

```go
package main

import (
    "context"
    "encoding/json"
    "fmt"
    "log"
    "os"

    "github.com/cloudwego/eino-ext/components/embedding/qianfan"
)

func main() {
    ctx := context.Background()

    qcfg := qianfan.GetQianfanSingletonConfig()
    qcfg.AccessKey = os.Getenv("QIANFAN_ACCESS_KEY")
    qcfg.SecretKey = os.Getenv("QIANFAN_SECRET_KEY")

    emb, err := qianfan.NewEmbedder(ctx, &qianfan.EmbeddingConfig{
        Model: "Embedding-V1",
    })
    if err != nil {
        log.Fatalf("NewEmbedder of qianfan embedding failed, err=%v", err)
    }

    v, err := emb.EmbedStrings(ctx, []string{"hello world", "bye world"})
    if err != nil {
        log.Fatalf("EmbedStrings of qianfan embedding failed, err=%v", err)
    }

    b, _ := json.Marshal(v)
    fmt.Println(string(b))
    // The example text is expected to generate vector representations similar to the following:
    // [
    //   [
    //     0.08621871471405029,
    //     -0.0012516016140580177,
    //     -0.09416878968477249,
    //     0.11720088124275208,
    //     ...
    //   ],
    //   [
    //     0.09814976155757904,
    //     0.10714524984359741,
    //     0.06678730994462967,
    //     0.08447521179914474,
    //     ...
    //   ]
    // ]
}
```

## **Related Documentation**

- Embedding Provider Official Website: [Baidu Qianfan](https://cloud.baidu.com/product-s/qianfan_home)
- Provider Official API Integration Documentation: [Baidu Qianfan Official API Documentation](https://cloud.baidu.com/doc/qianfan/index.html)
