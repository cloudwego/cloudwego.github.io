---
title: "StreamX FAQ"
date: 2025-01-13
weight: 5
keywords: ["Stream FAQ"]
description: ""
---

## Problems caused by programming errors

### Client forgot to call CloseSend

Kitex will proactively call CloseSend once when checking that the user no longer holds the stream object to avoid stream leaks on the local and peer ends.

Note that since the check depends on the GC timing, the delay monitoring of the stream will significantly increase at this time.

### Client persistent stream object causes stream leak

If the user holds the stream object for a long time and does not actively call stream. CloseSend, the framework will naturally assume that the stream still needs to be used, and will not close the stream and related gorotuines.

### Server call Recv stuck

If the client keeps a stream active and does not call CloseSend, the stream. Recv () function will not return.

If the server wants to avoid problems caused by incorrect usage of client users, it can customize its own timeout logic in the ctx of Recv (ctx). For example:

```go
ctx, cancel := context.WithTimeout(ctx, time.Second)
defer cancel()
stream.Recv(ctx)
```

### Server handler does not exit

Server handler function exits to indicate the end of the flow. If the user never exits from this function, the flow will never end.
