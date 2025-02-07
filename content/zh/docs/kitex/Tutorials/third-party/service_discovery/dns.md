---
title: "DNS"
date: 2023-11-30
weight: 9
keywords: ["服务注册与发现", "DNS"]
description: "Kitex 提供了服务发现 DNS 扩展"
---

## 如何使用

一些应用使用 DNS 作服务发现，例如 Kubernetes。

示例代码：

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
