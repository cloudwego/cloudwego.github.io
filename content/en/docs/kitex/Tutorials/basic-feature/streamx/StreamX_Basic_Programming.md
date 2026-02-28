---
title: "StreamX Basic Programming"
date: 2025-01-13
weight: 1
keywords: ["Stream Basic Programming"]
description: ""
---

## Select Protocol

Current support:

- **TTHeader Streaming**

  - Transport protocol: TTHeader
  - IDL Definition Language and Serialization Protocol: Thrift
- **gRPC Streaming**

  - Transport protocol: gRPC
  - IDL Definition Language and Serialization Protocol: Thrift / Protobuf

The protocol selected here only affects code generated from IDL. Regardless of the protocol, the following usage is consistent.

## Usage

### Generate code

#### Define IDL

##### Thrift

File `echo.thrift `:

```thrift
namespace go echo

service TestService {
    Response PingPong(1: Request req) // PingPong normal method
    
    Response Echo (1: Request req) (streaming.mode="bidirectional"),
    Response EchoClient (1: Request req) (streaming.mode="client"),
    Response EchoServer (1: Request req) (streaming.mode="server"),
}
```

#### Generate code
Please make sure that Kitex Tool has been upgraded to v0.13.0+:
```
go install github.com/cloudwego/kitex/tool/cmd/kitex@latest
```

To maintain compatibility with legacy stream-generated code, Command Line needs to add the `-streamx` flag.

```
kitex -streamx -module <go module> -service service echo.thrift
```

### Initialization

#### Create Client

```go
import ".../kitex_gen/echo/testservice"
import "github.com/cloudwego/kitex/client"

cli, err := testservice.NewClient(
    "a.b.c",
    client.WithStreamOptions(
        client.WithStreamRecvMiddleware(...),
        client.WithStreamSendMiddleware(...),
    ),
)
```

#### Create Server

```go
import ".../kitex_gen/echo/testservice"
import "github.com/cloudwego/kitex/server"

svr := testservice.NewServer(
    new(serviceImpl),
    server.WithStreamOptions(
        server.WithStreamRecvMiddleware(...),
        server.WithStreamSendMiddleware(...),
    ),
)
```

### Client Streaming

#### Usage scenarios

The client needs to send multiple copies of data to the server, and the server can send a message to the client.

```go
------------------- [Client Streaming] -------------------
--------------- (stream Req) returns (Res) ---------------
client.Send(req)         === req ==>       server.Recv(req)
                             ...
client.Send(req)         === req ==>       server.Recv(req)

client.CloseSend()       === EOF ==>       server.Recv(EOF)
client.Recv(res)         <== res ===       server.SendAndClose(res)
** OR
client.CloseAndRecv(res) === EOF ==>       server.Recv(EOF)
                         <== res ===       server.SendAndClose(res)
```

#### Client Usage

- [**Must**] : The client must call the CloseAndRecv() or (CloseSend + Recv) method to inform the server that there is no new data to send.

```go
stream, err := cli.EchoClient(ctx)
for i := 0; i < 3; i++ {
    err = stream.Send(stream.Context(), req)
}
res, err = stream.CloseAndRecv(stream.Context())
```

#### Server usage

- [**Must**] : The server must return a Response at the end of the handler, informing the client of the final result.

```go

func (si *serviceImpl) EchoClient(
    ctx context.Context, stream echo.TestService_EchoClientServer
) (err error) {
    for {
       req, err := stream.Recv(ctx)
       if err == io.EOF {
           res := new(Response)
           return stream.SendAndClose(ctx, res)
       }
       if err != nil {
          return nil, err
       }
    }
}
```

### Server Streaming

#### Usage scenarios

Typical scenario: ChatGPT type business

Client sends a request to Server, Server sends multiple returns to Client.

```go
------------------- [Server Streaming] -------------------
---------- (Request) returns (stream Response) ----------
client.Send(req)   === req ==>   server.Recv(req)
client.Recv(res)   <== res ===   server.Send(req)
                       ...
client.Recv(res)   <== res ===   server.Send(req)
client.Recv(EOF)   <== EOF ===   server handler return
```

#### Client Usage

- [**Must**] : The client must check the io.EOF error and end the loop

```go
stream, err := cli.EchoServer(ctx, req)
for {
    res, err := stream.Recv(stream.Context())
    if errors.Is(err, io.EOF) {
       break
    }
}
```

#### Server usage

```go
func (si *serviceImpl) EchoServer(ctx context.Context, req *echo.Request, stream echo.TestService_EchoServerServer) error {
    for i := 0; i < 3; i++ {
       err := stream.Send(ctx, resp)
       if err != nil {
          return err
       }
    }
    return nil
}
```

### Bidirectional Streaming

#### Usage scenarios

Clients and servers may need to or may need to send multiple messages in the future.

```go
----------- [Bidirectional Streaming] -----------
--- (stream Request) returns (stream Response) ---
* goroutine 1 *
client.Send(req)   === req ==>   server.Recv(req)
                       ...
client.Send(req)   === req ==>   server.Recv(req)
client.CloseSend() === EOF ==>   server.Recv(EOF)

* goroutine 2 *
client.Recv(res)   <== res ===   server.Send(req)
                       ...
client.Recv(res)   <== res ===   server.Send(req)
client.Recv(EOF)   <== EOF ===   server handler return
```

#### Client Usage

- [**Must**] : client must call CloseSend after sending
- [**Must**] : client must judge io.EOF and end the loop when Recv

```go
stream, err := cli.EchoBidi(ctx)
var wg sync.WaitGroup
wg.Add(2)
go func() {
    defer wg.Done()
    for i := 0; i < round; i++ {
       err := stream.Send(stream.Context(), req)
    }
    err = stream.CloseSend(stream.Context())
}()
go func() {
    defer wg.Done()
    for {
       res, err := stream.Recv(stream.Context())
       if errors.Is(err, io.EOF) {
          break
       }
    }
}()
wg.Wait()
```

#### Server usage

- [**Must**] : The server must determine io. EOF and end the loop when Recv

```go
func (si *serviceImpl) EchoBidi(ctx context.Context, stream echo.TestService_EchoBidiServer) error {
    for {
       req, err := stream.Recv(ctx)
       if err == io.EOF {
          return nil
       }
       if err != nil {
          return err
       }
       err = stream.Send(ctx, resp)
       if err != nil {
          return err
       }
    }
}
```
