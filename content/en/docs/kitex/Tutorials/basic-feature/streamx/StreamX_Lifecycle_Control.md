---
title: "Stream Lifecycle Control Best Practices"
linkTitle: "Stream Lifecycle Control Best Practices"
weight: 4
date: 2025-09-29
description: "Kitex StreamX stream lifecycle control best practices, introducing how to use ctx cancel to control streaming call lifecycle."
---

## Background

When directly interacting with the model layer through streaming, the caller needs to directly notify the model layer to stop responding in certain scenarios, thereby saving model resources.

In large model application scenarios such as classic Chat, the entire chain uses streaming interfaces that need to be connected in series, requiring perception of end-user disconnection signals and quickly ending the entire chain.

The above scenarios essentially require the upstream to be able to actively end streaming calls, often using ctx for control. When ctx is canceled, the Stream lifecycle will also end.

Kitex gRPC and TTHeader Streaming both support the mechanism of controlling Stream lifecycle based on ctx cancel, and TTHeader Streaming optimizes error descriptions on the basis of gRPC, which can better handle problem diagnosis in cascade cancel scenarios.

## TTHeader Streaming Supports Stream Lifecycle Control Based on ctx cancel

**Kitex >= v0.15.1 supports this feature**

### Upstream Actively Cancels Downstream

Here we use ServerStreaming as an example. When the upstream receives a special response, it actively calls cancel() to end the downstream Stream lifecycle.

#### Upstream - ServiceA

```go
// ctx generally comes from handler
ctx, cancel := context.WithCancel(ctx)
defer cancel()
cliSt, err := cli.InvokeStreaming(ctx, req)
if err != nil {
    // Log or perform other operations
    return
}

for {
    resp, err := cliSt.Recv(cliSt.Context())
    if err != nil {
        if err == io.EOF {
            // Normal end
            return
        }
        // Log or perform other operations
        // Abnormal end
        return
    }
    // Determine if it is a business-specific response, for example, a special flag is defined in resp to indicate end
    if isBizSpecialResp(resp) {
        // Cancel downstream Stream
        cancel()
        return
    }
}
```

#### Downstream - ServiceB

```go
import (
    "github.com/cloudwego/kitex/pkg/kerrors"
)

func (impl *ServiceImpl) InvokeStreaming(ctx context.Context, stream Service_InvokeStreamingServer) (err error) {
    // Downstream continuously sends data, only for demonstration
    for {
        if err = stream.Send(ctx, resp); err != nil {
            if errors.Is(kerrors.ErrStreamingCanceled, err) {
                // Upstream cancel
            }
            // Log or perform other operations
            return
        }
        time.Sleep(100 * time.Millisecond)
    }
}
```

At this time, the downstream error description is:

```
[ttstream error, code=12007] [server-side stream] [canceled path: ServiceA] user code invoking stream RPC with context processed by context.WithCancel or context.WithTimeout, then invoking cancel() actively
```

The meaning of each part of the error description is as follows:

| Error Description | Meaning | Notes |
|-------------------|---------|-------|
| [ttstream error, code=12007] | TTHeader Streaming error, error code 12007, corresponding to the scenario where upstream actively cancels | |
| [server-side stream] | Indicates that the error is thrown by the Stream on the server side | |
| [canceled path: ServiceA] | Indicates that ServiceA actively initiated cancel | |
| user code invoking stream RPC with context processed by context.WithCancel or context.WithTimeout, then invoking cancel() actively | Specific error description | |
