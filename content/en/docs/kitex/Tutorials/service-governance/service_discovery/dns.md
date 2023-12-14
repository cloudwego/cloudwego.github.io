---
title: "DNS"
date: 2023-11-30
weight: 9
keywords: ["Service Discovery", "DNS"]
description: "Service Discovery DNS Extensions provided by Kitex."
---

## How To Use

Some application runtime use DNS as service discovery, e.g. Kubernetes.

Example:

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
