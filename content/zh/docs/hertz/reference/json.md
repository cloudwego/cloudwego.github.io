---
title: "JSON Marshal 库"
linkTitle: "JSON Marshal 库"
weight: 3
description: >

---


Hertz 默认集成 [Sonic](https://github.com/bytedance/sonic) 作为 json marshal/unmarshal 库，用于`ctx.JSON`接口对数据进行序列化，以及`binding`包中针对请求的反序列化。Sonic 是一款超高性能 golang json 库，详情参考 Sonic [README](https://github.com/bytedance/sonic) 。


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
### 与 encoding/json 兼容性

当前 hertz 使用的配置为 sonic.ConfigDefault 配置，行为与标准库 encoding/json 会有一些差别（主要是 escape-HTML 和 key-sort），详见 [sonic#Compatibility](https://github.com/bytedance/sonic#compatibility)

#### 如需更改 sonic 配置，比如和标准库对齐

```go
    render.ResetJSONMarshaler(sonic.ConfigStd.Marshal)
```

### Mac M1 上编译报错

#### Unsupported CPU, maybe it's too old to run Sonic
一般为原因是运行 Go 程序的方式不对导致：
-   **安装了非 arm 版本的 go 镜像** —— 请安装 arm 版本 Go 镜像（go1.16某些 arm 镜像存在 bug 会导致 link 错误的 x86 文件，推荐 go1.17 以上版本）
-   **设置了 GOARCH=amd64** —— 请设置为 arm64 或去除
-   使用了转译器运行 x86 环境下编译出来的程序 —— 目前不支持这种使用方式

#### Build constraints exclude all Go files in xxx
一般是 Go 版本导致的问题，sonic 目前支持的版本为见 [sonic#Requirement](https://github.com/bytedance/sonic#requirement)
