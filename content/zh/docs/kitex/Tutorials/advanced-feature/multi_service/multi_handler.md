---
title: "多 Service 多 Handler 生成"
date: 2024-09-12
weight: 3
keywords: ["Kitex", "多 Service", "代码生成", "多 Handler"]
description: "Kitex 支持在多 Service 场景为每个 Service 生成 Handler 并统一注册。"
---

> 支持版本：Kitex Tool >= v0.11.0

## 功能说明

Kitex 从 v0.8.0 开始支持在一个 idl (同时支持 thrift 和 protobuf) 中定义多个 service，详情请参考[单 Server 多 Service](/zh/docs/kitex/tutorials/advanced-feature/multi_service/multi_service/)。但是生成代码中多个 service 对应的 handler.go 会被覆盖，只保留 idl 中最后一个 service 对应的 handler。

从 v0.11.0 开始，Kitex Tool 支持为每个 service 生成 handler 并统一注册到 server。

## 使用说明

- 需指定 -tpl multiple_services

Kitex tool 版本要求 >= v0.11.0

```bash
kitex -tpl multiple_services -service your_service path/to/idl
```

## 生成结果

### 3.1 thrift idl

以下方 thrift idl 为例：

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

生成代码结构为：

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

其中 handler_A.go，handler_B.go，handler_C.go 分别承载 Service A，Service B 以及 Service C 的 handler。

在 main.go 中，自动注册多 handler：

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

以下方 pb idl 为例：

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

生成代码结构和 main.go 内容与 thrift idl 一致。
