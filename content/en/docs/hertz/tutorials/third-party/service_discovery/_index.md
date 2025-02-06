---
title: "Service Registration and Discovery"
date: 2023-04-22
weight: 3
keywords:
  [
    "Service Registration and Discovery",
    "nacos",
    "consul",
    "etcd",
    "eureka",
    "polaris",
    "servicecomb",
    "zookeeper",
    "redis",
  ]
description: "Service Registration and Discovery Extensions provided by Hertz."
---

The service discovery extensions currently supported in the open source version of Hertz are stored in the [registry](https://github.com/hertz-contrib/registry). You are welcomed to join us in contributing and maintaining for this project.

As of now, the supported service discovery extensions are

- [nacos](https://github.com/hertz-contrib/registry/tree/main/nacos)
- [consul](https://github.com/hertz-contrib/registry/tree/main/consul)
- [etcd](https://github.com/hertz-contrib/registry/tree/main/etcd)
- [eureka](https://github.com/hertz-contrib/registry/tree/main/eureka)
- [polaris](https://github.com/hertz-contrib/registry/tree/main/polaris)
- [servicecomb](https://github.com/hertz-contrib/registry/tree/main/servicecomb)
- [zookeeper](https://github.com/hertz-contrib/registry/tree/main/zookeeper)
- [redis](https://github.com/hertz-contrib/registry/tree/main/redis)

## Configurations

Some optional configurations are provided to users when using service discovery.

| Configuration          | Description                                                                                            |
| ---------------------- | ------------------------------------------------------------------------------------------------------ |
| WithSD                 | Used in conjunction with service discovery, this request uses service discovery when `true` is passed. |
| WithTag                | Used in conjunction with service discovery to set Tag information.                                     |
| WithCustomizedAddrs    | Customize the address of the target instance.                                                          |
| WithLoadBalanceOptions | Configure load balancing options.                                                                      |

### WithSD

The `WithSD` configuration item is provided, and when the parameter is passed as true, this request uses service discovery. The `WithSD` configuration item must be used when using service discovery requests.
Signature:

```go
func WithSD(b bool) RequestOption
```

Sample code:

```go
status, body, err := cli.Get(context.Background(), nil, "http://hertz.test.demo/ping", config.WithSD(true))
```

### WithTag

Provides the `WithTag` configuration, which is used to set the Tag information.
Signature:

```go
func WithTag(k, v string) RequestOption
```

Sample code:

```go
status, body, err := cli.Get(context.Background(), nil, "http://hertz.test.demo/ping", config.WithTag("foo", "var"))
```

### WithCustomizedAddrs

This configuration item specifies the target instance address during service discovery. It will overwrite the result from `Resolver`. `Resolver` is a service discovery center for service discovery.

Signature:

```go
func WithCustomizedAddrs(addrs ...string) ServiceDiscoveryOption
```

Sample code:

```go
cli.Use(sd.Discovery(r, sd.WithCustomizedAddrs("127.0.0.1:8088")))
```

### WithLoadBalanceOptions

This configuration item can configure the load balancing algorithm and load balancing parameters for the client.

Signature:

```go
func WithLoadBalanceOptions(lb loadbalance.Loadbalancer, options loadbalance.Options) ServiceDiscoveryOption
```

Sample code:

```go
cli.Use(sd.Discovery(r, sd.WithLoadBalanceOptions(loadbalance.NewWeightedBalancer(), loadbalance.Options{
     RefreshInterval: 5 * time. Second,
     ExpireInterval: 15 * time. Second,
})))
```

Custom load-balance extensions are detailed in [Load Balancing Extensions](/docs/hertz/tutorials/framework-exten/service_discovery/#load-balancing-extension).
