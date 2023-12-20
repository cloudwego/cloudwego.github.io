---
title: "extension"
date: 2023-12-20
weight: 10
keywords: ["Service Discovery"]
description: "Service Registration and Discovery extension provided by Kitex."
---

## Registry

Kitex supports user-defined registration module. Users can extend and integrate other registration centers by themselves. This extension is defined under pkg/registry.

### Extension API and Definition of Info Struct

- Extension API

```go
// Registry is extension interface of service registry.
type Registry interface {
	Register(info *Info) error
	Deregister(info *Info) error
}
```

- Definition of Info Struct
  Kitex defines some registration information. Users can also expand the registration information into tags as needed.

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

### Integrate into Kitex

Specify your own registration module and customized registration information through `option`. Note that registration requires service information, which is also specified through option.

- Specify Server Info

  option: `WithServerBasicInfo`

  ```go
  ebi := &rpcinfo.EndpointBasicInfo{
  		ServiceName: "yourServiceName",
  		Tags:        make(map[string]string),
  }
  ebi.Tags[idc] = "xxx"
  
  svr := xxxservice.NewServer(handler, server.WithServerBasicInfo(ebi))
  ```

- Specify Custom Registion module

  option: `WithRegistry`

  ```go
  svr := xxxservice.NewServer(handler, server.WithServerBasicInfo(ebi), server.WithRegistry(yourRegistry))
  ```

- Custom RegistryInfo

  Kitex sets ServiceName, Addr and PayloadCodec by default. If other registration information is required, you need to inject it by yourself. option: `WithRegistryInfo`.

  ```go
  svr := xxxservice.NewServer(handler, server.WithRegistry(yourRegistry), server.WithRegistryInfo(yourRegistryInfo))
  ```

## Resolver

[kitex-contrib](https://github.com/kitex-contrib/resolver-dns) has provided multiple service discovery extensions: DNS, ETCD, ZooKeeper, Eureka, Consul, Nacos, Polaris.

If you want to adopt other service discovery protocol, you can implement the `Resolver` interface, and clients can inject it by `WithResolver` Option.

## Interface Definition

The interface is defined in `pkg/discovery/discovery.go` and is defined as follows:

```go
type Resolver interface {
    Target(ctx context.Context, target rpcinfo.EndpointInfo) string
    Resolve(ctx context.Context, key string) (Result, error)
    Diff(key string, prev, next Result) (Change, bool)
    Name() string
}

type Result struct {
    Cacheable bool // if can be cached
    CacheKey  string // the unique key of cached result
    Instances []Instance // the result of service discovery
}

// the diff result
type Change struct {
    Result  Result
    Added   []Instance
    Updated []Instance
    Removed []Instance
}
```

`Resolver` interface detail:

- `Resolve`: as the core method of `Resolver`, it obtains the service discovery result from target key
- `Target`:   it resolves the unique target endpoint that from the downstream endpoints provided by `Resolve`, and the result will be used as the unique key of the cache
- `Diff`:  it is used to compare  the discovery results with the last time. The differences in results are used to notify other components, such as [loadbalancer](../../service-governance/loadbalance) and circuitbreaker, etc
- `Name`:  it is used to specify a unique name for `Resolver`, and will use it to cache and reuse `Resolver`

## Usage Example

You need to implement the the `Resolver` interface, and using it by Option:

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

## Attention

To improve performance,  Kitex reusing `Resolver`, so the `Resolver` method implementation must be concurrent security.
