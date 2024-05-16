---
title: "消息类型"
date: 2021-08-26
weight: 1
keywords: ["Kitex", "PingPong", "Oneway", "Streaming"]
description: Kitex 支持 PingPong、Oneway、Streaming 消息类型。
---

## 协议支持

目前 Kitex 支持的消息类型、编解码协议和传输协议

| 消息类型  | 编码协议          | 传输协议                                                                 |
| --------- | ----------------- | ------------------------------------------------------------------------ |
| PingPong  | Thrift / Protobuf | [TTHeader](../../../reference/transport_protocol_ttheader) / HTTP2(gRPC) |
| Oneway    | Thrift            | [TTHeader](../../../reference/transport_protocol_ttheader)               |
| Streaming | Protobuf          | HTTP2(gRPC)                                                              |

- PingPong：客户端发起一个请求后会等待一个响应才可以进行下一次请求
- Oneway：客户端发起一个请求后不等待一个响应
- Streaming：客户端发起一个或多个请求 , 等待一个或多个响应

## Thrift

目前 Thrift 支持 PingPong 和 Oneway。Kitex 计划支持 Thrift Streaming。

### Example

IDL 定义 :

```thrift
namespace go echo

struct Request {
    1: string Msg
}

struct Response {
    1: string Msg
}

service EchoService {
    Response Echo(1: Request req); // pingpong method
    oneway void VisitOneway(1: Request req); // oneway method
}
```

生成的代码组织结构 :

```
.
└── kitex_gen
    └── echo
        ├── echo.go
        ├── echoservice
        │   ├── client.go
        │   ├── echoservice.go
        │   ├── invoker.go
        │   └── server.go
        ├── k-consts.go
        └── k-echo.go
```

Server 的处理代码形如 :

```go
package main

import (
    "context"

    "xx/echo"
    "xx/echo/echoservice"
)

type handler struct {}

func (handler) Echo(ctx context.Context, req *echo.Request) (r *echo.Response, err error) {
    //...
    return &echo.Response{ Msg: "world" }, err
}

func (handler) VisitOneway(ctx context.Context, req *echo.Request) (err error) {
    //...
    return nil
}

func main() {
    svr := echo.NewServer(handler{})
	err := svr.Run()
    if err != nil {
        panic(err)
    }
}
```

#### PingPong

Client 侧代码 :

```go
package main

import (
    "context"
    "fmt"

    "xx/echo"
    "xx/echo/echoservice"

    "github.com/cloudwego/kitex/client"
)

func main() {
    cli, err := echoservice.NewClient("destServiceName", client.WithHostPorts("0.0.0.0:8888"))
    if err != nil {
        panic(err)
    }
    req := echo.NewRequest()
    req.Msg = "hello"
    resp, err := cli.Echo(context.Background(), req)
    if err != nil {
        panic(err)
    }

    fmt.Println(resp.Msg)
    // resp.Msg == "world"
}
```

#### Oneway

Client 侧代码 :

```go
package main

import (
    "context"

    "xx/echo"
    "xx/echo/echoservice"

    "github.com/cloudwego/kitex/client"
)

func main() {
    cli, err := echoservice.NewClient("destServiceName", client.WithHostPorts("0.0.0.0:8888"))
    if err != nil {
        panic(err)
    }
    req := echo.NewRequest()
    req.Msg = "hello"
    err = cli.VisitOneway(context.Background(), req)
    if err != nil {
        panic(err)
    }
    // no response return
}
```

## Protobuf

Kitex 支持两种承载 Protobuf 负载的协议：

- Kitex Protobuf
  - 只支持 PingPong，若 IDL 定义了 stream 方法，将默认使用 gRPC 协议
- gRPC 协议
  - 可以与 gRPC 互通，与 gRPC service 定义相同，支持 Unary(PingPong)、 Streaming 调用

### Example

以下给出 Streaming 的使用示例。

IDL 定义 :

```protobuf
syntax = "proto3";

option go_package = "echo";

package echo;

message Request {
  string msg = 1;
}

message Response {
  string msg = 1;
}

service EchoService {
  rpc ClientSideStreaming(stream Request) returns (Response) {} // 客户端侧 streaming
  rpc ServerSideStreaming(Request) returns (stream Response) {} // 服务端侧 streaming
  rpc BidiSideStreaming(stream Request) returns (stream Response) {} // 双向流
}
```

