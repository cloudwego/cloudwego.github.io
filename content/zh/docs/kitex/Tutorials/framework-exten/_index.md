---
title: "框架扩展"
linkTitle: "框架扩展"
weight: 6
date: 2021-08-26
description: >

---

## 概述

Kitex 框架核心主要基于接口进行开发，而不受限于特定的组件。这为框架提供了很强的扩展能力，开发者可以根据具体需求，轻松集成各种第三方组件。

框架主要提供了两种基础的扩展方式：

1. Middleware 中间件：它可以在每个请求过程的前后对该请求相关的数据进行一定的操作与处理，来定制需要的功能；

2. Option 选项：它是框架提供的、数量有限的选项，每个选项都有其对应的拓展能力，各不相同。该章节会分别展开介绍常用的 Option，你也可以到 [Option](/zh/docs/kitex/tutorials/options/) 章节来查看所有的 Option 列表；

此外还有一种比较高级的拓展方式是增加 Suite 套件，Suite 是对于 Middleware 和 Option 的组合和封装，也就是添加一个 Suite 相当于添加了多个 Option 与 Middleware。

基于这些拓展能力，Kitex 也围绕微服务的生态，实现了很多常用组件的拓展，它们都被存放到了 [kitex-contrib](https://github.com/kitex-contrib) 下，开发者可以通过这些拓展直接接入对应的组件。

## 注册中心

Kitex 提供了统一的接口 Registry 与 Resolver，分别用于实现服务注册与服务发现能力。

目前已经对接了大部分业界主流的注册中心，并且提供了一些相关能力的拓展：

- [registry-etcd](https://github.com/kitex-contrib/registry-etcd) ：将 Etcd 注册中心集成到 Kitex。 
- [registry-consul](https://github.com/kitex-contrib/registry-consul) ：将 Consul 注册中心集成到 Kitex。 
- [registry-eureka](https://github.com/kitex-contrib/registry-eureka) ：将 Eureka 注册中心集成到 Kitex。 
- [registry-nacos](https://github.com/kitex-contrib/registry-nacos) ：将 Nacos 注册中心集成到 Kitex。 
- [registry-polaris](https://github.com/kitex-contrib/registry-polaris) ：将 Polaris 注册中心集成到 Kitex。 
- [registry-servicecomb](https://github.com/kitex-contrib/registry-servicecomb) ：将 ServiceComb 注册中心集成到 Kitex。 
- [registry-zookeeper](https://github.com/kitex-contrib/registry-zookeeper) ：将 Zookeeper 注册中心集成到 Kitex。 
- [resolver-dns](https://github.com/kitex-contrib/resolver-dns) ：基于 DNS 进行服务发现。
- [resolver-rule-based](https://github.com/kitex-contrib/resolver-rule-based) ：基于自定义规则进行服务发现。

## 配置中心

为了方便用户快速整合常用的微服务治理特性，Kitex 提供了很多配置中心拓展，开发者可以使用配置中心来动态的配置服务治理特性。

以下是框架已经实现的配置中心拓展：

- [config-consul](https://github.com/kitex-contrib/config-consul) ：将 Consul 配置中心集成到 Kitex。
- [config-nacos](https://github.com/kitex-contrib/config-nacos) ：将 Nacos 配置中心集成到 Kitex。
- [config-etcd](https://github.com/kitex-contrib/config-etcd) ：将 Etcd 配置中心集成到 Kitex。
- [config-apollo](https://github.com/kitex-contrib/config-apollo) ：将 Apollo 配置中心集成到 Kitex。
- [config-zookeeper](https://github.com/kitex-contrib/config-zookeeper) ：将 Zookeeper 配置中心集成到 Kitex。
- [config-file](https://github.com/kitex-contrib/config-file) ：基于本地文件进行动态配置。

## 可观测性

Kitex 提供了两个主要的接口来实现可观测性，为别有：1. Logger 用于实现日志；2. Tracer 用于实现指标监控与链路追踪。

作为微服务生态的重要特性，Kitex 也围绕可观测性各方面提供了对应的拓展：

- 日志：在日志方面，Kitex 默认提供且使用了基于 Go 标准库 log 开发的日志拓展，同时也提供了 Go 中主流的几个日志库 logrus、zap 与 slog 的日志拓展。

- 指标：Kitex 提供了基于 Prometheus 与 OpenTelemetry 的监控拓展。

- 链路追踪：Kitex 提供了基于 OpenTracing 与 OpenTelemetry 的链路追踪拓展

可观测性方面的拓展仓库有：

- [tracer-opentracing](https://github.com/kitex-contrib/tracer-opentracing) ：基于 OpenTracing 的链路追踪实现。
- [monitor-prometheus](https://github.com/kitex-contrib/monitor-prometheus) ：基于 Prometheus 的监控拓展。
- [obs-opentelemetry](https://github.com/kitex-contrib/obs-opentelemetry) ：基于 OpenTelemetry 的可观测性拓展，并提供基于 logrus、zap 与 slog 日志库的日志拓展。

## 其它

- [xds](https://github.com/kitex-contrib/xds) ：集成 xDS 模块，让 Kitex 服务以 Proxyless 的模式运行，被服务网格统一纳管。
- [opensergo](https://github.com/kitex-contrib/opensergo) ：支持 OpenSergo 服务治理规范，可以快速集成 Sentinel 进行流量治理。
- [codec-dubbo](https://github.com/kitex-contrib/codec-dubbo) ：Dubbo 编解码器，支持 Dubbo 协议编解码，可以与 Dubbo 框架互通。
- [loadbalance-tagging](https://github.com/kitex-contrib/loadbalance-tagging) ：基于标签的负载均衡策略，适用于有状态服务或多租户服务的场景。
