---
title: "Message Types"
date: 2021-08-26
weight: 1
keywords: ["Kitex", "PingPong", "Oneway", "Streaming"]
description: Kitex supports message types of PingPong、Oneway、Streaming.
---

## Protocols

The table below is message types, serializations and transport protocols supported by Kitex:

| Message Types | Serialization     | Transport Protocol                                                       |
| ------------- |-------------------|--------------------------------------------------------------------------|
| PingPong      | Thrift / Protobuf | [TTHeader](../../../reference/transport_protocol_ttheader) / HTTP2(gRPC) |
| Oneway        | Thrift            | [TTHeader](../../../reference/transport_protocol_ttheader)               |
| Streaming     | Thrift / Protobuf | HTTP2(gRPC)                                                              |

- PingPong: the client always waits for a response after sending a request
- Oneway: the client does not expect any response after sending a request
- Streaming: the client can send one or more requests while receiving one or more responses.

## Thrift

Kitex supports **PingPong** and **Oneway** message types based on Thrift protocol; Simultaneously supporting **Thrift Streaming** over HTTP2. 

The interface definitions for PingPong and Oneway are shown in the following example, and the usage of Thrift Streaming please see [Thrift Streaming](/docs/kitex/tutorials/basic-feature/protocol/streaming/grpc/thrift_streaming/)

### Example

Given an IDL:

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

The layout of generated code:

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

The handler code on server side:

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

The code on client side:

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

The code on client side:

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

Kitex supports two kinds of protocols that carry Protobuf payload:

- Kitex Protobuf
  - Only supports the PingPong type of messages. If any streaming method is defined in the IDL, the protocol will switch to gRPC.
- The gRPC Protocol
  - Be able to interoperate with gRPC. Use the same definition as gRPC service, and supports Unary (PingPong) and Streaming calls.

### Example

The following is an example showing how to use the streaming types.

Given an IDL:

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
  rpc ClientSideStreaming(stream Request) returns (Response) {} // client streaming
  rpc ServerSideStreaming(Request) returns (stream Response) {} // server streaming
  rpc BidiSideStreaming(stream Request) returns (stream Response) {} // bidirectional streaming
}
```

The generated code:

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

The handler code on server side:

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
