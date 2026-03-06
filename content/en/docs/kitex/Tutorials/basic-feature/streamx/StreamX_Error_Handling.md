---
title: "Stream Error Handling Best Practices"
linkTitle: "Stream Error Handling Best Practices"
weight: 3
date: 2025-09-29
description: "Kitex StreamX stream error handling best practices, introducing TTHeader Streaming error codes and error handling mechanisms."
---

## Preface

Unlike PingPong RPC, stream errors can occur at any time during stream processing. For example, a server can return an error after sending multiple messages. However, once a stream has sent an error, it cannot send any more messages.

## Error Types

### Framework Exceptions

#### Error Description Meaning

```
[ttstream error, code=12007] [server-side stream] [canceled path: ServiceA] user code invoking stream RPC with context processed by context.WithCancel or context.WithTimeout, then invoking cancel() actively
```

| Error Description | Meaning | Notes |
|-------------------|---------|-------|
| [ttstream error, code=12007] | TTHeader Streaming error, error code 12007, corresponding to the scenario where upstream actively cancels | |
| [server-side stream] | Indicates that the error is thrown by the Stream on the server side | |
| [canceled path: ServiceA] | Indicates that ServiceA actively initiated cancel | |
| user code invoking stream RPC with context processed by context.WithCancel or context.WithTimeout, then invoking cancel() actively | Specific error description | |

#### Error Code Summary

TTHeader Streaming Error Summary

| Error Code | Error Description | Meaning | Notes |
|------------|-------------------|---------|-------|
| 12001 | application exception | Business exception, downstream handler returns err | |
| 12002 | unexpected header frame | Header Frame related errors | |
| 12003 | illegal biz err | Failed to parse business exception contained in Trailer Frame | |
| 12004 | illegal frame | Failed to parse basic information of Frame | |
| 12005 | illegal operation | Error due to improper Stream usage, such as Stream has been CloseSend but still Send | |
| 12006 | transport is closing | Connection exception, such as connection has been closed | |
| 12007 | user code invoking stream RPC with context processed by context.WithCancel or context.WithTimeout, then invoking cancel() actively | Upstream actively uses cancel() | |
| 12008 | user code canceled with cancelCause(error) | Upstream uses context.WithCancelCause and actively uses cancel(err) | |
| 12009 | canceled by downstream | Canceled by downstream service | |
| 12010 | canceled by upstream | Canceled by upstream service | |
| 12011 | Internal canceled | Cascade cancel scenario, such as gRPC handler ctx is canceled, cascade cancel TTHeader Streaming | |
| 12012 | canceled by business handler returning | Handler exits early, but there are still asynchronous goroutines using Recv/Send | |
| 12013 | canceled by connection closed | Stream lifecycle ends due to connection closure, common in server-side service migration/update | |

### Business Exceptions

Usage example: For example, in the ChatGPT scenario, we need to constantly check whether the user account balance can continue to call the large model to generate returns.

**Server Implementation:**

```go
func (si *streamingService) ServerStreamWithErr(ctx context.Context, req *echo.Request, stream echo.TestService_ServerStreamWithErrServer) error {
    // Check user account balance
    for hasBalance(req.UserId) {
        stream.Send(ctx, res)
    }
    // Return insufficient user balance error
    bizErr := kerrors.NewBizStatusErrorWithExtra(
        10001, "insufficient user balance", map[string]string{"testKey": "testVal"},
    )
    return bizErr
}
```

**Client Implementation:**

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

### Other Errors

If the Error returned by the Server is a non-business exception, the framework will be uniformly encapsulated as `(*thrift.ApplicationException)`. At this time, only the error Message can be obtained.

**Server Implementation:**

```go
func (si *streamingService) ServerStreamWithErr(ctx context.Context, req *echo.Request, stream echo.TestService_ServerStreamWithErrServer) error {
    // ...
    return errors.New("test error")
}
```

**Client Implementation:**

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
