---
title: "Service Registration and Service Discovery Extensions"
date: 2022-08-14
weight: 3
keywords:
  [
    "Service Registration and Service Discovery Extensions",
    "Service Registration Extension",
    "Service Discovery Extension",
    "Load Balancing Extension",
  ]
description: "Service Registration and Service Discovery Extensions provided by Hertz."
---

## Service Registration Extension

Hertz supports custom registration extensions, you can extend it to integrate other registries, which are defined under pkg/app/server/registry.

### Interface and Info Definition

- Interface Definition

```go
// Registry is extension interface of service registry.
type Registry interface {
	Register(info *Info) error
	Deregister(info *Info) error
}
```

- Info Definition

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

### Work with Hertz

- Specify your own registration extensions and custom registration information via `server.WithRegistry`.

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

## Service Discovery Extension

### Interface Definition

Hertz supports custom discovery extensions, you can extend it to integrate other registries, which are defined under pkg/app/server/discovery.

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
    CacheKey  string // Unique key for cache
    Instances []Instance // Service discovery result
}
```

`Resolver` is defined as follows:

- `Resolve`: Core function of `Resolver`, get the service discovery `Result` we need from the target key.
- `Target`: The unique target to be used by `Resolve` is resolved from the peer TargetInfo provided by Hertz, and this target is used as the unique key for the cache.
- `Name`: This is used to specify a unique name for the Resolver, and is used by Hertz to cache and reuse the Resolver.

### Work with Hertz

Specify custom service discovery extensions by using the Discovery middleware provided by Hertz.

```go
    cli, err := client.NewClient()
    if err != nil {
        panic(err)
    }
    r := nacos_demo.NewNacosResolver()
    cli.Use(sd.Discovery(r))
```

### Note

- We improve performance by reusing Resolver in a way that requires the Resolver method implementation to be concurrency-safe.

## Load Balancing Extension

Hertz provides a WeightedRandom load balancing implementation by default, and also supports a custom load balancing implementation defined under pkg/app/client/loadbalance.

### Interface Definition

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

### Work with Hertz

By using the Discovery middleware provided by Hertz, custom service discovery extensions can be specified along with custom load balancing extensions using `sd.WithLoadBalanceOptions`.

```go
    cli, err := client.NewClient()
    if err != nil {
        panic(err)
    }
    r := nacos_demo.NewNacosResolver()
    cli.Use(sd.Discovery(r, sd.WithLoadBalanceOptions(***,***)))
```
