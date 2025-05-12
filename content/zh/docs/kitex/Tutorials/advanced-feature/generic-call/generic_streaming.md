---
title: "流式泛化调用用户指南"
date: 2025-05-12
weight: 6
keywords: ["流式泛化调用用户指南"]
description: ""
---

## 简介

**Kitex v0.12.0 起支持流式接口的 JSON 泛化调用（仅客户端）**。

## 使用方法

### 泛化流式客户端初始化

#### protobuf

以如下 Protobuf IDL 为例：

```protobuf
syntax = "proto3";
package pb;
option go_package = "pb";

message Request {
  string message = 1;
}

message Response {
  string message = 1;
}

service StreamingService {
  rpc StreamRequestEcho (stream Request) returns (Response) {}
  rpc StreamResponseEcho (Request) returns (stream Response) {}
  rpc BidirectionalEcho (stream Request) returns (stream Response) {}
  rpc UnaryEcho (Request) returns (Response) {}
}
```

上述 IDL 包含四种方法，分别对应四种场景：

1. Client Streaming：客户端发送多条消息，服务端返回一条消息后关闭流。
2. Server Streaming：客户端发送一条消息，服务端返回多条消息后关闭流，适合大模型等场景。
3. Bidirectional Streaming：客户端和服务端可独立收发消息，顺序可自定义。
4. Unary：gRPC 中的单次调用模式，不使用流机制，类似于 Thrift 中的 Ping Pong 模式。

流式客户端初始化示例：

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

ctx := context.Background()

// 初始化泛化客户端
dOpts := proto.Options{}
p, err := generic.NewPbFileProviderWithDynamicGo(idlPath, ctx, dOpts)

// 创建 JSON 泛化对象
g, err := generic.JSONPbGeneric(p)

// 初始化流式客户端
cli, err := genericclient.NewStreamingClient(
	"streaming",
	g,
	client.WithTransportProtocol(transport.GRPC),
	client.WithHostPorts("127.0.0.1:8888"),
	client.WithMetaHandler(transmeta.ClientHTTP2Handler),
)

// ... 其他流式调用示例 ...
```

#### thrift

以如下 Thrift IDL 为例：

```thrift
namespace go echo

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
    // Response EchoUnary (1: Request req) (streaming.mode="unary"), // 不推荐

    Response EchoPingPong (1: Request req), // KitexThrift，非流式
}
```

上述 IDL 包含以下场景：

1. Client Streaming：客户端发送多条消息，服务端返回一条消息后关闭流。
2. Server Streaming：客户端发送一条消息，服务端返回多条消息后关闭流，适合大模型等场景。
3. Bidirectional Streaming：客户端和服务端可独立收发消息，顺序可自定义。
4. Unary (gRPC)：带 `streaming.mode` 注解的非流式（不推荐，性能有损失）。
5. Ping Pong (KitexThrift)：传统的 Thrift 请求-响应模式，不使用流机制，性能更好，推荐使用。

流式客户端初始化示例：

```go
// 1. 创建 Thrift 文件提供者
p, err := generic.NewThriftFileProvider("../idl/streaming.thrift")

// 2. 创建 JSON Thrift 泛化调用
g, err := generic.JSONThriftGeneric(p)

// 3. 创建流式客户端
cli, err := genericclient.NewStreamingClient(
	"streaming_service",
	g,
	client.WithTransportProtocol(transport.GRPC),
	client.WithHostPorts("127.0.0.1:8888"),
	client.WithMetaHandler(transmeta.ClientHTTP2Handler),
)

// ... 其他流式调用示例 ...
```

### Client Streaming

示例：

```go
import (
	"context"
	"fmt"
	"time"
	
	"github.com/cloudwego/kitex/client/genericclient"
)

// 使用已创建的流式客户端初始化 client streaming
streamCli, err := genericclient.NewClientStreaming(ctx, cli, "EchoClient")

// 发送多个请求
for i := 0; i < 3; i++ {
	req := fmt.Sprintf(`{"message": "grpc client streaming generic %dth request"}`, i)
	if err = streamCli.Send(req); err != nil {
		return fmt.Errorf("failed to send: %v", err)
	}
	time.Sleep(time.Second)
}

