---
title: "Timeouts"
date: 2021-08-31
weight: 3
keywords: ["Kitex", "timeout"]
description: "There are several types of Timeout in Kitex: Client connection timeout, Client RPC timeout, Server read/write timeout, and Server exit timeout."
---

## How to Use

### Client Timeouts

#### Config Items

##### Connection Timeout (default=50ms)

Note:

1. This is the maximum waiting time for establishing a new connection;
2. It can be set to any value (no upper limit); if not set, the default value is 50ms;
3. If you frequently encounter "dial timeout", try increasing the value and using the long connection pool (see client.WithLongConnection).

##### RPC Timeout (default=0, no limit)

Note:

1. This is the maximum time limit for one RPC call; If timeout occurs, `kerrors.ErrRPCTimeout` is returned;
2. Any value can be specified (no upper limit); if not specified, the default value is 0, meaning no timeout limit;
3. No retry will be sent by default in case of timeout.

#### Configuration method

##### By code - Client Option (per-client config)

Specified when initializing client:

```go
import "github.com/cloudwego/kitex/client"

cli, err := xxx.NewClient(targetService,
    client.WithConnectTimeout(100 * time.Millisecond),
    client.WithRPCTimeout(2 * time.Second))
```

Note: The two configuration items can be specified independently as needed.

##### By code - Call Option（per-request config; priority over client option）

Specified when sending the request:

```go
import "github.com/cloudwego/kitex/client/callopt"

rsp, err := cli.YourMethod(ctx, req,
    callopt.WithConnectTimeout(100 * time.Millisecond))
    callopt.WithRPCTimeout(2 * time.Second))
```

Note: The two configuration items can be specified independently as needed.

##### Dynamic Config - TimeoutProvider (priority lower than the options above)

Applicable to scenarios that require dynamic configuration. Before each request, the Client will call the `TimeoutProvider`` specified to obtain RPCTimeout and ConnectionTimeout.

Specify a user-defined `rpcinfo.TimeoutProvider` when initializing the client:

```go
import (
    "github.com/cloudwego/kitex/client"
    "github.com/cloudwego/kitex/pkg/rpcinfo"
)

type UserTimeoutProvider struct {}

func (UserTimeoutProvider) Timeouts(ri rpcinfo.RPCInfo) rpcinfo.Timeouts {
    // Should return RPCTimeout、ConnectTimeout
    // ReadWriteTimeout is not used; recommended to have the same value as RPCTimeout
}

opt := client.WithTimeoutProvider(&UserTimeoutProvider{})
cli, err := xxx.NewClient(targetService, opt)
```

##### Configuration Center Extension

Available extension(s):

- [config-nacos](https://github.com/kitex-contrib/config-nacos): Use Nacos as the configuration center, support timeout, retry, circuitbreak, and server side limiter.

#### Error for Timeout

##### Request Timeout (kerrors.ErrRPCTimeout)

When a request times out, the `error` received by the Client will be:

```go
&kerrors.DetailedError {
    basic: kerrors.ErrRPCTimeout,
    cause: errors.New("timeout=100ms, to=ServerName, method=MethodName, location=kitex.rpcTimeoutMW, remote=0.0.0.0:8888"),
}
```

`kerrors.IsTimeoutError(err)` can be used to check whether it's a timeout error.

##### Splitting the ErrRPCTimeout

> Applicable to github.com/cloudwego/kitex >= v0.5.2

By default, reasons of ErrRPCTimeout may be:

1. Timeout set by Kitex client (by options), causing request timed out
2. The business code invoked the ctx.Cancel()
3. The business code set a deadline earlier than set by Kitex

In some scenarios, it's necessary to distinguish these reasons, such as issuing multiple requests at the same time expecting only one request to be successful, and cancelling other requests. However, other requests cancelled are not regarded as RPC or business error, and should be filtered to avoid unwanted alarms.

Considering compatibility, this configuration is disabled by default and needs to be set by code:

```go
import "github.com/cloudwego/kitex/pkg/rpctimeout"

