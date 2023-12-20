---
title: "扩展"
date: 2023-12-20
weight: 10
keywords: ["服务注册与发现"]
description: "Kitex 提供的服务注册与发现扩展功能"
---

## 服务注册

Kitex 支持自定义注册模块，使用者可自行扩展集成其他注册中心，该扩展定义在 pkg/registry 下。

### 扩展接口和 Info 定义

- 扩展接口

```go
// Registry is extension interface of service registry.
type Registry interface {
  Register(info *Info) error
  Deregister(info *Info) error
}
```

- Info 定义
  Kitex 定义了部分注册信息，使用者也可以根据需要自行扩展注册信息到 Tags 中。

```go
// Info is used for registry.
// The fields are just suggested, which is used depends on design.
type Info struct {
  // ServiceName will be set in kitex by default
  ServiceName string
  // Addr will be set in kitex by default
  Addr net.Addr
  // PayloadCodec will be set in kitex by default, like thrift, protobuf
  PayloadCodec string

  Weight        int
  StartTime     time.Time
  WarmUp        time.Duration

  // extend other infos with Tags.
  Tags map[string]string
}
```

### 集成到 Kitex

通过 option 指定自己的注册模块和自定义的注册信息。注意注册需要服务信息，服务信息也是通过 option 指定。

- 指定服务信息

  option: `WithServerBasicInfo`

  ```go
  ebi := &rpcinfo.EndpointBasicInfo{
      ServiceName: "yourServiceName",
      Tags:        make(map[string]string),
  }
  ebi.Tags[idc] = "xxx"
  
  svr := xxxservice.NewServer(handler, server.WithServerBasicInfo(ebi))
  ```

- 指定自定义注册模块

  option: `WithRegistry`

  ```go
  svr := xxxservice.NewServer(handler, server.WithServerBasicInfo(ebi), server.WithRegistry(yourRegistry))
  ```

- 自定义 RegistryInfo

  Kitex 默认赋值 ServiceName、Addr 和 PayloadCodec，若需要其他注册信息需要使用者自行注入。option:  `WithRegistryInfo`

  ```go
  svr := xxxservice.NewServer(handler, server.WithRegistry(yourRegistry), server.WithRegistryInfo(yourRegistryInfo))
  ```

## 服务发现

[kitex-contrib](https://github.com/kitex-contrib) 中已经提供了多种服务发现扩展：DNS, ETCD, ZooKeeper, Eureka, Consul, Nacos, Polaris。

用户如果需要更换其他的服务发现，用户可以根据需求实现 `Resolver ` 接口，client 通过 `WithResolver` Option 来注入。

### 接口定义

接口在 pkg/discovery/discovery.go 中，具体定义如下：

```go
// 服务发现接口定义
type Resolver interface {
    Target(ctx context.Context, target rpcinfo.EndpointInfo) string
    Resolve(ctx context.Context, key string) (Result, error)
    Diff(key string, prev, next Result) (Change, bool)
    Name() string
}

type Result struct {
    Cacheable bool // 是否可以缓存
    CacheKey  string // 缓存的唯一 key
    Instances []Instance // 服务发现结果
}

// diff 的结果
type Change struct {
    Result  Result
    Added   []Instance
    Updated []Instance
    Removed []Instance
}
```

`Resolver` 接口定义如下:

- `Resolve`：作为 `Resolver` 的核心方法， 从 target key 中获取我们需要的服务发现结果 `Result`。
- `Target`：从 Kitex 提供的对端 EndpointInfo 中解析出 `Resolve` 需要使用的唯一 target, 同时这个 target 将作为缓存的唯一 key。
- `Diff`：用于计算两次服务发现的变更， 计算结果一般用于通知其他组件， 如 [loadbalancer](../../service-governance/loadbalance) 和熔断等， 返回的是变更 `Change`。
- `Name`：用于指定 Resolver 的唯一名称， 同时 Kitex 会用它来缓存和复用 Resolver。

### 自定义 Resolver

首先需要实现 Resolver 接口需要的方法， 通过配置项指定 Resolver。

Kitex 提供了 Client 初始化配置项 :

```go
import (
    "xx/kitex/client"
)


func main() {
    opt := client.WithResolver(YOUR_RESOLVER)

    // new client
    xxx.NewClient("destServiceName", opt)
}
```

### 注意事项

- 我们通过复用 Resolver 的方式来提高性能， 要求 Resolver 的方法实现需要是并发安全的。
