---
title: "StreamX Metainfo"
date: 2025-01-13
weight: 3
keywords: ["Stream Metainfo"]
description: ""
---

## Preface

The overall usage of message pass-through is similar to [Kitex - 元信息透传](https://bytedance.larkoffice.com/wiki/Y3ChwldJzihF4Vkb6Ekcie38no4), except that each stream can only **pass-through meta-information when created** , and sending messages cannot pass-through.

## User guide

### Client pass-through meta-message

```go
ctx = metainfo.WithPersistentValue(ctx, "k1", "v1")
ctx = metainfo.WithValue(ctx, "k2", "v2")

stream, err := cli.EchoClient(ctx)
```
> If using gRPC streaming, make sure the key is uppercase and use _ instead of - or it will be discarded. TTHeader streaming does not make this requirement.

### Server receives meta message

```go
func (s *streamingService) EchoClient(ctx context.Context,
    stream echo.TestService_EchoClientServer) (err error) {
   
   v, ok := metainfo.GetPersistentValue(ctx, "k1")
   // v == "v1"
   v, ok = metainfo.GetValue(ctx, "k2")
   // v == "v2"
}
```

### Server reverse pass-through meta-message

Reverse pass-through introduces a new concept, Header and Trailer. Any complete data stream must include Header and Trailer. Use these two frames to reverse pass-through information.

```go
import "github.com/cloudwego/pkg/streaming"

func (s *streamingService) EchoClient(ctx context.Context,
    stream echo.TestService_EchoClientServer) (err error) {
    
    // the trailer set by SetTrailer would be sent after server handler finishing
    err := stream.SetTrailer(streaming.Trailer{"t1": "v1"})
    // send Header directly
    err = stream.SendHeader(streaming.Header{"h1": "v1"})
    if err != nil {
        return err
    }
    // send normal data
    err = stream.Send(req)
}
```

### Client receives a reverse pass-through meta message

```go
stream, err := cli.EchoClient(ctx)

// Header/Trailer calling would block constantly until the remote side has sent Header/Trailer, or there was an error in the intermediate process
hd, err := stream.Header()
// hd["h1"] == "v1"
tl, err := stream.Trailer()
// tl["t1"] == "v1"
```

## FAQ

### Why is the reverse pass-through interface inconsistent with 's reverse pass-through?

Because the concept of flow is different from , under the flow, the Header can be sent independently, which means that my server can send the Header in the first second, send the Data after 10 seconds, and send the Trailer after 1 second.

At the same time, the client can also choose whether to call `.Header () ` or `.Trailer () ` to block.

Therefore, the semantics of traditional CTX cannot meet the reverse pass-through function of streams. Forward pass-through is still consistent with the original .
