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

s, err := streamClient.ClientStream(ctx)
```

### Server receives meta message

```go
func (s *streamingService) ClientStream(ctx context.Context,
    stream streamx.ClientStreamingServer[Request, Response]) (*Response, error) {
   
   v, ok := metainfo.GetPersistentValue(ctx, "k1")
   // v == "v1"
   v, ok = metainfo.GetValue(ctx, "k2")
   // v == "v2"
}
```

### Server reverse pass-through meta-message

Reverse pass-through introduces a new concept, Header and Trailer. Any complete data stream must include Header and Trailer. Use these two frames to reverse pass-through information.

```go
func (s *streamingService) ClientStream(ctx context.Context,
    stream streamx.ClientStreamingServer[Request, Response]) (*Response, error) {
    
    // SetTrailer set 的 trailer 会在 server handler 结束后发送
    err := stream.SetTrailer(streamx.Trailer{"t1": "v1"})
    // 立刻发送 Header
    err = stream.SendHeader(streamx.Header{"h1": "v1"})
    if err != nil {
        return err
    }
    // 发送正常数据
    err = stream.Send(req)
}
```

### Client receives a reverse pass-through meta message

```go
s, err := streamClient.ClientStream(ctx)

// Header/Trailer 函数会一直阻塞到对端发送了 Header/Trailer 为止，或中间发生了错误
hd, err := s.Header()
// hd["h1"] == "v1"
tl, err := s.Trailer()
// tl["t1"] == "v1"
```

## FAQ

### Why is the reverse pass-through interface inconsistent with 's reverse pass-through?

Because the concept of flow is different from , under the flow, the Header can be sent independently, which means that my server can send the Header in the first second, send the Data after 10 seconds, and send the Trailer after 1 second.

At the same time, the client can also choose whether to call `.Header () ` or `.Trailer () ` to block.

Therefore, the semantics of traditional CTX cannot meet the reverse pass-through function of streams. Forward pass-through is still consistent with the original .
