---
title: "Call Option"
date: 2022-06-20
weight: 3
keywords: ["Kitex", "Call", "Option"]
description: Kitex Call Option 使用说明。
---

## 用法

客户端发起 RPC 调用时，额外添加一些 Option，优先级比 Client Option 高，会覆盖某些配置：

```go
resp, err := client.Call(ctx, req, callopt.WithXXX....)
```

## Option 说明

### IP 端口 - WithHostPort

```go
func WithHostPort(hostport string) Option
```

在本次调用阶段直接指定一个具体的 HostPort ，会覆盖掉 Resolver 的结果进行直接访问，详见[直连访问-指定 IP 和 Port 进行调用](/zh/docs/kitex/tutorials/basic-feature/visit_directly/)。

### 指定 URL - WithURL

```go
func WithURL(url string) Option
```

在本次调用阶段重新指定一个指定 URL 发起调用，详见[直连访问-指定 URL 进行调用](/zh/docs/kitex/tutorials/basic-feature/visit_directly/)。

### 添加标签 - WithTag

```go
func WithTag(key, val string) Option
```

为本次 RPC 调用设置一些 Tag 元信息，以 key-value 的形式添加，例如希望在元信息中加入 cluster、idc 等字段用来做服务治理，可以像下面这样写：

```go
resp, err := client.Call(ctx, req,callopt.WithTag("cluster", cluster),callopt.WithTag("idc", idc))
```

### 超时设置 - WithRPCTimeout

```go
func WithRPCTimeout(d time.Duration) Option
```

指定本次 RPC 调用的超时时间，详见[超时控制](/zh/docs/kitex/tutorials/service-governance/timeout/)。

### 超时设置 - WithConnectTimeout

```go
func WithConnectTimeout(d time.Duration) Option
```

为本次 RPC 调用设置连接超时时间，详见[超时控制](/zh/docs/kitex/tutorials/service-governance/timeout/)。

### HTTP Host 设置 - WithHTTPHost

```go
func WithHTTPHost(host string) Option
```

当使用 HTTP 连接的场景时，该 Option 会在 HTTP Header 中指定 Host 地址。
