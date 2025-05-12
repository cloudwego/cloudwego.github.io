---
title: "User Guide to Generic Call for Streaming"
date: 2024-09-19
weight: 6
keywords: ["User Guide to Generic Call for Streaming"]
description: ""
---

## Introduction

**JSON generic call for streaming interfaces is now supported (client-side only) from Kitex v0.12.0**.

## Usage

### Generic Streaming Client Initialization

#### protobuf

Take the following Protobuf IDL as an example:

```protobuf
syntax = "proto3";
package pbapi;
// The greeting service definition.
option go_package = "pbapi";

message Request {
  string message = 1;
}

message Response {
  string message = 1;
}

service Echo {
  rpc StreamRequestEcho (stream Request) returns (Response) {}
  rpc StreamResponseEcho (Request) returns (stream Response) {}
  rpc BidirectionalEcho (stream Request) returns (stream Response) {}
  rpc UnaryEcho (Request) returns (Response) {}
}
```

The four methods included in the example IDL correspond to four scenarios:

1. Client Streaming: the client sends multiple messages, the server returns one message, and then closes the stream.
2. Server Streaming: The client sends one message, the server returns multiple messages, and then closes the stream. It's suitable for LLM scenarios.
3. Bidirectional Streaming: The sending and receiving of client/server are independent, which can be organized in arbitrary order.
4. Unary: In gRPC, this is a single call mode without using streams, similar to the Ping Pong mode in Thrift.

First of all, please initialize the streaming client. Here is an example of streaming client initialization.

```go
import (
    "context"
    
    "github.com/cloudwego/kitex/client"
    "github.com/cloudwego/kitex/client/genericclient"
    "github.com/cloudwego/kitex/pkg/generic"
    "github.com/cloudwego/kitex/pkg/generic/proto"
    "github.com/cloudwego/kitex/pkg/transmeta"
    "github.com/cloudwego/kitex/transport"
)

dOpts := proto.Options{} // you can specify parsing options as you want
p, err := generic.NewPbFileProviderWithDynamicGo(your_idl, ctx, dOpts)
// create json pb generic
g, err := generic.JSONPbGeneric(p)
// streaming client initialization
cli, err := genericclient.NewStreamingClient("destService", g,
    client.WithTransportProtocol(transport.GRPC),
    client.WithHostPorts(targetIPPort),
)
```

#### thrift

Take the following Thrift IDL as an example:

```thrift
namespace go thrift

struct Request {
    1: required string message,
}

struct Response {
    1: required string message,
}

service TestService {
    Response Echo (1: Request req) (streaming.mode="bidirectional"),
    Response EchoClient (1: Request req) (streaming.mode="client"),
    Response EchoServer (1: Request req) (streaming.mode="server"),
    Response EchoUnary (1: Request req) (streaming.mode="unary"), // not recommended
    Response EchoBizException (1: Request req) (streaming.mode="client"),

    Response EchoPingPong (1: Request req), // KitexThrift, non-streaming
}
```

The four methods included in the example IDL correspond to four scenarios:

1. Client Streaming: the client sends multiple messages, the server returns one message, and then closes the stream.
2. Server Streaming: The client sends one message, the server returns multiple messages, and then closes the stream. It's suitable for LLM scenarios.
3. Bidirectional Streaming: The sending and receiving of client/server are independent, which can be organized in arbitrary order.
4. Unary (gRPC): Non-streaming with `streaming.mode` annotation. Not recommended due to performance loss.
5. Ping Pong mode (KitexThrift): Traditional Thrift request-response pattern without using streams. Better performance, recommended.

Here is an example of streaming client initialization.

```go
import (
    "context"
    
    "github.com/cloudwego/kitex/client"
    "github.com/cloudwego/kitex/client/genericclient"
    "github.com/cloudwego/kitex/pkg/generic"
    "github.com/cloudwego/kitex/pkg/transmeta"
    "github.com/cloudwego/kitex/transport"
)

p, err := generic.NewThriftFileProvider(your_idl_path)
/*
// if you use dynamicgo
p, err := generic.NewThriftFileProviderWithDynamicGo(idl)
*/

// create json thrift generic
g, err := generic.JSONThriftGeneric(p)
// streaming client initialization
cli, err := genericclient.NewStreamingClient("destService", g,
    client.WithTransportProtocol(transport.GRPC),
    client.WithHostPorts(targetIPPort),
)
```

