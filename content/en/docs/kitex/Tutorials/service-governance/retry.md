---
title: "Retry"
date: 2022-08-25
weight: 4
keywords: ["Kitex", "Retry", "Backup Request"]
description: Kitex Exception retry and Backup Request policy Introduction and Usage Guide.
---

## 1. Introduction

Currently, there are three types of retries:

- Failure Retry
- Backup Request
- Mixed Retry (Mixed Failure Retry and Backup Request)
- Connection Failure Retry (default)
    - Connection Failure Retry is a network-level issue. Since the request was not sent, the framework will automatically retry by default when Connection Failure, and the user does not need to be concerned.

This document introduces the usage of the first three types of retries. Because many business requests are not idempotent, these three types of retries are not set as the default strategy.

### Failure Retry
To improve the overall success rate of the service, retries are by default only applied to timeout errors. However, users can also specify retries for specific errors or responses. The specific usage is explained below.

### Backup Request
To reduce service latency fluctuation, if the request is not returned within the set time, it will be sent again. The process ends when any request finishes, whether successfully or unsuccessfully.

### Mixed Retry (Failure Retry and Backup Request)
Mixed Retry function with both Failure Retry and Backup Request functions. Advantages compared to the first two types of retries:
- Can optimize the overall retry latency of Failure Retry
- Can improve the request success rate of Backup Request

### Attention

- Make sure your targeting service method is idempotent before enabling retry.
- Failure Retry and Backup Request cannot be enabled on the same method at the same time. If you need to enable it at the same time, please use Mixed Retry.
- Timeout retry will increase latency

## 2. Retry Policy

### 2.1 Failure Retry

The default is for timeout retry only, and it can be configured to support specific exception or Resp retry.

| Configuration Item | Default value | Description                                                                                                                                                                                                                                             | Limit                            |
| ------------------ | ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------- |
| `MaxRetryTimes`    | 2             | The first request is not included. If it is configured as 0, it means to stop retrying.                                                                                                                                                                 | Value: [0-5]                     |
| `MaxDurationMS`    | 0             | Including the time-consuming of the first failed request and the retry request. If the limit is reached, the subsequent retry will be stopped. 0 means unlimited. Note: if configured, the configuration item must be greater than the request timeout. |
| `EERThreshold`     | 10%           | If the method-level request error rate exceeds the threshold, retry stops.                                                                                                                                                                              | Value: (0-30%]                   |
| `ChainStop`        | -             | `Chain Stop` is enabled by default. If the upstream request is a retry request, it will not be retried.                                                                                                                                                 | >= v0.0.5 as the default policy. |
| `DDLStop`          | false         | If the timeout period of overall request chain is reached, the retry request won't be sent with this policy. Notice, Kitex doesn't provide build-in implementation, use `retry.RegisterDDLStop(ddlStopFunc)` to register is needed.                     |
| `BackOff`          | None          | Retry waiting strategy, `NoneBackOff` by default. Optional: `FixedBackOff`, `RandomBackOff`.                                                                                                                                                            |
| `RetrySameNode`    | false         | By default, Kitex selects another node to retry. If you want to retry on the same node, set this parameter to true.                                                                                                                                     |

#### 2.1.1 Custom Result Retry - retry. ShouldResultRetry definition

In order to be specific to the method-level error or resp to judge, provide rpcinfo as parameter, you can get the method through ri.To().Method().

