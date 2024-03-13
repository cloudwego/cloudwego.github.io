---
title: "单 Server 多 Service"
date: 2023-03-05
weight: 10
keywords: ["Kitex", "多 Service", "单 Server 多 Service", "gRPC", "thrift", "protobuf"]
description: Kitex 支持在一个 Server 上注册多个 Service 。
---
## 介绍
从 Kitex v0.8.0 开始，支持在单个 Server 上注册多个 Service 。

目前，该功能适用于：
- gRPC 传输协议，包括基于 HTTP2 的 Thrift Streaming (也基于 gRPC ) (>= v0.8.0)
- Kitex Thrift 和 Protobuf (non-streaming) (>= v0.9.0)


## 使用方法

### 客户端用户

如果您是客户端用户并使用多业务功能，请按照以下说明操作：

1. 将客户端升级到 Kitex 版本 >= v0.9.0
2. 使用 TTHeader 作为传输协议`client.WithTransportProtocol(transport.TTHeader)`
3. 在客户端添加以下选项：`client.WithMetaHandler(transmeta.ClientTTHeaderHandler())`

### 服务器端用户
#### 准备工作
请使用 Kitex 命令工具 (>= v0.9.0) 为每个 Service 生成代码。更多详情，请参考[代码生成工具](/docs/kitex/tutorials/code-gen/code_generation/)。

（注：对于使用 gRPC 多服务功能的用户，从 v0.8.0 版本开始，服务注册方面的使用方法略有变化，请升级您的 Kitex 命令工具至 v0.9.0+。更多详情，请参阅“创建 Server 并在 Server 上注册您的 Service”部分。）

代码生成的结果如下所示：

```text
kitex_gen
    |_ api
        |_ servicea
            |_ client.go
            |_ invoker.go
            |_ server.go
            |_ servicea.go
        |_ serviceb
            |_ client.go
            |_ invoker.go
            |_ server.go
            |_ serviceb.go
        |_ ...
```
您可以在每个 Service 的`server.go`中看到`RegisterService`函数。
```golang
func RegisterService(svr server.Server, handler XXX, opts ...server.RegisterOption) error {
   if err := svr.RegisterService(serviceInfo(), handler, opts...); err != nil {
      return err
   }
   return nil
}
```

### 创建 Server 并在 Server 上注册您的 Service 
在 Server 上注册 Service 是一个简单的过程。

首先，创建一台 Server 。然后，通过在您生成的代码中调用`RegisterService`函数，即可注册 Service 。

可以在同一台 Server 上调用多个 Service ，根据需要注册任意多个 Service 。

```golang
package main

import (
   "github.com/cloudwego/kitex/pkg/server"
   
    servicea "your_servicea_kitex_gen_path"
    serviceb "your_serviceb_kitex_gen_path"
)   

func main() {
    // 通过调用 server.NewServer 创建 Server 
    svr := server.NewServer(your_server_option)
    // 在 Server 上注册多 Service
    err := servicea.RegisterService(svr, new(ServiceAImpl))
    err = serviceb.RegisterService(svr, new(ServiceBImpl))
    
    err = svr.Run()
    
    if err != nil {
       logs.Error("%s", err.Error())
    }
    logs.Stop()
}
```

### 备用 Service 
假设 Service 之间有相同的命名方法。

```thrift
// demo.thrift
namespace go api
struct Request {
1: string message
}

struct Response {
1: string message
}

service ServiceA {
Response sameNamedMethod(1: Request req)
}
service ServiceB {
Response sameNamedMethod(1: Request req)
}
```

在这种情况下，**请注意，您需要指定一个 Service 作为备用 Service（Fallback Service）。**

当客户端使用旧的 Kitex 版本 ( < v0.9.0 ) 时，备用 Service 用于维护兼容性
- 或者当`TTHeader`未用于传输协议时，
- 或者客户端没有设置可选的元处理程序`Transmeta.ClientTTHeaderHandler()`。

**如果未指定任何备用 Service 或指定了多个备用 Service ，则在 Server 启动时将返回错误。**

请注意，您只能将一个 Service 指定为备用 Service 。

生成代码(`server.go`)中的`RegisterService()`有一个可选参数：`server.RegisterOption`。
如果传入`server.WithFallback Service`选项，则该 Service 将注册为备用 Service 。

```golang
func main() {
    // 通过调用 server.NewServer 创建 Server 
    svr := server.NewServer(your_server_option)
    // 在 Server 上注册多 Service 
    // servicea 将成为备用 Service 
    servicea.RegisterService(svr, new(ServiceAImpl), server.WithFallbackService())
    serviceb.RegisterService(svr, new(ServiceBImpl))
    
    err := svr.Run()
    if err != nil {
        logs.Error("%s", err.Error())
    }
    logs.Stop()
}
```

另一种避免 Server 启动错误而不指定备用 Service 的方法是使用`server.WithRefuseTrafficWithoutServiceName`选项。

使用此选项，即使您没有为名称冲突的方法指定备用 Service ，启动 Server 时也不会返回错误。

但在使用此选项时，必须注意以下事项：

当`server.WithRefuseTrafficWithoutServiceName`选项启用时，如果 Server 在以下情况下收到请求，
则会出现错误消息：“no service name while the server has WithRefuseTrafficWithoutServiceName option enabled”

1. 客户端使用较旧的 Kitex 版本(<v0.9.0)，不支持多 Service 功能
2. 请求的传输协议不是 TTHeader ( Kitex pb 的传输协议默认启用 TTHeader )
3. 未设置客户端选项`client.WithMetaHandler(transmeta.ClientTTHeaderHandler())`

