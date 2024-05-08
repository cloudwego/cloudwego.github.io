---
title: "Call Option"
date: 2022-06-20
weight: 3
keywords: ["Kitex", "Call", "Option"]
description: Kitex Call Option instructions.
---

## Usage

When a client makes an RPC call, it adds an additional Option that takes precedence over client Option and overrides some configurations:

```go
resp, err := client.Call(ctx, req, callopt.WithXXX....)
```

## Options

### WithHostPort

```go
func WithHostPort(hostport string) Option
```

Specifying a specific HostPort directly during this call phase will overwrite the resolver result for direct access. [More](/docs/kitex/tutorials/basic-feature/visit_directly/)

### WithURL

```go
func WithURL(url string) Option
```

Specifying a specified URL during this call phase to initiate the call. [More](/docs/kitex/tutorials/basic-feature/visit_directly/)

### WithTag

```go
func WithTag(key, val string) Option
```

Set some meta information for this RPC call, add it in the form of key-value, for example, if you want to add fields such as cluster and idc to the meta information for service governance, you can write it like this:

```go
resp, err := client.Call(ctx, req,callopt.WithTag("cluster", cluster),callopt.WithTag("idc", idc))
```

### WithRPCTimeout

```go
func WithRPCTimeout(d time.Duration) Option
```

Set RPC timeout. [More](/docs/kitex/tutorials/service-governance/timeout/)

### WithConnectTimeout

```go
func WithConnectTimeout(d time.Duration) Option
```

Set connection timeout. [More](/docs/kitex/tutorials/service-governance/timeout/)

### WithHTTPHost

```go
func WithHTTPHost(host string) Option
```

When using HTTP connection, the Option specifies the Host address in the HTTP header.
