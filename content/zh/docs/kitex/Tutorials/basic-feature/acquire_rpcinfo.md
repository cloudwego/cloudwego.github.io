---
title: "框架 RPC 信息的获取"
date: 2023-11-29
weight: 8
keywords: ["框架 RPC 信息的获取"]
description: ""
---

## 从 RPCInfo 获取 RPC 信息

Kitex 的 RPCInfo 的生命周期默认是从请求开始到请求返回（性能考虑），随后会被放到 sync.Pool 中复用。在 Server 端，如果在业务 Handler 中异步获取使用，可能会读到脏数据 / 空指针而 panic。

### 1.1 同步使用方式

同步的使用方式是指用户没有在新起的 Goroutine 里获取 RPCInfo。

| **获取的信息**                | **Kitex 获取方式**                                                                                                                                                                                             |
| ----------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 获取调用方的 Service          | caller, ok := kitexutil.GetCaller(ctx)                                                                                                                                                                         |
| 获取 RPC 方法名               | method, ok := kitexutil.GetMethod(ctx)                                                                                                                                                                         |
| 获取调用方的请求地址          | cluster, ok := kitexutil.GetCallerAddr(ctx)                                                                                                                                                                    |
| 获取 IDL 里定义的 ServiceName | svcName, ok := kitexutil.GetIDLServiceName(ctx)                                                                                                                                                                |
| 获取调用方的 handler 接口名   | callerMethod, ok := kitexutil.GetCallerHandlerMethod(ctx) <br/>只有调用方也是 Kitex Server 才默认有这个信息，或者调用方主动将 K_METHOD 写入 context.Context 中，Kitex 会获取该信息传输给服务端。               |
| 获取传输协议                  | tp, ok := kitexutil.GetTransportProtocol(ctx)                                                                                                                                                                  |
| 调用端获取请求的服务端的地址  | ctx = metainfo.WithBackwardValues(ctx)<br/>// 先设置 ctx，再执行 RPC 调用 ...err, resp := cli.YourMethod(ctx, req)rip, ok := metainfo.GetBackwardValue(ctx, consts.RemoteAddr) <br/>注意：不适用于 oneway 方法 |

### 1.2 异步使用方式

如果需要在新的 Goroutine 里获取 RPCInfo，有两种使用方式，选择其中一种，获取具体信息与上面一样。

- **方式一：** 用 Kitex 提供的 rpcinfo.FreezeRPCInfo 复制初始的 RPCInfo 再使用

```go
import (
    "github.com/cloudwego/kitex/pkg/rpcinfo"
    "github.com/cloudwego/kitex/pkg/utils/kitexutil"
)
// this creates a read-only copy of `ri` and attaches it to the new context
ctx2 := rpcinfo.FreezeRPCInfo(ctx)
go func(ctx context.Context) {
    // ...
    ri := rpcinfo.GetRPCInfo(ctx) // OK

    // eg: get client psm
    // caller, ok := kitexutil.GetCaller(ctx)
    //...
}(ctx2)

```

- **方式二 [Kitex v0.8.0+]：** 关闭 RPCInfo 回收，以下二选一即可
  环境变量设置 `KITEX_DISABLE_RPCINFO_POOL=true` 或者代码里配置 `rpcinfo.EnablePool(false)`。

## 元信息透传

详见 [元信息透传](/zh/docs/kitex/tutorials/advanced-feature/metainfo/)。
