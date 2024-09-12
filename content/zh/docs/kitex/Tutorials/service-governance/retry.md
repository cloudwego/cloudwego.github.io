---
title: "请求重试"
date: 2022-08-25
weight: 4
keywords: ["Kitex", "重试", "Backup Request"]
description: Kitex 异常重试与 Backup Request 策略介绍与使用指南。
---

## 1. 重试功能说明

目前有四类重试：

- 异常重试
- Backup Request
- Mixed Retry (混合 异常重试 和 Backup Request)
- 框架建连失败重试（默认机制）

    - 建连失败是网络层面问题，由于请求未发出，框架会默认重试，一般用户无需关注

      本文档介绍前三类重试的使用，因为很多业务请求不具有幂等性，这三类**重试不会作为默认策略。**

### **异常重试（Failure Retry）**

提高服务整体的成功率。

默认只针对超时错误重试，同时支持用户指定异常或 Resp 重试，具体使用方面见下面。

### **备用请求（Backup Request）**

减少服务的延迟波动。在设置时间内未返回，再次发送请求，任意请求结束（成功或失败）则结束。

### **Mixed Retry (Failure Retry and Backup Request**)

- 可以优化 Failure Retry 的整体重试延迟
- 可以提高 Backup Request 的请求成功率

### 注意

- 确认你要请求的接口**具有幂等性**，再开启重试
- 异常重试 和 备用请求 在一个方法上不能同时启用，如果需要同时启用请使用 Mixed Retry
- 超时重试会增加延迟

## 2. 重试策略

### 2.1 **异常重试（Failure Retry）**

默认只对超时重试，可配置支持指定异常或 Resp 重试。

| **策略**            | **默认值**                                               | **说明**                                                                                                                                                                                                                                       | **限制**                                                           |
| ------------------- | -------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| MaxRetryTimes       | 2                                                        | 最大重试次数，不包含首次请求。如果配置为 0 表示停止重试。                                                                                                                                                                                      | 合法值：[0-5]                                                      |
| MaxDurationMS       | 0                                                        | 累计最大耗时，包括首次失败请求和重试请求，如果耗时达到了限制的时间则停止后续的重试，单位 ms。0 表示无限制。注意：如果配置，该配置项必须大于请求超时时间。                                                                                      | 最小值：请求超时时间<br><br>最大值：RPCTimeout * (MaxRetryTimes+1) |
| StopPolicy.CBPolicy | 10%<br><br><br><br>根据创建 Container 的不同，含义有区别 | 根据创建 Container 的不同，含义有区别<br><br>- 重试请求**占比**阈值，或<br><br>- 请求**错误率**阈值，须小于服务粒度的熔断阈值<br><br>	注：单机方法粒度，超阈值则停止重试，默认值是 10%<br><br>注：单机方法粒度，超阈值则停止重试，默认值是 10% | (0-30%]                                                            |
| ChainStop           | true                                                     | 链路中止, 默认启用。如果上游请求是重试请求，不会重试。                                                                                                                                                                                         |                                                                    |
| DDLStop             | false                                                    | 链路超时中止，该策略是从链路的超时时间判断是否需要重试。注意，Kitex 未内置该实现，需通过 retry.RegisterDDLStop(ddlStopFunc) 注册 DDL func，结合链路超时判断，实现上建议基于上游的发起调用的时间戳和超时时间判断。                              |                                                                    |
| BackOff             | None                                                     | 重试等待策略，默认立即重试（`NoneBackOff`）。可选：固定时长退避 (`FixedBackOff`)、随机时长退避 (`RandomBackOff`)。                                                                                                                             |                                                                    |
| RetrySameNode       | false                                                    | 若需要同节点重试，可配置为 true。                                                                                                                                                                                                              |                                                                    |

#### 2.1.1 自定义结果重试 - retry.ShouldResultRetry 定义

为了能具体到方法粒度对 error 和 resp 做判断，提供 rpcinfo 作为入参，可以通过 ri.To().Method() 获取方法。

