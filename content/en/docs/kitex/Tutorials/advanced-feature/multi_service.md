---
title: "Multiple Services"
date: 2024-03-05
weight: 10
keywords: ["Kitex", "Multi Services", "gRPC", "thrift", "protobuf"]
description: Kitex supports multiple service registration on a server.
---

Currently, the feature is available for:
- gRPC transport protocol
- Kitex thrift and protobuf (non-streaming)

## Usage

### Preparation
Please generate code for each service using Kitex command tool. For more details, please refer to [Code Generation Tool](https://www.cloudwego.io/docs/kitex/tutorials/code-gen/code_generation/).

The results of code generation will be as follows:
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

You will see `RegisterService`  func in each service's `server.go`.
```golang
func RegisterService(svr server.Server, handler XXX, opts ...server.RegisterOption) error {
   if err := svr.RegisterService(serviceInfo(), handler, opts...); err != nil {
      return err
   }
   return nil
}
```

### Create a server and register your services on the server
Registering services on a server is a straightforward process.

First, create a server. Then, by calling the `RegisterService` function in your generated code, a service can be registered.

Multiple services can be called on the same server, registering as many services as needed.

```golang
package main

import (
   "github.com/cloudwego/kitex/pkg/server"

   servicea "your_servicea_kitex_gen_path"
   serviceb "your_serviceb_kitex_gen_path"
)

func main() {
   // create a server by calling server.NewServer
   svr := server.NewServer(your_server_option)
   // register multi-service on a server
   err := servicea.RegisterService(svr, new(ServiceAImpl))
   err = serviceb.RegisterService(svr, new(ServiceBImpl))

   err = svr.Run()

   if err != nil {
      logs.Error("%s", err.Error())
   }
   logs.Stop()
}
```

### Fallback service
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

Fallback service is used to maintain compatibility when the client is using an old Kitex version (< v0.9.0) 
- or when `TTHeader` is not being used for transport protocol, 
- or the client does not set an optional meta handler `transmeta.ClientTTHeaderHandler()`.

If you don't specify any fallback service or if you specify multiple fallback services, an error will be returned on server startup.

Note that you can specify only one service as a fallback service.

`RegisterService()` in the generated code (`server.go`) has an optional argument:`server.RegisterOption`.
If `server.WithFallbackService` option is passed, the service will be registered as a fallback service.

```golang
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

When `server.WithRefuseTrafficWithoutServiceName` option is enabled, an error will occur with a message "no service name while the server has WithRefuseTrafficWithoutServiceName option enabled" 
if the server receives requests in the following cases:
- Client uses the older Kitex version (< v0.9.0), which does not support multi-service feature 
- The transport protocol of a request is not TTHeader (Kitex pb's transport protocol enables TTHeader by default)
- Client option `client.WithMetaHandler(transmeta.ClientTTHeaderHandler())` is not set

## FAQ
### 1. What's the difference between Multi-Service and Combine Service?
- Combine Service (A service formed by merging multiple services into one unified service by generating code with -combine-service flag)
  - Code for all services (both combineservice and each service being combined) are generated.
  - All the method names of your services must be unique.
  - Only one service (= combine service) can be registered on a server. 
    Otherwise, you'll receive an error message saying "only one service can be registered when registering combined service".

- Multi-Service **RECOMMENDED TO USE INSTEAD OF COMBINE SERVICE**
  - Code for each service is generated.
  - Method names can be the same between services. But there are some restrictions. Please choose one.
    - You need to specify a fallback service for the conflicting method.
    - Add `server.WithRefuseTrafficWithoutServiceName` option when creating a server, 
      and make sure that client uses the kitex version >=v0.9.0, TTHeader protocol, 
      and sets `client.WithMetaHandler(transmeta.ClientTTHeaderHandler())` client option.

### 2. Why does the service registration fail?
There are some possible reasons:
- No fallback service is specified, despite having methods with the same name between services you register.
  Please specify a fallback service.
- You are attempting to register both the combine service and other services on the server.
  Combine service can only be registered on a server by itself. If you want to register other services as well, you either need to merge those services into the combine service or register each service separately without using combine service.