### 如何不回退到备用 Service（= 不依赖方法名称来查找服务）
在某些情况下，即使为服务之间具有相同名称的方法指定了备用Service，客户端的请求也可能旨在调用与备用Service不同的服务。

在这种情况下，请在客户端确保以下事项：

1. 将客户端升级到支持thrift & pb multi-service的Kitex版本（>= v0.9.0）
2. 使用 TTHeader 作为传输协议
3. 在客户端添加以下选项:`client.WithMetaHandler(transmeta.ClientTTHeaderHandler())`


## 获取ServiceName和MethodName 

- 服务名称

```go
idlService, ok := kitexutil.GetIDLServiceName(ctx)

```

- 方法名称

```go
method, ok := kitexutil.GetMethod(ctx)

```

## 中间件

一般来说和以前一样，只是在调用`NewServer`时需要添加选项:

```go
options = append(options, server.WithMiddleware(yourMiddleware))
svr := server.NewServer(options...)

```
您可以通过之前在中间件中显示的用法来区分每个服务/方法。

### 区分流式/非流式方法 
确定请求是否具有流式处理底层协议的推荐方法是检查请求/响应参数的类型：

|                                     | **客户端中间件**                                                                                        | **服务端中间件**                                                                                                                                                                                          |
|-------------------------------------|--------------------------------------------------------------------------------------------------------------|----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| **Bidirectional**<br/>**(gRPC)**    | - request: `interface{}` = nil <br/>- response: *streaming.Result                                            | - request: *streaming.Args<br/>- response: `interface{}` = nil                                                                                                                                                 |
| **Client Streaming**<br/>**(gRPC)** | - request: interface{} = nil <br/>- response: *streaming.Result                                              | - request: *streaming.Args<br/>- response: `interface{}` = nil                                                                                                                                                 |
| **Server Streaming**<br/>**(gRPC)** | - request: `interface{}` = nil <br/>- response: *streaming.Result                                            | - request: *streaming.Args<br/>- response: `interface{}` = nil                                                                                                                                                 |
| **Unary (gRPC)**                    | - request: *kitex_gen/some_pkg.${svc}${method}Args<br/>- response: *kitex_gen/some_pkg.${svc}${method}Result | - request: *streaming.Args<br/>- response: `interface{}` = nil<br/>Note: the option provided in v1.15.0 (to be released soon): `server.WithCompatibleMiddlewareForUnary()` makes it the same with PingPong API |
| **PingPong API (KitexPB)**          | - request: *kitex_gen/some_pkg.${svc}${method}Args<br/>- response: *kitex_gen/some_pkg.${svc}${method}Result | - request: *kitex_gen/some_pkg.${svc}${method}Args<br/>- response: *kitex_gen/some_pkg.${svc}${method}Result                                                                                                   |

**注意:**
Kitex 服务器支持对传入请求的自动检测，对于 gRPC/Protobuf Unary 方法，它同时接受 gRPC 请求和 KitexProtobuf(TTHeader + Pure Protobuf Payload) 请求, 因此 **仅依靠 RPCInfo 中的方法名称可能并不准确**。

#### 客户端中间件示例 

**客户端** 中间件应依赖于`resp`类型:

```go
func clientMWForIdentifyStreamingRequests(next endpoint.Endpoint) endpoint.Endpoint {
    return func(ctx context.Context, req, resp interface{}) (err error) {
        if _, ok := resp.(*streaming.Result); ok {
            // it's a streaming request
            return next(ctx, req, resp)
        } else {
            // it's a non-streaming request
            return next(ctx, req, resp)
        }
    }
}

```

#### 服务端中间件示例 

**服务端** 中间件应依赖于`req`类型:

```go
func serverMWForIdentifyStreamingRequests(next endpoint.Endpoint) endpoint.Endpoint {
    return func(ctx context.Context, req, resp interface{}) (err error) {
        if _, ok := req.(*streaming.Args); ok {
            // it's a streaming request
            return next(ctx, req, resp)
        } else {
            // it's a non-streaming request
            return next(ctx, req, resp)
        }
    }
}

```


## 常见问题解答
### 1.单 Server 多 Service 和 Combine Service 有什么区别？
- Combine Service（通过生成带有 `-combine-service` 标志的代码，将多个 Service 合并成一个统一的 Service 形成的 Service）
  - 所有 Service（Combine Service 和被合并的每个 Service）的代码都会生成。
  - Service 的所有方法名称必须是唯一的。
  - 一个 Server 上只能注册一个 Service (即 combine service）。
  否则，您将收到一条错误消息，提示您“在注册 Combine Service 时只能注册一个 Service”。
- 单 Server 多 Service（即 Multiple Services，**更推荐使用**）
  - 每个 Service 的代码都会单独生成。
  - Service 之间的方法名称可以相同，但也有一些限制。请选一个解决方案：
    - 您需要为冲突的方法指定备用 Service（Fallback Service） 。
    - 创建 Server 时增加`server.WithRefuseTrafficWithoutServiceName`选项。
    并确保客户端使用的是 Kitex（版本 >= v0.9.0）， 且使用 TTHeader 协议，并设置`client.WithMetaHandler(transmeta.ClientTTHeaderHandler())`客户端选项。
### 2. Service 注册失败的原因？
  可能的原因如下：
  - 当您注册的 Service 之间具有相同名称的方法时，未指定备用 Service。请指定备用 Service 。
  - 您正在尝试在 Server 上同时注册 Combine Service 和其他 Service 。
  请注意，Combine Service 只能在 Server 上单独注册。如果您还想注册其他 Service ，则需要将这些 Service 合并到 Combine Service 中，或者在不使用 Combine Service 的情况下单独注册每个 Service 。
