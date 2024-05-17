---
title: "超时控制"
date: 2023-09-19
weight: 3
keywords: ["Kitex", "超时"]
description: "Kitex 中共有几种「超时」：客户端连接超时(Connection Timeout)、客户端请求超时(RPC Timeout)、服务端读写超时(Read/Write Timeout)、服务端退出超时(Exit Wait Timeout)。"
---

## 使用方式

### 客户端超时（Client）

#### 配置项

##### 连接超时：ConnTimeout (default=50ms)

说明：

1. 建立一条新连接的最大等待时间；
2. 可设置为任意值（无上限）；如未设置，默认值为 50ms；
3. 如经常遇到 dial timeout 可考虑调大该值，及使用长连接池（详见 client.WithLongConnection）。

##### 请求超时：RPCTimeout (default=0, 不限时)

说明：

1. 限制一次 rpc 调用的最大用时；如超时，返回 `kerrors.ErrRPCTimeout`；
2. 可指定任意值（无上限）；如未指定，默认为 0，表示不限制等待时间；
3. 超时默认不会重试。

#### 配置方式

##### 代码配置 - Client Option（Client 粒度配置）

在初始化 client 时传入：

```go
import "github.com/cloudwego/kitex/client"

cli, err := xxx.NewClient(targetService,
    client.WithConnectTimeout(100 * time.Millisecond),
    client.WithRPCTimeout(2 * time.Second))
```

注：两个配置项可以按需独立配置。

##### 代码配置 - Call Option（请求粒度配置，优先级高于 client option）

发起请求时传入：

```go
import "github.com/cloudwego/kitex/client/callopt"

rsp, err := cli.YourMethod(ctx, req,
    callopt.WithConnectTimeout(100 * time.Millisecond))
    callopt.WithRPCTimeout(2 * time.Second))
```

注：两个配置项可以按需独立配置。

##### 动态配置 - TimeoutProvider（优先级低于前述 Option）

适用于需要动态配置的场景，每次请求前，Client 会调用 `TimeoutProvider 获取 RPCTimeout 和 ConnectionTimeout。

在初始化 client 时传入用户自定义的 `rpcinfo.TimeoutProvider`：

```go
import (
    "github.com/cloudwego/kitex/client"
    "github.com/cloudwego/kitex/pkg/rpcinfo"
)

type UserTimeoutProvider struct {}

func (UserTimeoutProvider) Timeouts(ri rpcinfo.RPCInfo) rpcinfo.Timeouts {
    // 需返回 RPCTimeout、ConnectTimeout
    // ReadWriteTimeout 实际未被使用，建议返回值与 RPCTimeout 相同
}

opt := client.WithTimeoutProvider(&UserTimeoutProvider{})
cli, err := xxx.NewClient(targetService, opt)
```

##### 配置中心扩展

可用的配置中心扩展：

- [config-nacos](https://github.com/kitex-contrib/config-nacos): 使用 Nacos 作为配置中心，支持超时、重试、熔断、服务端限流

#### 超时错误

##### 请求超时(kerrors.ErrRPCTimeout)

在请求超时的情况下，Client 收到的 Error 为：

```go
&kerrors.DetailedError {
    basic: kerrors.ErrRPCTimeout,
    cause: errors.New("timeout=100ms, to=ServerName, method=MethodName, location=kitex.rpcTimeoutMW, remote=0.0.0.0:8888"),
}
```

可使用 `kerrors.IsTimeoutError(err)` 来判断是否是超时错误。

##### 错误拆分

> 适用于 github.com/cloudwego/kitex >= v0.5.2

默认情况下，ErrRPCTimeout 可能有几种原因：

1. Kitex client 设置超时时间，导致请求超时
2. 业务代码主动调用 ctx.Cancel()
3. 业务在 context 里设置了比当前配置更短的 timeout

某些业务场景需要区分这些原因，例如同时发出多个请求，只要有一个请求成功，其他请求就会被 cancel，但这不是 RPC 或业务错误，希望区分这类结果，以免引起报警。

考虑到前向兼容，该配置默认关闭，需要在代码中主动设置：

```go
import "github.com/cloudwego/kitex/pkg/rpctimeout"

