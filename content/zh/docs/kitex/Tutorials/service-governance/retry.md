---
title: "请求重试"
date: 2022-08-25
weight: 4
keywords: ["Kitex", "重试", "Backup Request"]
description: Kitex 异常重试与 Backup Request 策略介绍与使用指南。
---

## 重试功能说明

目前有三类重试：异常重试、Backup Request，建连失败重试（默认）。其中建连失败是网络层面问题，由于请求未发出，框架会默认重试。 本文档介绍前两类重试的使用：

- 异常重试：提高服务整体的成功率
- Backup Request：减少服务的延迟波动

因为很多的业务请求不具有幂等性，这两类重试不会作为默认策略。

### 注意：

- 确认你的服务具有**幂等性**，再开启重试
- 异常重试会增加延迟

## 重试策略

异常重试和 Backup Request 策略方法粒度上只能配置其中之一。

- 异常重试

  默认只对超时重试，可配置支持指定异常或 Resp 重试。

| 配置项          | 默认值 | 说明                                                                                                                                                                                                                | 限制                     |
| --------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------ |
| `MaxRetryTimes` | 2      | 最大重试次数，不包含首次请求。如果配置为 0 表示停止重试。                                                                                                                                                           | 合法值：[0-5]            |
| `MaxDurationMS` | 0      | 累计最大耗时，包括首次失败请求和重试请求耗时，如果耗时达到了限制的时间则停止后续的重试。0 表示无限制。注意：如果配置，该配置项必须大于请求超时时间。                                                                |                          |
| `EERThreshold`  | 10%    | 重试熔断错误率阈值, 方法级别请求错误率超过阈值则停止重试。                                                                                                                                                          | 合法值：(0-30%]          |
| `ChainStop`     | -      | 链路中止, 默认启用。如果上游请求是重试请求，不会重试。                                                                                                                                                              | >= v0.0.5 后作为默认策略 |
| `DDLStop`       | false  | 链路超时中止，该策略是从链路的超时时间判断是否需要重试。注意，Kitex 未内置该实现，需通过 retry.RegisterDDLStop(ddlStopFunc) 注册 DDL func，结合链路超时判断，实现上建议基于上游的发起调用的时间戳和超时时间判断。​​ |                          |
| `BackOff`       | None   | 重试等待策略，默认立即重试（`NoneBackOff`）。可选：固定时长退避 (`FixedBackOff`)、随机时长退避 (`RandomBackOff`)。                                                                                                  |                          |
| `RetrySameNode` | false  | 框架默认选择其他节点重试，若需要同节点重试，可配置为 true。                                                                                                                                                         |                          |

- Backup Request

| 配置项          | 默认值 | 说明                                                                                             | 限制                     |
| --------------- | ------ | ------------------------------------------------------------------------------------------------ | ------------------------ |
| `RetryDelayMS`  | -      | Backup Request 的等待时间，若该时间内若请求未返回，会发送新的请求。必须手动配置，建议参考 TP99。 |                          |
| `MaxRetryTimes` | 1      | 最大重试次数，不包含首次请求。 如果配置为 0 表示停止重试。                                       | 合法值：[0-2]            |
| `EERThreshold`  | 10%    | 重试熔断错误率阈值，方法级别请求错误率超过阈值则停止重试。                                       | 合法值：(0-30%]          |
| `ChainStop`     | -      | 链路中止, 默认启用。如果上游请求是重试请求，不会发送 Backup Request。                            | >= v0.0.5 后作为默认策略 |
| `RetrySameNode` | false  | 框架默认选择其他节点重试，若需要同节点重试，可配置为 true                                        |                          |

## 使用方式

### 代码配置开启

注意：若通过代码配置开启重试，优先级更高，会导致动态配置 (见「动态开启或调整策略」) 无法生效。

#### 异常重试配置

- 配置示例：

```go
// import "github.com/cloudwego/kitex/pkg/retry"
fp := retry.NewFailurePolicy()
fp.WithMaxRetryTimes(3) // 配置最多重试3次
xxxCli := xxxservice.NewClient("destServiceName", client.WithFailureRetry(fp))
```

- 策略选择：

```go
fp := retry.NewFailurePolicy()

// 重试次数, 默认2，不包含首次请求
fp.WithMaxRetryTimes(xxx)

// 总耗时，包括首次失败请求和重试请求耗时达到了限制的duration，则停止后续的重试。
fp.WithMaxDurationMS(xxx)

// 关闭链路中止
fp.DisableChainRetryStop()

// 开启DDL中止
fp.WithDDLStop()

// 退避策略，默认无退避策略
fp.WithFixedBackOff(fixMS int) // 固定时长退避
fp.WithRandomBackOff(minMS int, maxMS int) // 随机时长退避

// 开启重试熔断
fp.WithRetryBreaker(errRate float64)

// 同一节点重试
fp.WithRetrySameNode()
```

##### 指定结果重试（异常/Resp）

支持版本 v0.4.0。

