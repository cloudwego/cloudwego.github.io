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
- **gRPC Streaming** : ~~~~(planned implementation)

  - ~~Transport protocol: gRPC~~
  - ~~IDL Definition Language and Serialization Protocol: Protobuf Encoding~~

The protocol selected here only affects code generated from IDL. Regardless of the protocol, the following usage is consistent.

## Usage

### Generate code

#### Define IDL

##### Thrift

File `echo.thrift `:

```go
namespace go echo

service TestService {
    Response PingPong(1: Request req) // PingPong normal method
    
    Response Echo (1: Request req) (streaming.mode="bidirectional"),
    Response EchoClient (1: Request req) (streaming.mode="client"),
    Response EchoServer (1: Request req) (streaming.mode="server"),
}
```

#### Generate code

To maintain compatibility with legacy stream-generated code, Command Line needs to add `the -streamx ` flag.

```
kitex -streamx -module <go module> -service P.S.M echo.thrift
```

##### Initialization

#### Create Client

```go
import ".../kitex_gen/echo/testservice"
import "github.com/cloudwego/kitex/client/streamxclient"

cli, err := testservice.NewClient(
    "a.b.c",
    streamxclient.WithStreamRecvMiddleware(...),
    streamxclient.WithStreamSendMiddleware(...),
)
```

#### Create Server

```go
import ".../kitex_gen/echo/streamserver"
import "github.com/cloudwego/kitex/server/streamxserver"

svr := streamserver.NewServer(
    new(serviceImpl),
    streamxserver.WithStreamRecvMiddleware(...),
    streamxserver.WithStreamSendMiddleware(...),
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

- [**Must**] : The client must call the CloseAndRecv () or (CloseSend + Recv) method to inform the server that there is no new data to send.

```go
ctx, cs, err := cli.ClientStream(ctx)
for i := 0; i < 3; i++ {
    err = cs.Send(ctx, req)
}
res, err = cs.CloseAndRecv(ctx)
```

#### Server usage

- [**Must**] : The server must return a Response at the end of the handler, informing the client of the final result.

```go

func (si *serviceImpl) ClientStream(
    ctx context.Context, stream streamx.ClientStreamingServer[Request, Response]
) (res *Response, err error) {
    for {
       req, err := stream.Recv(ctx)
       if err == io.EOF {
           res := new(Response)
           return res, nil
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

- [**Must**] : The client must check the io. EOF error and end the loop

```go
ctx, ss, err := cli.ServerStream(ctx, req)
for {
    res, err := ss.Recv(ctx)
    if errors.Is(err, io.EOF) {
       break
    }
}
```

#### Server usage

```go
func (si *serviceImpl) ServerStream(ctx context.Context, req *Request, stream streamx.ServerStreamingServer[Response]) error {
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
- [**Must**] : client must judge io. EOF and end the loop when Recv

```go
ctx, bs, err := cli.BidiStream(ctx)
var wg sync.WaitGroup
wg.Add(2)
go func() {
    defer wg.Done()
    for i := 0; i < round; i++ {
       err := bs.Send(ctx, req)
    }
    err = bs.CloseSend(ctx)
}()
go func() {
    defer wg.Done()
    for {
       res, err := bs.Recv(ctx)
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
func (si *serviceImpl) BidiStream(ctx context.Context, stream streamx.BidiStreamingServer[Request, Response]) error {
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
