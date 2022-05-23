---
title: "正向代理"
date: 2022-05-23
weight: 8
description: >

---

## 何为正向代理

正向代理是一种特殊的网络服务，允许一个网络终端（一般为客户端）通过这个服务与另一个网络终端（一般为服务器）进行非直接的连接。一些网关、路由器等网络设备具备网络代理功能。一般认为代理服务有利于保障网络终端的隐私或安全，防止攻击。

一个完整的代理请求过程为：客户端（Client）首先与代理服务器创建连接，接着根据代理服务器所使用的代理协议，请求对目标服务器创建连接、或者获得目标服务器的指定资源。

## 接口

```go
// Proxy 结构体，根据 request 来选定访问的代理 uri
type Proxy func(*protocol.Request) (*protocol.URI, error)

// ProxyURI 用来生成只会返回固定代理 uri 的 Proxy
func ProxyURI(fixedURI *protocol.URI) Proxy

// SetProxy 用来设置 client 的 proxy，设置后 client 会与 proxy 建连发请求
func (c *Client) SetProxy(p protocol.Proxy)
```

## 例子

```go
package main

import (
   "context"

   "github.com/cloudwego/hertz/pkg/app/client"
   "github.com/cloudwego/hertz/pkg/protocol"
)

func main() {
   proxyURL := "http://<__user_name__>:<__password__>@<__proxy_addr__>:<__proxy_port__>"

   // 将代理的 uri 转成 *protocol.URI 的形式
   parsedProxyURL := protocol.ParseURI(proxyURL)

   c, err := client.NewClient()
   if err != nil {
      return
   }

   // 设置代理
   c.SetProxy(protocol.ProxyURI(parsedProxyURL))

   upstreamURL := "http://google.com"
   _, body, _ := client.Get(context.Background(), nil, upstreamURL)
}
```
