---
title: "业务异常"
date: 2022-11-04
weight: 5
keywords: ["Kitex", "自定义异常"]
description: "Kitex 自 v0.4.3 版本提供了业务自定义异常功能，本文涵盖了相关接口定义、用户使用和框架实现介绍。"
---

业务自定义异常方便用户使用实现了特定接口的 err 来传递业务异常，以便与 RPC 链路异常做区分。RPC 异常通常表示一次 RPC 请求失败，比如超时、熔断、限流，从 RPC 层面是失败的请求，
但业务错误属于业务逻辑层面，在 RPC 层面其实是请求成功。服务监控建议对于 RPC 错误上报为请求失败，而业务层面错误，上报为请求成功，而使用额外的 biz_status_code 字段上报业务异常状态码。该能力对于工程实践具有一定的价值。

## BizStatusError 接口定义

内置 `BizStatusErrorIface` 提供自定义异常接口，框架同时提供默认实现，用户也可以自定义实现。gRPC 用户自定义的 Error 可同时实现 `GRPCStatusIface` ，以便复用 Status 的 Detail 用于透传更丰富的业务信息。

```go
type BizStatusErrorIface interface {
    BizStatusCode() int32
    BizMessage() string
    BizExtra() map[string]string
    Error() string
}

type GRPCStatusIface interface {
    GRPCStatus() *status.Status
    SetGRPCStatus(status *status.Status)
}
```

## 用户使用

你可以在 server handler 使用 `NewBizStatusError` 或 `NewBizStatusErrorWithExtra` 函数构造业务异常并作为err返回。之后在 client 端通过 `FromBizStatusError` 函数将err转换回 `BizStatusErrorIface` 来获取需要的异常信息。

### 用法示例

使用 TTHeader 作为传输协议：

```go
// Server side
func (*MyServiceHandler) TestError(ctx context.Context, req *myservice.Request) (r *myservice.Response, err error) {
     // ...
     err = kerrors.NewBizStatusError(404, "not found")
     return nil, err
}
svr := myservice.NewServer(&MyServiceHandler{}, server.WithMetaHandler(transmeta.ServerTTHeaderHandler))


// Client side
cli := myservice.MustNewClient("client", client.WithTransportProtocol(transport.TTHeader),
        client.WithMetaHandler(transmeta.ClientTTHeaderHandler))
resp, err := cli.TestError(ctx, req)
bizErr, isBizErr := kerrors.FromBizStatusError(err)
```

如需额外传递 gRPC Detail，可以使用 `NewGRPCBizStatusError` 或 `NewGRPCBizStatusErrorWithExtra` 来构造异常：

> 注：如无需传递 gRPC Detail，gRPC 用户仍可以使用 `NewBizStatusError` 或 `NewBizStatusErrorWithExtra`.

```go
// Server side
func (*Handler) Serve(ctx, Request) (Response, error) {
    bizErr := kerrors.NewGRPCBizStatusError(404, "not found")
    grpcStatusErr := bizErr.(kerrors.GRPCStatusIface)
    st, _ := grpcStatusErr.GRPCStatus().WithDetails(&echo.Echo{Str: "hello world"})
    grpcStatusErr.SetGRPCStatus(st)
    return nil, bizErr
}
// ...
svr := myservice.NewServer(&Handler{})


// Client side
cli := myservice.MustNewClient("client", client.WithTransportProtocol(transport.GRPC))
resp, err := cli.Serve(ctx, req)
if err != nil {
    if bizErr, ok := kerrors.FromBizStatusError(err); ok {
        println(bizErr.BizStatusCode())
        println(bizErr.BizMessage())
        println(bizErr.(status.Iface).GRPCStatus().Details()[0].(*echo.Echo).Str)
        // ...
    }
}
```

### 在中间件中获取/返回 BizStatusError

业务异常不属于 RPC 异常，因此中间件中不能直接读取或返回 BizStatusError。

Kitex 会将 handler 返回的 BizStatusError 放入 rpcinfo，并返回 nil error 给上层。因此，对于 handler 返回的 BizStatusError，在中间件中，调用 `next(ctx, req, resp)` 得到的 error 是 nil。

如果要在中间件中获取 BizStatusError，可以用如下方式：

```go
bizErr := rpcinfo.GetRPCInfo(ctx).Invocation().BizStatusErr()
```

如果要在中间件中返回 BizStatusError，可以用如下方式：

```go
ri := rpcinfo.GetRPCInfo(ctx)
if setter, ok := ri.Invocation().(rpcinfo.InvocationSetter); ok {
   setter.SetBizStatusErr(bizErr)
   return nil
}
```

## 框架实现

依赖传输协议透传自定义异常的错误码和错误信息，Thrift 和 Kitex Protobuf 依赖 TTHeader，Kitex gRPC 依赖 HTTP2。

- Thrift：使用 TTHeader
- Kitex Protobuf：使用 TTHeader
- gRPC：使用 HTTP2 Header

### 框架处理

#### TTHeader

新增了三个 string key，分别是 biz-status 、 biz-message 和 biz-extra。

对于服务端，如果用户通过 `NewBizStatusError` 构造了 error，将 errorCode、message 和 extra 信息分别装填到 biz-status、biz-message 和 biz-extra；

对于调用端，如果 TTHeader 中 biz-status != 0，则构造 `BizStatusErrorIface` 返回给用户。

#### Streaming - gRPC

gRPC 的 RPC 异常是通过 HTTP2 Header 传递的，statusCode 和 statusMessage 分别对应 header 中的 grpc-status 和 grpc-message。

为尽量做到前向兼容，同时区分 gRPC 的 RPC 异常，在其现有基础上额外增加 biz-status 和 biz-extra 字段，分别对应于 `BizStatusErrorIface` 的 errorCode 和 extra，而 message 则复用 grpc-message。

在 server 返回自定义异常时，将 grpc-status 编码为业务异常实现的 `GRPCStatusIface` 接口中的 statusCode 或 `codes.Internal`，同时编码 biz-status。这样，上游收到响应后，发现设置了 biz-status header, 即可将错误转换为 `BizStatusErrorIface` 返回给 client handler。即使上游不支持自定义异常，也能相对正确地处理 server 返回的 error，只不过丢失了识别业务异常的能力。
