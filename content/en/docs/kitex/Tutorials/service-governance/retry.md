---
title: "Retry"
date: 2022-08-25
weight: 4
keywords: ["Kitex", "Retry", "Backup Request"]
description: Kitex Exception retry and Backup Request policy Introduction and Usage Guide.
---

## Introduction

There are currently three types of retries: `Exception Retry`, `Backup Request` and `Connection Failed Retry`. Among them, `Connection Failed Retry` is a network-level problem, since the request is not sent, the framework will retry by default. Here we only present the use of the first two types of retries:

- `Exception Retry`: Improve the overall success rate of the service.
- `Backup Request`: Reduce delay jitter of request.

Because many requests are not idempotent, these two types of retries are not used as the default policy.

### Attention

- Confirm that your service is **idempotent** before enable retry.
- `Exception Retry` will increase overall latency.

## Retry Policy

Only one of the `Exception Retry` and `Backup Request` policies can be configured at method granularity.

- `Exception Retry`

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

- `Backup Request`

| Configuration Item | Default value | Description                                                                                                                                                      | Limit                            |
| ------------------ | ------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------- |
| `RetryDelayMS`     | -             | Duration of waiting for initiating a Backup Requset when the first request is not returned. This parameter must be set manually. It is suggested to set as TP99. |
| `MaxRetryTimes`    | 1             | The first request is not included. If it is configured as 0, it means to stop retrying.                                                                          | Value: [0-2]                     |
| `EERThreshold`     | 10%           | If the method-level request error rate exceeds the threshold, retry stops.                                                                                       | Value: (0-30%]                   |
| `ChainStop`        | false         | `Chain Stop` is enabled by default. If the upstream request is a retry request, it will not be retried after timeout.                                            | >= v0.0.5 as the default policy. |
| `RetrySameNode`    | false         | By default, Kitex selects another node to retry. If you want to retry on the same node, set this parameter to true.                                              |

## How to use

### Enable by Code Configuration

Note: Dynamic configuration (refer to "Dynamic open or adjust strategy") won't take effect if retry is enabled by code configuration, since code conf has high priority.

#### Exception Retry Configuration

- Configuration e.g.

```go
// import "github.com/cloudwego/kitex/pkg/retry"
fp := retry.NewFailurePolicy()
fp.WithMaxRetryTimes(3) // set the maximum number of retries to 3
xxxCli := xxxservice.NewClient("destServiceName", client.WithFailureRetry(fp))
```

- Strategy selection:

```go
fp := retry.NewFailurePolicy()

// Number of retries. The default value is 2, excluding the first request.
fp.WithMaxRetryTimes(xxx)

// Total time consuming. Including the time-consuming for the first failed request and retry request. If the duration limit is reached, the subsequent retries are stopped.
fp.WithMaxDurationMS(xxx)

// Disable `Chain Stop`
fp.DisableChainRetryStop()

// Enable DDL abort
fp.WithDDLStop()

// Backoff policy. No backoff strategy by default.
fp.WithFixedBackOff(fixMS int) // Fixed backoff
fp.WithRandomBackOff(minMS int, maxMS int) // Random backoff

// Set errRate for retry circuit breaker
fp.WithRetryBreaker(errRate float64)

// Retry on the same node
fp.WithRetrySameNode()
```

##### Retry with Specific Result（Exception/Resp）

v0.4.0 is supported.

It can be configured to support specific result to retry, and the result can be request failure or Resp. Because the business may set status information in Resp, and return retry for a certain type. This is collectively referred to as exception retry.

- Configuration e.g.

```go
// import "github.com/cloudwego/kitex/pkg/retry"

var opts []client.Option
opts = append(opts, client.WithSpecifiedResultRetry(yourResultRetry))

xxxCli := xxxservice.NewClient(targetService, opts...)
```

- retry.ShouldResultRetry Definition

In order to judge error and resp at specific method granularity, rpcinfo is provided as an input argument. The method can be obtained through `ri.To().Method()`.

```go
// ShouldResultRetryit is used for specifying which error or resp need to be retried
type ShouldResultRetry struct {
   ErrorRetry func(err error, ri rpcinfo.RPCInfo) bool
   RespRetry  func(resp interface{}, ri rpcinfo.RPCInfo) bool
}
```

- Specific Exception/Resp Implementation e.g.

  - Resp:

    Resp of Thrift and KitexProtobuf protocol correspond to \*XXXResult in the generated code, not the real business Resp. To get the real Resp, you need to assert `interface{ GetResult() interface{} }`.

  - Error:

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

