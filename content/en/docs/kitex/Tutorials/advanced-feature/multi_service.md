---
title: "Multiple Services"
date: 2024-03-05
weight: 10
keywords: ["Kitex", "Multi Services", "gRPC", "thrift", "protobuf"]
description: Kitex supports multiple service registration on a server.
---

## Introduction

Since Kitex v0.8.0, multiple service registrations on a single server are supported.

Currently, the feature is available for:

- gRPC transport protocol, including [Thrift Streaming over HTTP2](/docs/kitex/tutorials/basic-feature/protocol/transport-streaming/thrift_streaming/) (which is also based on gRPC) (>= v0.8.0)
- Kitex thrift & protobuf (non-streaming) (>= v0.9.0)

## Usage

### Client Side Users

If you are client-side users and using the multi-service feature, please follow the instructions below:

1. Upgrade the client to the Kitex version >= v0.9.0
2. For Kitex thrift & protobuf (non-streaming) APIs:
   1. Use TTHeader as the transport protocol `client.WithTransportProtocol(transport.TTHeader)`
   2. Add the following option on the client side: `client.WithMetaHandler(transmeta.ClientTTHeaderHandler)`

### Server Side Users

#### Preparation

Please generate code for each service using kitex command tool (>= v0.9.0). For more details, please refer to [Code Generation Tool](/docs/kitex/tutorials/code-gen/code_generation/).

(Note: For users utilizing the gRPC multi-service feature from v0.8.0 onwards, there have been some slight usage changes regarding service registration, so please upgrade your kitex command tool to v0.9.0+. For more details, please refer to the section "Create a server and register your services on the server".)

The results of code generation will be as follows:

```
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

You will see `RegisterService` func in each service's `server.go`.

```go
func RegisterService(svr server.Server, handler XXX, opts ...server.RegisterOption) error {
   if err := svr.RegisterService(serviceInfo(), handler, opts...); err != nil {
      return err
   }
   return nil
}

```

#### Create a server and register your services on the server

Registering services on a server is a straightforward process.

First, create a server. Then, by calling the `RegisterService` function in your generated code, a service can be registered.

Multiple services can be called on the same server, registering as many services as needed.

```go
package main

import (
   "github.com/cloudwego/kitex/pkg/server"

   servicea "your_servicea_kitex_gen_path"
   serviceb "your_serviceb_kitex_gen_path"
)

func main() {
   // create a server by calling server.NewServer
   svr := server.NewServer(your_server_option)
   // register your multi-service on a server
   err := **servicea**.RegisterService(svr, new(ServiceAImpl))
   err := **serviceb**.RegisterService(svr, new(ServiceBImpl))

   if err := svr.Run(); err != nil {
      klog.Errorf("%s", err.Error())
   }
}

```

#### Fallback Service

Suppose there is the same named method between services.

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

In this case, **please note that you need to specify one service as a fallback service.**

Fallback service is used to maintain compatibility when the client does not meet any of the conditions written in section [Client Side Users](/docs/kitex/tutorials/advanced-feature/multi_service/#client-side-users).

**If you don't specify any fallback service or if you specify multiple fallback services, an error will be returned on server startup.**

Note that you can specify only one service as a fallback service.

`RegisterService()` in the generated code (`server.go`) has an optional argument: `server.RegisterOption`. If `server.WithFallbackService` option is passed, the service will be registered as a fallback service.

```go
func main() {
   // create a server by calling server.NewServer
   svr := server.NewServer(your_server_option)
   // register multi-service on a server
   // servicea will be a fallback service
   servicea.RegisterService(svr, new(ServiceAImpl), server.WithFallbackService())
   serviceb.RegisterService(svr, new(ServiceBImpl))

   err := svr.Run()
   if err != nil {
      logs.Error("%s", err.Error())
   }
   logs.Stop()
}