```go
// ShouldResultRetryit is used for specifying which error or resp need to be retried
type ShouldResultRetry struct {
   ErrorRetry func(err error, ri rpcinfo.RPCInfo) bool
   RespRetry  func(resp interface{}, ri rpcinfo.RPCInfo) bool
   // disable the default timeout retry in specific scenarios (e.g. the requests are not non-idempotent)
   NotRetryForTimeout bool
}
````

### 2.2 Backup Request

| Configuration Item | Default value | Description                                                                                                                                                      | Limit                            |
| ------------------ | ------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------- |
| `RetryDelayMS`     | -             | Duration of waiting for initiating a Backup Requset when the first request is not returned. This parameter must be set manually. It is suggested to set as TP99. |
| `MaxRetryTimes`    | 1             | The first request is not included. If it is configured as 0, it means to stop retrying.                                                                          | Value: [0-2]                     |
| `EERThreshold`     | 10%           | If the method-level request error rate exceeds the threshold, retry stops.                                                                                       | Value: (0-30%]                   |
| `ChainStop`        | false         | `Chain Stop` is enabled by default. If the upstream request is a retry request, it will not be retried after timeout.                                            | >= v0.0.5 as the default policy. |
| `RetrySameNode`    | false         | By default, Kitex selects another node to retry. If you want to retry on the same node, set this parameter to true.                                              |

### 2.3 Mixed Retry

| Configuration Item          | Default Val | Description                                                                                                                                                                                                                                                                                                       | Legal value                                                       | 对比 Failure Retry                            | 对比 Backup Request                                                                                                                                               |
| ------------------- | --------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------- |--------------------------------|-----------------------------------------------------------------------------------------------------------------------------------------------------------------|
| RetryDelayMS        | -               | Duration of waiting for initiating a Backup Requset when the first request is not returned. This parameter must be set manually. It is suggested to be set as TP99.                                                                                                                                                   |                                                                       | ——                             | As long as there is a result for Backup Request, no new Backup Request will be sent regardless of the result.Mixed Retry waits for valid results to be replied. |
| MaxRetryTimes       | 1               | The maximum number of retries for both Backup request and Failure Retry, excluding the first request. If configured to 0, it means to stop retrying.                                                                                                                                                                  | [0-3]                                                                 | Legal val: [0-2]Default Val: 2 | Legal val: [0-5]Default Val: 1                                                                                                                                  |
| MaxDurationMS       | 0               | The cumulative maximum time consumption, including the first failed request and the retry requests. If time consumption reaches the limit, the subsequent retries will be stopped, and the unit is ms. 0 means no limit. Note: If configured, the configuration item must be greater than the request timed out time. | Minimum: RPCTimeoutTheoretical Maximum:RPCTimeout * (MaxRetryTimes+1) | Default Val: 0                 | ——                                                                                                                                                              |
| StopPolicy.CBPolicy | 10%             | Retry Percentage LimitNote: Single instance - method granularity. If it exceeds the threshold, stop retrying.                                                                                                                                                                                                         | (0-30%]                                                               | Same                           | Same                                                                                                                                                            |
| ChainStop           | true            | `Chain Stop` is enabled by default. If the upstream request is a retry request, it will not be retried.                                                                                                                                                                                                               |                                                                       | Same                           | Same                                                                                                                                                            |
| DDLStop             | false           | If the timeout period of overall request chain is reached, the retry request won’t be sent with this policy. Notice, Kitex doesn’t provide build-in implementation, use `retry.RegisterDDLStop(ddlStopFunc)` to register is needed.                                                                                 |                                                                       | Same                           | ——                                                                                                                                                              |
| BackOff             | None            | Retry waiting strategy, `NoneBackOff` by default. Optional: `FixedBackOff`, `RandomBackOff`.                                                                                                                                                                                                                          |                                                                       | Same                           | ——                                                                                                                                                              |

#### 2.3.1 Custom Result Retry - retry. ShouldResultRetry definition

It is same as Failure Retry, please see 2.1.1.

## 3. How to use

### 3.1 Enable by Code Configuration

Note: Dynamic configuration (refer to "Dynamic open or adjust strategy") won't take effect if retry is enabled by code configuration, since code conf has high priority.

#### 3.1.1 Failure Retry

##### 3.1.1.1 Notice

The retry layer is implemented before middlewares, so every retry will execute all middlewares. When `next` returns an error in the middleware (such as timeout, network exception, etc.), it does NOT mean that the entire method call has failed (only this retry attempt fails, and another one may succeed). Please handle it appropriately according to business needs.
The "Custom Fallback" feature can be used to handle responses (fallback policy is executed after all middlewares).

##### 3.1.1.2 Usage

- Configuration example:

```go
// import "github.com/cloudwego/kitex/pkg/retry"
fp := retry.NewFailurePolicy()
fp.WithMaxRetryTimes(3) // 配置最多重试3次
xxxCli := xxxservice.NewClient("psm", client.WithFailureRetry(fp))
```

- Policy choices:

```go
fp := retry.NewFailurePolicy()