可配置支持指定结果重试，结果可以是请求失败，也可以指定 Resp。因为业务可能在 Resp 设置状态信息，针对某类返回重试，所以支持指定 Resp 重试，这里统称为异常重试。

- 配置示例：

```go
// import "github.com/cloudwego/kitex/pkg/retry"

var opts []client.Option
opts = append(opts, client.WithSpecifiedResultRetry(yourResultRetry))

xxxCli := xxxservice.NewClient(targetService, opts...)
```

- retry.ShouldResultRetry 定义

为了能具体到方法粒度对 error 和 resp 做判断，提供 rpcinfo 作为入参，可以通过 `ri.To().Method()` 获取方法。

```go
// ShouldResultRetryit is used for specifying which error or resp need to be retried
type ShouldResultRetry struct {
   ErrorRetry func(err error, ri rpcinfo.RPCInfo) bool
   RespRetry  func(resp interface{}, ri rpcinfo.RPCInfo) bool
}
```

- 指定 异常/Resp 实现示例：

  - 关于 Resp：

    Thrift 和 KitexProtobuf 协议 Resp 对应的是生成代码中的 \*XXXResult，不是真实的业务 Resp，获取真实的 Resp 需要断言 `interface{ GetResult() interface{} }`；

  - 关于 Error：

    对端返回的 error，kitex 都会统一封装为 `kerrors.ErrRemoteOrNetwork`，对于 Thrift 和 KitexProtobuf 以下示例可以获取对端返回 Error Msg；对于 gRPC 如果对端通过 `status.Error` 构造的错误返回，本端使用 `status.FromError(err)` 可以获取 `*status.Status`，注意 `Status` 需使用 Kitex 提供的，包路径是 `github.com/cloudwego/kitex/pkg/remote/trans/nphttp2/status`。

```go
// retry with specify Resp for one method
respRetry := func(resp interface{}, ri rpcinfo.RPCInfo) bool {
   if ri.To().Method() == "mock" {
        // Notice: you should test with your code, this is only a demo, thrift gen-code of Kitex has GetResult() interface{}
        if respI, ok1 := resp.(interface{ GetResult() interface{} }); ok1 {
            if r, ok2 := respI.GetResult().(*xxx.YourResp); ok2 && r.Msg == retryMsg {
              return true
            }
			}
   }
   return false
}
// retry with specify Error for one method
errorRetry := func(err error, ri rpcinfo.RPCInfo) bool {
   if ri.To().Method() == "mock" {
      if te, ok := errors.Unwrap(err).(*remote.TransError); ok && te.TypeID() == -100 {
         return true
      }
   }
   return false
}
// client option
yourResultRetry := &retry.ShouldResultRetry{ErrorRetry:errorRetry , RespRetry: respRetry}
opts = append(opts, client.WithSpecifiedResultRetry(yourResultRetry))
```

特别地，对于 Thrift 的 Exception，rpc 调用层面虽然返回了 error，但对框架内部处理其实视为一次成本的 RPC 请求（因为有实际的返回），如果要对其做判断需注意两点：

1. 通过 resp 做判断而不是 error
2. 若该方法重试成功即 `GetSuccess() != nil`，需重置 Exception 为 nil，因为重试使用的是一个 XXXResult，且 Resp 和 Exception 对应的是 XXXResult 的两个字段，第一次返回 Exception 已经做了赋值，第二次成功对 Resp 赋值但框架层面不会重置 Exception，需要用户自行重置。

示例如下：

```go
respRetry := func(resp interface{}, ri rpcinfo.RPCInfo) bool {
    if ri.To().Method() == "testException" {
        teResult := resp.(*stability.TestExceptionResult)
        if teResult.GetSuccess() != nil {
           teResult.SetStException(nil)
        } else if teResult.IsSetXXException() && teResult.XxException.Message == xxx {
           return true
        }
    }
    return false
}
```

#### Backup Request 配置

- Retry Delay 建议

建议配置为 TP99，则 1% 请求会触发 Backup Request。

- 配置示例：

```go
// 首次请求 xxx ms未返回，发起 backup 请求，并开启链路中止
bp := retry.NewBackupPolicy(xxx)
xxxCli := xxxservice.NewClient(targetService, client.WithBackupRequest(bp))
```

- 策略选择：

```go
bp := retry.NewBackupPolicy(xxx)

// 重试次数, 默认1，不包含首次请求
bp.WithMaxRetryTimes(xxx)

// 关闭链路中止
bp.DisableChainRetryStop()

// 开启重试熔断
bp.WithRetryBreaker(errRate float64)

// 同一节点重试
bp.WithRetrySameNode()
```

#### 方法粒度配置重试

支持版本 v0.4.0。

3.1.1,3.1.2 的示例配置会对所有方法生效，如果希望只对部分方法配置重试，或对不同方法分别配置 失败重试 或 BackupRequest，配置如下：

- 配置示例：

