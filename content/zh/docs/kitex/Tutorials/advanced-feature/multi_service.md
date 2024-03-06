---
title: "多服务"
date: 2023-03-05
weight: 10
keywords: ["Kitex", "多服务", "单服务器多服务", "gRPC", "thrift", "protobuf"]
description: Kitex 支持在一个服务器上注册多个服务。
---

目前，该功能适用于：
- gRPC传输协议
- Kitex Thrift和Protobuf(non-streaming)


## 使用方法

### 准备工作
请使用Kitex命令工具为每个服务生成代码。更多详情，请参考[代码生成工具](https://www.cloudwego.io/docs/kitex/tutorials/code-gen/code_generation/).

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
您可以在每个服务的`server.go`中看到`RegisterService`函数。
```golang
func RegisterService(svr server.Server, handler XXX, opts ...server.RegisterOption) error {
   if err := svr.RegisterService(serviceInfo(), handler, opts...); err != nil {
      return err
   }
   return nil
}
```

### 创建服务器并在服务器上注册您的服务
在服务器上注册服务是一个简单的过程。

首先，创建一台服务器。然后，通过在您生成的代码中调用`RegisterService`函数，即可注册服务。

可以在同一台服务器上调用多个服务，根据需要注册任意多个服务。

```golang
package main

import (
   "github.com/cloudwego/kitex/pkg/server"
   
    servicea "your_servicea_kitex_gen_path"
    serviceb "your_serviceb_kitex_gen_path"
)   

func main() {
    // 通过调用server.NewServer创建服务器
    svr := server.NewServer(your_server_option)
    // 在服务器上注册多服务
    err := servicea.RegisterService(svr, new(ServiceAImpl))
    err = serviceb.RegisterService(svr, new(ServiceBImpl))
    
    err = svr.Run()
    
    if err != nil {
       logs.Error("%s", err.Error())
    }
    logs.Stop()
}
```

### 备用服务
假设服务之间有相同的命名方法。

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

在这种情况下，**请注意，您需要指定一个服务作为备用服务。**

当客户端使用旧的Kitex版本(<v0.9.0)时，备用服务用于维护兼容性
- 或者当`TTHeader`未用于传输协议时，
- 或者客户端没有设置可选的元处理程序`Transmeta.ClientTTHeaderHandler()`。

如果未指定任何回退服务或指定了多个回退服务，则在服务器启动时将返回错误。

请注意，您只能将一个服务指定为备用服务。

生成代码(`server.go`)中的`RegisterService()`有一个可选参数：`server.RegisterOption`。
如果传入`server.WithFallback Service`选项，则该服务将注册为回退服务。

```golang
func main() {
    // 通过调用server.NewServer创建服务器
    svr := server.NewServer(your_server_option)
    // 在服务器上注册多服务
    // servicea 将成为备用服务
    servicea.RegisterService(svr, new(ServiceAImpl), server.WithFallbackService())
    serviceb.RegisterService(svr, new(ServiceBImpl))
    
    err := svr.Run()
    if err != nil {
        logs.Error("%s", err.Error())
    }
    logs.Stop()
}
```

另一种避免服务器启动错误而不指定回退服务的方法是使用`server.WithRefuseTrafficWithoutServiceName`选项。
使用此选项，即使您没有为名称冲突的方法指定回退服务，启动服务器时也不会返回错误。
但在使用此选项时，必须注意以下事项：
如果启用了`server.WithRefuseTrafficWithoutServiceName`选项，则会出现错误，并显示“当服务器启用了RefuseTrafficWithoutServiceName`选项时没有服务名”的消息
如果服务器在以下情况下收到请求：
- 客户端使用较旧的Kitex版本(<v0.9.0)，不支持多业务功能
- 请求的传输协议不是TTHeader(Kitex pb的传输协议默认启用TTHeader)

### 组合服务
请注意，如果您注册了组合服务(代码是使用 -combine-service 标志生成的)，
**一台服务器上只能注册一个服务(= 组合服务)**。
否则，您将收到一条错误消息，提示您“在注册组合服务时只能注册一个服务”。
