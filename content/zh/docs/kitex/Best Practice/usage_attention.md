---
title: "Kitex 使用注意事项"
linkTitle: "Kitex 使用注意事项"
weight: 1
date: 2024-02-18
description: >

---

## 勿异步使用 RPCInfo

Kitex 的 RPCInfo 的生命周期默认是从请求开始到请求返回（性能考虑），随后会被放到 sync.Pool 中复用，在 Server 端，如果在业务 Handler 中异步获取使用，可能会读到脏数据 / 空指针而 panic。

如果的确存在异步使用的场景，有两种方式：

- 用 Kitex 提供的 rpcinfo.FreezeRPCInfo 复制初始的 RPCInfo 再使用

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

- 配置环境变量 KITEX_DISABLE_RPCINFO_POOL=true，禁用 RPCInfo 回收

  - 支持版本：github.com/cloudwego/kitex v0.8.1

## 勿**每个请求创建一个** kitex client

Kitex client 对象管理着远程配置、服务发现的缓存、连接池等与 Service 相关的资源，会对应创建若干 goroutine 以完成各种异步更新工作。如果频繁创建 kitex client，会导致服务的 CPU 会陡然升高，RPC 调用、 服务发现、远程配置拉取频繁超时，以及 goroutine 数目大涨。

**正确的用法：**为每个访问的下游 Service 创建一个 kitex client，可以缓存起来，然后每次响应请求要去调用下游服务时，调用该 kitex client 的对应方法即可，同一个 Client 可以并发安全的使用。