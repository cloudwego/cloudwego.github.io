---
title: "链路追踪"
linkTitle: "链路追踪"
weight: 2
keywords: ["链路追踪"]
description: "Hertz 提供的链路追踪能力。"

---

在微服务中，链路追踪是一项很重要的能力，在快速定位问题，分析业务瓶颈，还原一次请求的链路情况等方面发挥重要作用。Hertz 提供了链路追踪的能力，也支持用户自定义链路跟踪。

Hertz 将 trace 抽象为以下接口：

```go
// Tracer is executed at the start and finish of an HTTP.
type Tracer interface {
	Start(ctx context.Context, c *app.RequestContext) context.Context
	Finish(ctx context.Context, c *app.RequestContext)
}
```

使用 `server.WithTracer()` 配置添加 tracer，可以添加多个 tracer。

Hertz 会在请求开始之前 (读包之前) 执行所有 tracer 的 Start 方法，在请求结束之后 (写回数据之后) 执行所有 tracer 的 Finish 方法。这种实现时需要注意：

- Start 方法执行时，刚开始接受包，这个时候 `requestContext` 是一个“空”的 `requestContext`，并不能拿到这次请求的相关信息。如果想在解包后中拿到一些信息 (如在 header 中的 traceID 等) 再进行操作时，可以使用中间件能力将 traceID 注入到 span 中。
- 在中间件内对 context 的修改是无效的。

在 `requestContext` 内存有 `traceInfo`，其有以下信息

```go
type HTTPStats interface {
   Record(event stats.Event, status stats.Status, info string) // 记录事件
   GetEvent(event stats.Event) Event // 获取事件
   SendSize() int // 获取 SendSize
   RecvSize() int // 获取 RecvSize
   Error() error // 获取 Error
   Panicked() (bool, interface{}) // 获取 Panic
   Level() stats.Level // 获取当前 trace 等级
   SetLevel(level stats.Level) // 设置 trace 等级，当事件等级高于 trace 等级时不上报
   ...
}
```

事件包括：

```go
HTTPStart  = newEvent(httpStart, LevelBase) // 请求开始
HTTPFinish = newEvent(httpFinish, LevelBase) // 请求结束

ServerHandleStart  = newEvent(serverHandleStart, LevelDetailed) // 业务 handler 开始
ServerHandleFinish = newEvent(serverHandleFinish, LevelDetailed) // 业务 handler 结束
ReadHeaderStart    = newEvent(readHeaderStart, LevelDetailed) // 读取 header 开始
ReadHeaderFinish   = newEvent(readHeaderFinish, LevelDetailed) // 读取 header 结束
ReadBodyStart      = newEvent(readBodyStart, LevelDetailed) // 读取 body 开始
ReadBodyFinish     = newEvent(readBodyFinish, LevelDetailed) // 读取 body 结束
WriteStart         = newEvent(writeStart, LevelDetailed) // 写 response 开始
WriteFinish        = newEvent(writeFinish, LevelDetailed) // 写 response 结束
```

在 Finish 时可以获取到上述信息。

同时，如果不希望记录这些信息，可以不注册任何 tracer，则框架停止对这些信息的记录。

hertz-contrib 中提供了 opentracing 的扩展方式，也在 hertz-examples 提供了可以从 http 到 rpc 调用的 demo。
仓库：https://github.com/hertz-contrib/tracer
