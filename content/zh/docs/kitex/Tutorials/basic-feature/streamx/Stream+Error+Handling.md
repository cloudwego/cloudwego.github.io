---
title: "StreamX 流错误处理最佳实践"
date: 2025-01-10
weight: 4
keywords: ["流错误处理最佳实践"]
description: ""
---

## 前言

与 PingPong RPC 不同，流的错误可以发生在一个流处理的任何时候，例如 server 可以在发送多条消息后，再返回一个错误。但是一旦一个流发送完错误后，就不能再发送任何消息。

## 错误类型

### 业务异常

**使用范例**：例如 ChatGPT 场景，我们需要不停检查用户账户余额是否能继续调用大模型生成返回。

Server 实现：

```go
func (si *streamingService) ServerStreamWithErr(ctx context.Context, req *Request, stream streamx.ServerStreamingServer[Response]) error {
    // 检查用户账户余额
    for isHasBalance (req.UserId) {
        stream.Send(ctx, res)
    }
    // 返回用户余额不足错误
    bizErr := kerrors.NewBizStatusErrorWithExtra(
        10001, "insufficient user balance", map[string]string{"testKey": "testVal"}，
    )
    return bizErr
}
```

Client 实现：

```go
svrStream, err = streamClient.ServerStreamWithErr(ctx, req)

var err error
for {
    res, err = stream.Recv(ctx)
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

如果 Server 返回的 Error 为非业务异常，框架会统一封装为 `(*thrift.ApplicationException)` 。此时只能拿到错误的 Message 。

Server 实现：

```go
func (si *streamingService) ServerStreamWithErr(ctx context.Context, req *Request, stream streamx.ServerStreamingServer[Response]) error {
    // ...
    return errors.New("test error")
}
```

Client 实现：

```go
svrStream, err = streamClient.ServerStreamWithErr(ctx, req)
test.Assert(t, err == nil, err)

var err error
for {
    res, err = stream.Recv(ctx)
    if err != nil {
         break
    }
}
ex, ok := err.(*thrift.ApplicationException)
if ok {
     println(ex.TypeID(), ex.Msg())
}
```