// Number of retries. The default value is 2, excluding the first request.
fp.WithMaxRetryTimes(xxx)

// The cumulative maximum time consumption, including the first failed request and the retry requests. If time consumption reaches the limit, the subsequent retries will be stopped
fp.WithMaxDurationMS(xxx)

// Disable `Chain Stop`
fp.DisableChainRetryStop()

// Enable DDL Stop
fp.WithDDLStop()

// Backoff policy. No backoff policy by default.
fp.WithFixedBackOff(fixMS int) // Fixed backoff
fp.WithRandomBackOff(minMS int, maxMS int) // Random backoff

// Set errRate for retry circuit breaker
fp.WithRetryBreaker(errRate float64)

// Retry on the same node
fp.WithRetrySameNode()
```

##### 3.1.1.3 Customized Error/Resp Retry Policy

Support version v0.4.0 (github.com/cloudwego/kitex). It can be configured to support retry with specified result which can be error or Resp. Because the business may set status information in the Resp and retry for some status, it supports specified Resp retry, which are collectively referred to as failure retry here.

- Configuration example:
Refer to 2.1.1 for the definition and implementation of ShouldResultRetry.

There are two ways to specify, exception/Resp retry:
- Method 1: Configure through **WithFailureRetryoption**.
- Method 2: Configure through **WithSpecifiedResultRetry** option
  - Note: it only takes effect on methods with FailurePolicy specified (either by method 1 or by remote configuration)

```go  
import "github.com/cloudwego/kitex/pkg/retry"

// Method 1: Configure through WithFailureRetry option.
var opts []client.Option
opts = append(opts, client.WithFailureRetry(
retry.NewFailurePolicyWithResultRetry(yourShouldResultRetry)))

