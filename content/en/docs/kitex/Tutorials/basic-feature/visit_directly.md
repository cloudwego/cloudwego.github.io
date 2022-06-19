---
title: "Visit Directly"
date: 2021-08-31
weight: 4
description: >
---

If you want to send the request to downstream that address determined, you can choose visiting directly without service discovery.

## Specify RPC Host and Port
You can use `callopt.WithHostPort` to specify host and port, supports two parameters:
- Normal IP address, in the form of `host:port`, support `IPv6`
- Sock file address, communicating with UDS (Unix Domain Socket)

```go
import "github.com/cloudwego/kitex/client/callopt"
...
resp, err := cli.Echo(context.Background(), req, callopt.WithHostPort("127.0.0.1:8888"))
if err != nil {
   log.Fatal(err)
}

```

## Specify RPC URL

You can use `callopt.WithURL` to specify a URL, which will be resolved by default DNS resolver to get host and port. It's functionally equal to `callopt.WithHostPort`.

```go
import "github.com/cloudwego/kitex/client/callopt"
...
url := callopt.WithURL("http://myserverdomain.com:8888")
resp, err := cli.Echo(context.Background(), req, url)
if err != nil {
	log.Fatal(err)
}
```

## Customized DNS resolver

You can also use your own DNS resolver

resolver interface(pkg/http)：

```go
type Resolver interface {
	Resolve(string) (string, error)
}
```

The only parameter is URL，return value should be "host:port".

You can use `client.WithHTTPResolver` to specify DNS resolver.

```go
import "github.com/cloudwego/kitex/client/callopt"
...
dr := client.WithHTTPResolver(myResolver)
cli, err := echo.NewClient("echo", dr)
if err != nil {
	log.Fatal(err)
}
```
