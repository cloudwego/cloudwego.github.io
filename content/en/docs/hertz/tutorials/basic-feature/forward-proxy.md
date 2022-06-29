---
title: "Forward Proxy"
date: 2022-05-23
weight: 9
description: >

---

## What is forward proxy

A forward proxy is a special network service that allows a network terminal (usually a client) to make a non-direct connection with another network terminal (usually a server) through this service. Some network devices such as gateways and routers have network proxy functions. Proxy services are generally considered to be beneficial to safeguard the privacy or security of network terminals and prevent attacks.

A complete proxy request process is that the client first creates a connection to the proxy server, and then requests to create a connection to the target server, or to obtain the specified resources of the target server, according to the proxy protocol used by the proxy server.

## Interface

```go
// Proxy struct, which selects the proxy uri to access based on the request
type Proxy func(*protocol.Request) (*protocol.URI, error)

// ProxyURI is used to generate a Proxy that only returns a fixed proxy uri
func ProxyURI(fixedURI *protocol.URI) Proxy

// SetProxy is used to set the proxy of the client, after setting, the client will build concatenated requests with the proxy
func (c *Client) SetProxy(p protocol.Proxy)
```

## Example

```go
package main

import (
   "context"

   "github.com/cloudwego/hertz/pkg/app/client"
   "github.com/cloudwego/hertz/pkg/protocol"
)

func main() {
   proxyURL := "http://<__user_name__>:<__password__>@<__proxy_addr__>:<__proxy_port__>"

   // Convert the proxy uri to *protocol.URI
   parsedProxyURL := protocol.ParseURI(proxyURL)

   c, err := client.NewClient()
   if err != nil {
      return
   }

   // Set proxy
   c.SetProxy(protocol.ProxyURI(parsedProxyURL))

   upstreamURL := "http://google.com"
   _, body, _ := client.Get(context.Background(), nil, upstreamURL)
}
```
