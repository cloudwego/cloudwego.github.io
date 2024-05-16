---
title: "Business Exception"
date: 2022-11-04
weight: 5
keywords: ["Kitex", "Custom Exception"]
description: "Kitex has provided business custom exceptions since v0.4.3. This doc covers the interface definition, user usage, and framework implementation."
---

Business custom exceptions is convenient for users to use err that implements a specific interface to transmit business exceptions, so as to distinguish them from RPC exceptions.
An RPC exception usually indicates a failure of an RPC request, such as timeout, circuit breaker, or current limit. From the RPC level, it is a failed request.
But the business error belongs to the business logic level, at the RPC level, the request is actually successful.
It is recommended for service monitoring to report RPC errors as request failures and business-level errors as success, and use the additional biz_status_code field to report business exception status codes.
This ability has certain value for engineering practice.

## BizStatusError interface definition

The built-in `BizStatusErrorIface` provides a business exception interfaces. The framework also provides default implementations, and users can also customize implementations.
The gRPC business Error can implement `GRPCStatusIface` at the same time, so as to reuse the Detail of Status to transparently transmit richer business information.

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

## Instructions for use

You can use the `NewBizStatusError` or `NewBizStatusErrorWithExtra` function in the server handler to construct a business exception and return it as err. After that, on the client side, convert err back to `BizStatusErrorIface` through the `FromBizStatusError` function to obtain the required exception information.

### Usage example

Use TTHeader as transport protocol:

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

To pass additional gRPC Detail, use `NewGRPCBizStatusError` or `NewGRPCBizStatusErrorWithExtra` to construct an exception:

> Note: gRPC users can still use `NewBizStatusError` or `NewBizStatusErrorWithExtra` if not needed to pass gRPC Detail.

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

### Middleware: Obtain/Return BizStatusError

A BizStatusError is not considered an RPC error, therefore, by design, a middleware can not obtain/return a BizStatusError directly.

Kitex will set the BizStatusError returned by method handler into RPCInfo, and return a nil error to upper level middlewares.

Therefore, for a BizStatusError returned by method handler, calling `next(ctx, req, resp)` will always get a nil error.

To obtain a BizStatusError in your middleware by:

```go
bizErr := rpcinfo.GetRPCInfo(ctx).Invocation().BizStatusErr()
```

And to return a BizStatusError in your middleware by:

```go
ri := rpcinfo.GetRPCInfo(ctx)
if setter, ok := ri.Invocation().(rpcinfo.InvocationSetter); ok {
   setter.SetBizStatusErr(bizErr)
   return nil
}
```

## Framework implementation

It relies on transport protocols to transparently transmit the error code and error information of business exceptions. Thrift and Kitex Protobuf rely on TTHeader, and Kitex gRPC relies on HTTP2.

- Thrift: use TTHeader
- Kitex Protobuf: use TTHeader
- gRPC: use HTTP2 Header

### Framework handling

#### TTHeader

Three new string keys have been added, namely biz-status , biz-message and biz-extra.

For the server, if the user constructs an error through `NewBizStatusError`, fill the errorCode , message and extra information into biz-status, biz-message and biz-extra respectively;

For the caller, if biz-status != 0 in TTHeader, construct `BizStatusErrorIface` and return it to the user.

#### Streaming - gRPC

GRPC exceptions are passed through HTTP2 Header, statusCode and statusMessage correspond to grpc-status and grpc-message in the header respectively.

In order to achieve forward version compatibility and distinguish RPC exceptions of gRPC, additional fields biz-status and biz-extra are added on HTTP2 Header, which correspond to the errorCode and extra info of `BizStatusErrorIface` respectively, while errMessage reuses grpc-message fields.

When the server returns a business exception, encode grpc-status as statusCode in the `GRPCStatusIface` interface implemented by business exceptions or `codes.Internal`, and also encode biz-status. In this way, after the upstream receives the response and finds that the biz-status header is set, the error can be converted into `BizStatusErrorIface` and returned to the client handler. Even if the upstream does not support business exceptions, the error returned by the server can still be handled relatively correctly, only the ability to identify business exceptions is lost.
