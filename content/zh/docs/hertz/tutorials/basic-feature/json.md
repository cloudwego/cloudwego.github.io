---
title: "JSON Marshal 库"
linkTitle: "JSON Marshal 库"
date: 2023-08-03
weight: 19
keywords: ["JSON Marshal", "Sonic", "条件编译", "自定义 JSON Marshall 库"]
description: "Hertz 使用的 JSON Marshal 库及自定义能力。"
---

Hertz 默认集成并使用 [Sonic](https://github.com/bytedance/sonic) 用于序列化 `ctx.JSON` 接口，以及反序列化 `binding` 包中的请求。Sonic 是一款超高性能 golang json 库，详情参考 Sonic [README](https://github.com/bytedance/sonic) 。

开启 Sonic 需要满足以下条件：

- Go 1.16 以上
- Linux / darwin OS / Windows
- Amd64 CPU with AVX instruction set

当上述条件不能满足时，Sonic 会自动 fallback 到 golang 的 encoding/json 库。

## 自定义 JSON Marshall Unmarshal 库

如果 Sonic 不能够满足您的需求，你可以使用以下方式配置 [binding](/zh/docs/hertz/tutorials/basic-feature/binding-and-validate/#%E9%85%8D%E7%BD%AE%E5%85%B6%E4%BB%96-json-unmarshal-%E5%BA%93) 或 [render](/zh/docs/hertz/tutorials/basic-feature/render/#配置其他-json-marshal-库) 的自定义 json marshal unmarshal 库:

## 条件编译

Hertz 支持条件编译来控制实际使用的 json 库，你可以通过 `-tags stdjson` 来选择使用标准库。

```go
go build -tags stdjson
```

## Sonic 相关问题

若出现与 Sonic 相关的问题，可参考 Sonic [README](https://github.com/bytedance/sonic) 或提 [issue](https://github.com/bytedance/sonic/issues) 解决。
