---
title: 'JSON Marshal 库'
date: 2023-08-03
weight: 19
description: >
---

Hertz 默认集成并使用 [Sonic](https://github.com/bytedance/sonic) 用于序列化`ctx.JSON`接口，以及反序列化`binding`包中的请求。Sonic 是一款超高性能 golang json 库，详情参考 Sonic [README](https://github.com/bytedance/sonic) 。

开启 Sonic 需要满足以下条件：

- Go 1.16 以上
- Linux / darwin OS / Windows
- Amd64 CPU with AVX instruction set

当上述条件不能满足时，Sonic 会自动 fallback 到 golang 的 encoding/json 库。

## 与 encoding/json 兼容性

当前 Hertz 使用 Sonic 的默认配置（即`sonic.ConfigDefault`），行为与标准库 encoding/json 有所差异，详见 [sonic#Compatibility](https://github.com/bytedance/sonic#compatibility)

具体来说，默认情况下，Sonic：

- 禁用 html escape：Sonic 不会转义 HTML 中的特殊字符
- 禁用 key-sort：Sonic 不会按照键对 JSON 排序

你可以通过调用 render 包中的`ResetJSONMarshaler`函数来修改 Sonic 的行为，比如保持和标准库兼容。

```go
render.ResetJSONMarshaler(sonic.ConfigStd.Marshal)
```

## 自定义 JSON Marshall 库

如果 Sonic 不能够满足您的需求，你可以使用以下方式自定义 json marshal 库的实现:

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

## 条件编译

Hertz 支持条件编译来控制实际使用的 json 库，你可以通过 `-tags stdjson` 来选择使用标准库。

```go
go build -tags stdjson .
```

## 常见问题

### Mac M1 上使用 Sonic 报错

#### Build constraints exclude all Go files in xxx

一般是因为 Go 镜像版本或环境参数不符合 Sonic 要求。

- Go 版本：go1.16 或以上，推荐 go1.17 以上版本。Sonic 目前支持的版本见 [Sonic#Requirement](https://github.com/bytedance/sonic#requirement)。

- Go 环境参数：设置 GOARCH=**amd64**。因为，Sonic 已经支持二进制翻译软件 Rosetta，借助 Rosetta，在 M1 上可运行 x86 环境下编译出来的程序。

#### 无法 Debug

如果想调试，可设置 GOARCH=**arm64**。因为 Rosetta 技术会导致 Sonic 的编译产物无法调试。

注意，设置为 arm64 后将损失 Sonic 的高性能，因为 Sonic 内部在此环境下，会 fallback 到性能较差的标准库。
