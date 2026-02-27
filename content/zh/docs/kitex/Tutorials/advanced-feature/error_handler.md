---
title: "定制框架错误处理"
date: 2022-06-09
weight: 4
keywords: ["Kitex", "Error Handler", "中间件"]
description: RPC 基于协议进行通信，且 RPC 并没有统一的错误码规范，因此 Kitex 提供 ErrorHandler 来定制错误处理。
---

部分用户会问如何让调用端收到服务端对应的错误类型，这里解释一下，RPC 是通过协议进行通信，错误的处理也是基于协议，通常服务端返回 Error，RPC 框架统一进行错误编码返回回调用端，如果要让调用端返回和服务端一样的错误，需要定义一套错误码进行处理。但考虑到 RPC 并没有统一的错误码规范且内部的错误码不一定适用于外部用户，所以 Kitex 的开源部分没有暴露错误码定义，用户可以通过提供 **ErrorHandler** 来定制自己的错误处理。

## 建议使用方式

ErrorHandler 通过 client/server 的 Option 配置，但通常一个微服务体系会有统一的异常处理规范，如果是企业用户建议通过 [Suite](../../framework-exten/suite) 封装定制 Option，服务开发者就不用具体关注异常处理的配置。

### 服务端配置

```go
// server option
server.WithErrorHandler(yourServerErrorHandler)
```

该函数会在服务端 handler 执行后，中间件执行前被执行，可以用于给调用端返回自定义的错误码和信息。注意，虽然对此提供了支持，但业务层面自定义的错误码依然不建议通过 ErrorHandler 处理，因为我们希望将 RPC 错误和业务的错误能够区分开，RPC 错误表示一次RPC 请求失败，比如超时、熔断、限流，从 RPC 层面是失败的请求，但业务错误属于业务逻辑层面，在 RPC 层面其实是请求成功。Kitex 会制定一个业务[自定义异常规范](https://github.com/cloudwego/kitex/issues/511)用于区分业务错误和 RPC 层面错误。

- ErrorHandler 示例：

  Kitex 对 server handler 返回的 error 统一封装为 kerrors.ErrBiz，如果要获取原始的 error 需要先进行 Unwrap。

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

### 调用端配置

```go
// client option
client.WithErrorHandler(yourClientErrorHandler)
```

该 handler 在远程调用结束，中间件执行前被执行。框架有默认的 ClientErrorHandler，如果未配置将使用默认的，默认 Handler 的行为是：接收到服务端的错误返回或者调用端在传输层出现了异常，统一返回 **ErrRemoteOrNetwork**。另外，对于 Thrift 和 KitexProtobuf，error msg 会包含 '[remote]' 信息用来标识这是对端的错误；对于 gRPC 如果对端通过 `status.Error` 构造的错误返回，本端使用 `status.FromError(err)` 可以获取 `*status.Status`，注意 `Status` 需使用 Kitex 提供的，包路径是 `github.com/cloudwego/kitex/pkg/remote/trans/nphttp2/status`。

- ErrorHandler 示例：

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

### 错误码定义范围

因为部分错误码是框架内置的，所以使用者应当避开内置错误码，目前内置的错误码：

- Thrift、KitexProtobuf：0 - 10。

- gRPC：0 - 17。

## ErrorHandler 执行机制

ErrorHandler 在 Middleware 中被执行，无论是调用端还是服务端 ErrorHandler 都作为最里层的 Middleware 被执行，如图所示：

![middleware_errorhandler](/img/docs/middleware_errorhandler.png)