xxxCli := xxxservice.NewClient(TargetServiceName, opts...)
```

- Implementation example of Specifying Error/Resp retry:
  - Resp：
  Resp of Thrift and KitexProtobuf protocol correspond to *XXXResult in the generated code, not the real business Resp. To get the real Resp, you need to assert `interface{ GetResult() interface{} }`.
  Error：
  The error returned by the peer, kitex will be uniformly encapsulated as `kerrors.ErrRemoteOrNetwork`. For Thrift and KitexProtobuf, the following examples can get the Error Msg returned by the peer. For gRPC, if the peer returns an error constructed by `status.Error`, and the local can use `status.FromError(err)` to get `*status.Status`. Pay attention to `Status` needs to be provided by Kitex, and the package path is `github.com/cloudwego/kitex/pkg/remote/trans/nphttp2/status`.
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

In particular, for cases where there is a Thrift Exception definition (you define an Exception for the IDL Method), although the rpc call layer returns an error, the internal processing of the framework is actually regarded as a one-time cost RPC request (because there is an actual return). If you want to judge it, you need to pay attention to two points:
1. Judge by resp instead of error.
2. If the method retry is successful, namely, `GetSuccess() != nil`, you need to reset Exception to nil. Because the retry uses the XXXResult, and the Resp and Exception correspond to the two fields of XXXResult. Exception has been set for the first, and the second successfully set to Resp. However, the framework layer will not reset Exception, and the user needs to reset it by himself.

Example：

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
###### Turn off retry for timeout

Support version v0.5.2 (github.com/cloudwego/kitex)

Because Kitex does timeout retry by default after enabling failure retry, and will also do timeout retry by default after configuring specifying Error/Resp retry, but some business interface requests are non-idempotence, and should not be retried, so provide configuration when specifying Error/Resp retry, you can choose not to do timeout retry.

> Why is the timeout error not directly handed over to the user-defined judgment?？
> Most users need to do timeout retry, only some non-idempotence requests can not retry for timeout. Considering most user scenarios, providing the configuration to disable it
```go
// set NotRetryForTimeout as true
yourResultRetry := &retry.ShouldResultRetry{NotRetryForTimeout: true, ErrorRetry: errorRetry}
opts = append(opts, client.WithSpecifiedResultRetry(yourResultRetry))
```

#### 3.1.2 Backup Request

##### 3.1.2.1 Notice (to avoid concurrency issues)

The retry layer is implemented before middlewares, so **every retry will execute all middlewares**.

Do pay attention to avoid concurrent read/write on the request/response in middlewares:

- Before calling `next`: if you're going to modify the request, please introduce a lock (sync.Mutex, sync.Once, etc.) or make a copy to avoid concurrent read/write

    - Kitex will initiate another retry attempt after "retry waiting time", so the possibility of conflict is low, but due to unpredictable factors such as inner middleware processing time and Go/OS scheduler, there may still be concurrent execution of multiple retry attempts.
- **Check the error return by** `next`

    - if the error is `kerrors.ErrRPCFinish`, it means the result of this attempt is discarded (another attempt is already decoding the response), the middleware should return directly

        - Reading the response object might conflict with the retry attempt decoding into response
    - If it's another error (such as timeout, network exception, etc.), it does **NOT** mean that the entire method call has failed (only this retry attempt fails, and another one may succeed). Please handle it appropriately according to business needs.
- The "[Custom Fallback](https://www.cloudwego.io/docs/kitex/tutorials/service-governance/fallback/)" feature can be used to handle responses (fallback policy is executed after all middlewares).

##### 3.1.2.2 Usage

- Retry Delay suggestion

The recommended configuration is TP99, then 1% of requests will trigger a backup request.

- Configuration example:

```go
// If the request not reply after XXX ms, the backup request will be sent
bp := retry.NewBackupPolicy(xxx)
var opts []client.Option
opts = append(opts, client.WithBackupRequest(bp))
xxxCli := xxxservice.NewClient("psm", opts...)
```

- Policy choices:

```go
bp := retry.NewBackupPolicy(xxx)

// Number of retries. The default value is 1, excluding the first request.
bp.WithMaxRetryTimes(xxx)

// Disable `Chain Stop`
bp.DisableChainRetryStop()

// Set errRate for retry circuit breaker
bp.WithRetryBreaker(errRate float64)

// Retry on the same node
bp.WithRetrySameNode()
```

#### 3.1.3 Mixed Retry

*Support version v0.12.0(github.com/cloudwego/kitex)。*

##### 3.1.3.1 Notice (to avoid concurrency issues)

The retry layer is implemented before middlewares, so **every retry will execute all middlewares**.

Do pay attention to avoid concurrent read/write on the request/response in middlewares:

- Before calling `next`: if you're going to modify the request, please introduce a lock (sync.Mutex, sync.Once, etc.) or make a copy to avoid concurrent read/write

    - Kitex will initiate another retry attempt after "retry waiting time", so the possibility of conflict is low, but due to unpredictable factors such as inner middleware processing time and Go/OS scheduler, there may still be concurrent execution of multiple retry attempts.
- **Check the error return by** `next`

    - if the error is `kerrors.ErrRPCFinish`, it means the result of this attempt is discarded (another attempt is already decoding the response), the middleware should return directly

        - Reading the response object might conflict with the retry attempt decoding into response
    - If it's another error (such as timeout, network exception, etc.), it does **NOT** mean that the entire method call has failed (only this retry attempt fails, and another one may succeed). Please handle it appropriately according to business needs.
- The "[Custom Fallback](https://www.cloudwego.io/docs/kitex/tutorials/service-governance/fallback/)" feature can be used to handle responses (fallback policy is executed after all middlewares).

##### 3.1.3.2 Usage

- Retry Delay suggestion

The recommended configuration is TP99, then 1% of requests will trigger a backup request.

- Configuration example:

```go
import "github.com/cloudwego/kitex/pkg/retry"

