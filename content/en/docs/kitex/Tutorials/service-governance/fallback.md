---
title: "Fallback"
date: 2023-03-09
weight: 6
keywords: ["Kitex", "Fallback"]
description: Kitex Fallback Introduction and Usage Guide.
---

> **Support Version: >= v0.5.0 （go.mod dependencies: [github/cloudwego/kitex](https://github.com/cloudwego/kitex))**
>
> Protobuf Generated code version: >=v0.5.0（The version can be found in the header of the generated code file and in the version comments.）
>
> Thrift : No specific requirement for the generated code version

## 1.Kitex Fallback Functional Description

After an RPC request fails, businesses usually take some fallback measures to ensure a valid response (such as constructing a default response when encountering timeouts or circuit breakers). Kitex's Fallback supports handling all exceptional requests. Additionally, as business exceptions maybe return through Resp (BaseResp), Fallback also supports handling Resp.

### 1.1 Result types that support Fallback

1. **RPC** **Error**: RPC request exceptions such as timeout, circuit breaker, rate limiting, and protocol errors at the RPC level.
2. **Business Error**: Business custom exception, which is distinct from RPC Exception, for the details please see [Kitex - Business Exception Usage Guide]((/docs/kitex/tutorials/basic-feature/bizstatuserr/)
3. **Resp**: In the absence of using business exceptions, users will define error returns in Resp (BaseResp). Therefore, fallback can also be done by judging Resp.

### 1.2 Monitoring reporting

After fallback, a successful Resp may be directly returned, which appears as a successful request to the user, but is still considered a failed request at the RPC level. Therefore, the monitoring system defaults to reporting the original result, but can be configured to report based on the fallback result.

## 2.Usage approach

Due to the involvement of business logic, Fallback is only supported through code configuration.

### 2.1 Client-level configuration

```Go
import (
    "github.com/cloudwego/kitex/client"
)

var opts []client.Option
opts = append(opts, client.WithFallback(yourFallbackPolicy))

xxxCli := xxxservice.NewClient("target_service", opts...)
```

### Call-level configuration

```Go
import (
    "github.com/cloudwego/kitex/client/callopt"
)

xxxCli.XXXMethod(ctx, req, callopt.WithFallback(yourFallbackPolicy))
```

### 2.3 How to configure Fallback Policy

#### 2.3.1 Define your Fallback Func

Kitex provides two ways to define Fallback Func:

1. Use XXXArgs/XXXResult as req/resp parameters, similar to Middleware.

2. Use actual RPC Req/Resp as parameters, similar to Handler's parameter types.

The latter is more intuitive and user-friendly, but it is not compatible with APIs that have multiple request parameters. Therefore, the framework defaults to using the former method.

**Use XXXArgs/XXXResult as req/resp parameters**

Note: You must replace the original return value using result.SetSuccess(yourFallbackResult).

```go
// Func is the definition for fallback func, which can do fallback both for error and resp.
// Notice !! The args and result are not the real rpc req and resp, are respectively XXArgs and XXXResult of generated code.
// setup eg: client.WithFallback(fallback.NewFallbackPolicy(yourFunc))
type Func func(ctx context.Context, args utils.KitexArgs, result utils.KitexResult, err error) (fbErr error)

// use demo
client.WithFallback(
    fallback.NewFallbackPolicy(
        func(ctx context.Context, args utils.KitexArgs, result utils.KitexResult, err error) (fbErr error) {
            // your fallback logic...
            result.SetSuccess(yourFallbackResult)
            return
        }
    )
)
```

**Use actual RPC Req/Resp as parameters**

By using the **fallback.UnwrapHelper** provided by Kitex, you can define a Fallback Func with the signature of RealReqRespFunc, whose parameter types are consistent with Handler's req and resp.

Note: If you need to return resp, you need to construct the actual RPC resp as the return value here, and the Helper will call the SetSuccess method to replace the original return value.

```Go
// RealReqRespFunc is the definition for fallback func with real rpc req as param, and must return the real rpc resp.
// setup eg: client.WithFallback(fallback.NewFallbackPolicy(fallback.UnwrapHelper(yourRealReqRespFunc)))
type RealReqRespFunc func(ctx context.Context, req, resp interface{}, err error) (fbResp interface{}, fbErr error)

// use demo
client.WithFallback(
    fallback.NewFallbackPolicy(
        fallback.UnwrapHelper(
            func(ctx context.Context, req, resp interface{}, err error) (fbResp interface{}, fbErr error) {
                // your fallback logic...
                return fbResp, fbErr
            }
        )
    )
)
```

#### 2.3.2 Construct your Fallback Policy

The default constructor method for creating a Fallback Policy is NewFallbackPolicy, the framework will trigger fallback execution for both errors and responses to make it easier for businesses to use.Also,the framework provides encapsulation for users who want to execute fallbacks for errors or timeouts/circuit breakers.

1. **Execute fallback based on judgment of both errors and responses**

```Go
// Method 1: XXXArgs/XXXResult as params
fallback.NewFallbackPolicy(
    func(ctx context.Context, args utils.KitexArgs, result utils.KitexResult, err error) (fbErr error) {
        // your fallback logic...
        result.SetSuccess(yourFallbackResult)
        return
    }
)

// Method 2: real rpc req/resp as params
fallback.NewFallbackPolicy(
    fallback.UnwrapHelper(
        func(ctx context.Context, req, resp interface{}, err error) (fbResp interface{}, fbErr error) {
            // your fallback logic...
            return
        }
    )
)
```

2. **Execute fallback only on Errors (including business errors)**

   The Fallback will not be executed for non-Errors.

```Go
// 1: XXXArgs/XXXResult as params
fallback.ErrorFallback(
    func(ctx context.Context, args utils.KitexArgs, result utils.KitexResult, err error) (fbErr error) {
        // your fallback logic...
        result.SetSuccess(yourFallbackResult)
        return
    }
)

// 2: real rpc req/resp as params
fallback.ErrorFallback(
    fallback.UnwrapHelper(
        func(ctx context.Context, req, resp interface{}, err error) (fbResp interface{}, fbErr error) {
            // your fallback logic...
            return
        }
    )
)
```

3. **Execute fallback only on timeout and circuit-breaker errors**

   The Fallback will not be executed for non-timeout and circuit-breaker error.

```Go
// 1: XXXArgs/XXXResult as params
fallback.TimeoutAndCBFallback(func(ctx context.Context, args utils.KitexArgs, result utils.KitexResult, err error) (fbErr error) {
    // your fallback logic...
    result.SetSuccess(yourFallbackResult)
    return
})

// 2: real rpc req/resp as params
fallback.TimeoutAndCBFallback(fallback.UnwrapHelper(func(ctx context.Context, req, resp interface{}, err error) (fbResp interface{}, fbErr error) {
    // your fallback logic...
    return
}))
```

#### 2.3.3 How to report monitoring data based on Fallback result

The framework defaults to reporting monitoring data based on the original RPC results.The fallback.Policy provides the **EnableReportAsFallback()** method to choose to report the fallback results.

**Note**: If the original result was not an RPC failure (business error), but if an error is returned in the Fallback, even if EnableReportAsFallback is set, the framework will not report the Fallback result.

| **Original Result**                                      | **Whether to use EnableReportAsFallback()** | **Reported Result**                                                  |
| -------------------------------------------------------- | ------------------------------------------- | -------------------------------------------------------------------- |
| RPC Fail                                                 | YES                                         | fallback result                                                      |
| RPC Fail                                                 | NO                                          | is_error=1 <br/>(rpcinfo.GetRPCInfo(ctx).Stats().Error() is not nil) |
| Business Error(Biz Err or BaseResp Non-successful state) | YES/NO                                      | is_error=0 <br/>(rpcinfo.GetRPCInfo(ctx).Stats().Error() is nil)     |

### 2.4 Configuration example

#### **Example 1**: Only execute fallback for timeout and circuit-breaker errors, and reporting monitoring data based on the fallback result.

```Go
yourFallbackPolicy := fallback.TimeoutAndCBFallback(func(ctx context.Context, args utils.KitexArgs, result utils.KitexResult, err error) (fbErr error) {
   methodName := rpcinfo.GetRPCInfo(ctx).To().Method()
   fbRPCResp := buildFallbackRPCResp(methodName, req)
   result.SetSuccess(fbRPCResp)
   return nil
}).EnableReportAsFallback()

var opts []client.Option
opts = append(opts, client.WithFallback(yourFallbackPolicy))

xxxCli := xxxservice.NewClient("target_service", opts...)
```

#### **Example 2**: Fallback is needed for both Error and Resp, and the real RPC req/resp types are used as parameters

```Go
yourFallbackPolicy := fallback.NewFallbackPolicy(fallback.UnwrapHelper(func(ctx context.Context, req, resp interface{}, err error) (fbResp interface{}, fbErr error) {
    methodName := rpcinfo.GetRPCInfo(ctx).To().Method()
    fbResp = buildFallbackRPCResp(methodName, req, resp)
    return fbResp, nil
})).EnableReportAsFallback()

xxxCli.XXXMethod(ctx, req, callopt.WithFallback(yourFallbackPolicy))
```

## 3.Notes

### 3.1 Description of special return values

- If both resp and err in the Fallback are nil, the framework will return the original resp and error.
- If both resp and err in the Fallback are not nil, the resp will not be returned to the user.
- It is allowed for the Fallback to return an error.

### 3.2 Usage of Kitex Protobuf / Kitex gRPC

- Fallback is supported for Kitex Protobuf and Kitex gRPC unary requests, but requires generated code version >=v0.5.0 (The version can be found in the header of the generated code file and in the version comments.)
- Kitex gRPC streaming requests do not support fallback.
