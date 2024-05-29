---
title: "Metainfo"
date: 2021-09-30
weight: 2
keywords: ["Kitex", "Metainfo", "Metadata"]
description: 除了 IDl 定义的数据结构外，Kitex 支持额外的元信息传递的能力，并且支持与不同框架之间的互通。
---

## 元信息

作为一个 RPC 框架，Kitex 服务之间的通信都是基于 IDL（thrift、protobuf 等）描述的协议进行的。IDL 定义的服务接口决定了客户端和服务端之间可以传输的数据结构。

然而在实际生产环境，我们偶尔会有特殊的信息需要传递给对端服务，而又不希望将这些可能是临时或者格式不确定的内容显式定义在 IDL 里面，这就需要框架能够支持一定的元信息传递能力。

**注意** _必须使用支持元信息的透传的底层传输协议才可用，例如 TTheader、HTTP、gRPC_。

为了和底层的协议解耦，同时也为了支持与不同框架之间的互通，Kitex 并没有直接提供读写底层传输协议的元信息的 API，而是通过一个独立维护的基础库 [metainfo][metainfo] 来支持元信息的传递。

## 正向元信息传递

包 [metainfo][metainfo] 提供了两种类型的正向元信息传递 API：临时的（transient）和持续的（persistent）。前者适用于通常的元信息传递的需求；后者是在对元信息有持续传递需求的场合下使用，例如日志 ID、染色等场合，当然，持续传递的前提是下游以及更下游的服务都是支持这一套数据透传的约定，例如都是 Kitex 服务。

客户端的例子：

```golang
import "github.com/bytedance/gopkg/cloud/metainfo"

func main() {
    ...
    ctx := context.Background()
    cli := myservice.MustNewClient(...)
    req := myservice.NewSomeRequest()

    ctx = metainfo.WithValue(ctx, "temp", "temp-value")       // 附加元信息到 context 里
    ctx = metainfo.WithPersistentValue(ctx, "logid", "12345") // 附加能持续透传的元信息
    resp, err := cli.SomeMethod(ctx, req)                     // 将得到的 context 作为客户端的调用参数
    ...
}
```

服务端的例子：

```golang
import (
    "context"

    "github.com/bytedance/gopkg/cloud/metainfo"
)

var cli2 = myservice2.MustNewClient(...) // 更下游的服务的客户端

func (MyServiceImpl) SomeMethod(ctx context.Context, req *SomeRequest) (res *SomeResponse, err error) {
    temp, ok1 := metainfo.GetValue(ctx, "temp")
    logid, ok2 := metainfo.GetPersistentValue(ctx, "logid")

    if !(ok1 && ok2) {
        panic("It looks like the protocol does not support transmitting meta information")
    }
    println(temp)  // "temp-value"
    println(logid) // "12345"

    // 如果需要调用其他服务的话
    req2 := myservice2.NewRequset()
    res2, err2 := cli2.SomeMethod2(ctx, req2) // 在调用其他服务时继续传递收到的 context，可以让持续的元信息继续传递下去
    ...
}
```

## 反向元信息传递

一些传输协议还支持反向的元数据传递，因此 Kitex 也利用 [metainfo][metainfo] 做了支持。

客户端的例子：

```golang
import "github.com/bytedance/gopkg/cloud/metainfo"

func main() {
    ...
    ctx := context.Background()
    cli := myservice.MustNewClient(...)
    req := myservice.NewSomeRequest()

    ctx = metainfo.WithBackwardValues(ctx) // 标记要接收反向传递的数据的 context
    resp, err := cli.SomeMethod(ctx, req)  // 将得到的 context 作为客户端的调用参数

    if err == nil {
        val, ok := metainfo.RecvBackwardValue(ctx, "something-from-server") // 获取服务端传回的元数据
        println(val, ok)
    }

    // 获取服务端传回的所有元数据
    m := metainfo.RecvAllBackwardValues(ctx) // m: map[string]string
    if m != nil {
        for key, value := range m {
            log.Printf("key: %s, value: %s", key, value)
        }
    }
    ...
}
```

服务端的例子：

```golang
import (
    "context"

    "github.com/bytedance/gopkg/cloud/metainfo"
)

func (MyServiceImpl) SomeMethod(ctx context.Context, req *SomeRequest) (res *SomeResponse, err error) {
    ok := metainfo.SendBackwardValue(ctx, "something-from-server-key", "something-from-server-value")

    if !ok {
        panic("It looks like the protocol does not support transmitting meta information backward")
    }
    ...
}
```

[metainfo]: https://pkg.go.dev/github.com/bytedance/gopkg/cloud/metainfo

## Kitex gRPC metadata

Kitex gRPC 场景也可以同样使用 metainfo。但注意，需要满足用大写 + '\_' 格式的 CGI 网关风格接口的 key 。

除了 metainfo 用法，也兼容了原本的 metadata 传输方式。但二者不可混合使用。

与原生 gRPC 类似，正向传递通过 metadata 实现。反向传递通过 Header 或者 Trailer 发回，具体用法如下：

### 正向传递

Client 发送设置：

```golang
  ctx := metadata.AppendToOutgoingContext(ctx, "k1", "v1", "k1", "v2", "k2", "v3")
  // unary 场景
  resp, err := client.SayHello(ctx, req)
  // stream 场景
  stream, err := client.CallStream(ctx)
```

Server 接收：

```golang
  // unary 场景
  md, ok := metadata.FromIncomingContext(ctx)
  // stream 场景
  md, ok := metadata.FromIncomingContext(stream.Context())
```

### 反向传递

#### Unary

Unary 场景中，Server 向 Client 发送元信息方式如下：

Server 设置:

```golang
  nphttp2.SendHeader(ctx, metadata.Pairs("k1", "v1"))
  nphttp2.SetHeader(ctx, metadata.Pairs("k1", "v1"))
  nphttp2.SetTrailer(ctx, metadata.Pairs("k2", "v2"))
```

Client 接收：

```golang
  // 提前设置
  var header, trailer metadata.MD
  ctx = nphttp2.GRPCHeader(ctx, &header)
  ctx = nphttp2.GRPCTrailer(ctx, &trailer)
  // RPC Call
  resp, err := client.SayHello(ctx, req)
  // 获取 header 和 trailer
  log.Println("header is ", header)
  log.Println("trailer is ", trailer)
```

#### Streaming

Streaming 场景中，Server 向 Client 发送元信息方式如下：
Server 发送：

```golang
  stream.SetHeader(metadata.Pairs("k1", "v1"))
  stream.SetTrailer(metadata.Pairs("k2","v2"))
```

Client 接收：

```golang
  // 发起 stream call 之后
  md, _ := stream.Header()
  md = stream.Trailer()
```
