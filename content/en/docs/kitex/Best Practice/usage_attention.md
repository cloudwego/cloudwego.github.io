---
title: "Usage Attention"
linkTitle: "Usage Attention"
weight: 1
date: 2024-02-18
description: >

---

## Do not use RPCInfo asynchronously

By default, the lifecycle of Kitex's RPCInfo is from the start of the request until the response is returned (for performance reasons). Afterwards, it is put into a sync.Pool for reuse. In the server-side, if RPCInfo is asynchronously accessed and used within the business handler, it may read dirty data or encounter a null pointer and panic.

If there is indeed a scenario where asynchronous usage is required, there are two approaches:

- Use `rpcinfo.FreezeRPCInfo` provided by Kitex to make a copy of the initial RPCInfo before using it.

  ```go
  import (
      "github.com/cloudwego/kitex/pkg/rpcinfo"
  )
  // this creates a read-only copy of `ri` and attaches it to the new context
  ctx2 := rpcinfo.FreezeRPCInfo(ctx) 
  go func(ctx context.Context) {
      // ...
      ri := rpcinfo.GetRPCInfo(ctx) // OK
      
      //...
  }(ctx2)
  ```

- Set the environment variable `KITEX_DISABLE_RPCINFO_POOL=true` to disable RPCInfo recycling.

  > Supported version: github.com/cloudwego/kitex v0.8.1

## Do not create a new Kitex client for each request

The Kitex client object manages resources related to remote configuration, service discovery cache, connection pool, and other Service-related resources. It creates several goroutines to perform various asynchronous update tasks. If Kitex clients are frequently created, it will cause a sudden increase in CPU usage, frequent timeouts in RPC calls, service discovery, and remote configuration retrieval, as well as a large increase in the number of goroutines.

**Correct usage**: Create a Kitex client for each downstream service being accessed, and cache it. Then, whenever you need to make a request to the downstream service, use the corresponding method of the cached Kitex client. The same client can be used concurrently and safely.
