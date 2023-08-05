---
title: "JSON Marshal Library"
linkTitle: "JSON Marshal Library"
date: 2023-08-03
weight: 19
description: >
---

By default, Hertz integrates with and uses [Sonic](https://github.com/bytedance/sonic) for serializing `ctx.JSON` interface and deserialization requests as defined in the `binding` package.
Sonic is an ultra-high performance golang json library, also see Sonic [README](https://github.com/bytedance/sonic) for details.

The following are requirements to enable Sonic:

- Go 1.16 or above
- Linux / darwin OS / Windows
- Amd64 CPU with AVX instruction set

Sonic automatically fallback to golang's `encoding/json` library when the above requirements have not been satisfied.

## Bringing Your Own JSON Marshal Library

If Sonic does not meet your needs, you may provide your own implementation by calling `ResetJSONMarshal` for render and `ResetJSONUnmarshaler` for binding.

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

## Conditional Compilation

Hertz supports conditional compilation to control the actual json library used, you can use `-tags stdjson` to choose to use the standard library.

```go
go build -tags stdjson 
```

## Sonic related issues

If there are issues related to Sonic, please refer to Sonic [README](https://github.com/bytedance/sonic) or propose an [issue](https://github.com/bytedance/sonic/issues).