In particular, for Thrift's Exception, although the rpc call layer returns an error, the internal processing of the framework is actually regarded as a one-time cost RPC request (because there is an actual return). If you want to judge it, you need to pay attention to two points:

1. Judge by resp instead of error.
2. If the method retry is successful, namely, `GetSuccess() != nil`, you need to reset Exception to nil. Because the retry uses the XXXResult, and the Resp and Exception correspond to the two fields of XXXResult. Exception has been set for the first, and the second successfully set to Resp. However, the framework layer will not reset Exception, and the user needs to reset it by himself.

e.g.

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

#### Backup Request Configuration

- Retry Delay recommendations

It is recommended to configure as TP99, then 1% request will trigger `Backup Request`.

- Configuration e.g.

```go
// If the first request is not returned after XXX ms, the backup request will be initiated and the `Chain Retry Stop` is enabled
bp := retry.NewBackupPolicy(xxx)
xxxCli := xxxservice.NewClient("targetService", client.WithBackupRequest(bp))
```

- Strategy selection:

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

#### Method Granularity Configuration Retry

v0.4.0 is supported.

The sample configuration of 3.1.1, 3.1.2 will take effect for all methods. If you want to configure retry only for some methods, or configure on Failure Retry or BackupRequest for different methods respectively, configure as follows:

- Configuration e.g.

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

> If both `WithFailureRetry` or `WithBackupRequest` are configured, methods not configured in `WithRetryMethodPolicies` will be executed according to the `WithFailureRetry` or `WithBackupRequest` policy. But `WithFailureRetry` and `WithBackupRequest` cannot be configured at the same time because they will take effect on all client methods.

#### Request Level Configuration Retry（callopt）

v0.4.0 is supported.

- Configuration e.g.

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

### Circuit Breaker Reuse

When circuit breaker is enabled for a service, you can reuse the breaker's statistics to reduce additional CPU consumption. Note that the error rate threshold for retries must be lower than the threshold for a service.

- Configuration e.g.

```go
// 1. Initialize kitex's built-in cbsuite
cbs := circuitbreak.NewCBSuite(circuitbreak.RPCInfo2Key)// 2. Initialize retryContainer, passing in ServiceControl and ServicePanel
retryC := retry.NewRetryContainerWithCB(cs.cbs.ServiceControl(), cs.cbs.ServicePanel())

var opts []client.Option
// 3. Set retryContainer
opts = append(opts, client.WithRetryContainer(retryC))
// 4. Set Service circuit breaker
opts = append(opts, client.WithMiddleware(cbs.ServiceCBMW()))

// 5. Initialize Client and pass in the configuration option
cli, err := xxxservice.NewClient(targetService, opts...)
```

### Dynamic open or adjust strategy

If you want to dynamically adjust the policy according to a remote configuration center, for example, to dynamically enable retry, or change the retry policy of a method on the run, you can invoke the `NotifyPolicyChange` method of the `retryContainer`. Currently, the open source version of Kitex does not provide integration with a remote configuration center, so Kitex users need to integrate their own configuration center with Kitex with some extra work.

Note: If it is turned on through code configuration, dynamic configuration won't take effect.

- Configuration e.g.

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

## Tracking

Kitex records the retry times and previous request time in `rpcInfo`. You can report or output a retry request based on the `retry Tag` in Client's `metric` or log through:

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

## Downstream identification

If using `TTHeader` as the transport protocol, you can determine if the downstream `handler` is currently a retry request and decide whether to continue processing.

```go
retryReqCount, exist := metainfo.GetPersistentValue(ctx,retry.TransitKey)
```

For example, `retryReqCount = 2`, which means the second retry request (excluding the first request), then the business degradation strategy can be adopted(non-retry requests do not have this information).

> Question: `Chain Stop` is enabled by default, is it necessary for services to identify retry requests?

> Answer：`Chain Stop` means that the retry request on the chain will not be retried. Assuming that there is a request chain `A->B->C`, `A` sends a retry request to `B`, while during `B->C`, if a timeout occurs or `Backup` is configured, `B` will not send a retry request to `C`. If the service can identify the retry request, it can directly decide whether to continue the request to `C`.
> In short, `Chain Stop` avoids retry amplification caused by `B` sending a retry request to `C`. The service's own control can completely avoid requests from `B` to `C`.
