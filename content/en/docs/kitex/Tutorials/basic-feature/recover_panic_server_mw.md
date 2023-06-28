---
title: "How to recover panic in server middleware?"
linkTitle: "How to recover panic in server middleware?"
weight: 6
description: "How to recover panic in server middleware?"
---

Answer: YOU CAN'T.

## Reason

The kitex framework recovers panics in the handler itself, and (currently) DOES NOT provide any means of inserting recover logic or middleware before that.

## Get details of recovered panic

What you can do is to check for recovered panic in your Middleware as follows:

```go
// After calling next(...) in your middleware:
ri := rpcinfo.GetRPCInfo(ctx)
if stats := ri.Stats(); stats != nil {
    if panicked, err := stats.Panicked(); panicked {
        // `err` is the object kitex get by calling recover()
    }
}
```

## FAQ