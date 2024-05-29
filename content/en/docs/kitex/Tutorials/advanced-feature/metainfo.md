---
title: "Metainfo"
date: 2021-09-30
weight: 2
keywords: ["Kitex", "Metainfo", "Metadata"]
description: In addition to IDL-defined data structures, Kitex supports additional meta-info transmitting capabilities and interoperability with different frameworks.
---

## Meta Information

As an RPC framework, Kitex services communicate with each other through protocols described by IDL (thrift, protobuf, etc.). The interface defined in an IDL determines the data structures that could be transmitted between the client and the server.

However, in the production environment, we somehow may need to send special information to a remote server and that information is temporary or has an unstable format which can not be explicitly defined in the IDL. Such a situation requests the framework to be capable of sending meta information.

**NOTE** _MUST use the underlying transport protocol that supports passthrough of meta information，such as TTHeader, gRPC, HTTP_。

To decouple with the underlying transport protocols, and interoperate with other frameworks, Kitex does not provide APIs to read or write meta information directly. Instead, it uses a stand-alone library [metainfo][metainfo] to support meta information transmitting.

## Forward Meta Information Transmitting

Package [metainfo][metainfo] provides two kinds of API for sending meta information forward -- transient and persistent. The former is for ordinary needs of sending meta information; while the later is used when the meta information needs to be kept and sent to the next service and on, like a log ID or a dying tag. Of course, the persistent APIs works only when the next service and its successors all supports the meta information tarnsmitting convention.

A client side example:

```golang
import "github.com/bytedance/gopkg/cloud/metainfo"

func main() {
    ...
    ctx := context.Background()
    cli := myservice.MustNewClient(...)
    req := myservice.NewSomeRequest()

    ctx = metainfo.WithValue(ctx, "temp", "temp-value")       // attach the meta information to the context
    ctx = metainfo.WithPersistentValue(ctx, "logid", "12345") // attach persistent meta information
    resp, err := cli.SomeMethod(ctx, req)                     // pass the context as an argument
    ...
}
```

A server side example:

```golang
import (
    "context"

    "github.com/bytedance/gopkg/cloud/metainfo"
)

var cli2 = myservice2.MustNewClient(...) // the client for next service

func (MyServiceImpl) SomeMethod(ctx context.Context, req *SomeRequest) (res *SomeResponse, err error) {
    temp, ok1 := metainfo.GetValue(ctx, "temp")
    logid, ok2 := metainfo.GetPersistentValue(ctx, "logid")

    if !(ok1 && ok2) {
        panic("It looks like the protocol does not support transmitting meta information")
    }
    println(temp)  // "temp-value"
    println(logid) // "12345"

    // if we need to call another service
    req2 := myservice2.NewRequset()
    res2, err2 := cli2.SomeMethod2(ctx, req2) // pass the context to other service for the persistent meta information to be transmitted continuously
    ...
}
```

## Backward Meta Information Transmitting

Some transport protocols also support backward meta information transmitting. So Kitex supports that through [metainfo][metainfo], too.

A client side example:

```golang
import "github.com/bytedance/gopkg/cloud/metainfo"

func main() {
    ...
    ctx := context.Background()
    cli := myservice.MustNewClient(...)
    req := myservice.NewSomeRequest()

    ctx = metainfo.WithBackwardValues(ctx) // mark the context to receive backward meta information
    resp, err := cli.SomeMethod(ctx, req)  // pass the context as an argument

    if err == nil {
        val, ok := metainfo.RecvBackwardValue(ctx, "something-from-server") // receive the meta information from server side
        println(val, ok)
    }

    // receive all the meta information from server side
    m := metainfo.RecvAllBackwardValues(ctx) // m: map[string]string
    if m != nil {
        for key, value := range m {
            log.Printf("key: %s, value: %s", key, value)
        }
    }
    ...
}
```

A server side example:

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

Kitex gRPC scenarios can also use metainfo. But note that the key of the CGI gateway style interface in the format of uppercase + '\_' needs to be satisfied.

In addition to metainfo usage, it is also compatible with the original metadata transmission method. But the two cannot be mixed.

Similar to native gRPC, the forward pass is implemented through metadata. Reverse transmission is sent back through Header or Trailer, the specific usage is as follows:

### Forward

Client send settings:

```golang
  ctx := metadata. AppendToOutgoingContext(ctx, "k1", "v1", "k1", "v2", "k2", "v3")
  // unary scene
  resp, err := client. SayHello(ctx, req)
  // stream scene
  stream, err := client. CallStream(ctx)
```

Server receives:

```golang
  // unary scene
  md, ok := metadata. FromIncomingContext(ctx)
  // stream scene
  md, ok := metadata.FromIncomingContext(stream.Context())
```

### Backward

#### Unary

In the unary scenario, the server sends meta information to the client as follows:

Server settings:

```golang
  nphttp2. SendHeader(ctx, metadata. Pairs("k1", "v1"))
  nphttp2. SetHeader(ctx, metadata. Pairs("k1", "v1"))
  nphttp2. SetTrailer(ctx, metadata. Pairs("k2", "v2"))
```

Client receives:

```golang
  // set in advance
  var header, trailer metadata.MD
  ctx = nphttp2.GRPCHeader(ctx, &header)
  ctx = nphttp2. GRPCTrailer(ctx, &trailer)
  // RPC Call
  resp, err := client. SayHello(ctx, req)
  // get header and trailer
  log.Println("header is ", header)
  log.Println("trailer is ", trailer)
```

#### Streaming

In the Streaming scenario, the server sends meta information to the client as follows:
Server sends:

```golang
  stream.SetHeader(metadata. Pairs("k1", "v1"))
  stream.SetTrailer(metadata. Pairs("k2","v2"))
```

Client receives:

```golang
  // After stream call
  md, _ := stream.Header()
  md = stream.Trailer()
```
