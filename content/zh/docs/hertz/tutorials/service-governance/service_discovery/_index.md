---
title: "服务注册与发现"
date: 2023-04-22
weight: 1
keywords:
  [
    "服务注册与发现",
    "nacos",
    "consul",
    "etcd",
    "eureka",
    "polaris",
    "servicecomb",
    "zookeeper",
    "redis",
  ]
description: "Hertz 提供的服务注册与发现拓展。"
---

目前在 Hertz 的开源版本支持的服务发现拓展都存放在 [registry](https://github.com/hertz-contrib/registry) 中，欢迎大家参与项目贡献与维护。

到现在为止，支持的服务发现拓展有

- [nacos](https://github.com/hertz-contrib/registry/tree/main/nacos)
- [consul](https://github.com/hertz-contrib/registry/tree/main/consul)
- [etcd](https://github.com/hertz-contrib/registry/tree/main/etcd)
- [eureka](https://github.com/hertz-contrib/registry/tree/main/eureka)
- [polaris](https://github.com/hertz-contrib/registry/tree/main/polaris)
- [servicecomb](https://github.com/hertz-contrib/registry/tree/main/servicecomb)
- [zookeeper](https://github.com/hertz-contrib/registry/tree/main/zookeeper)
- [redis](https://github.com/hertz-contrib/registry/tree/main/redis)

## 配置

使用服务发现时会提供一些可选配置给用户。

| 配置                   | 描述                                                     |
| ---------------------- | -------------------------------------------------------- |
| WithSD                 | 配合服务发现使用，传递 `true` 时，本次请求使用服务发现。 |
| WithTag                | 配合服务发现使用，设置 Tag 信息。                        |
| WithCustomizedAddrs    | 自定义目标实例地址。                                     |
| WithLoadBalanceOptions | 配置负载均衡选项。                                       |

### WithSD

提供 `WithSD` 配置项，传入参数为 true 时，本次请求使用服务发现。使用服务发现请求时必须使用 `WithSD` 配置项。

函数签名：

```go
func WithSD(b bool) RequestOption
```

示例代码：

```go
status, body, err := cli.Get(context.Background(), nil, "http://hertz.test.demo/ping", config.WithSD(true))
```

### WithTag

提供 `WithTag` 配置项，使用此配置用于设置 Tag 信息。

函数签名：

```go
func WithTag(k, v string) RequestOption
```

示例代码：

```go
status, body, err := cli.Get(context.Background(), nil, "http://hertz.test.demo/ping", config.WithTag("foo", "var"))
```

### WithCustomizedAddrs

`WithCustomizedAddrs`配置项指定服务发现时的目标实例地址。它将会覆盖来自 `Resolver` 的结果。`Resolver` 是服务发现中心，用于服务发现。

函数签名：

```go
func WithCustomizedAddrs(addrs ...string) ServiceDiscoveryOption
```

示例代码：

```go
cli.Use(sd.Discovery(r, sd.WithCustomizedAddrs("127.0.0.1:8088")))
```

### WithLoadBalanceOptions

`WithLoadBalanceOptions`为客户端配置负载均衡实现和负载均衡参数。可以通过传递`loadbalance.Options`配置负载均衡参数，或者通过传递`loadbalance.DefaultOpts`使用默认负载均衡参数。若不使用此配置项，则客户端默认使用 WeightedRandom 负载均衡实现并且使用默认负载均衡参数。

可以设置的负载均衡参数：

| 负载均衡参数名  | 负载均衡参数默认值 | 描述               |
| --------------- | ------------------ | ------------------ |
| RefreshInterval | 5秒                | 刷新服务端信息间隔 |
| ExpireInterval  | 15秒               | 服务端信息过期间隔 |

函数签名：

```go
func WithLoadBalanceOptions(lb loadbalance.Loadbalancer, options loadbalance.Options) ServiceDiscoveryOption
```

示例代码：

```go
cli.Use(sd.Discovery(r, sd.WithLoadBalanceOptions(loadbalance.NewWeightedBalancer(), loadbalance.Options{
	RefreshInterval: 5 * time.Second,
	ExpireInterval:  15 * time.Second,
})))
```

自定义负载均衡扩展详见[负载均衡扩展](/zh/docs/hertz/tutorials/framework-exten/service_discovery/#负载均衡扩展)。
