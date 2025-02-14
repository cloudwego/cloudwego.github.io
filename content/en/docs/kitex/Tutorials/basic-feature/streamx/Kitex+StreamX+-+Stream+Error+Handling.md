---
title: "StreamX Error Handling"
date: 2025-01-13
weight: 4
keywords: ["Stream Error Handling"]
description: ""
---

## Preface

Unlike  RPC, stream errors can occur at any time during stream processing. For example, a server can return an error after sending multiple messages. However, once a stream has sent an error, it cannot send any more messages.

## Error type

### Business exception

**Usage example** : For example, in the ChatGPT scenario, we need to constantly check whether the user account balance can continue to call the large model to generate returns.

Server implementation:

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

Client implementation:

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

### Other errors

If the Error returned by the Server is a non-business exception, the framework will be uniformly encapsulated as `(* thrift.ApplicationException) `. At this time, only the error Message can be obtained.

Server implementation:

```go
func (si *streamingService) ServerStreamWithErr(ctx context.Context, req *Request, stream streamx.ServerStreamingServer[Response]) error {
    // ...
    return errors.New("test error")
}
```

Client implementation:

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