```go
// ShouldResultRetryit is used for specifying which error or resp need to be retried
type ShouldResultRetry struct {
    // ErrorRetryWithCtx is added in v0.10.0, passing ctx is more convenient for user
    ErrorRetryWithCtx func(ctx context.Context, err error, ri rpcinfo.RPCInfo) bool
    // RespRetryWithCtx is added in v0.10.0, passing ctx is more convenient for user
    RespRetryWithCtx func(ctx context.Context, resp interface{}, ri rpcinfo.RPCInfo) bool
    
    // Deprecated: please use ErrorRetryWithCtx instead of ErrorRetry
    ErrorRetry func(err error, ri rpcinfo.RPCInfo) bool
    // Deprecated: please use RespRetryWithCtx instead of RespRetry
    RespRetry func(resp interface{}, ri rpcinfo.RPCInfo) bool
    // disable the default timeout retry in specific scenarios (e.g. the requests are not non-idempotent)
    NotRetryForTimeout bool
}
```

### 2.2 **备用请求（Backup Request）**

| **策略**            | **默认值** | **说明**                                                                                                               | **限制**      |
| ------------------- |---------|----------------------------------------------------------------------------------------------------------------------| ------------- |
| RetryDelayMS        | -       | Backup Request 的等待时间，若该时间内若请求未返回，会发送新的请求。必须手动配置，建议参考 TP99。                                                           |               |
| MaxRetryTimes       | 1       | 最大重试次数，不包含首次请求。如果配置为 0 表示停止重试。                                                                                       | 合法值：[0-2] |
| StopPolicy.CBPolicy | 10%     | 根据创建 Container 的不同，含义有区别<br><br>- 重试请求**占比**阈值，或<br><br>- 请求**错误率**阈值，须小于服务粒度的熔断阈值<br><br>	注意：方法级别，超阈值则停止重试，默认值是 10% | (0-30%]       |
| ChainStop           | true    | 链路中止, 默认启用。如果上游请求是重试请求，不会发送 Backup Request。                                                                          |               |
| RetrySameNode       | false   | 框架默认选择其他节点重试，若需要同节点重试，可配置为 true。                                                                                     |               |

### **2.3 Mixed Retry**

| **策略**            | **默认值** | **说明**                                                                                                                                                                                                          | **限制**                                                               | **对比  Failure Retry**        | **对比 Backup Request**                                                                                              |
| ------------------- | ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- | ------------------------------ | -------------------------------------------------------------------------------------------------------------------- |
| RetryDelayMS        | -          | Backup Request 的等待时间，若该时间内无有效请求返回，会发送新的请求。必须手动配置，建议参考 TP99。                                                                                                                |                                                                        | ——                           | Backup Request 只要有结果，不管什么结果都不会发送新的 Backup Request。<br><br>Mixed Retry 则是**等待有效结果**返回。 |
| MaxRetryTimes       | 1          | Backup request 和 Failure Retry 的共同最大重试次数，不包含首次请求。如果配置为 0 表示停止重试。                                                                                                                   | 合法值：[0-3]<br><br>默认值：1                                         | 合法值：[0-2]<br><br>默认值：2 | 合法值：[0-5]<br><br>默认值：1                                                                                       |
| MaxDurationMS       | 0          | 累计最大耗时，包括首次失败请求和重试请求，如果耗时达到了限制的时间则停止后续的重试，单位 ms。0 表示无限制。注意：如果配置，该配置项必须大于请求超时时间。                                                         | 最小值：请求超时时间<br><br>理论最大值：RPCTimeout * (MaxRetryTimes+1) | 默认值：0                      | ——                                                                                                                 |
| StopPolicy.CBPolicy | 10%        | 重试请求**占比**阈值<br><br>注：单机方法粒度，超阈值则停止重试，默认值是 10%                                                                                                                                      | (0-30%]                                                                | 相同                           | 相同                                                                                                                 |
| ChainStop           | true       | 链路中止, 默认启用。如果上游请求是重试请求，不会重试。                                                                                                                                                            |                                                                        | 相同                           | 相同                                                                                                                 |
| DDLStop             | false      | 链路超时中止，该策略是从链路的超时时间判断是否需要重试。注意，Kitex 未内置该实现，需通过 retry.RegisterDDLStop(ddlStopFunc) 注册 DDL func，结合链路超时判断，实现上建议基于上游的发起调用的时间戳和超时时间判断。 |                                                                        | 相同                           | ——                                                                                                                 |
| BackOff             | None       | 重试等待策略，默认立即重试（`NoneBackOff`）。可选：固定时长退避 (`FixedBackOff`)、随机时长退避 (`RandomBackOff`)。                                                                                                |                                                                        | 相同                           | ——                                                                                                                 |

