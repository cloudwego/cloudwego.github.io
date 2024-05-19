---
title: "Hertz v0.6.0 版本发布"
linkTitle: "Release v0.6.0"
projects: ["Hertz"]
date: 2023-03-02
description: >
---

Hertz 0.6.0 版本中，除了常规迭代优化之外，我们还带来了多个重要 feature。

## 支持 HTTP Trailer

在 Hertz v0.6.0 版本中，我们支持了 HTTP Trailer 的编码和解析。

> https://github.com/cloudwego/hertz-examples/tree/main/trailer

- 写 Trailer

```go
// server 端
func handler(c context.Context, ctx *app.RequestContext){
    ctx.Response.Header.Trailer().Set("Hertz", "Good")
}

// client 端
req.Header.Trailer().Set("Hertz", "Good")
```

- 读 Trailer

```go
// server 端
func handler(c context.Context, ctx *app.RequestContext){
    ctx.Request.Header.Trailer().Get("Hertz")
}

// client 端
resp.Header.Trailer().Get("Hertz")
```

## HTTP/1.1 支持 Response Writer 劫持

在 Hertz v0.6.0 版本中，我们扩展了 HTTP/1.1 写请求的方式，在原来写请求流程的基础之上，支持用户在业务 handler/中间件中劫持 Response Writer，实现更加灵活的写请求方式。
简单来说，原来所有的“底层写”逻辑统一放到 handler/中间件返回之后，这个带来两个比较明显的局限性：

1. 用户无法控制请求真正 flush 到对端的时机
2. 针对 chunk 方式增量产生数据 & 实时写到对端的场景，在老的架构之上用法相对复杂，限制相对较多

基于此我们扩展出一套能够提供自行 flush 请求头和请求体的能力，同时提供了一个支持用户按需发送 chunk 数据的 Writer。详细实现参考：https://github.com/cloudwego/hertz/pull/610

### 主要变更

1. 增加了一个扩展 Writer 的接口定义，实现了这个接口的 Writer 都可以用作劫持 Response Writer：

   ```go
   type ExtWriter interface {
           io.Writer
           Flush() error

           // Finalize will be called by framework before the writer is released.
           // Implementations must guarantee that Finalize is safe for multiple calls.
           Finalize() error
   }
   ```

2. 提供了一个实现了上述接口的 Chunk Writer（有类似需求都可以参考这个来实现）：`chunkedBodyWrite`
3. HTTP/1.1 具体写请求的地方针对被劫持了 Writer 的 Response 写操作做了对应的处理（跳过默认写请求逻辑），最后调用`ExtWriter`接口的`Finalize()`方法完成一次请求写回

### 使用方法

如上，Hertz 提供了一个默认的`ExtWriter`实现满足用户在 handler/中间件中的主动 flush 需求，使用方式也非常简单：

```go
h.GET("/flush/chunk", func(c context.Context, ctx *app.RequestContext) {
        // Hijack the writer of response
        ctx.Response.HijackWriter(resp.NewChunkedBodyWriter(&ctx.Response, ctx.GetWriter()))

        for i := 0; i < 10; i++ {
                ctx.Write([]byte(fmt.Sprintf("chunk %d: %s", i, strings.Repeat("hi~", i)))) // nolint: errcheck
                ctx.Flush()                                                                 // nolint: errcheck
                time.Sleep(200 * time.Millisecond)
        }
})
```

## 脚手架使用优化 & 最佳实践

在 hz v0.6.0 版本中，我们对生成代码的组织结构进行一系列的优化，从而可生成更加灵活的代码组织结构

### 主要优化

- `new` 命令支持 "router_dir" 选项，并配合已有的 "handler_dir"、"model_dir"，可完全自定义 IDL 生成产物的路径；并且会将这些自定义选项持久化到 ".hz" 文件中，可在 `update` 时自动读取，减少命令的复杂度
- 增加向上搜索 "go.mod" 文件的能力，从而使得 hertz 在作为一个子项目时可以和其他项目共享同一个 "go module"
- 增加 "handler" 中引用第三方 IDL 产物的能力，可将 IDL 产物放到第三方仓库单独维护，使其不在项目目录中存放，进一步增强 IDL 管理能力

### 最佳实践

我们利用 "hz v0.6.0" 重写了 "[biz-demo/easy-note](https://github.com/cloudwego/biz-demo/pull/26)"，主要利用了如下 hz 的特性

- 利用 "hz client" 的能力，基于 IDL 生成访问 "api server" 的 hertz client 调用代码
- 利用自定义 "router_dir"、 "handler_dir"、"model_dir" 选项，重新调整 "api server" 代码的组织结构，去掉 "biz" 目录的限制
- 利用 "向上搜索 go.mod" 的能力，使得 "api server" 可以作为 "easy-note" 的子项目共享同一个 "go module"
- 利用 "handler 引用第三方 IDL 产物" 的能力并配合 "hz model" 的能力，使得 IDL 产物单独存到到 "easy-note" 项目里，而并不存放到 "api server" 子项目里

## 完整 Release Note

完整的 Release Note 可以参考：

- Hertz: https://github.com/cloudwego/hertz/releases/tag/v0.6.0
- Hz(脚手架): https://github.com/cloudwego/hertz/releases/tag/cmd%2Fhz%2Fv0.6.0