// If the request not reply after XXX ms, the backup request will be sent
mp := retry.NewMixedPolicy(xxx)
mp.WithMaxRetryTimes(3) 
xxxCli := xxxservice.NewClient("psm", client.WithMixedRetry(mp))
```

- Policy choices:

```go
mp := retry.NewMixedPolicy(xxx)

// Number of retries. The default value is 1, excluding the first request.
mp.WithMaxRetryTimes(xxx)

// The cumulative maximum time consumption, including the first failed request and the retry requests. If time consumption reaches the limit, the subsequent retries will be stopped
mp.WithMaxDurationMS(xxx)

// Disable `Chain Stop`
mp.DisableChainRetryStop()

// Enable DDL Stop
mp.WithDDLStop()

// Backoff policy. No backoff policy by default.
mp.WithFixedBackOff(fixMS int) // Fixed backoff
mp.WithRandomBackOff(minMS int, maxMS int) // Random backoff

// Set errRate for retry circuit breaker
mp.WithRetryBreaker(errRate float64)
```

##### 3.1.3.3 Customized Error/Resp Retry Policy

ShouldResultRetry is the same as failure retry. Below is a configuration example(ShouldResultRetry is defined in 3.1.1.3):

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

#### 3.1.4 How to configure by method-level

Support version v0.4.0 (github/cloudwego/kitex).

Different methods can be configured **Failure Retry** or **Backup Request** or **Mixed Retry** separately.

Note: If *WithFailureRetry* or *WithBackupRequest* or *WithMixedRetry* are configured at the same time, the methods that *WithRetryMethodPolicies* is not configured will be executed according to the *WithFailureRetry* or *WithBackupRequest* or *WithMixedRetry* policy.

- Configuration example:

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

#### 3.1.5 How to enable by request-level (callopt)

- Configuration example:

```go
import (
    "github.com/cloudwego/kitex/pkg/retry"
)
// demo1: call with failure retry policy, default retry error is Timeout
resp, err := cli.Mock(ctx, req, callopt.WithRetryPolicy(retry.BuildFailurePolicy(retry.NewFailurePolicy())))

// demo2: call with customized failure retry policy
resp, err := cli.Mock(ctx, req, callopt.WithRetryPolicy(retry.BuildFailurePolicy(retry.NewFailurePolicyWithResultRetry(retry.AllErrorRetry()))))

// demo3: call with backup request policy
bp := retry.NewBackupPolicy(10)
bp.WithMaxRetryTimes(1)
resp, err := cli.Mock(ctx, req, callopt.WithRetryPolicy(retry.BuildBackupRequest(bp)))
```

### 3.2 Dynamically enable or adjust strategies

#### 3.2.1 Supported Config Sources

List of supported config sources: [https://github.com/cloudwego/kitex/issues/973](https://github.com/cloudwego/kitex/issues/973)

#### 3.2.2 Custom Config Source

If you need to combine remote configuration to dynamically enable retry or runtime adjustment policies, you can take effect through the NotifyPolicyChange method of retryContainer. Users can integrate their own configuration center based on the Kitex remote configuration interface. Note: If it has been enabled through code configuration, dynamic configuration cannot take effect.

- Configuration example:

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
cli, err := xxxservice.NewClient(targetService, client.WithRetryContainer(retryC))
```

### 3.3 Circuit Breaker Reuse

When the circuit breaker configuration of the service is enabled, it is possible to reuse the fuse statistics to reduce additional CPU consumption.

Note:

