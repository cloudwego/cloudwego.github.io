---
title: "使用注意事项"
linkTitle: "使用注意事项"
weight: 1
date: 2024-02-18
keywords: ["Kitex", "RPCInfo", "client", "Set", "Map"]
description: "介绍 Kitex RPCInfo、client 创建、大量数据传输场景下的注意事项。"
---

## 勿异步使用 RPCInfo

Kitex 的 RPCInfo 的生命周期默认是从请求开始到请求返回（性能考虑），随后会被放到 `sync.Pool` 中复用，在 Server 端，如果在业务 Handler 中异步获取使用，可能会读到脏数据 / 空指针而 panic。

如果的确存在异步使用的场景，有两种方式：

- 用 Kitex 提供的 `rpcinfo.FreezeRPCInfo` 复制初始的 RPCInfo 再使用

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

- 配置环境变量 `KITEX_DISABLE_RPCINFO_POOL=true`，禁用 RPCInfo 回收 (支持版本: v0.8.1)

## 勿**每个请求创建一个** kitex client

Kitex client 对象管理着远程配置、服务发现的缓存、连接池等与 Service 相关的资源，会对应创建若干 goroutine 以完成各种异步更新工作。如果频繁创建 kitex client，会导致服务的 CPU 会陡然升高，RPC 调用、 服务发现、远程配置拉取频繁超时，以及 goroutine 数目大涨。

**正确的用法**：为每个访问的下游 Service 创建一个 kitex client，可以缓存起来，然后每次响应请求要去调用下游服务时，调用该 kitex client 的对应方法即可，同一个 Client 可以并发安全的使用。

## 使用 set\<struct> 避免传输大量数据

### Case：12M 数据 set 改为 map 耗时 20s -> 100ms

业务 IDL 数据结构如下：

```thrift
struct DataResponse {
    1: required i32 code
    2: required string msg
    3: optional map<string, set<Grid>> data
}
```

### 原因

Thrift 官方自 0.11.0 开始在 go 生成代码中将 set 类型由 `map[T]bool` 改为 `[]T`，见 [PR](https://github.com/apache/thrift/pull/1156)。

由于 `[]T` 无法去重，避免发送重复元素，编码时对 slice 的元素进行校验，校验方式是 O(n^2) 遍历 + `reflect.DeepEqual`，代码如下：

```go
for i := 0; i < len(p.StringSet); i++ {
   for j := i + 1; j < len(p.StringSet); j++ {
      if reflect.DeepEqual(p.StringSet[i], p.StringSet[j]) {
         return thrift.PrependError("", fmt.Errorf("%T error writing set field: slice is not unique", p.StringSet[i]))
      }
   }
}
```

如果 set 中元素数据很多，同时数据结构复杂将导致编码耗时急剧增加，如前面所述 case。

### 如何处理

**方式一：将 set 改成 map（不兼容的变更）**

如果元素是 struct 生成出来是指针类型，也不能保证唯一性。

**方式二：生成代码时通过参数禁用 set 校验（业务自行保证元素的唯一性）**

即使增加了校验也是返回 error，如果业务能自行保证唯一性，编码时可不做该校验

`kitex -thrift validate_set=false yourIDL`
