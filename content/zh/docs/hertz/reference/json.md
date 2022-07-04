---
title: "JSON Marshal 库"
linkTitle: "JSON Marshal 库"
weight: 3
description: >

---


Hertz 默认集成 [Sonic](https://github.com/bytedance/sonic) 作为 json marshal 库，用于`ctx.JSON`接口对数据进行序列化。Sonic 是一款超高性能 golang json 库，详情参考 Sonic [README](https://github.com/bytedance/sonic) 。

目前开启 Sonic 需要以下条件：
- Go 1.15/1.16/1.17/1.18
- Linux / darwin OS / Windows
- Amd64 CPU with AVX instruction set

在不支持的条件下会自动 fallback 到 golang 的 encoding/json 库。

另外 Sonic
- 默认关闭 html enscape
- 默认关闭 keysort

如果 Sonic 不能够满足您的需求，可以使用以下方式自定义 json marshal 库:

```go
import (
    "encoding/json"

    "github.com/cloudwego/hertz/pkg/app/server/render"
)

func main() {
    render.ResetJSONMarshal(json.Marshal)
}
```
