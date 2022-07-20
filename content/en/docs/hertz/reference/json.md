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
Specifically, by default, Sonic are configured to:
- disable html escape: Sonic will not escape HTML's special characters
- disable key-sort by default: Sonic will not sort json based on keys

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
## Common FAQs

### Compilation Error on Mac M1
#### Unsupported CPU, maybe it’s too old to run Sonic
In most cases, this is because the go binary and/or build configuration is incompatible with Sonic.

##### Go binary is not built for ARM64
Please use a go binary compiled for ARM64. You may encounter issues on go1.16 as compiler incorrectly links x86 files due to bugs.
Therefore, go1.17 or above is highly recommended.
##### GOARCH is set to amd64 `i.e. GOARCH=amd64`
You can either remove the flag or set its value to `arm64`.
##### Ran Binaries compiled in an x86 environment with a translator
This is not supported yet.

### Build constraints exclude all Go files in xxx
This is mostly because Sonic does not work on your go version. See [sonic#Requirement](https://github.com/bytedance/sonic#requirement) for a list of supported go versions.
