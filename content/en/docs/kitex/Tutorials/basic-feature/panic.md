---
title: "Deal with panic"
linkTitle: "Deal with panic"
weight: 8
description: "This article introduces the way Kitex deals with panic"
---

## Introduction

- The panic that occurs in the goroutine created by the business code using the go keyword, SHOULD be recovered by business code (Due to the limit of golang, it can not be recovered by Kitex)
- In order to ensure the stability of the service, the Kitex framework will automatically recover all other panics.

## FAQ

### Q: How to recover panic in Server Middleware?

The answer is: NO, YOU CAN'T; but kitex provides a way to get the details of the recovered panic.

The kitex framework recovers panics in the handler itself, and (currently) DOES NOT provide any means of inserting recover logic or middleware before that.

### Q: Get details of recovered panic

You can check for recovered panic in your Middleware as follows:

```go
// After calling next(...) in your middleware:
ri := rpcinfo.GetRPCInfo(ctx)
if stats := ri.Stats(); stats != nil {
    if panicked, err := stats.Panicked(); panicked {
        // `err` is the object kitex get by calling recover()
    }
}
```