---
title: "Warming Up"
linkTitle: "Warming Up"
weight: 6
description: By warming up the Kite client, we can avoid large delays in the first request.
---

## Introduction

Kitex v0.3.0 supports Client warm-up, which can pre-initialize the relevant components of Service Discovery and connection pool when creating a Client to avoid large delays in the first request.

## How to Use

### New API since v0.3.0

The option for `NewClient`:

```go
client.WithWarmingUp(w *warmup.ClientOption) Option
```

Where `warmup.ClientOption` is the struct introduced by package `pkg/warmup` since version v0.3.0:

```go
// ClientOption controls the warming up of a client.
type ClientOption struct {
    ErrorHandling
    ResolverOption *ResolverOption
    PoolOption     *PoolOption
}
```

```go
// ErrorHandling controls how to handle error
type ErrorHandling int

// ErrorHandling .
const (
    IgnoreError ErrorHandling = iota
    WarningLog
    ErrorLog
    FailFast // fail if any error occurs.
)

// ResolverOption controls the warming up of service discovery.
type ResolverOption struct {
    Dests []*rpcinfo.EndpointBasicInfo
}

// PoolOption controls the warming up of connection pools.
type PoolOption struct {
    Targets  map[string][]string // Network => addresses; if nil, use the result of service discovery
    ConnNum  int                 // Connection numbers for each address
    Parallel int                 // If greater than zero, build connections in `Parallel` goroutines.
}
```

### Common Usage

#### Perform Service Discovery when creating client

```go
cli, err := myservice.NewClient(psm, client.WithWarmingUp(&warmup.ClientOption{
    ResolverOption: &warmup.ResolverOption{
        Dests: []*rpcinfo.EndpointBasicInfo{
            &rpcinfo.EndpointBasicInfo{
                ServiceName: psm,
                Tags: map[string]string{
                    "cluster": "default",
                    // "env": "xxx"
                },
            },
        },
    },
}))
```

#### Initialize the connection pool when creating a client, and establish two connections for each downstream instance

```go
cli, err := myservice.NewClient(psm, client.WithWarmingUp(&warmup.ClientOption{
    PoolOption: &warmup.PoolOption{
        ConnNum: 2,
    },
}))
```

## FAQ

### Q: Will it be re-warmed up after the downstream upgrade

No, it won't.
