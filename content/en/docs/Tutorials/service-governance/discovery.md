---
title: "Service Discovery"
date: 2021-11-15
weight: 1
description: >
---

Currently, only one service discovery extension is open-sourced: DNS Resolver.

DNS Resolver is suitable for the clusters where DNS is used as a service discovery, commonly used for [Kubernetes](https://kubernetes.io/) clusters.

Extended repository: [Extended Repository](https://github.com/kitex-contrib)

## Usage

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
