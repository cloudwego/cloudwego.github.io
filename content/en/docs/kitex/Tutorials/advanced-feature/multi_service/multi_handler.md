---
title: "Generating Multiple Handlers for Multiple Services"
date: 2024-09-12
weight: 3
keywords: ["Kitex", "Multiple Services", "Code Generation", "Multiple Handlers"]
description: "Kitex supports generating handlers for each service in multiple services scenario and unifying registration."
---

> Support Version: Kitex Tool >= v0.11.0

## Function Description

Starting from v0.8.0, Kitex supports defining multiple services in one idl (both thrift and protobuf are supported). For details, please refer to [Multiple Services](/docs/kitex/tutorials/advanced-feature/multi_service/multi_service/). However, in the generated code, the handler.go corresponding to multiple services will be overwritten, and only the handler corresponding to the last service in the idl will be retained.

Since v0.11.0, Kitex Tool supports generating handlers for each service and registering them uniformly to the server.

## Usage Approach

- configure `-tpl multiple_services`

Kitex Tool >= v0.11.0

```bash
kitex -tpl multiple_services -service your_service path/to/idl
```

## 3. Generation Result

### 3.1 thrift idl

Take the following thrift idl as an example:

```thrift
namespace go multiple.services.test

service A {
  string EchoA(1: string req)
}

service B {
  string EchoB(1: string req)
}

service C {
  string EchoC(1: string req)
}
```

The code generation structure is:

```bash
kitex_gen/
script/
build.sh
go.mod
handler_A.go
handler_B.go
handler_C.go
kitex_info.yaml
main.go
```

Among them, handler_A.go, handler_B.go, and handler_C.go respectively host the handlers of service A, service B, and service C.

In main.go, multiple handlers are automatically registered:

```go
package main

import (
    serviceA "demo/kitex_gen/multiple/services/test/a"
    serviceB "demo/kitex_gen/multiple/services/test/b"
    serviceC "demo/kitex_gen/multiple/services/test/c"
    server "github.com/cloudwego/kitex/server"
    "log"
)

func main() {
    svr := server.NewServer()
    if err := serviceA.RegisterService(svr, new(AImpl)); err != nil {
       panic(err)
    }
    if err := serviceB.RegisterService(svr, new(BImpl)); err != nil {
       panic(err)
    }
    if err := serviceC.RegisterService(svr, new(CImpl)); err != nil {
       panic(err)
    }

    err := svr.Run()

    if err != nil {
       log.Println(err.Error())
    }
}
```

### 3.2 pb idl

Take the following pb idl as an example:

```go
syntax="proto3";
package pbdemo;
option go_package = "pbdemo";

message RequestA {
  string msg = 1;
}

message ResponseA {
  string msg = 1;
}

service A {
  rpc EchoA(RequestA) returns (ResponseA);
}

message RequestB {
  string msg = 1;
}

message ResponseB {
  string msg = 1;
}

service B {
  rpc EchoB(RequestB) returns (ResponseB);
}

message RequestC {
  string msg = 1;
}

message ResponseC {
  string msg = 1;
}

service C {
  rpc EchoC(RequestC) returns (ResponseC);
}
```

The code generation structure and the content of main.go are consistent with thrift idl.