rpctimeout.EnableGlobalNeedFineGrainedErrCode()
```

The difference before and after enabling is listed in the following table:
| Scenarios | Disabled | Enabled |
| --------- | -------- | ------- |
| Timeout set by kitex | kerrors.ErrRPCTimeout | kerrors.ErrRPCTimeout |
| Cancel called by business code | (same as above) | kerrors.ErrCanceledByBusiness |
| Timeout set by business code (earlier than timeout set by kitex) | (same as above) |kerrors.ErrTimeoutByBusiness (\*NOTE) |

\*NOTE：Considering the fact that the timer of go language may not be accurate all the time, when a timeout occurs, it checks whether actualDDL + 50ms < kitex's DDL, and only returns the error code if the condition is met, otherwise it still returns 103.

For example, Kitex sets a 1s timeout:

- If the actual timeout returns after < 950ms, it indicates that the timer is most likely set in the business code;
- If it actually takes >= 1s to timeout, it means that it's most likely the timer set by Kitex.
- If the timeout is between 950ms and 1s, it's currently conservatively determined to be the timer set by Kitex because it can not be accurately judged.

The threshold (50ms) can be modified under Kitex >= 0.7.1 by:

```go
rpctimeout.SetBusinessTimeoutThreshold(10 * time.Millisecond)
```

### Server Timeouts

#### Config Items

##### ReadWriteTimeout (default=5s)

NOTE:

1. This is the maximum waiting time that can be tolerated for reading and writing data on the connection, mainly to prevent abnormal connections from blocking the goroutine.
2. This is not the Handler execution timeout;
3. It only takes effect on the server side and it won't be a problem in most cases.

For example, on the client side, request is sent in multiple segments. If the interval between two segments is too long, it will trigger a server-side read waiting timeout. Upon such a case, try increasing the ReadWriteTimeout.

##### ExitWaitTime（default=5s）

NOTE：

1. After receiving an exit signal, the server will wait for an ExitWaitTime before exit;
2. If the waiting time is exceeded, the server will forcibly terminate all requests being processed (the client will receive an error).

##### EnableContextTimeout

> github.com/cloudwego/kitex >= v0.9.0

(For non-streaming API) If timeout is available in the request's TTHeader, set it into server request ctx.

For detailed usage, please refer to the example code below.

NOTE:

- For Streaming API requests: enabled by default via another way
  - Including GRPC/Protobuf and Thrift Streaming
  - Client's `ctx.Deadline()` is sent via header `grpc-timeout` to server which will be added to the server request's ctx
- For Non-streaming API requests: disabled by default
  - Client should enable TTHeader Transport and ClientTTHeaderMetaHandler, and specify RPC Timeout via client/callopt `WithRPCTimeout` option
  - Server should enable this Option and ServerTTHeaderMetaHandler to read the RPCTimeout from requests' TTHeader
    - If there's a need in your business code to get this value, call `rpcinfo.GetRPCInfo(ctx).Config().RPCTimeout()`

#### Configuration method

##### By code - Server Option

###### WithReadWriteTimeout

Specified when initializing a server:

```go
import "github.com/cloudwego/kitex/server"

svr := xxx.NewServer(handler,
    server.WithReadWriteTimeout(5 * time.Second),
)
```

###### WithExitWaitTime

Specified when initializing a server:

```go
import "github.com/cloudwego/kitex/server"

svr := yourservice.NewServer(handler,
    server.WithExitWaitTime(5 * time.Second),
)
```

###### WithEnableContextTimeout

This Option should be used with TTHeader; please refer to the example code below.

Client

- Specify TTHeader as Transport Protocol
- Enable [transmeta.ClientTTHeaderHandler](https://github.com/cloudwego/kitex/blob/v0.9.0/pkg/transmeta/ttheader.go#L45)
- Specify an RPC timeout by client.WithRPCTimeout (or by callopt.WithRPCTimeout when sending a request)

```go
cli := yourservice.MustNewClient(
    serverName,
    client.WithTransportProtocol(transport.TTHeader),
    client.WithMetaHandler(transmeta.ClientTTHeaderHandler),
    client.WithRPCTimeout(time.Second),
)
```

Server

- Specify this option
- Enable [transmeta.ServerTTHeaderHandler](https://github.com/cloudwego/kitex/blob/v0.9.0/pkg/transmeta/ttheader.go#L46)

```
svr := yourservice.NewServer(handler,
    server.WithMetaHandler(transmeta.ServerTTHeaderHandler),
    server.WithEnableContextTimeout(true),
)
```

## FAQ

### Q: Will the server report a timeout if a handler executes more than ReadWriteTimeout(5s)?

This is the timeout time waiting for the packet during server-side decoding, and has nothing to do with the execution of the server handler (decoding has already been completed when the server handler is executed).

### Q: Does the server support handler timeout?

Currently, the server side does not support handler execution timeout.
