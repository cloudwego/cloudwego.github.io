---
title: "流错误处理最佳实践 | Stream Error Handling"
linkTitle: "流错误处理最佳实践"
weight: 3
date: 2025-09-29
description: "Kitex StreamX 流错误处理最佳实践，介绍 TTHeader Streaming 错误码和错误处理机制。"
---

## 前言

与 PingPong RPC 不同，流的错误可以发生在一个流处理的任何时候，例如 server 可以在发送多条消息后，再返回一个错误。但是一旦一个流发送完错误后，就不能再发送任何消息。

## 错误类型

### 框架异常

#### 错误描述含义

```
[ttstream error, code=12007] [server-side stream] [canceled path: ServiceA] user code invoking stream RPC with context processed by context.WithCancel or context.WithTimeout, then invoking cancel() actively
```

| 错误描述 | 含义 | 备注 |
|---------|------|------|
| [ttstream error, code=12007] | TTHeader Streaming 错误，错误码为 12007，对应上游主动 cancel 的场景 | |
| [server-side stream] | 表示该错误由 server 侧的 Stream 抛出 | |
| [canceled path: ServiceA] | 表示由 ServiceA 主动发起 cancel | |
| user code invoking stream RPC with context processed by context.WithCancel or context.WithTimeout, then invoking cancel() actively | 具体的错误描述 | |

#### 错误码汇总

TTHeader Streaming 错误汇总

| 错误码 | 错误描述 | 含义 | 备注 |
|--------|---------|------|------|
| 12001 | application exception | 业务异常，下游 handler 返回 err | |
| 12002 | unexpected header frame | Header Frame 相关的错误 | |
| 12003 | illegal biz err | 解析 Trailer Frame 中包含的业务异常失败 | |
| 12004 | illegal frame | 解析 Frame 的基础信息失败 | |
| 12005 | illegal operation | 使用 Stream 姿势不当报错，例如 Stream 已经 CloseSend 了，依然 Send | |
| 12006 | transport is closing | 连接异常，例如连接已被关闭 | |
| 12007 | user code invoking stream RPC with context processed by context.WithCancel or context.WithTimeout, then invoking cancel() actively | 上游主动使用 cancel() | |
| 12008 | user code canceled with cancelCause(error) | 上游使用 context.WithCancelCause，并主动使用 cancel(err) | |
| 12009 | canceled by downstream | 被下游服务 cancel | |
| 12010 | canceled by upstream | 被上游服务 cancel | |
| 12011 | Internal canceled | 级联 cancel 场景，例如 gRPC handler ctx 被 cancel，级联 cancel TTHeader Streaming | |
| 12012 | canceled by business handler returning | Handler 提前退出，但仍有异步 goroutine 使用 Recv/Send | |
| 12013 | canceled by connection closed | 连接被关闭导致 Stream 生命周期结束，常见于 Server 侧服务迁移/更新 | |

### 业务异常

使用范例：例如 ChatGPT 场景，我们需要不停检查用户账户余额是否能继续调用大模型生成返回。

**Server 实现：**

```go
func (si *streamingService) ServerStreamWithErr(ctx context.Context, req *echo.Request, stream echo.TestService_ServerStreamWithErrServer) error {
    // 检查用户账户余额
    for isHasBalance (req.UserId) {
        stream.Send(ctx, res)
    }
    // 返回用户余额不足错误
    bizErr := kerrors.NewBizStatusErrorWithExtra(
        10001, "insufficient user balance", map[string]string{"testKey": "testVal"},
    )
    return bizErr
}
```

**Client 实现：**

```go
stream, err = cli.ServerStreamWithErr(ctx, req)

var err error
for {
    res, err = stream.Recv(stream.Context())
    if err != nil {
         break
    }
}
bizErr, ok := kerrors.FromBizStatusError(err)
if ok {
    println(bizErr.BizStatusCode(), bizErr.BizMessage(), bizErr.BizExtra())
}
```

### 其他错误

如果 Server 返回的 Error 为非业务异常，框架会统一封装为 `(*thrift.ApplicationException)`。此时只能拿到错误的 Message。

**Server 实现：**

```go
func (si *streamingService) ServerStreamWithErr(ctx context.Context, req *echo.Request, stream echo.TestService_ServerStreamWithErrServer) error {
    // ...
    return errors.New("test error")
}
```

**Client 实现：**

```go
stream, err = cli.ServerStreamWithErr(ctx, req)

var err error
for {
    res, err = stream.Recv(stream.Context())
    if err != nil {
         break
    }
}
ex, ok := err.(*thrift.ApplicationException)
if ok {
     println(ex.TypeID(), ex.Msg())
}
```
