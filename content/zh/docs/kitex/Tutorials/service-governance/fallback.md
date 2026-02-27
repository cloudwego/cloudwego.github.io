---
title: "Fallback"
date: 2023-03-09
weight: 6
keywords: ["Kitex", "Fallback", "降级"]
description: Kitex 自定义 Fallback 使用指南。
---

> **支持版本：>= v0.5.0 （go.mod依赖 [github/cloudwego/kitex](https://github.com/cloudwego/kitex))**
>
> Protobuf 生成代码版本：>=v0.5.0（版本见生成代码文件头部与版本注释）
>
> Thrift 对生成代码版本无要求

## 1. Kitex Fallback 功能说明

业务在 RPC 请求失败后通常会有一些降级措施保证有效返回（比如请求超时、熔断后，构造默认返回），Kitex 的 Fallback 支持对所有异常请求进行处理。同时，因为业务异常通常会通过 Resp（BaseResp） 返回，所以也支持对 Resp 进行处理。

### 1.1 支持 Fallback 的结果类型

1. **RPC** **Error**：RPC 请求异常，如超时、熔断、限流、协议等 RPC 层面的异常
2. **业务 Error**：业务自定义的异常，区别于 RPC 异常，具体是 [Kitex - 业务异常处理使用文档](/zh/docs/kitex/tutorials/basic-feature/bizstatuserr/)
3. **Resp**：在没有使用业务异常的情况下，用户会在 Resp（BaseResp） 中定义错误返回，所以也支持对 Resp 判断做 fallback

### 1.2 监控上报

Fallback 后可能直接返回成功的 Resp，对用户而言是一次成功请求，但 RPC 层面还是失败请求，所以监控默认以原来的结果上报，但支持配置化调整为以 Fallback 结果上报。

## 2. 使用方式

因为 Fallback 涉及业务逻辑，只支持代码配置。

### 2.1 Client 维度配置

```Go
import (
    "github.com/cloudwego/kitex/client"
)

var opts []client.Option
opts = append(opts, client.WithFallback(yourFallbackPolicy))

xxxCli := xxxservice.NewClient("target_service", opts...)
```

### 2.2 Call 维度配置

```Go
import (
    "github.com/cloudwego/kitex/client/callopt"
)

xxxCli.XXXMethod(ctx, req, callopt.WithFallback(yourFallbackPolicy))
```

### 2.3 如何配置 Fallback Policy

#### 2.3.1 Fallback Func 定义

Kitex 提供两种 Fallback Func 定义：

1. 以 XXXArgs/XXXResult 作为 req/resp 参数，与 Middleware 相同

2. 以真实的 RPC Req/Resp 作为参数，与 Handler 的参数类型相同

后者符合使用直觉，对用户更加友好，但不兼容有多个请求参数的 API，因此框架默认使用前一种方法。

**XXXArgs/XXXResult 作为 req/resp 参数**

注意：必须通过 result.SetSuccess(yourFallbackResult) 替换原返回值。

```go
// Func is the definition for fallback func, which can do fallback both for error and resp.
// Notice !! The args and result are not the real rpc req and resp, are respectively XXArgs and XXXResult of generated code.
// setup eg: client.WithFallback(fallback.NewFallbackPolicy(yourFunc))
type Func func(ctx context.Context, args utils.KitexArgs, result utils.KitexResult, err error) (fbErr error)

// use demo
client.WithFallback(
fallback.NewFallbackPolicy(
func(ctx context.Context, args utils.KitexArgs,
result utils.KitexResult, err error) (fbErr error) {
// your fallback logic...
result.SetSuccess(yourFallbackResult)
return
}))
```

**真实的** **RPC** **Req/Resp 作为参数**

通过使用 Kitex 提供的 **fallback.UnwrapHelper**，可以定义签名为 RealReqRespFunc 的 Fallback Func，参数类型和 Handler 的 req、resp 一致。

注意：如果需要返回 resp，这里需要构造真实的 RPC resp 作为返回值，Helper 会调用 SetSuccess 方法 替换原返回值。

```Go
// RealReqRespFunc is the definition for fallback func with real rpc req as param, and must return the real rpc resp.
// setup eg: client.WithFallback(fallback.NewFallbackPolicy(fallback.UnwrapHelper(yourRealReqRespFunc)))
type RealReqRespFunc func(ctx context.Context, req, resp interface{}, err error) (fbResp interface{}, fbErr error)

// use demo
client.WithFallback(fallback.NewFallbackPolicy(fallback.UnwrapHelper(func(ctx context.Context, req, resp interface{}, err error) (fbResp interface{}, fbErr error) {
// your fallback logic...
return fbResp, fbErr
}))
```

#### 2.3.2 构造 Fallback Policy

默认的构造方法 NewFallbackPolicy，框架会对 Error 和 Resp 均触发 Fallback 执行，为了方便业务使用，如果用户是希望对 Error 或者 超时/熔断 做 fallback，框架也提供了封装。

1. **对 Error 和 Resp 均做判断执行 Fallback**

```Go
// 方法1：XXXArgs/XXXResult as params
fallback.NewFallbackPolicy(func(ctx context.Context, args utils.KitexArgs, result utils.KitexResult, err error) (fbErr error) {
   // your fallback logic...
   result.SetSuccess(yourFallbackResult)
   return
})

// 方法2：real rpc req/resp as params
fallback.NewFallbackPolicy(fallback.UnwrapHelper(func(ctx context.Context, req, resp interface{}, err error) (fbResp interface{}, fbErr error) {
   // your fallback logic...
   return
})
```

2. **只对 Error（包括业务 Error） 进行 Fallback**

   非 Error 不会执行 Fallback

```Go
// 1: XXXArgs/XXXResult as params
fallback.ErrorFallback(func(ctx context.Context, args utils.KitexArgs, result utils.KitexResult, err error) (fbErr error) {
   // your fallback logic...
   result.SetSuccess(yourFallbackResult)
   return
})

// 2: real rpc req/resp as params
fallback.ErrorFallback(fallback.UnwrapHelper(func(ctx context.Context, req, resp interface{}, err error) (fbResp interface{}, fbErr error) {
   // your fallback logic...
   return
})
```

3. **只对超时和熔断 Error 进行 Fallback**

   非 超时 和 熔断 Error 不会执行 Fallback

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
})
```

#### 2.3.3 如何以 Fallback 结果进行监控上报

框架默认以原来的 RPC 结果进行监控上报，fallback.Policy 提供了 **EnableReportAsFallback()** 方法可以选择以 Fallback 结果上报。

**注意**：如果原结果本来就不是 RPC 失败（业务 Error），但如果在 Fallback 里返回了 error，即使 设置了 EnableReportAsFallback，框架也不会以 Fallback 结果上报。

| **原结果**                                  | **是否使用 EnableReportAsFallback()** | **上报结果**                                                         |
| ------------------------------------------- | ------------------------------------- | -------------------------------------------------------------------- |
| RPC 失败                                    | 是                                    | fallback 结果                                                        |
| RPC 失败                                    | 否                                    | is_error=1 <br/>(rpcinfo.GetRPCInfo(ctx).Stats().Error() is not nil) |
| 业务错误 （Biz Err 或 BaseResp 非成功状态） | 是/否                                 | is_error=0 <br/>(rpcinfo.GetRPCInfo(ctx).Stats().Error() is nil)     |

### 2.4 配置示例

#### **示例1**：只对 超时和熔断 error 做 fallback，且以 fallback 结果进行监控上报

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

#### **示例2**：对 Error 和 Resp 都需要 fallback，使用真实的 RPC req/resp 类型作为参数

```Go
yourFallbackPolicy := fallback.NewFallbackPolicy(fallback.UnwrapHelper(func(ctx context.Context, req, resp interface{}, err error) (fbResp interface{}, fbErr error) {
   methodName := rpcinfo.GetRPCInfo(ctx).To().Method()
   fbResp = buildFallbackRPCResp(methodName, req, resp)
   return fbResp, nil
})).EnableReportAsFallback()

xxxCli.XXXMethod(ctx, req, callopt.WithFallback(yourFallbackPolicy))
```

## 3.注意事项

### 3.1 特殊返回值说明

- 若 Fallback 的 resp, err 均为 nil，框架将返回原来的 resp 和 error
- 若 Fallback 的 resp, err 均不为 nil，不会返回 resp 给用户
- 允许 fallback 返回 error

### 3.2 Kitex Protobuf / Kitex gRPC 使用

- Kitex Protobuf 和 Kitex gRPC 的 Unary 请求均支持 fallback ，但需要用 >=v0.5.0 工具版本生成的代码（版本见生成代码文件头部与版本注释）
- Kitex gRPC streaming 请求不支持 fallback
