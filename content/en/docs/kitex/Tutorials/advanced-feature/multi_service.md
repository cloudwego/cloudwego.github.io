---
title: "Multiple Services"
date: 2023-11-09
weight: 10
keywords: ["Kitex", "Multi Services", "gRPC"]
description: Kitex supports multiple service registration on a server.
---

## Multiple Services
Kitex supports multiple service registration on a server.

Currently, the feature is only available for **gRPC** transport protocol.

## Usage

### gRPC
For instance, suppose you have two proto files, each containing one service.
By running the kitex command, you can automatically generate the code.

```thrift
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


// File2：base.thrift
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

#### Register multi-service on a server

Registering services on a server is a straightforward process.

First, create a server. Then, by calling the `RegisterService` function on that server, a service can be registered.

Multiple services can be called on the same server, registering as many services as needed.

```golang
package main

import (
   "github.com/cloudwego/kitex/pkg/server"
   "github.com/cloudwego/kitex/pkg/serviceinfo"

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