1. The circuit break threshold for retry must be lower than the fuse threshold for the service.
2. When reusing a circuit breaker, you can strictly restrict the percentage limit of retry requests

    1. It's risky for backup requests: if a request returns after backup timeout and before rpc timeout, it will not be counted as a failure, which might lead to more requests than expected (e.g. network jitter, temporarily increased server-side pressure)

- Configuration example:

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

## 4. Monitor event tracking

Kitex records the number of retries and the time-consuming of previous requests in rpcinfo of first request for retry requests, which can be reported or output according to the retry tag in the metric or log on the Client side. Note that it is not available in the custom Client Middleware because this information is only available in the first request rpcinfo.

Get way:

```go
var retryCount stringvar lastCosts string

toInfo := rpcinfo.GetRPCInfo(ctx).To()if retryTag, ok := toInfo.Tag(rpcinfo.RetryTag); ok {
   retryCount = retryTag
   if lastCostTag, ok := toInfo.Tag(rpcinfo.RetryLastCostTag); ok {
      lastCosts = lastCostTag
    }
}
```

## 5. Identify retry requests

### 5.1 How does the downstream identify retry requests?

If TTHeader is used as the transport protocol, the downstream handler can determine whether the current request is a retry request and decide whether to continue processing by itself. Note that this judgment should be placed before the client call, not in the customized middleware of client-side.(in customized middleware of server-side is OK).

```go
retryReqCount, exist := metainfo.GetPersistentValue(ctx,retry.TransitKey)
```

For example, retryReqCount = 2, indicating that the second retry request (excluding the first request), the business degradation strategy is adopted to return part or mock data (non-retry requests do not have this information).

#### Q: The framework enables Chain Stop by default. Is it necessary for users to identify retry requests?

Chain Stop does not do retry for chain retry requests, such as A -> B -> C, A sends a retry request to B. If B-> C times out or Backup is configured, B will not send a retry request to C. If the users recognizes the retry request by itself, it can directly decide whether to continue the request to C. In short, Chain stop avoids the retry amplification caused by B sending a retry request to C, but the user can completely avoid requests from B to C.

### 5.2 How to recognize retry requests locally in client Middleware

In the client Middleware, through'metainfo. GetPersistentValue (ctx, retry. TransitKey) 'to get the retry information, it is impossible to distinguish whether it is an upstream retry request or a local retry request. If the user wants to determine whether it is a local retry request in the custom Client Middleware, it can be judged as follows:

```go
localRetryReqCount, exist := rpcinfo.GetRPCInfo(ctx).To().Tag(rpcinfo.RetryTag)
```

## FAQ

### Q: Why does a retry request always trigger a circuit breaker abort?

Unrestricted retries will cause an avalanche of requests. circuit breaker must be enabled for retries. When the proportion of retry requests reaches the threshold, CB will be triggered. The default threshold is 10%. The statistical caliber is the retry rate (retry requests/total number of requests) of a single method instance within 10 seconds.

Why did you see the retry rate of less than 10% but it was breaked? Circuit breaker is based on the rate of specific methods downstream of the current client's request statistics, not on the granularity of the current service and all methods. It needs to be viewed specifically at the same granularity.

### Q: Why is the circuit breaker still triggered when timeout rate is low?

The circuit breaker looks at the failure rate of a single method of a single instance of the Client within a period of time. Combined with monitoring, it determines whether the circuit breaker meets expectations.

In addition, to trigger fusing in low versions, the corresponding method QPS should > 20 for a single instance at the end. When the QPS is not high, retry fusing always fails to take effect. Therefore, the judgment of the request amount is removed and only the error rate is looked at. However, since the statistical window of the fuse error rate is 10s, when the QPS is very low or the first request timeout within 10s, the failure rate in the statistical window is high and the fuse is triggered. To avoid this problem, adjust the strategy in v0.0.8 to request volume > 10 && within 10s then the fuse can be triggered. Suggested version > 0.0.8.

### Q: How is the request failure rate calculated?

The failure rate of client single instance and single method within the 10s window.
