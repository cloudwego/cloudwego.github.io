---
title: "Service Discovery"
date: 2021-11-15
weight: 1
keywords: ["Kitex", "Service Discovery", "Resolver"]
description: Kitex provides extensions for service registration and discovery, and already supports many popular registries.
---

Kitex has completed ETCD, ZooKeeper, Eureka, Consul, Nacos, Polaris multiple service discovery component through the support of community developers. Of course, it also supports DNS resolution and Static IP direct access mode. A strong and complete community ecology has been established for users to choose flexibly according to their needs.

For example, DNS Resolver is suitable for the clusters where DNS is used as a service discovery, commonly used for [Kubernetes](https://kubernetes.io/) clusters.

More service discovery components in extended repository: [registry-etcd](https://github.com/kitex-contrib/registry-etcd)、[registry-nacos](https://github.com/kitex-contrib/registry-nacos)、[registry-zookeeper](https://github.com/kitex-contrib/registry-zookeeper)、[polaris](https://github.com/kitex-contrib/polaris)、[registry-eureka](https://github.com/kitex-contrib/registry-eureka)、[registry-consul](https://github.com/kitex-contrib/registry-consul)、[registry-servicecomb](https://github.com/kitex-contrib/registry-servicecomb) .

## Usage
In the case of DNS Resolver
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
