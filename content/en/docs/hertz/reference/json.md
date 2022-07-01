---
title: "JSON Marshal Library"
linkTitle: "JSON Marshal Library"
weight: 3
description: >

---


Hertz integrates [Sonic](https://github.com/bytedance/sonic) by default as a json marshal/unmarshal library for serializing data with the `ctx.JSON` interface and deserialization for requests in the `binding` package. Sonic is an ultra-high performance golang json library, see Sonic [README](https://github.com/bytedance/sonic) for details.

The following are currently required to enable Sonic:
- Go 1.15/1.16/1.17/1.18
- Linux / darwin OS / Windows
- Amd64 CPU with AVX instruction set

Automatically fallback to golang's encoding/json library if the above requirements are not satisfied.

In addition, Sonic
- disabled html enscape by default
- disabled keysort by default

If sonic does not meet your needs, you can customize the json marshal library in the following way:

```go
import (
    "encoding/json"

    "github.com/bytedance/go-tagexpr/v2/binding"
    "github.com/cloudwego/hertz/pkg/app/server/render"
)

func main() {
    // Render
    render.ResetJSONMarshal(json.Marshal)

    // Binding
    binding.ResetJSONUnmarshaler(json.Unmarshal)
}
```