生成的代码组织结构 :

```
.
└── kitex_gen
    └── echo
        ├── echo.pb.go
        ├── echo.pb.fast.go
        └── echoservice
            ├── client.go
            ├── echoservice.go
            ├── invoker.go
            └── server.go
```

Server 侧代码 :

```go
package main

import (
    "log"
    "time"
    "context"

    "xx/echo"
    "xx/echo/echoservice"
}

type handler struct{}

func (handler) ClientSideStreaming(stream echo.EchoService_ClientSideStreamingServer) (err error) {
    for {
        req, err := stream.Recv()
        if err != nil {
            return err
        }
        log.Println("received:" , req.GetMsg())
    }
}

func (handler) ServerSideStreaming(req *echo.Request, stream echo.EchoService_ServerSideStreamingServer) (err error) {
      _ = req
      for {
          resp := &echo.Response{Msg: "world"}
          if err := stream.Send(resp); err != nil {
              return err
          }
      }
}

func (handler) BidiSideStreaming(stream echo.EchoService_BidiSideStreamingServer) (err error) {
	ctx, cancel := context.WithCancel(context.Background())
	errChan := make(chan error, 1)

	go func() {
		for {
			select {
			case <- ctx.Done():
				return
			default:
				req,err := stream.Recv()
				if err != nil {
					errChan <- err
					cancel()
					return
				}
				log.Println("received:", req.GetMsg())
			}
		}
	}()
	go func() {
		for {
			select {
			case <- ctx.Done():
				return
			default:
				resp := &echo.Response{Msg: "world"}
				if err := stream.Send(resp); err != nil {
					errChan <- err
					cancel()
					return
				}
			}
			time.Sleep(time.Second)
		}
	}()

	err = <-errChan
	cancel()
	return err
}

func main() {
    svr := echoservice.NewServer(new(handler))

    err := svr.Run()

    if err != nil {
        log.Println(err.Error())
    }
}
```

#### Streaming

ClientSideStreaming:

```go
package main

import (
    "context"
    "time"

    "xx/echo"
    "xx/echo/echoservice"

    "github.com/cloudwego/kitex/client"
}

func main() {
    cli, err := echoservice.NewClient("destServiceName", client.WithHostPorts("0.0.0.0:8888"))
    if err != nil {
        panic(err)
    }
    cliStream, err := cli.ClientSideStreaming(context.Background())
    if err != nil {
        panic(err)
    }
    for {
        req := &echo.Request{Msg: "hello"}
        if err := cliStream.Send(req); err != nil {
            panic(err)
        }
        time.Sleep(time.Second)
    }

}
```

ServerSideStreaming:

```go
package main

import (
    "context"
    "log"
    "time"

    "xx/echo"
    "xx/echo/echoservice"

    "github.com/cloudwego/kitex/client"
}

func main() {
    cli, err := echoseervice.NewClient("destServiceName", client.WithHostPorts("0.0.0.0:8888"))
    if err != nil {
        panic(err)
    }
    req := &echo.Request{Msg: "hello"}
    svrStream, err := cli.ServerSideStreaming(context.Background(), req)
    if err != nil {
        panic(err)
    }
    for {
        resp, err := svrStream.Recv()
        log.Println("response:",resp.GetMsg())
        if err != nil {
            panic(err)
        }
        time.Sleep(time.Second)
        // resp.Msg == "world"
    }

}
```

BidiSideStreaming:

```go
package main

import (
    "context"
    "log"
    "time"

    "xx/echo"
    "xx/echo/echoservice"

    "github.com/cloudwego/kitex/client"
}

func main() {
    cli, err := echoservice.NewClient("destServiceName", client.WithHostPorts("0.0.0.0:8888"))
    if err != nil {
        panic(err)
    }
    bidiStream, err := cli.BidiSideStreaming(context.Background())
    if err != nil {
        panic(err)
    }
    go func() {
        for {
            req := &echo.Request{Msg: "hello"}
            err := bidiStream.Send(req)
            if err != nil {
                panic(err)
            }
            time.Sleep(time.Second)
        }
    }()
    for {
        resp, err := bidiStream.Recv()
        if err != nil {
            panic(err)
        }
        log.Println(resp.GetMsg())
        // resp.Msg == "world"
    }
}
```