### Client Streaming

Example:

```go
// initialize client streaming client using the streaming client you created
streamCli, err := genericclient.NewClientStreaming(ctx, cli, "StreamRequestEcho")
for i := 0; i < 3; i++ {
    req := fmt.Sprintf(`{"message": "grpc client streaming generic %dth request"}`, i)
    // Send
    err = streamCli.Send(req)
    time.Sleep(time.Second)
}
// Recv
resp, err := streamCli.CloseAndRecv()
strResp, ok := resp.(string) // response is json string
```

### Server Streaming

Note: An `io.EOF` error returned by `Recv` indicates that the server has finished sending and normally closed the stream, while other non-nil errors indicate actual errors.

Example:

```go
// initialize server streaming client using the streaming client you created, and send a message
streamCli, err := genericclient.NewServerStreaming(ctx, cli, "StreamResponseEcho", `{"message": "grpc server streaming generic request"}`)
for {
    resp, err := streamCli.Recv()
    if err == io.EOF {
       log.CtxInfof(stream.Context(), "serverStreaming message receive done. stream is closed")
       break
    } else if err != nil {
       klog.CtxInfof(stream.Context(), "failed to recv: "+err.Error())
       break
    } else {
       strResp, ok := resp.(string) // response is json string
       klog.CtxInfof(stream.Context(), "serverStreaming message received: %+v", strResp)
    }
}
```

### Bidirectional Streaming

Example:

```go
// initialize bidirectional streaming client using the streaming client you created
streamCli, err := genericclient.NewBidirectionalStreaming(ctx, cli, "BidirectionalEcho")

wg := &sync.WaitGroup{}
wg.Add(2)

// Send
go func() {
    defer func() {
       if p := recover(); p != nil {
          err = fmt.Errorf("panic: %v", p)
       }
       wg.Done()
    }()
    // Tell the server there'll be no more message from client
    defer streamCli.Close()
    for i := 0; i < 3; i++ {
       req := fmt.Sprintf(`{"message": "grpc bidirectional streaming generic %dth request"}`, i)
       if err = streamCli.Send(req); err != nil {
          klog.Warnf("bidirectionalStreaming send: failed, err = " + err.Error())
          break
       }
       klog.Infof("BidirectionalStreamingTest send: req = %+v", req)
    }
}()

// Recv
go func() {
    defer func() {
       if p := recover(); p != nil {
          err = fmt.Errorf("panic: %v", p)
       }
       wg.Done()
    }()
    for {
       resp, err := streamCli.Recv()
       if err == io.EOF {
          log.CtxInfof(stream.Context(), "bidirectionalStreaming message receive done. stream is closed")
          break
       } else if err != nil {
          klog.CtxInfof(stream.Context(), "failed to recv: "+err.Error())
          break
       } else {
          strResp, ok := resp.(string) // response is json string
          klog.CtxInfof(stream.Context(), "bidirectionalStreaming message received: %+v", strResp)
       }
    }
}()
wg.Wait()
```

### Unary

The usage of unary call is similar to normal (non-streaming) generic call.

Example:

```go
resp, err := cli.GenericCall(ctx, "UnaryEcho", `{"message": "unary request"}`)
strResp, ok := resp.(string) // response is json string
```

## FAQ

### Recv() got err: rpc error: code = 12 desc = Method not found!

This error occurs when calling with Kitex **protobuf** generic streaming when the downstream is **gRPC-python** (gRPC libraries for other languages may also have this problem).

The root cause is that Kitex does not parse the package in the protobuf idl, so the package part of `:path` in the gPRC request is missing, and gRPC-python can't find the corresponding method.

e.g.

- normal client

`:path` - /search.gpt_engine.GPTStreamService/GPTGeneration

- protobuf generic client

`:path` - /GPTStreamService/GPTGeneration

#### Solution

Use the following branch to solve it and wait for the official release of Kitex v0.13.1 to fix this issue.

```shell
go get -u github.com/cloudwego/kitex@v0.13.1
```
