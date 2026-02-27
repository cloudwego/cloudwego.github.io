---
title: "流生命周期控制最佳实践"
linkTitle: "流生命周期控制最佳实践"
weight: 4
date: 2025-09-29
description: "Kitex StreamX 流生命周期控制最佳实践，介绍如何使用 ctx cancel 控制流式调用生命周期。"
---

## 背景

与模型层直接进行流式交互时，需要调用方在某些场景直接通知模型层停止响应，从而节省模型资源。

在大模型应用场景如经典的 Chat，整个链路使用流式接口需要串联，需要感知端上用户断开的信号并快速让整条链路都结束。

以上场景本质上需要上游能够主动结束流式调用，常使用 ctx 来进行控制，ctx 被 cancel 那么 Stream 的生命周期也会结束。

Kitex gRPC 以及 TTHeader Streaming 都支持这种基于 ctx cancel 控制 Stream 生命周期的机制，并且 TTHeader Streaming 在 gRPC 的基础上优化了错误描述，能更好地应对级联 cancel 场景问题排查。

## TTHeader Streaming 支持基于 ctx cancel 控制 Stream 生命周期

**Kitex >= v0.15.1 支持该功能**

### 上游主动 cancel 下游

此处以 ServerStreaming 为例，当上游接收到特殊的 resp 后，主动调用 cancel() 结束下游 Stream 生命周期。

#### 上游 - ServiceA

```go
// ctx 一般来源于 handler
ctx, cancel := context.WithCancel(ctx)
defer cancel()
cliSt, err := cli.InvokeStreaming(ctx, req)
if err != nil {
    // 打日志或执行其它操作
    return
}

for {
    resp, err := cliSt.Recv(cliSt.Context())
    if err != nil {
        if err == io.EOF {
            // 正常结束
            return
        }
        // 打日志或执行其它操作
        // 异常结束
        return
    }
    // 判断是否是业务上特殊的 resp，例如 resp 中定义了特殊 flag，表示结束
    if isBizSpecialResp(resp) {
        // cancel 下游 Stream
        cancel()
        return
    }
}
```

#### 下游 - ServiceB

```go
import (
    "github.com/cloudwego/kitex/pkg/kerrors"
)

func (impl *ServiceImpl) InvokeStreaming(ctx context.Context, stream Service_InvokeStreamingServer) (err error) {
    // 下游不停发送数据，仅做展示
    for {
        if err = stream.Send(ctx, resp); err != nil {
            if errors.Is(kerrors.ErrStreamingCanceled, err) {
                // 上游 cancel
            }
            // 打日志或执行其它操作
            return
        }
        time.Sleep(100 * time.Millisecond)
    }
}
```

此时下游报错描述为：

```
[ttstream error, code=12007] [server-side stream] [canceled path: ServiceA] user code invoking stream RPC with context processed by context.WithCancel or context.WithTimeout, then invoking cancel() actively
```

其中各部分错误描述含义如下所示：

| 错误描述 | 含义 | 备注 |
|---------|------|------|
| [ttstream error, code=12007] | TTHeader Streaming 错误，错误码为 12007，对应上游主动 cancel 的场景 | |
| [server-side stream] | 表示该错误由 server 侧的 Stream 抛出 | |
| [canceled path: ServiceA] | 表示由 ServiceA 主动发起 cancel | |
| user code invoking stream RPC with context processed by context.WithCancel or context.WithTimeout, then invoking cancel() actively | 具体的错误描述 | |
