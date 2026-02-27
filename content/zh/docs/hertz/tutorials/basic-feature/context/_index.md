---
title: "请求上下文"
date: 2025-04-22
weight: 5
keywords: ["RequestContext", "HTTP", "上下文传递", "元数据存储", "并发安全", "协程安全"]
description: "请求上下文相关功能。"
---

请求上下文 `RequestContext` 是用于保存 HTTP 请求和设置 HTTP 响应的上下文，它提供了许多方便的 API 接口帮助用户开发。

Hertz 在 `HandlerFunc` 设计上，同时提供了一个标准 `context.Context` 和一个 `RequestContext` 作为函数的入参。
`handler/middleware` 函数签名为：

```go
type HandlerFunc func(ctx context.Context, c *RequestContext)
```

### 元数据存储

`context.Context` 与 `RequestContext` 都有存储键值的能力。

`context.Context` 作为上下文在中间件和各函数之间传递，通用的标准化参数、协程安全。建议都使用`context.Context` 进行上下文数据传递。

`*RequestContext` 提供了一种比`context.Context`更轻量的方式，可以使用`Get`, `Set` 方法进行存储中间数据。但要注意 `*RequestContext`  会在请求结束时被回收复用，需要确保`*RequestContext` 的使用不能超过handler的生命周期，不允许有异步后台协程，详见下一节。

### 协程安全

因为 `*RequestContext` 请求结束会被回收复用，请不要将其传递到后台异步协程做任何操作。
如有需要，可以主动调用 `Exile()` 方法标识为不会回收，或使用 `Copy()` 生成一个副本以供后台使用。

为了快速排查问题，可以通过设置环境变量 `HERTZ_DISABLE_REQUEST_CONTEXT_POOL=1` 来关闭此行为，但是建议还是通过按需 `Exile()` 或 `Copy()` 方法。

`*RequestContext` 大部分方法并非协程安全。在 `v0.9.7` 版本之前，**任何 Header 相关的方法**都不是协程安全，这包括绝大部的**读和写**方法，如常见的 `Peek` 读方法。在 `v0.9.7` 版本及以后，优化了Header的读方法，可以保证协程并发读安全。但是如果存在异步后台协程，仍需要参考前面小节的说明。