rpctimeout.EnableGlobalNeedFineGrainedErrCode()
```

开启前后区别如下：

| Scenarios                                           | Disabled              | Enabled                             |
| --------------------------------------------------- | --------------------- | ----------------------------------- |
| kitex 设置的超时到期                                | kerrors.ErrRPCTimeout | kerrors.ErrRPCTimeout               |
| 业务主动调用 ctx.Cancel()                           | (同上)                | kerrors.ErrCanceledByBusiness       |
| 业务代码设置的超时到期（比kitex配置更短的 timeout） | (同上)                | kerrors.ErrTimeoutByBusiness (\*注) |

\*注：考虑到 go 的 timer 有误差，在超时发生时，会判断 actualDDL + 50ms < Kitex's DDL，满足条件才会返回该错误码，否则仍返回 103。

例如 Kitex 设置 1s 超时：

- 如果实际 <950ms 就超时返回，说明大概率是业务代码里设置了 timer
- 如果实际 >= 1s 才超时返回，说明大概率是 Kitex 设置的 timer
- 如果在 950ms ~ 1s 之间超时，由于无法精确判断，目前保守地判定为 Kitex 设置的 timer

该阈值 (50ms) 在 Kitex >= 0.7.1 可通过如下方式修改：

```go
rpctimeout.SetBusinessTimeoutThreshold(10 * time.Millisecond)
```

### 服务端超时 (Server)

#### 配置项

##### ReadWriteTimeout (default=5s)

说明：

1. 在连接上读写数据所能忍受的最大等待时间，主要为防止异常连接卡住协程；
2. 不是 Handler 执行超时时间；
3. 只在 server 端生效，一般无需关心。

举例：client 端数据分多次发送，如果发送间隔过长，会触发 server 端读等待超时；这时需考虑调大 ReadWriteTimeout。

##### ExitWaitTime（default=5s）

说明：

1. Server 在收到退出信号时的等待时间；
2. 如果超过该等待时间，Server 将会强制结束所有在处理的请求（客户端会收到错误）。

##### EnableContextTimeout

> github.com/cloudwego/kitex >= v0.9.0

(针对非 Streaming API）如果从请求的 TTHeader 中读到了 timeout，则写入 server 请求的 ctx 。

具体用法请参考后文示例代码。

说明：

- Streaming API：已默认开启（通过另外的实现）
  - 含 GRPC/Protobuf 和 Thrift Streaming
  - client 的 `ctx.Deadline()` 会通过 `grpc_timeout` header 发送给 server，写入 server 的 ctx
- 非 Streaming API：默认未开启
  - 在 client 端需启用 TTHeader Transport 和 ClientTTHeaderMetaHandler，并通过 client/callopt `WithRPCTimeout` option 指定 RPC 超时时间
  - 在 server 端需启用此 Option 及 ServerTTHeaderMetaHandler，才能从请求的 TTHeader 中读取到 RPCTimeout
    - 如果业务代码有需要，可用 `rpcinfo.GetRPCInfo(ctx).Config().RPCTimeout()` 获得这个值

#### 配置方式

##### 代码配置 - Server Option

###### WithReadWriteTimeout

在初始化 Server 时指定：

```go
import "github.com/cloudwego/kitex/server"

svr := yourservice.NewServer(handler,
    server.WithReadWriteTimeout(5 * time.Second),
)
```

###### WithExitWaitTime

在初始化 Server 时指定：

```go
import "github.com/cloudwego/kitex/server"

svr := yourservice.NewServer(handler,
    server.WithExitWaitTime(5 * time.Second),
)
```

###### WithEnableContextTimeout

该 Option 需配合 TTHeader 使用，详见下方示例代码。

Client

- 指定 Transport Protocol 为 TTHeader
- 启用 [transmeta.ClientTTHeaderHandler](https://github.com/cloudwego/kitex/blob/v0.9.0/pkg/transmeta/ttheader.go#L45)
- 通过 client.WithRPCTimeout （或者在请求时使用 callopt.WithRPCTimeout）指定超时

```go
cli := yourservice.MustNewClient(
    serverName,
    client.WithTransportProtocol(transport.TTHeader),
    client.WithMetaHandler(transmeta.ClientTTHeaderHandler),
    client.WithRPCTimeout(time.Second),
)
```

Server

- 指定该 Option
- 启用 [transmeta.ServerTTHeaderHandler](https://github.com/cloudwego/kitex/blob/v0.9.0/pkg/transmeta/ttheader.go#L46)

```
svr := yourservice.NewServer(handler,
    server.WithMetaHandler(transmeta.ServerTTHeaderHandler),
    server.WithEnableContextTimeout(true),
)
```

## Q&A

### Q: ReadWriteTimeout，server 端执行时间超过默认的 5s，是否也会报超时？

这是服务端解码时等待包的超时时间，与服务端 handler 的执行没有关系（服务端handler执行时，已经完成解码）

### Q: 服务端支持 handler 执行超时配置吗？

目前服务端不支持 handler 执行超时，只支持读写超时。