#### 2.3.1 自定义结果重试 - retry.ShouldResultRetry 定义

与 Failure Retry 一样，见 2.1.1。

## 3. 使用方式

### 3.1 代码配置开启

注意：代码配置优先级更高，代码配置后，动态开启的方式将不会生效。

#### 3.1.1 异常重试

##### 3.1.1.1 注意事项

- 当前「重试策略」实现在中间件之前，因此**每一次重试都会执行所有中间件**，当中间件里 next 返回 err 时（例如超时、网络异常等），不代表整个 method call 失败了（只是这次重试失败了，可能有一个会成功），请根据业务需求做适当的处理
- 如果需要对异常结果做 Fallback，可以使用 “[自定义 Fallback](https://www.cloudwego.io/zh/docs/kitex/tutorials/service-governance/fallback/)”（fallback 在中间件执行完之后执行）

##### 3.1.1.2 使用方法

- 配置示例：

```go
// import "github.com/cloudwego/kitex/pkg/retry"
fp := retry.NewFailurePolicy()
fp.WithMaxRetryTimes(3) // 配置最多重试3次
xxxCli := xxxservice.NewClient("psm", client.WithFailureRetry(fp))
```

- 策略选择：

```go
fp := retry.NewFailurePolicy()

// 重试次数, 默认2，不包含首次请求
fp.WithMaxRetryTimes(xxx)

// 总耗时，包括首次失败请求和重试请求耗时达到了限制的duration，则停止后续的重试。0表示无限制。注意：如果配置，该配置项必须大于请求超时时间。
fp.WithMaxDurationMS(xxx)

// 关闭链路中止
fp.DisableChainRetryStop()

// 开启DDL中止
fp.WithDDLStop()

// 退避策略，默认无退避策略
fp.WithFixedBackOff(fixMS int) // 固定时长退避，单位毫秒
fp.WithRandomBackOff(minMS int, maxMS int) // 随机时长退避，单位毫秒

// 设置重试熔断阈值
fp.WithRetryBreaker(errRate float64)

// 同一节点重试
fp.WithRetrySameNode()
```

##### 3.1.1.3 自定义 异常/Resp 重试

支持版本 v0.4.0 (github.com/cloudwego/kitex)。可配置支持指定结果重试，结果可以为 error，也可以指定 Resp。因为业务可能在 Resp 设置状态信息，针对某类返回进行重试，所以支持指定 Resp 重试，这里统称为异常重试。

- 代码配置示例：

    关于 ShouldResultRetry 的定义和实现参考 2.1.1。

    有以下两种方式可以指定 异常/Resp 重试：

     1. 通过 `client.WithFailureRetry`** **配置
     2. 通过 `client.WithSpecifiedResultRetry`** **配置，

         注：只会在开启异常重试的方法上生效（例如通过方式 1，或者配置中心指定）

- 指定 异常/Resp 重试的例子：

  ```go
  import "github.com/cloudwego/kitex/pkg/retry"

  // Method 1: Configure through NewFailurePolicyWithResultRetry
  var opts []client.Option
  opts = append(opts, 

  xxxCli := xxxservice.NewClient(TargetServiceName, opts...)
  ```

    - 关于 Resp：

        - Thrift 和 KitexProtobuf 协议 Resp 对应的是生成代码中的 *XXXResult，不是真实的业务 Resp，获取真实的 Resp 需要断言 `interface{ GetResult() interface{} }`；
    - 关于 Error：

        - 对端返回的 error，kitex 都会统一封装为 `kerrors.ErrRemoteOrNetwork`，对于 Thrift 和 KitexProtobuf 以下示例可以获取对端返回 Error Msg；对于 gRPC 如果对端通过 `status.Error` 构造的错误返回，本端使用 `status.FromError(err)` 可以获取 `*status.Status`，注意 `Status` 需使用 Kitex 提供的，包路径是 `github.com/cloudwego/kitex/pkg/remote/trans/nphttp2/status`。
- 例：

  ```go
  // retry with specify Resp for one method
  respRetry := func(ctx context.Context, resp interface{}, ri rpcinfo.RPCInfo)
     if ri.To().Method() == xxx {
          // Notice: you should test with your code
          //
          if respI, ok1 := resp.(
              if r, ok2 := respI.GetResult().(*xxx.YourResp); ok2 && r.Msg == retryMsg {
                  return true
              }
          }
     }
     return false
  }
  // retry with specify Error for one method
  errorRetry := func(ctx context.Context, err error, ri rpcinfo.RPCInfo) bool {
     if ri.To().Method() == "mock" {
        if te, ok := errors.Unwrap(err).(*remote.TransError); ok && te.TypeID() == -100 {
           return true
        }
     }
     return false
  }
  // client option
  yourResultRetry := &retry.ShouldResultRetry{ErrorRetryWithCtx:errorRetry , RespRetryWithCtx: respRetry}
  opts = append(opts, 
  ```

  特别地，对于有 Thrift Exception 定义的情况(你对 IDL Method 定义了 Exception)，rpc 调用层面虽然返回了 error，但对框架内部处理其实视为一次成功的 RPC 请求（因为有实际的返回），如果要对其做判断需注意两点：

    1. 需要通过 resp 做判断而不是 error
    2. 若该方法重试成功既 `GetSuccess() != nil`，需重置 Exception 为 nil，因为重试使用的是一个 XXXResult，且 Resp 和 Exception 对应的是 XXXResult 的两个字段，第一次返回 Exception 已经做了赋值，第二次成功对 Resp 赋值但框架层面不会重置 Exception，需要用户自行重置。

  示例如下：
    
    ```go
    respRetry := func(ctx context.Context, resp interface{}, ri rpcinfo.RPCInfo) bool {
        if ri.To().Method() == "testException" {
            // stability.TestExceptionResult is your generated struct
            teResult := resp.(*stability.TestExceptionResult)
            if teResult.GetSuccess() != nil && teResult.IsSetXxException() {
               // GetSuccess is not nil means that it is normal response, we can set Exception as nil
               teResult.SetStException(nil)
            } else if teResult.IsSetXxException() && teResult.XxException.Message == xxx {
               return true
            }
        }
        return false
    }
    ```

###### 关闭对超时的重试

*支持版本 v0.5.2(github/cloudwego/kitex*)

因为 Kitex 在启用异常重试后，默认支持的是超时重试，在配置自定义异常/Resp 重试后也会默认对超时进行重试，但一些业务接口的请求是非幂等的，在超时异常时不应重试，所以提供配置在自定义异常重试时，可以不对超时重试。

> 为什么超时异常不直接交给用户自定义异常判断？
> 
> 大部分用户都对超时重试有诉求，只有部分非幂等的请求不能对超时做重试，考虑到大部分用户场景，所以提供的是禁用超时重试配置。

```go
// set NotRetryForTimeout as true
yourResultRetry := &retry.ShouldResultRetry{NotRetryForTimeout: true, ErrorRetryWithCtx: errorRetry}
opts = append(opts, client.WithSpecifiedResultRetry(yourResultRetry))
```

#### 3.1.2 备用请求（Backup Request）

##### 3.1.2.1 注意事项（避免并发）

当前「重试策略」实现在中间件之前，因此**每一次重试都会执行所有中间件**，MW 里需注意避免并发读写 Request、Response：

- 在调用 next 之前：如果要修改 request，建议做好并发控制或构造副本，避免并发写入 request

    - Kitex 会在「重试等待时间」后才发起下一次重试，所以冲突的可能性较低，但由于内层中间件的处理耗时、Go/OS 调度等不可控因素，仍可能并发执行
- **在调用 next 之后，请检查返回的 error**

    - 如返回的是 `kerrors.ErrRPCFinish`，说明这次重试的结果是被丢弃的（另一个重试已经在解码 response 了），中间件应直接返回

        - 读取 response 可能会和正在 decode 写入 response 的重试请求冲突
    - 如返回的是其他 err（例如超时、网络异常等），不代表整个 method call 失败了（只是这次重试失败了，可能有一个会成功），请根据业务需求做适当的处理
- 如果需要对异常结果做 Fallback，可以使用 “[自定义 Fallback](https://www.cloudwego.io/zh/docs/kitex/tutorials/service-governance/fallback/)”（fallback 在中间件执行完之后执行）

##### 3.1.2.2 使用方法

- Retry Delay 建议

  建议配置为 TP99，则 1% 请求会触发 Backup Request。
- 配置示例：

```go
import "github.com/cloudwego/kitex/pkg/retry"
// 请求 xxx ms未返回，发起 backup 请求，并开启链路中止
bp := retry.NewBackupPolicy(xxx)
var opts []client.Option
opts = append(opts, client.WithBackupRequest(bp))
xxxCli := xxxservice.NewClient("psm", opts...)
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

#### 3.1.3 Mixed Retry

*支持版本 v0.12.0(github.com/cloudwego/kitex)。*

##### 3.1.3.1 注意事项（避免并发）

当前「重试策略」实现在中间件之前，因此**每一次重试都会执行所有中间件**，MW 里需注意避免并发读写 Request、Response：

- 在调用 next 之前：如果要修改 request，建议做好并发控制或构造副本，避免并发写入 request
- **在调用 next 之后，请检查返回的 error**

    - 如返回的是 `kerrors.ErrRPCFinish`，说明这次重试的结果是被丢弃的（另一个重试已经在解码 response 了），中间件应直接返回

        - 读取 response 可能会和正在 decode 写入 response 的重试请求冲突
    - 如返回的是其他 err（例如超时、网络异常等），不代表整个 method call 失败了（只是这次重试失败了，可能有一个会成功），请根据业务需求做适当的处理
- 如果需要对异常结果做 Fallback，可以使用 “[自定义 Fallback](https://www.cloudwego.io/zh/docs/kitex/tutorials/service-governance/fallback/)”（fallback 在中间件执行完之后执行）

##### 3.1.3.2 使用方法

- Retry Delay 建议

  建议配置为 TP99，则 1% 请求会触发 Backup Request。
- 配置示例：

```go
import "github.com/cloudwego/kitex/pkg/retry"
// 请求 xxx ms未返回，发起 backup 请求
mp := retry.NewMixedPolicy(xxx)
mp.WithMaxRetryTimes(3) // 配置最多重试3次
xxxCli := xxxservice.NewClient("psm", client.WithMixedRetry(fp))
```

- 策略选择：

```go
mp := retry.NewMixedPolicy(xxx)
// 重试次数, 默认2，不包含首次请求
mp.WithMaxRetryTimes(xxx)
// 总耗时，包括首次失败请求和重试请求耗时达到了限制的duration，则停止后续的重试。0表示无限制。注意：如果配置，该配置项必须大于请求超时时间。
mp.WithMaxDurationMS(xxx)
// 关闭链路中止
mp.DisableChainRetryStop()
// 开启DDL中止
mp.WithDDLStop()
// 退避策略，默认无退避策略
mp.WithFixedBackOff(fixMS int) // 固定时长退避，单位毫秒
mp.WithRandomBackOff(minMS int, maxMS int) // 随机时长退避，单位毫秒
// 设置重试熔断阈值
mp.WithRetryBreaker(errRate float64)
```

##### 3.1.3.3 自定义 异常/Resp 重试

ShouldResultRetry 与异常重试相同，这里给出配置示例（ShouldResultRetry 定义见 3.1.1.3）：

```go
import "github.com/cloudwego/kitex/pkg/retry"
// Method 1: Configure through WithSpecifiedResultRetry option.
xxxCli := xxxservice.NewClient(TargetServiceName, client.WithMixedRetry(retry.NewMixedPolicy(100)), client.WithSpecifiedResultRetry(errRetry)))

// Method 2: Configure through NewMixedPolicyWithResultRetry.
var opts []client.Option
opts = append(opts, client.WithMixedRetry(
retry.NewMixedPolicyWithResultRetry(100, yourShouldResultRetry)))
xxxCli := xxxservice.NewClient(TargetServiceName, opts...)
```

#### 3.1.4 如何按照方法粒度配置

*支持版本 v0.4.0(github.com/cloudwego/kitex)。*

可以给不同方法分别配置 Failure Retry 或 BackupRequest 或 Mixed Retry。

注意：如果同时配置了 WithFailureRetry 或 WithBackupRequest 或 WithMixedRetry，则 WithRetryMethodPolicies 未配置的方法会按照 WithFailureRetry 或 WithBackupRequest 或 WithMixedRetry 策略执行。

- 配置示例：

```go
import "github.com/cloudwego/kitex/pkg/retry"

methodPolicies := client.WithRetryMethodPolicies(map[string]retry.Policy{
"method1":        retry.BuildFailurePolicy(retry.NewFailurePolicy()),
"method2":       retry.BuildFailurePolicy(retry.NewFailurePolicyWithResultRetry(yourResultRetry))})

// other methods do backup request except above methods
otherMethodPolicy := client.WithBackupRequest(retry.NewBackupPolicy(10))
var opts []client.Option
opts = append(opts, methodPolicies, otherMethodPolicy)

xxxCli := xxxservice.NewClient(targetService, opts...)
```

#### 3.1.5 如何调用级别设置请求重试（callopt）

配置示例：

```go
import (
    "github.com/cloudwego/kitex/pkg/retry"
)
// demo1: call with failure retry policy, default retry error is Timeout
resp, err := cli.Mock(ctx, req, callopt.WithRetryPolicy(retry.BuildFailurePolicy(retry.NewFailurePolicy())))

// demo2: call with customized failure retry policy
resp, err := cli.Mock(ctx, req, callopt.WithRetryPolicy(retry.BuildFailurePolicy(retry.NewFailurePolicyWithResultRetry(retry.AllErrorRetry()))))

// demo3: call with backup request policy
bp := retry.NewBackupPolicy(100)
bp.WithMaxRetryTimes(1)
resp, err := cli.Mock(ctx, req, callopt.WithRetryPolicy(retry.BuildBackupRequest(bp)))

// demo4: call with mixed retry policy
mp := retry.NewMixedPolicy(100)
mp.WithMaxRetryTimes(2)
resp, err := cli.Mock(ctx, req, callopt.WithMixedRetry(retry.BuildMixedPolicy(mp)))
```

### 3.2 动态开启或调整策略

#### 3.2.1 支持的配置源

已支持的配置源列表：[https://github.com/cloudwego/kitex/issues/973](https://github.com/cloudwego/kitex/issues/973)

#### 3.2.2 自定义配置源

若需要结合远程配置，动态开启重试或运行时调整策略，可以通过 retryContainer 的 `NotifyPolicyChange` 方法生效，使用者可基于 Kitex 远程配置接口集成自己的配置中心。

注意：若已通过代码配置开启，则会覆盖对应的动态配置。

- 配置示例：

```go
// Available since v0.7.2 [Recommended]
retryC := retry.NewRetryContainerWithPercentageLimit()
// Available for Kitex < 0.7.2
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
cli, err := xxxservice.NewClient(targetService,
    client.WithRetryContainer(retryC),
    client.WithCloseCallback(retryC.Close), // available since v0.7.2
)
```

### 3.3 复用熔断器

1. 重试的熔断阈值须低于服务的熔断阈值；
2. 如复用熔断器，则无法严格限制重试请求占比，只能按错误率限制重试请求

    1. 在备用请求场景有风险：在备用等待时间之后、超时之前返回的请求，不会计入失败，可能会导致重试请求超出预期（例如网络抖动、服务端压力升高时）

- 配置示例：

```go
// 1. Initialize the built-in cbsuite of kitex.
cbs := circuitbreak.NewCBSuite(circuitbreak.RPCInfo2Key)

// 2. Initialize retryContainer, pass in ServiceControl and ServicePanel
retryC := retry.NewRetryContainerWithCB(cs.cbs.ServiceControl(), cs.cbs.ServicePanel())

var opts []client.Option
// 3. Configure retryContainer
opts = append(opts, client.WithRetryContainer(retryC))
// 4. Configure Service circuit breaker
opts = append(opts, client.WithMiddleware(cbs.ServiceCBMW()))

// 5. Client initialization, passing configuration options
cli, err := xxxservice.NewClient(targetService, opts...)
```

## 4. 监控埋点

Kitex 对重试的请求在首次请求的 rpcinfo 中记录了重试次数和之前请求的耗时，可以在 Client 侧的 metric 或日志中根据 retry tag 区分上报或输出。注意，在自定义的 Client Middleware 中获取不到，因为该信息只有首次请求的 rpcinfo 才有。

获取方式：

```go
var retryCount stringvar lastCosts string

toInfo := rpcinfo.GetRPCInfo(ctx).To()if retryTag, ok := toInfo.Tag(rpcinfo.RetryTag); ok {
    retryCount = retryTag
    if lastCostTag, ok := toInfo.Tag(rpcinfo.RetryLastCostTag); ok {
        lastCosts = lastCostTag
    }
}
```

## 5. 识别重试请求

### 5.1 下游如何识别重试请求

如果使用 TTHeader 作为传输协议，下游 handler 可以通过如下方式判断当前是否是重试请求，自行决定是否继续处理。注意该判断请放在 handler 里的 client 调用前，不要放在 client 自定义 middleware 中。

```go
import (
    "github.com/bytedance/gopkg/cloud/metainfo"
    "github.com/cloudwego/kitex/pkg/retry"
)
retryReqCount, exist := metainfo.GetPersistentValue(ctx,retry.TransitKey)
```

比如 retryReqCount = 2，表示第二次**重试**请求（不包括首次请求），则采取业务降级策略返回部分或 mock 数据返回（**非重试请求没有该信息**）。

#### Q: 框架默认开启链路中止，用户是否还有必要识别重试请求？

链路中止既链路上的重试请求不会重试，比如 A->B->C，A 向 B 发送的是重试请求，如果 B->C 超时了或者配置了 Backup，则 B 不会再发送重试请求到 C。如果业务自行识别重试请求，可以直接决定是否继续请求到 C。简言之，链路中止避免了 B 向 C 发送重试请求导致重试放大，业务自己控制可以完全避免 B 到 C 的请求。

### 5.2 本地如何在 client Middleware 识别重试请求

在 client Middleware 中通过 `metainfo.GetPersistentValue(ctx,retry.TransitKey) ` 拿到重试信息无法区分是上游的重试请求还是本地的重试请求，如果用户希望在自定义的 Client Middleware 中判断是否是本地的重试请求，可以通过如下方式判断，二选一：

```go
// method 1
import "github/cloudwego/kitex/pkg/retry"
isRetry := retry.IsLocalRetryRequest(ctx)

// method 2
// first request return 0, false, only retry request set rpcinfo.RetryTag
localRetryReqCount, exist := rpcinfo.GetRPCInfo(ctx).To().Tag(rpcinfo.RetryTag)
```

## FAQ

### Q: 为什么重试请求总是触发熔断中止？

重试没有限制会造成请求雪崩，重试必须开启熔断，当重试请求比例达到阈值就会触发熔断，熔断阈值默认是 10%，统计口径-调用端单实例某个方法 10s 内的重试率（重试请求/总请求数）。

为什么你看到的重试比例不到 10% 但熔断了？熔断是按照当前 client 统计的请求下游具体方法的失败率，不是当前 service 和所有方法粒度的，需要具体到同一个粒度来看。

### Q: 为什么超时率很低还是熔断了？

熔断看的是 Client 的单实例单个方法一段时间内的失败率，结合监控判断熔断是否符合预期

另外，低版本触发熔断需要调用端**单实例对应方法** QPS>20，QPS 不高情况下重试熔断总是无法生效，于是去掉了请求量的判断，只看错误率，但由于熔断错误率的窗口是 10s，QPS 非常低或 10s 内的首次请求超时，导致统计窗口内超时率较高，触发熔断。避免这个问题，在 v0.0.8 调整策略为 10s 内**请求量 > 10 && 达到熔断阈值** 才触发熔断。建议版本 >0.0.8

### Q: 请求失败率是如何统计的?

client 单实例单个方法 10s 窗口内的失败率。
