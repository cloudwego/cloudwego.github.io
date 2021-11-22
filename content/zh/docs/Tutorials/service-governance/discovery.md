---
title: "服务发现"
date: 2021-11-15
weight: 1
description: >
---

目前在 Kitex 的开源版本中，暂时只提供了一种服务发现的扩展支持 : DNS Resolver, 适合使用 DNS 作为服务发现的场景， 常见的用于 [Kubernetes](https://kubernetes.io/) 集群。
扩展库：[扩展仓库](https://github.com/kitex-contrib)

## 使用方式

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