// 接收最终响应
resp, err := streamCli.CloseAndRecv()
strResp, ok := resp.(string) // 响应为 json 字符串
```

### Server Streaming

注意：`Recv` 返回 `io.EOF` 错误表示服务端已发送完毕并正常关闭流，其它非 nil 错误表示出错。

示例：

```go
import (
	"context"
	"fmt"
	"io"
	
	"github.com/cloudwego/kitex/client/genericclient"
)

// 使用已创建的流式客户端初始化 server streaming，并发送消息
streamCli, err := genericclient.NewServerStreaming(ctx, cli, "EchoServer", `{"message": "grpc server streaming generic request"}`)

// 接收多个响应
for {
	resp, err := streamCli.Recv()
	if err == io.EOF {
		fmt.Println("Server streaming message receive done. stream is closed")
		break
	} else if err != nil {
		return fmt.Errorf("failed to receive: %v", err)
	}

	strResp, ok := resp.(string)
}
```

### Bidirectional Streaming

示例：

```go
import (
	"context"
	"fmt"
	"io"
	"sync"
	
	"github.com/cloudwego/kitex/client/genericclient"
	"github.com/cloudwego/kitex/pkg/klog"
)

// 使用已创建的流式客户端初始化 bidirectional streaming
streamCli, err := genericclient.NewBidirectionalStreaming(ctx, cli, "Echo")
if err != nil {
	return fmt.Errorf("failed to create bidirectional streaming: %v", err)
}

wg := &sync.WaitGroup{}
wg.Add(2)
var sendErr, recvErr error

// 发送消息
go func() {
	defer func() {
		if p := recover(); p != nil {
			sendErr = fmt.Errorf("panic: %v", p)
		}
		wg.Done()
	}()

	for i := 0; i < 3; i++ {
		req := fmt.Sprintf(`{"message": "grpc bidirectional streaming generic %dth request"}`, i)
		if err = streamCli.Send(req); err != nil {
			sendErr = fmt.Errorf("bidirectionalStreaming send: failed, err = %v", err)
			break
		}
		klog.Infof("BidirectionalStreamingTest send: req = %+v", req)
	}

    // 发送完所有消息后关闭客户端到服务端的流方向
	if cerr := streamCli.Close(); cerr != nil {
		sendErr = fmt.Errorf("stream close failed: %v", cerr)
	}
}()


// 接收消息
go func() {
	defer func() {
		if p := recover(); p != nil {
			recvErr = fmt.Errorf("panic: %v", p)
		}
		wg.Done()
	}()

	for {
		resp, err := streamCli.Recv()
		if err == io.EOF {
			klog.Infof("bidirectionalStreaming message receive done. stream is closed")
			break
		} else if err != nil {
			recvErr = fmt.Errorf("failed to recv: %v", err)
			break
		}

		strResp, ok := resp.(string)
	}
}()

wg.Wait()
```

### Ping Pong

用法与普通（非流式）泛化调用类似。

示例：

```go
import (
	"context"
	
	"github.com/cloudwego/kitex/client/genericclient"
)

resp, err := cli.GenericCall(ctx, "EchoPingPong", `{"message": "unary request"}`)
strResp, ok := resp.(string) // 响应为 json 字符串
```

## 常见问题（FAQ）

### Recv() got err: rpc error: code = 12 desc = Method not found!

该错误出现在 Kitex **protobuf** 泛化流式调用下游为 **gRPC-python**（或其他语言 gRPC 库）时。

根因是 Kitex 没有解析 protobuf idl 的 package，导致 gRPC 请求的 `:path` 缺少 package 部分，gRPC-python 找不到对应方法。

例如：

- 普通客户端

`:path` - /search.gpt_engine.GPTStreamService/GPTGeneration

- protobuf 泛化客户端

`:path` - /GPTStreamService/GPTGeneration

#### 解决办法

可用如下分支修复，等待 Kitex v0.13.1 正式发布后即可解决：

```shell
go get -u github.com/cloudwego/kitex@v0.13.1
```

如需完整 main 函数示例，请参考[官方 demo](https://github.com/cloudwego/kitex-examples/tree/main/generic_streaming)。 