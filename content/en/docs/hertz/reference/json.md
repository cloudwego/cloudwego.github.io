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

Currently, Hertz uses the default configuration for Sonic (i.e.`sonic.ConfigDefault`, which behaves different from JSON `encoding/json`.
Specifically, by default, Sonic are configured to
- disable html escape: Sonic will not escape HTML's special characters
- disable key-sort by default: Sonic will not sort json based on keys

You may configure sonic to behave exactly the same way as `encoding/json` by calling `ResetJSONMarshaler` for render.

```go
render.ResetJSONMarshaler(sonic.ConfigStd.Marshal)
```


## Bringing Your Own JSON Marshal Library

If Sonic and `encoding/json` does not meet your needs, you may provide your own implementation by calling `ResetJSONMarshal` for render and `ResetJSONUnmarshaler` for binding.

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
## Common FAQs

### Compilation Error on Mac M1
#### Unsupported CPU, maybe it’s too old to run Sonic
In most cases, this is because you attempted to run Sonic on an incompatible runtime

#####Installed non-arm version of go image
please install arm version of Go image (go1.16 some arm images have bugs that cause link error x86 files, go1.17 or above is recommended)
##### GOARCH is set to amd64 `i.e. GOARCH=amd64`
You can either remove the flag or set its value to `arm64`.
##### Ran Binaries compiled in an x86 environment with a translator
This is not supported yet.