```go
// import "github.com/cloudwego/kitex/pkg/retry"
methodPolicies := client.WithRetryMethodPolicies(map[string]retry.Policy{
   "method1":        retry.BuildFailurePolicy(retry.NewFailurePolicy()),
   "method2":       retry.BuildFailurePolicy(retry.NewFailurePolicyWithResultRetry(yourResultRetry))})

// other methods do backup request except above methods
otherMethodPolicy := client.WithBackupRequest(retry.NewBackupPolicy(10))
var opts []client.Option
opts = append(opts, methodPolicies, otherMethodPolicy)

xxxCli := xxxservice.NewClient(targetService, opts...)
```

> 如果同时配置了 `WithFailureRetry` 或 `WithBackupRequest`，则 `WithRetryMethodPolicies` 未配置的方法会按照 `WithFailureRetry` 或 `WithBackupRequest` 策略执行。但 `WithFailureRetry` 和 `WithBackupRequest` 因为会对 client 所有方法生效，不能同时配置。

#### 请求级别配置重试（callopt）

支持版本 v0.4.0。

- 配置示例：

```go
import (
    "github.com/cloudwego/kitex/pkg/retry"
)
// demo1: call with failure retry policy, default retry error is Timeout
resp, err := cli.Mock(ctx, req, callopt.WithRetryPolicy(retry.BuildFailurePolicy(retry.NewFailurePolicy())))

// demo2: call with customized failure retry policy
resp, err := cli.Mock(ctx, req, callopt.WithRetryPolicy(retry.BuildFailurePolicy(retry. NewFailurePolicyWithResultRetry(retry.AllErrorRetry()))))

// demo3: call with backup request policy
bp := retry.NewBackupPolicy(10)
bp.WithMaxRetryTimes(1)
resp, err := cli.Mock(ctx, req, callopt.WithRetryPolicy(retry.BuildBackupRequest(bp)))
```

### 复用熔断器

当开启了服务的熔断配置可以复用熔断的统计减少额外的 CPU 消耗，注意重试的熔断阈值须低于服务的熔断阈值。

- 配置示例：

```go
// 1. 初始化 kitex 内置的 cbsuite
cbs := circuitbreak.NewCBSuite(circuitbreak.RPCInfo2Key)
// 2. 初始化 retryContainer，传入ServiceControl和ServicePanel
retryC := retry.NewRetryContainerWithCB(cs.cbs.ServiceControl(), cs.cbs.ServicePanel())

var opts []client.Option
// 3. 配置 retryContainer
opts = append(opts, client.WithRetryContainer(retryC))
// 4. 配置 Service circuit breaker
opts = append(opts, client.WithMiddleware(cbs.ServiceCBMW()))

// 5. 初始化 Client, 传入配置 option
cli, err := xxxservice.NewClient(targetService, opts...)
```

### 动态开启或调整策略

若需要结合远程配置中心，动态开启重试、或运行时调整重试策略（即「动态配置」），可以通过调用 retryContainer 的 `NotifyPolicyChange` 方法生效；目前 Kitex 开源版本暂未提供远程配置模块，使用者可集成自己的配置中心。注意：通过代码指定的配置优先级更高，会导致动态配置无法生效。

- 配置示例：

```go
retryC := retry.NewRetryContainer()
// demo
// 1. define your change func
// 2. exec yourChangeFunc in your config module
yourChangeFunc := func(key string, oldData, newData interface{}) {
    newConf := newData.(*retry.Policy)
    method := parseMethod(key)
    retryC.NotifyPolicyChange(method, policy)
}


// configure retryContainer
cli, err := xxxservice.NewClient(targetService, client.WithRetryContainer(retryC))
```

## 监控埋点

Kitex 对重试的请求在 rpcinfo 中记录了重试次数和之前请求的耗时，可以在Client侧的 metric 或日志中根据 retry tag 区分上报或输出。获取方式：

```go
var retryCount string
var lastCosts string

toInfo := rpcinfo.GetRPCInfo(ctx).To()
if retryTag, ok := toInfo.Tag(rpcinfo.RetryTag); ok {
   retryCount = retryTag
   if lastCostTag, ok := toInfo.Tag(rpcinfo.RetryLastCostTag); ok {
      lastCosts = lastCostTag
   }
}
```

## 下游识别重试请求

如果使用 TTHeader 作为传输协议，下游 handler 可以通过如下方式判断当前是否是重试请求，自行决定是否继续处理。

```go
retryReqCount, exist := metainfo.GetPersistentValue(ctx,retry.TransitKey)
```

比如 retryReqCount = 2，表示第二次重试请求（不包括首次请求），则采取业务降级策略返回部分或 mock 数据返回（非重试请求没有该信息）。

> Q: 框架默认开启链路中止，业务是否还有必要识别重试请求？
>
> 链路中止是指链路上的重试请求不会重试，比如 A->B->C，A 向 B 发送的是重试请求，如果 B->C 超时了或者配置了 Backup，则 B 不会再发送重试请求到 C。如果业务自行识别重试请求，可以直接决定是否继续请求到 C。简言之链路中止避免了 B 向 C 发送重试请求导致重试放大，业务自己控制可以完全避免 B 到 C 的请求。
