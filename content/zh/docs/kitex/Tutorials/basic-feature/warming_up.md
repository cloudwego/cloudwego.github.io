---
title: "预热"
linkTitle: "预热"
weight: 6
description: 通过客户端预热，可以避免首次请求时产生较大的延迟。
---

## 介绍

kitex v0.3.0 支持了客户端预热，可以在创建客户端的时候预先初始化服务发现和连接池的相关组件，避免在首次请求时产生较大的延迟。

## 使用方式

### v0.3.0 新增 API

`NewClient` 方法的 option：

```go
client.WithWarmingUp(w *warmup.ClientOption) Option
```

其中 `warmup.ClientOption` 是 v0.3.0 版本引入的 package `pkg/warmup` 提供的结构体：

```go
// ClientOption controls the warming up of a client.
type ClientOption struct {
    ErrorHandling
    ResolverOption *ResolverOption
    PoolOption     *PoolOption
}
```

```go
// ErrorHandling controls how to handle error
type ErrorHandling int

// ErrorHandling .
const (
    IgnoreError ErrorHandling = iota
    WarningLog
    ErrorLog
    FailFast // fail if any error occurs.
)

// ResolverOption controls the warming up of service discovery.
type ResolverOption struct {
    Dests []*rpcinfo.EndpointBasicInfo
}

// PoolOption controls the warming up of connection pools.
type PoolOption struct {
    Targets  map[string][]string // Network => addresses; if nil, use the result of service discovery
    ConnNum  int                 // Connection numbers for each address
    Parallel int                 // If greater than zero, build connections in `Parallel` goroutines.
}
```

### 常见用法

#### 创建 client 的时候执行服务发现

```go
cli, err := myservice.NewClient(psm, client.WithWarmingUp(&warmup.ClientOption{
    ResolverOption: &warmup.ResolverOption{
        Dests: []*rpcinfo.EndpointBasicInfo{
            &rpcinfo.EndpointBasicInfo{
                ServiceName: psm,
                Tags: map[string]string{
                    "cluster": "default",
                    // "env": "xxx"
                },
            },
        },
    },
}))
```

#### 创建 client 的时候初始化连接池，每个下游实例建立两个连接

```go
cli, err := myservice.NewClient(psm, client.WithWarmingUp(&warmup.ClientOption{
    PoolOption: &warmup.PoolOption{
        ConnNum: 2,
    },
}))
```

## FAQ

### Q：下游升级后会重新预热吗？

不会。
