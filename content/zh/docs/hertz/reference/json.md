---
title: "JSON Marshal 库"
linkTitle: "JSON Marshal 库"
weight: 3
description: >

---


Hertz 默认集成并使用 [Sonic](https://github.com/bytedance/sonic) 用于序列化`ctx.JSON`接口，以及反序列化`binding`包中的请求。Sonic 是一款超高性能 golang json 库，详情参考 Sonic [README](https://github.com/bytedance/sonic) 。


开启 Sonic 需要满足以下条件：
- Go 1.15/1.16/1.17/1.18
- Linux / darwin OS / Windows
- Amd64 CPU with AVX instruction set

当上述条件不能满足时，Sonic 会自动 fallback 到 golang 的 encoding/json 库。




### 与 encoding/json 兼容性



当前 hertz 使用Sonic的默认配置（即`sonic.ConfigDefault`），行为与标准库 encoding/json 有所差异，详见 [sonic#Compatibility](https://github.com/bytedance/sonic#compatibility)

具体来说，默认情况下，Sonic：
- 禁用 html escape：Sonic 不会转义 HTML中的特殊字符
- 禁用 key-sort：Sonic 不会按照键对JSON排序


你可以通过调用 render 包中的`ResetJSONMarshaler`函数来修改Sonic的行为，比如保持和标准库兼容。

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
## 常见问题
### Mac M1 上编译报错

#### Unsupported CPU, maybe it's too old to run Sonic
一般为是因为 Go 镜像版本或构建参数和 Sonic 不兼容
#### 安装了非 arm 版本的 go 镜像
请安装 arm 版本 Go 镜像（go1.16某些 arm 镜像存在 bug 会导致 link 错误的 x86 文件，推荐 go1.17 以上版本）
#### **设置了 GOARCH=amd64**
请去除该参数或设置为 arm64
#### 使用了转译器运行 x86 环境下编译出来的程序
目前不支持这种使用方式
###Build constraints exclude all Go files in xxx
一般是 Go 版本导致的问题，sonic 目前支持的版本见 [sonic#Requirement](https://github.com/bytedance/sonic#requirement)
