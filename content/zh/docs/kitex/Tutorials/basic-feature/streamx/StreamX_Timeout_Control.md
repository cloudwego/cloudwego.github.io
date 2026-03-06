---
title: "StreamX 流超时控制"
date: 2025-01-10
weight: 5
keywords: ["流超时控制最佳实践"]
description: ""
---

## TTHeader Streaming 支持的超时机制
### Recv Timeout
对每次 Recv 进行超时控制。
#### Client 级别
这个 Client 下的所有接口都会生效。

```
import (
    "github.com/cloudwego/kitex/client"
)

cli, err := NewClient("service", client.WithStreamOptions(client.WithStreamRecvTimeout(timeout)))
```
#### 接口级别(Kitex >= v0.13.0)
只针对单个接口生效。

```
import (
    "github.com/cloudwego/kitex/client/callopt/streamcall"
)

cli, err := NewClient("service")
// 调用下游某个流式接口
stream, err := cli.NewStream(ctx, streamcall.WithRecvTimeout(timeout))
``` 
