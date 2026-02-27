---
title: "Customize Error Handler"
date: 2022-07-22
weight: 4
keywords: ["Kitex", "Error Handler", "Middleware"]
description: RPC is based on the protocol and there is no unified error code specification, so Kitex provides ErrorHandler to customize error handling.
---

Some users will ask how to let the client-side receive the corresponding error type of the server-side, here to explain, RPC communicates through the protocol, and error handling is also based on the protocol. Usually when the server returns Error, the framework will unify the Error encoding and return it to the client side. If you want the client to return the same error as the server-side, you need to define a set of error codes for handling. However, considering that RPC does not have a unified error code specification, and internal error codes are not necessarily applicable to external users, so the open source part of Kitex does not expose the error code definition, and users can customize their own error handler by using the provided **ErrorHandler**.

## Recommended Usage

ErrorHandler is configured via the client/server Option, but usually, a microservice system will have a unified error handler specification, if you are an enterprise user, it is recommended to customize the Option through the [Suite](../../framework-exten/suite), so that the service developer does not need to pay attention to the configuration of error handler.

### Server-side Configuration

```go
// server option
server.WithErrorHandler(yourServerErrorHandler)
```

This function is executed after the server-side handler and before the middleware is executed, and can be used to return custom error codes and messages to the client-side. Note that although this is supported, business-level custom error codes are still not recommended to be handled by ErrorHandler, because we want to distinguish RPC errors from business errors, which indicate a failed RPC request, such as timeout, circuit breaker, rate limiting, which is a failed request at the RPC level, but business errors are at the business logic level, which is actually a successful request at the RPC level. Kitex will develop a [custom exception specification](https://github.com/cloudwego/kitex/issues/511) to distinguish between business errors and RPC level errors.

- ErrorHandler example：

  Kitex wraps the error returned by the server handler as kerrors.ErrBiz, if you want to get the original error you need to Unwrap it first.

```go
// convert errors that can be serialized
func ServerErrorHandler(ctx context.Context, err error) error {
    // if you want get other rpc info, you can get rpcinfo first, like `ri := rpcinfo.GetRPCInfo(ctx)`
    // for example, get remote address: `remoteAddr := rpcinfo.GetRPCInfo(ctx).From().Address()`

    if errors.Is(err, kerrors.ErrBiz) {
        err = errors.Unwrap(err)
    }
    if errCode, ok := GetErrorCode(err); ok {
        // for Thrift、KitexProtobuf
        return remote.NewTransError(errCode, err)
    }
    return err
}

// convert errors that can be serialized
func ServerErrorHandler(ctx context.Context, err error) error {
    if errors.Is(err, kerrors.ErrBiz) {
        err = errors.Unwrap(err)
    }
    if errCode, ok := GetErrorCode(err); ok {
        // for gRPC
        // status use github.com/cloudwego/kitex/pkg/remote/trans/nphttp2/status
        return status.Errorf(errCode, err.Error())
    }
    return err
}
```

### Client-side Configuration

```go
// client option
client.WithErrorHandler(yourClientErrorHandler)
```

The handler is executed after the remote call and before the middleware is executed. The framework has a default ClientErrorHandler, it will be used by default if no ClientErrorHandler is configured. The behavior of the default Handler is to return **ErrRemoteOrNetwork** when an error is received from the server-side or when an exception occurs at the transport layer on the client side. In addition, for Thrift and KitexProtobuf, the error msg contains a '[remote]' message to identify that it is an error on the other side; for gRPC, if the other side returns an error constructed by `status.Error`, use `status.FromError(err)` on the local side to get `*status.Status`, note that `Status` needs to be provided by Kitex, the package path is `github.com/cloudwego/kitex/pkg/remote/trans/nphttp2/status`.

- ErrorHandler example：

```go
func ClientErrorHandler(ctx context.Context, err error) error {
    // if you want get other rpc info, you can get rpcinfo first, like `ri := rpcinfo.GetRPCInfo(ctx)`
    // for example, get remote address: `remoteAddr := rpcinfo.GetRPCInfo(ctx).To().Address()`

    // for thrift、KitexProtobuf
    if e, ok := err.(*remote.TransError); ok {
        // TypeID is error code
        return buildYourError(e.TypeID(), e)
    }
    // for gRPC
    if s, ok := status.FromError(err); ok {
        return buildYourErrorWithStatus(s.Code(), s)
    }
    return kerrors.ErrRemoteOrNetwork.WithCause(err)
}
```

### Error Code Definition Range

Because some of the error codes are built-in to the framework, users should avoid using the built-in error codes, currently built-in error codes:

- Thrift、KitexProtobuf：0 - 10。

- gRPC：0 - 17。

## ErrorHandler Execution Mechanism

The ErrorHandler is executed in the Middleware, either on the client-side or on the server-side ErrorHandler is executed as the innermost Middleware, as shown below:

![middleware_errorhandler](/img/docs/middleware_errorhandler.png)
