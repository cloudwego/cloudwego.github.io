---
title: "服务发现"
linkTitle: "服务发现"
weight: 1
date: 2023-11-30
keywords: ["服务注册与发现", "nacos", "consul", "etcd", "eureka", "polaris", "servicecomb", "zookeeper", "DNS"]
description: "Kitex 框架提供服务注册与发现的扩展，目前已经支持与业界主流注册中心对接。"
---

Kitex 已经通过社区开发者的支持，完成了多种服务发现模式，当然也支持 DNS 解析以及 Static IP 直连访问模式，建立起了强大且完备的社区生态，供用户按需灵活选用。

比如 DNS Resolver，适合使用 DNS 作为服务发现的场景， 常用于 [Kubernetes](https://kubernetes.io/) 集群。
