---
title: "流量治理"
date: 2024-02-29
weight: 9
keywords: [ "Kitex", "治理特性", "流量治理", "OpenSergo", "Sentinel" ]
description: "Kitex 支持 OpenSergo 规范，集成 Sentinel 使用指南。"
---

Kitex 提供了 [kitex-contrib/opensergo](https://github.com/kitex-contrib/opensergo) 拓展来支持 OpenSergo 服务治理规范，并支持快速集成 Sentinel。

## 安装

```shell
go get github.com/kitex-contrib/opensergo
```

## 元信息

OpenSergo 拓展支持向 OpenSergo 管理控制面板上报服务的元信息。

### 用法

1. 在使用之前，你需要有一个运行中的 opensergo-dashboard 实例作为管理控制面板，可以按照 [opensergo-dashboard](https://github.com/opensergo/opensergo-dashboard) 说明来启动一个实例。

2. 配置服务治理访问信息，将下面的环境变量加入到您的环境中：

    ```shell
    export OPENSERGO_BOOTSTRAP_CONFIG='{"endpoint":"127.0.0.1:9090"}'
    ```

3. 添加一个 Hook，在服务启动时上报服务的元信息：

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
        // 注册启动钩子，在服务启动时上报服务的元信息
        server.RegisterStartHook(func() {
            if err = r.ReportMetaInfo(svr.GetServiceInfo()); err != nil {
                klog.Error(err)
            }
        })
        ...
    }
    ```

## Sentinel

OpenSergo 拓展提供了 Sentinel 适配器，可以快速集成 [Sentinel](https://sentinelguard.io/zh-cn/docs/golang/quick-start.html)。

### 示例

#### 服务端

通过 `SentinelServerMiddleware` 来创建 Sentinel Server 中间件，集成到 Kitex：

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

#### 客户端

通过 `SentinelClientMiddleware` 来创建 Sentinel Client 中间件，集成到 Kitex：

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

可以在创建 Sentinel 中间件的时候添加 Option 来定制中间件，这些 Option 在服务端与客户端的用法是一致的，下文代码以服务端举例。

#### WithResourceExtract

默认情况下，资源名称格式为 `{ServiceName}:{MethodName}`，你可以使用 `WithResourceExtractor` 来自定义资源名称，来实现更精确地定义和控制不同资源的流量策略。示例如下：

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

`WithBlockFallback` 用于设置请求被阻断时的自定义回调函数，你可以通过请求、响应以及阻塞异常信息来打印错误日志等，也可以通过回调进行自定义错误处理。示例如下：

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

## 示例代码

完整用法示例详见 [example](https://github.com/kitex-contrib/opensergo/tree/main/example) 。
