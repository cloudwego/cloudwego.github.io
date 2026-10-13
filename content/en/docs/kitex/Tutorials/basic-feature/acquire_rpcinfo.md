---
title: "Acquire Kitex RPC Info "
date: 2026-07-01
weight: 8
keywords: ["Acquire Kitex RPC Info "]
description: ""
---

> ⚠️ Note: RPCInfo pooling and reuse will be gradually removed in the versions after [v0.16.2](https://github.com/cloudwego/kitex/releases/tag/v0.16.2), in order to reduce the mental burden on users during development.

## Acquire RPC information

When RPCInfo pooling and reuse is enabled, Kitex's RPCInfo lifecycle is from the start of the request to the return of the request for performance reasons. After that, it is put into `sync.Pool` for reuse. On the server side, if RPCInfo is asynchronously obtained and used in a business handler, dirty data or nil pointer panic may occur.

For safety, Kitex disables RPCInfo pooling and reuse by default. After a request finishes, the framework does not reset RPCInfo and put it back into the pool by default. Therefore, when business code reads a captured `ctx` asynchronously after the request returns, it will not panic due to the framework reusing the object and clearing its fields.

### RPCInfo Pooling Switch

RPCInfo pooling is disabled by default. To explicitly enable reuse, set the following environment variable:

```bash
KITEX_ENABLE_RPCINFO_POOL=1
```

The legacy disable switch is still kept for compatibility:

```bash
KITEX_DISABLE_RPCINFO_POOL=1
```

Priority: `KITEX_ENABLE_RPCINFO_POOL` > `KITEX_DISABLE_RPCINFO_POOL`

**Note:** Some information needs to rely on the transport protocol (TTHeader or HTTP2) and corresponding MetaHandler. Please refer to [here](/docs/kitex/tutorials/basic-feature/protocol/transport_protocol/#thrift).

### 1.1 Synchronous usage

| **Information obtained**                     | **Kitex fetch method**                                                                                                                                                                                                                          |
| -------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Get Caller's Service                         | caller, ok := kitexutil.GetCaller(ctx)                                                                                                                                                                                                          |
| Get RPC Method                               | method, ok := kitexutil.GetMethod(ctx)                                                                                                                                                                                                          |
| Get Caller's address                         | cluster, ok := kitexutil.GetCallerAddr(ctx)                                                                                                                                                                                                     |
| Get ServiceName defined in IDL               | svcName, ok := kitexutil.GetIDLServiceName(ctx)                                                                                                                                                                                                 |
| Get caller's handler method                  | callerMethod, ok := kitexutil.GetCallerHandlerMethod(ctx)<br/>Only the caller is a Kitex server will have this method information by default, or you can set K_METHOD into context.Context then kitex will get it.                              |
| Get the transport protocol                   | tp, ok := kitexutil.GetTransportProtocol(ctx)                                                                                                                                                                                                   |
| Get the remote address from the caller-side. | ctx = metainfo.WithBackwardValues(ctx) <br/> // set ctx first，then execute RPC call ... <br/>err, resp := cli.YourMethod(ctx, req)<br/>rip, ok := metainfo.GetBackwardValue(ctx, consts.RemoteAddr) <br/>Note: Not applicable to oneway method |

### 1.2 Asynchronous usage

> If the framework version is earlier than v0.16.2 and the environment variable `KITEX_DISABLE_RPCINFO_POOL=true` is not explicitly set

If you need to get RPCInfo in a new goroutine, there are two ways to use it. Choose one and get the specific information as above.

- **Method 1:** Use the rpcinfo.FreezeRPCInfo provided by Kitex to copy the initial RPCInfo and then use it.
  However, there is additional consumption due to deep copying of rpcinfo.

```go
import (
    "github.com/cloudwego/kitex/pkg/rpcinfo"
    "github.com/cloudwego/kitex/pkg/utils/kitexutil"
)
// this creates a read-only copy of `ri` and attaches it to the new context
ctx2 := rpcinfo.FreezeRPCInfo(ctx)
go func(ctx context.Context) {
    // ...
    ri := rpcinfo.GetRPCInfo(ctx) // OK

    // eg: get client psm
    // caller, ok := kitexutil.GetCaller(ctx)
    //...
}(ctx2)

```

- **Method 2 [Kitex v0.8.0+]:** Disable RPCInfo recycling. You can either set the environment variable `KITEX_DISABLE_RPCINFO_POOL=true`, or configure `rpcinfo.EnablePool(false)` in code.

## Meta Info Transparent Transmission

Please see [Meta Info Transparent Transmission](/docs/kitex/tutorials/advanced-feature/metainfo/).
