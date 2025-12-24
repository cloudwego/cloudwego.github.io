---
Description: ""
date: "2025-12-11"
lastmod: ""
tags: []
title: Embedding - Qianfan
weight: 0
---




## **基本介绍**

Embedding模型主要提供的功能是将文本转换为向量表示，进而方便用户基于向量表示进行下一步的操作，比如向量相似度召回（Retriever），在国内外提供相关模型的厂商有很多，百度的千帆大模型平台就提供了相关产品选择。


`qianfan Embedding` 是[Eino库](https://github.com/cloudwego/eino)中Embedding 接口的一个实现，其中qianfan是百度千帆大模型的**简称**，因而本模块：

```go
"github.com/cloudwego/eino-ext/components/embedding/qianfan"
```
提供了相关的封装，方便用户进行**qianfan供应商**的相关embedding模型调用。




## **使用方式**

1、首先引用eino-ext库中，qianfan供应商的相关embedding模块，具体如下：

```go
"github.com/cloudwego/eino-ext/components/embedding/qianfan"
```

2、然后，用户可以基于个人在百度千帆官网申请的ak、sk和自己需要调用的Embedding模型进行相关配置。

3、最后，用户即可快速接入相关模型的使用

#### 核心配置1、关于ak和sk

在后续的示例脚本中虽然是直接读取的用户环境变量中设置的相关变量。
但如果用户想要显示的指定相关ak和sk，也可以使用如下方式进行配置：

```go
os.Setenv("QIANFAN_ACCESS_KEY", "你的百度千帆ak")
os.Setenv("QIANFAN_SECRET_KEY", "你的百度千帆sk")
```

#### 核心配置2、调用的Embedding模型名称

```go
emb, err := qianfan.NewEmbedder(ctx, &qianfan.EmbeddingConfig{
    Model: "Embedding-V1", // 在此处指定你调用的Embedding模型名称
})
```



### **完整使用示例**

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
    // 示例文字预计生成的向量表示类似如下：
    // [
    //    [
    //        0.08621871471405029,
    //        -0.0012516016140580177,
    //        -0.09416878968477249,
    //        0.11720088124275208,
    //        ...
    //    ],
    //    [
    //        0.09814976155757904,
    //        0.10714524984359741,
    //        0.06678730994462967,
    //        0.08447521179914474,
    //        ...
    //    ]
    //]
}
```

## **相关文档**

- Embedding供应商官网：[百度千帆（qianfan）](https://cloud.baidu.com/product-s/qianfan_home)
- 供应商官方API接入文档：[百度千帆（qianfan）官方API文档](https://cloud.baidu.com/doc/qianfan/index.html)