```

Another way to avoid an error on server startup without specifying a fallback service is to use the option `server.WithRefuseTrafficWithoutServiceName`.

With this option, no error is returned when starting up the server even when you don't specify a fallback service for your method with conflicting names.

But when using this option, the following must be noted:

When `server.WithRefuseTrafficWithoutServiceName` option is enabled, an error will occur with a message “no service name while the server has WithRefuseTrafficWithoutServiceName option enabled” if the client does not meet any of the conditions mentioned in section [Client Side Users](/docs/kitex/tutorials/advanced-feature/multi_service/#client-side-users).

#### How to not fallback to a fallback service (= not rely on method name to find a service)

In some cases, even though a fallback service is specified for methods with the same name between services, the client's request may be intended to call a different service than the fallback service.

In such cases, please ensure the client meets the conditions written in section [Client Side Users](/docs/kitex/tutorials/advanced-feature/multi_service/#client-side-users).

## Obtain ServiceName and MethodName

- Service Name

```go
idlService, ok := kitexutil.GetIDLServiceName(ctx)

```

- Method Name

```go
method, ok := kitexutil.GetMethod(ctx)

```

## Middlewares

Generally, it's just the same as before, just add the option when calling `NewServer`:

```go
options = append(options, server.WithMiddleware(yourMiddleware))
svr := server.NewServer(options...)

```

You can distinguish each request by the service/method with the usage shown before.

### Distinguish Streaming/Non-Streaming Methods

The recommended way to determine whether a request has an underlying protocol for Streaming would be to check the type of the request/response arguments:

|                                     | **Client Middleware**                                                                                        | **Server Middleware**                                                                                                                                                                       |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Bidirectional**<br/>**(gRPC)**    | - request: `interface{}` = nil <br/>- response: \*streaming.Result                                           | - request: \*streaming.Args<br/>- response: `interface{}` = nil                                                                                                                             |
| **Client Streaming**<br/>**(gRPC)** | - request: interface{} = nil <br/>- response: \*streaming.Result                                             | - request: \*streaming.Args<br/>- response: `interface{}` = nil                                                                                                                             |
| **Server Streaming**<br/>**(gRPC)** | - request: `interface{}` = nil <br/>- response: \*streaming.Result                                           | - request: \*streaming.Args<br/>- response: `interface{}` = nil                                                                                                                             |
| **Unary (gRPC)**                    | - request: *kitex_gen/some_pkg.${svc}${method}Args<br/>- response: *kitex_gen/some_pkg.${svc}${method}Result | - request: \*streaming.Args<br/>- response: `interface{}` = nil<br/>Note: the option provided since v0.9.0: `server.WithCompatibleMiddlewareForUnary()` makes it the same with PingPong API |
| **PingPong API (KitexPB)**          | - request: *kitex_gen/some_pkg.${svc}${method}Args<br/>- response: *kitex_gen/some_pkg.${svc}${method}Result | - request: *kitex_gen/some_pkg.${svc}${method}Args<br/>- response: *kitex_gen/some_pkg.${svc}${method}Result                                                                                |

**NOTE:**
Kitex server supports auto-detection on incoming requests, and for GRPC/Protobuf Unary methods, it accepts both GRPC requests and KitexProtobuf(TTHeader + Pure Protobuf Payload) requests, so **it may not be accurate to rely solely on the method name from RPCInfo**.

#### Client Middleware Example

**Client** middlewares should rely on the type of `resp`:

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

#### Server Middleware Example

**Server** middlewares should rely on the type of `req`:

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

## FAQ

## What's the difference between Multi-Service and Combine Service?

- Combine Service (A service formed by merging multiple services into one unified service by generating code with `-combine-service` flag)
  - Code for all services (both combineservice and each service being combined) are generated.
  - All the method names of your services must be unique.
  - Only one service (= combine service) can be registered on a server. Otherwise, you'll receive an error message saying "only one service can be registered when registering combined service".
- Multi-Service **RECOMMENDED USING INSTEAD OF COMBINE SERVICE**
  - Code for each service is generated.
  - Method names can be the same between services. But there are some restrictions. Please choose one.
    - You need to specify a fallback service for the conflicting method.
    - Add `server.WithRefuseTrafficWithoutServiceName` option when creating a server, and make sure that client meets the conditions mentioned in section [Client Side Users](/docs/kitex/tutorials/advanced-feature/multi_service/#client-side-users).

## Why does the service registration fail?

There are some possible reasons:

- No fallback service is specified, despite having methods with the same name between services you register. Please specify a fallback service.
- You are attempting to register both combine service and other services on the server. Combine service can only be registered on a server by itself. If you want to register other services as well, you either need to merge those services into the combine service or register each service separately without using combine service.
