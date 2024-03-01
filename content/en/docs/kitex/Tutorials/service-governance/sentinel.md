---
title: "Traffic Governance"
date: 2024-02-29
weight: 9
keywords: [ "Kitex", "Service Governance", "Traffic Governance", "OpenSergo", "Sentinel" ]
description: "Kitex supports the OpenSergo specification and includes a guide for integrating Sentinel."
---

Kitex provides the [kitex-contrib/opensergo](https://github.com/kitex-contrib/opensergo) extension to support the OpenSergo Service Governance specification and to support rapid integration of Sentinel.

## Installation

```shell
go get github.com/kitex-contrib/opensergo
```

## MetaInfo

The OpenSergo extension supports reporting meta information about the service to the OpenSergo management dashboard.

### Usage

1. Before using, you need a running instance of the opensergo-dashboard as the management dashboard, which you can start following the instructions at [opensergo-dashboard](https://github.com/opensergo/opensergo-dashboard).

2. Configure service governance access information by adding the following environment variable to your environment:

    ```shell
    export OPENSERGO_BOOTSTRAP_CONFIG='{"endpoint":"127.0.0.1:9090"}'
    ```

3. Add a Hook to report service meta information upon service startup:

    ```go
    package main

    import (
        ...
        "github.com/cloudwego/kitex/server"
        "github.com/kitex-contrib/opensergo/metainfo"
        ...
    )

    func main() {
        ...
        r, err := metainfo.NewDefaultMetaReporter()
        if err != nil {
            panic(err)
        }
        svr := hello.NewServer(
            new(HelloImpl),
        )
        // Register a startup hook to report service meta information at service startup
        server.RegisterStartHook(func() {
            if err = r.ReportMetaInfo(svr.GetServiceInfo()); err != nil {
                klog.Error(err)
            }
        })
        ...
    }
    ```

## Sentinel

The OpenSergo extension offers a Sentinel adapter, allowing for quick integration of [Sentinel](https://sentinelguard.io/en-us/docs/introduction.html).

### Example

#### Server side

Create a Sentinel Server middleware using `SentinelServerMiddleware` and integrate it with Kitex:

```go
import (
    ...
    "github.com/cloudwego/kitex/server"
    "github.com/kitex-contrib/opensergo/sentinel"
    ...
)

func main() {
    ...
    srv := hello.NewServer(
        new(HelloImpl),
        server.WithServerBasicInfo(&rpcinfo.EndpointBasicInfo{ServiceName: "hello"}),
        server.WithMiddleware(sentinel.SentinelServerMiddleware()),
    )
    ...
}
```

#### Client side

Create a Sentinel Client middleware using `SentinelClientMiddleware` and integrate it with Kitex:

```go
import (
    ...
    "github.com/cloudwego/kitex/client"
    "github.com/kitex-contrib/opensergo/sentinel"
    ...
)

func main() {
    ...
    c, err := hello.NewClient(
        "hello",
        client.WithMiddleware(sentinel.SentinelClientMiddleware()),
    )
    ...
}
```

### Options

You can add Options when creating the Sentinel middleware to customize it, with consistent usage on both server and client sides. An example for the server side is shown below.

#### WithResourceExtract

By default, the resource name format is `{ServiceName}:{MethodName}`. You can use `WithResourceExtractor` to customize the resource name for defining and controlling traffic policies more precisely. Example:

```go
srv := hello.NewServer(
    new(HelloImpl),
    server.WithServerBasicInfo(&rpcinfo.EndpointBasicInfo{ServiceName: "hello"}),
    server.WithMiddleware(sentinel.SentinelServerMiddleware(
        sentinel.WithResourceExtract(func(ctx context.Context, req, resp interface{}) string {
            return "resource_test"
        }),
    )),
)
```

#### WithBlockFallBack

`WithBlockFallback` is used to set a custom callback function when a request is blocked. You can print error logs etc., based on request, response, and block error information, or handle errors customly through the callback. Example:

```go
srv := hello.NewServer(
    new(HelloImpl),
    server.WithServerBasicInfo(&rpcinfo.EndpointBasicInfo{ServiceName: "hello"}),
    server.WithMiddleware(sentinel.SentinelServerMiddleware(
        sentinel.WithBlockFallback(func(ctx context.Context, req, resp interface{}, blockErr error) error {
            return errors.New(FakeErrorMsg)
        }),
    )),
)
```

## Example

See [example](https://github.com/kitex-contrib/opensergo/tree/main/example) for the complete usage example.
