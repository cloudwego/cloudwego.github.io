---
title: "Forward Proxy and Reverse Proxy"
date: 2022-09-08
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

##  What is forward proxy

In computer networks, a reverse proxy is the application that sits in front of back-end applications and forwards client (e.g. browser) requests to those applications.

Reverse proxies help increase scalability, performance, resilience and security. The resources returned to the client appear as if they originated from the web server itself.

### Specific implementation

We provide the `SetXxx()` method for setting private properties
```go
type ReverseProxy struct {
    client *client.Client

    // target is set as a reverse proxy address
    target string

    // director must be a function which modifies the request
    // into a new request. Its response is then redirected
    // back to the original client unmodified.
    // director must not access the provided Request
    // after returning.
    director func (*protocol.Request)

    // modifyResponse is an optional function that modifies the
    // Response from the backend. It is called if the backend
    // returns a response at all, with any HTTP status code.
    // If the backend is unreachable, the optional errorHandler is
    // called without any call to modifyResponse.
    //
    // If modifyResponse returns an error, errorHandler is called
    // with its error value. If errorHandler is nil, its default
    // implementation is used.
    modifyResponse func(*protocol.Response) error

    // errorHandler is an optional function that handles errors
    // reaching the backend or errors from modifyResponse.
    // If nil, the default is to log the provided error and return
    // a 502 Status Bad Gateway response.
    errorHandler func(*app.RequestContext, error)
}

// NewSingleHostReverseProxy returns a new ReverseProxy that routes
// URLs to the scheme, host, and base path provided in target. If the
// target's path is "/base" and the incoming request was for "/dir",
// the target request will be for /base/dir.
// NewSingleHostReverseProxy does not rewrite the Host header.
// To rewrite Host headers, use ReverseProxy directly with a custom
// director policy.
func NewSingleHostReverseProxy(target string, opts ...config.Option) (*reverseProxy, error)
```

### Simple example

```go
package main

import (
	"context"

	"github.com/cloudwego/hertz/pkg/app"
	"github.com/cloudwego/hertz/pkg/app/server"
	"github.com/cloudwego/hertz/pkg/common/utils"
	"github.com/hertz-contrib/reverseproxy"
)

func main() {
	h := server.Default(server.WithHostPorts("127.0.0.1:8000"))
	// set target address
	proxy, err := reverseproxy.NewSingleHostReverseProxy("http://127.0.0.1:8000/proxy")
	if err != nil {
		panic(err)
	}
	h.GET("/proxy/backend", func(cc context.Context, c *app.RequestContext) {
		c.JSON(200, utils.H{
			"msg": "proxy success!!",
		})
	})

	h.GET("/backend", proxy.ServeHTTP)
	h.Spin()
}
```
### More Examples

As for usage, you may refer to hertz [example](https://github.com/cloudwego/hertz-examples/tree/main/reverseproxy)

