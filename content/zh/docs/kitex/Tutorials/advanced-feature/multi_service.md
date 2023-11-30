---
title: "单 Server 多 Service"
date: 2023-11-30
weight: 10
keywords: ["Kitex", "多 Service", "单端口多Service", "gRPC"]
description: Kitex 支持在一个 Server 上注册多个 Service。
---

注：当前这个功能仅支持 **gRPC** 传输协议。

## 使用

### gRPC service 定义

例如，假设您有两个 proto 文件（如下所示），每个包含一个 service。
通过执行 kitex 命令，可以自动生成对应的代码。

```protobuf
// File1：servicea.proto
syntax = "proto3";

option go_package = "myservice";

package myservice;

service ServiceA {
  rpc EchoA (stream RequestA) returns (stream ReplyA) {}
}

message RequestA {
  ...
}

message ReplyA {
  ...
}


// File2：serviceb.proto
syntax = "proto3";

option go_package = "myservice";

package myservice;

service ServiceB {
  rpc EchoB (stream RequestB) returns (stream ReplyB) {}
}

message RequestB {
  ...
}

message ReplyB {
  ...
}
```

### 如何在一个 Server 上注册多个 Service

在一个 server 上注册多个 service 是一个简单的过程。

首先，创建一个 server。然后，通过调用该 server 上的 `RegisterService` 函数，就可以注册 service 了。

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
   err := svr.RegisterService(servicea.NewServiceInfo(), new(ServiceAImpl))
   err := svr.RegisterService(serviceb.NewServiceInfo(), new(ServiceBImpl))

   err := svr.Run()

   if err != nil {
      logs.Error("%s", err.Error())
   }
   logs.Stop()
}
```
