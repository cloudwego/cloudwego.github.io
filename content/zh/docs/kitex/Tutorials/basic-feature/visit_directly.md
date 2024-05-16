---
title: "直连访问"
date: 2021-08-26
weight: 3
keywords: ["Kitex", "直连访问", "URL", "DNS"]
description: 在明确要访问某个下游地址时，Kitex 可以选择直连访问的方式，不需要经过服务发现。
---

## 指定 IP 和 Port 进行调用

在进行调用时，可以通过 `callopt.WithHostPort` 指定，支持两种参数:

- 普通 IP 地址，形式为 "host:port"，支持 IPv6
- sock 文件地址，通过 UDS (Unix Domain Socket) 通信

```go
import "github.com/cloudwego/kitex/client/callopt"
...
resp, err := cli.Echo(context.Background(), req, callopt.WithHostPort("127.0.0.1:8888"))
if err != nil {
   log.Fatal(err)
}

```

## 指定 URL 进行调用

在进行调用时，可以通过 `callopt.WithURL` 指定，通过该 option 指定的 URL，会经过默认的 DNS resolver 解析后拿到 host 和 port，此时其等效于 `callopt.WithHostPort`。

```go
import "github.com/cloudwego/kitex/client/callopt"
...
url := callopt.WithURL("http://myserverdomain.com:8888")
resp, err := cli.Echo(context.Background(), req, url)
if err != nil {
   log.Fatal(err)
}
```

## 自定义 DNS resolver

此外也可以自定义 DNS resolver

resolver 定义如下 (pkg/http)：

```go
type Resolver interface {
   Resolve(string) (string, error)
}
```

参数为 URL，返回值为访问的 server 的 "host:port"。

通过 `client.WithHTTPResolver` 指定用于 DNS 解析的 resolver。

```go
import "github.com/cloudwego/kitex/client/callopt"
...
dr := client.WithHTTPResolver(myResolver)
cli, err := echo.NewClient("echo", dr)
if err != nil {
   log.Fatal(err)
}
```
