---
title: "配置中心"
linkTitle: "配置中心"
date: 2023-11-29
weight: 1
keywords: ["配置中心"]
description: "kitex-contrib 提供对配置中心的扩展"

---

## Kitex 对接配置中心

Kitex 提供了可动态配置的服务治理能力，包括客户端的超时、重试、熔断，以及服务端的限流。

kitex-contrib 提供了对于社区主流配置中心的拓展，实现了动态配置对接 kitex 治理特性。

微服务的开发者可以使用配置中心来动态获取服务治理配置，并且是准实时生效。

目前支持的配置中心有:

|  配置中心  |                               仓库                                |
|:---------:|:----------------------------------------------------------------:|
|   nacos   |  [config-nacos](https://github.com/kitex-contrib/config-nacos)   |
|   etcd    |  [config-etcd](https://github.com/kitex-contrib/config-etcd)     |
|   apollo  |  [config-apollo](https://github.com/kitex-contrib/config-apollo) |
|   file    |  [config-file](https://github.com/kitex-contrib/config-file)     |
| zookeeper |  [config-zookeepr](https://github.com/kitex-contrib/config-zookeeper) |

## Suite

在对接配置中心的过程中，使用了 Suite（套件）来进行第三方的拓展。

Suite 的定义如下:
```go
type Suite interface {
    Options() []Option
}
```
Server 端和 Client 端都是通过 WithSuite 这个方法来注入新的套件。

更多关于 Suite 的介绍请见 [Suite](../../framework-exten/suite)
