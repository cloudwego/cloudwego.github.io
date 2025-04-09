---
title: "StreamX timeout control"
date: 2025-01-10
weight: 5
keywords: ["Stream Timeout Control Best Practices"]
description: ""
---

## Timeout Control Mechanism Supported by TTHeader Streaming
### Recv Timeout
Control timeout for every ```Recv```。
#### Client Level
It will take effect for every Interface of this Client.

```
import (
    "github.com/cloudwego/kitex/client"
)

cli, err := NewClient("service", client.WithStreamOptions(client.WithStreamRecvTimeout(timeout)))
```
#### Interface Level(Kitex >= v0.13.0)
It will take effect for single interface.

```
import (
    "github.com/cloudwego/kitex/client/callopt/streamcall"
)

cli, err := NewClient("service")
// Calling one of the downstream streaming interfaces
stream, err := cli.NewStream(ctx, streamcall.WithRecvTimeout(timeout))
``` 
