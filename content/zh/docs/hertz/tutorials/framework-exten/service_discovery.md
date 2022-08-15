---
title: "服务注册与发现扩展"
date: 2022-08-14
weight: 3
description: >
---

## 服务注册扩展
Hertz 支持自定义注册模块，使用者可自行扩展集成其他注册中心，该扩展定义在 pkg/app/server/registry 下。

### 接口定义与Info定义
- 接口定义
```go
// Registry is extension interface of service registry.
type Registry interface {
	Register(info *Info) error
	Deregister(info *Info) error
}
```
- Info定义
```go
// Info is used for registry.
// The fields are just suggested, which is used depends on design.
type Info struct {
	ServiceName string
	Addr net.Addr
	Weight int
	// extend other infos with Tags.
	Tags map[string]string
}
```

### 集成到Hertz

- 通过 `server.WithRegistry` 指定自己的注册模块和自定义的注册信息。

```go
    h := server.Default(
    	server.WithHostPorts(addr),
    	server.WithRegistry(r, &registry.Info{
    		ServiceName: "hertz.test.demo",
    		Addr:        utils.NewNetAddr("tcp", addr),
    		Weight:      10,
    		Tags:        nil,
    	}))
```

## 服务发现扩展

### 接口定义
Hertz 支持自定义发现模块，使用者可自行扩展集成其他注册中心，该扩展定义在 pkg/app/client/discovery 下。

```go
type Resolver interface {
	// Target should return a description for the given target that is suitable for being a key for cache.
	Target(ctx context.Context, target *TargetInfo) string

	// Resolve returns a list of instances for the given description of a target.
	Resolve(ctx context.Context, desc string) (Result, error)

	// Name returns the name of the resolver.
	Name() string
}

type TargetInfo struct {
    Host string
    Tags map[string]string
}

type Result struct {
    CacheKey  string // 缓存的唯一 key
    Instances []Instance // 服务发现结果
}
```

`Resolver` 接口定义如下:

- `Resolve`：作为 `Resolver` 的核心方法， 从 target key 中获取我们需要的服务发现结果 `Result`。
- `Target`：从 Hertz 提供的对端 TargetInfo 中解析出 `Resolve` 需要使用的唯一 target, 同时这个 target 将作为缓存的唯一 key。
- `Name`：用于指定 Resolver 的唯一名称， 同时 Hertz 会用它来缓存和复用 Resolver。

### 集成到Hertz

通过使用 Hertz 提供的 Discovery 中间件，指定自定义的服务发现扩展。

```go
    cli, err := client.NewClient()
    if err != nil {
        panic(err)
    }
    r := nacos_demo.NewNacosResolver()
    cli.Use(sd.Discovery(r))
```

### 注意事项
- 我们通过复用 Resolver 的方式来提高性能， 要求 Resolver 的方法实现需要是并发安全的。

## 负载均衡扩展

Hertz 默认提供了 WeightedRandom 负载均衡实现,同时也支持自定义负载均衡实现，该扩展定义在 pkg/app/client/loadbalance 下

### 接口定义
```go
    // Loadbalancer picks instance for the given service discovery result.
    type Loadbalancer interface {
        // Pick is used to select an instance according to discovery result
        Pick(discovery.Result) discovery.Instance

        // Rebalance is used to refresh the cache of load balance's information
        Rebalance(discovery.Result)

        // Delete is used to delete the cache of load balance's information when it is expired
        Delete(string)

        // Name returns the name of the Loadbalancer.
        Name() string
    }

```

### 集成到Hertz

通过使用 Hertz 提供的 Discovery 中间件，指定自定义的服务发现扩展的同时也可以使用 `sd.WithLoadBalanceOptions` 指定自定义负载均衡扩展。

```go
    cli, err := client.NewClient()
    if err != nil {
        panic(err)
    }
    r := nacos_demo.NewNacosResolver()
    cli.Use(sd.Discovery(r),sd.WithLoadBalanceOptions(***,***))
```
