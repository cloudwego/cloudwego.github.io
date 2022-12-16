---
title: "服务发现"
date: 2021-11-15
weight: 1
description: >
---

Kitex 已经通过社区开发者的支持，完成了 ETCD、ZooKeeper、Eureka、Consul、Nacos、Polaris 多种服务发现模式，当然也支持 DNS 解析以及 Static IP 直连访问模式，建立起了强大且完备的社区生态，供用户按需灵活选用。

比如 DNS Resolver, 适合使用 DNS 作为服务发现的场景， 常见的用于 [Kubernetes](https://kubernetes.io/) 集群。

更多服务发现组件参看扩展仓库：[registry-etcd](https://github.com/kitex-contrib/registry-etcd)、[registry-nacos](https://github.com/kitex-contrib/registry-nacos)、[registry-zookeeper](https://github.com/kitex-contrib/registry-zookeeper)、[polaris](https://github.com/kitex-contrib/polaris)、[registry-eureka](https://github.com/kitex-contrib/registry-eureka)、[registry-consul](https://github.com/kitex-contrib/registry-consul)、[registry-servicecomb](https://github.com/kitex-contrib/registry-servicecomb) 。

## 使用方式
以 DNS Resolver 为例
```go

import (
    ...
    dns "github.com/kitex-contrib/resolver-dns"
    "github.com/cloudwego/kitex/client"
    ...
)

func main() {
    ...
    client, err := echo.NewClient("echo", client.WithResolver(dns.NewDNSResolver()))
	if err != nil {
		log.Fatal(err)
	}
    ...
}
```
