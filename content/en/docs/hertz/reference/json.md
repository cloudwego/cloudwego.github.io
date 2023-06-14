---
title: "JSON Marshal Library"
linkTitle: "JSON Marshal Library"
weight: 3
description: >

---

By default, Hertz integrates with and uses [Sonic](https://github.com/bytedance/sonic) for serializing `ctx.JSON` interface and deserialization requests as defined in the `binding` package.
Sonic is an ultra-high performance golang json library, also see Sonic [README](https://github.com/bytedance/sonic) for details.

The following are requirements to enable Sonic:

- Go 1.15/1.16/1.17/1.18
- Linux / darwin OS / Windows
- Amd64 CPU with AVX instruction set

Sonic automatically fallback to golang's `encoding/json` library when the above requirements have not been satisfied.

## Compatibility With `encoding/json`

Currently, Hertz uses the default configuration for Sonic (i.e.`sonic.ConfigDefault`), which behaves different from JSON `encoding/json`.
Specifically, by default, Sonic are configured to:

- disable html escape: Sonic will not escape HTML's special characters
- disable key-sort by default: Sonic will not sort json in lexicographical order

To find more about the compatibility with `encoding/json`, you may want to see [sonic#Compatibility](https://github.com/bytedance/sonic#compatibility).
You may change Sonic's behavior (e.g. behaving exactly the same way as `encoding/json`) by calling `ResetJSONMarshaler` for render.

```go
render.ResetJSONMarshaler(sonic.ConfigStd.Marshal)
```

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
go build -tags stdjson .
```

## Common FAQs

### Error when using Sonic on M1

#### Build constraints exclude all Go files in xxx

Usually because the Go version or environment parameters do not meet Sonic requirements.

- Go version: go1.15 or above, recommend go1.17 or above. For the currently supported versions of Sonic, please see [Sonic#Requirement](https://github.com/bytedance/sonic#requirement)

- Go environment parameters: set GOARCH=**amd64**. Because Sonic already supports the binary translation software Rosetta, with Rosetta, the programs compiled under the x86 environment can be run on the M1.

#### Unable to Debug

If you want to debug, you can set GOARCH=**arm64**. Because the Rosetta will cause the binary of Sonic to fail to debug.

Note that the performance of Sonic will be hurt, because Sonic will fallback to the standard library in this environment.
