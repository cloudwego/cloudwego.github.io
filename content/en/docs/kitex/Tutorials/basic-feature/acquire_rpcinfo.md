---
title: "Acquire Kitex RPC Info "
date: 2023-11-29
weight: 8
keywords: ["Acquire Kitex RPC Info "]
description: ""
---

## Acquire RPC information

The default lifecycle of Kitex's RPCInfo is from the start of the request to the return of the request (performance considerations), and then it will be placed in sync.Pool to reuse. On the Server side, if it is asynchronously obtained and used in the business Handler, it may lead to read dirty data, nil panic.

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

If you need to get RPCInfo in the new goroutine, there are two ways to use it. Choose one and get the specific information as above.

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

- **Method 2 [Kitex v0.8.0+]:** Disable RPCInfo pool
  Set environment variables _KITEX_DISABLE_RPCINFO_POOL=true_ or configure _rpcinfo.EnablePool(false)_ in the code.

## Meta Info Transparent Transmission

Please see [Meta Info Transparent Transmission](/docs/kitex/tutorials/advanced-feature/metainfo/).
