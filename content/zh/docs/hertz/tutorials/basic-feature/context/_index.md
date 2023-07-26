---
title: "请求上下文"
date: 2023-04-12
weight: 5
description: >
---

请求上下文 `RequestContext` 是用于保存 HTTP 请求和设置 HTTP 响应的上下文，它提供了许多方便的 API 接口帮助用户开发。

Hertz 在 `HandlerFunc` 设计上，同时提供了一个标准 `context.Context` 和一个 `RequestContext` 作为函数的入参。
`handler/middleware` 函数签名为：

```go
type HandlerFunc func(c context.Context, ctx *RequestContext)
```

## 上下文传递与并发安全

### 元数据存储

`context.Context` 与 `RequestContext` 都有存储值的能力，具体选择使用哪一个上下文有个简单依据：所储存值的生命周期和所选择的上下文要匹配。

`ctx` 主要用来存储请求级别的变量，请求结束就回收了，特点是查询效率高（底层是 `map`），协程不安全，且未实现 `context.Context` 接口。

`c` 作为上下文在中间件 `/handler` 之间传递，协程安全。所有需要 `context.Context` 接口作为入参的地方，直接传递 `c` 即可。

### 协程安全

除此之外，如果存在异步传递 `ctx` 或并发使用 `ctx` 的场景，hertz 也提供了 `ctx.Copy()` 接口，方便业务能够获取到一个协程安全的副本。
