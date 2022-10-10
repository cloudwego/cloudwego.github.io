---
title: "重试"
date: 2022-10-01
weight: 10
description: >

---

hertz为用户提供了自定义的重试逻辑，下面来看一下 client 的 retry 使用方法

## retry次数及延迟配置

首先创建 client ，使用配置项 WithRetryConfig 来配置 retry 相关逻辑（这一部分主要配置 retry 的次数和延时部分）

```go
package main

import (
	"github.com/cloudwego/hertz/pkg/app/client"
	"github.com/cloudwego/hertz/pkg/app/client/retry"
)

func main() {
	cli, err := client.NewClient(
		client.WithRetryConfig(
			retry.WithXxx(), // 设置配置的方式
		),
	)
}
```

| 配置名称            | 类型                                                         | 说明                                                         |
| :------------------ | :----------------------------------------------------------- | :----------------------------------------------------------- |
| WithMaxAttemptTimes | uint                                                         | 最大尝试次数，默认1次（即不重试）                            |
| WithInitDelay       | time.Duration                                                | 设置初始延迟时间，默认 1ms                                   |
| WithMaxDelay        | time.Duration                                                | 设置最大延迟时间，默认100ms                                  |
| WithMaxJitter       | time.Duration                                                | 设置最大扰动时间，需要配合RandomDelayPolicy使用，会生成不超过最大扰动时间的随机时间，默认20ms |
| WithDelayPolicy     | type DelayPolicyFunc func(attempts uint, err error, retryConfig *Config) time.Duration | 设置延迟策略，可以使用下面四种的任意结合 FixedDelayPolicy, BackOffDelayPolicy, RandomDelayPolicy,DefaultDelayPolicy（详情见下面表格）默认使用 DefaultDelayPolicy （延迟0直接重试） |

### 延迟策略

```go
cli, err := client.NewClient(
		client.WithRetryConfig(
			...
			retry.WithDelayPolicy(retry.CombineDelay(retry.FixedDelayPolicy, retry.BackOffDelayPolicy, retry.RandomDelayPolicy)),
    		...
		),
	)
```



| 函数名称           | 说明                                                         |
| :----------------- | :----------------------------------------------------------- |
| CombineDelay       | 将下面四种策略进行任意组合，将所选策略计算出的值进行加和     |
| FixedDelayPolicy   | 使用WithInitDelay设置的值，来生成等值的延迟时间              |
| BackOffDelayPolicy | 使用WithInitDelay设置的值，根据当前是第几次重试，指数级生成延迟时间 |
| RandomDelayPolicy  | 使用WithMaxJitter设置的值，生成不超过该值的随机延迟时间      |
| DefaultDelayPolicy | 直接返回0延迟时间，一般单独使用，和其他策略结合没有效果      |

### 完整示例

```Go
package main

import (
	"github.com/cloudwego/hertz/pkg/app/client"
	"github.com/cloudwego/hertz/pkg/app/client/retry"
)
func main() {

	cli, err := client.NewClient(
		client.WithRetryConfig(
			retry.WithMaxAttemptTimes(3), // 最大的尝试次数，包括初始调用
			retry.WithInitDelay(1*time.Millisecond), // 初始延迟
			retry.WithMaxDelay(6*time.Millisecond), // 最大延迟，不管重试多少次，策略如何，都不会超过这个延迟
			retry.WithMaxJitter(2*time.Millisecond), // 延时的最大扰动，结合 RandomDelayPolicy 才会有效果
			/*
			   配置延迟策略，你可以选择下面四种中的任意组合，最后的结果为每种延迟策略的和
			   FixedDelayPolicy 使用 retry.WithInitDelay 所设置的值 ，
			   BackOffDelayPolicy 在 retry.WithInitDelay 所设置的值的基础上随着重试次数的增加，指数倍数增长，
			   RandomDelayPolicy 生成 [0，2*time.Millisecond）的随机数值 ，2*time.Millisecond 为 retry.WithMaxJitter 所设置的值，
			   DefaultDelayPolicy 生成 0 值，如果单独使用则立刻重试，
			   retry.CombineDelay() 将所设置的延迟策略所生成的值加和，最后结果即为当前次重试的延迟时间，
			   第一次调用失败 -> 重试延迟：1 + 1<<1 + rand[0,2)ms -> 第二次调用失败 -> 重试延迟：min(1 + 1<<2 + rand[0,2) , 6)ms -> 第三次调用成功/失败
			*/
			retry.WithDelayPolicy(retry.CombineDelay(retry.FixedDelayPolicy, retry.BackOffDelayPolicy, retry.RandomDelayPolicy)),
		),
	)
}
```



## retry条件配置

如果你想要自定义配置重试发生的条件，你可以使用 client.SetRetryIfFunc() 配置，该函数的参数是一个函数 func(req *protocol.Request, resp *protocol.Response, err error) bool 类型，相关参数包括 hertz 请求中的 req、resp 和 err 字段，你可以通过这些参数，判断这个请求该不该重试。在如下例子中，当请求返回的状态码不是 200 或者调用过程中 err != nil 时我们返回 true，即进行重试。

```Go
cli.SetRetryIfFunc(func(req *protocol.Request, resp *protocol.Response, err error) bool {
   return resp.StatusCode() != 200 || err != nil
})
```

需要注意的是，如果你没有设置 client.SetRetryIfFunc() 。我们将会按照hertz默认的重试发生条件进行判断，即判断是否满足下面的DefaultRetryIf函数并且判断该调用是否是幂等调用（即 [pkg/protocol/http1/client.go::Do()](https://github.com/cloudwego/hertz/blob/develop/pkg/protocol/http1/client.go#L328 ) 和 [pkg/protocol/http1/client.go::doNonNilReqResp()](https://github.com/cloudwego/hertz/blob/develop/pkg/protocol/http1/client.go#L411) 中 canIdempotentRetry 为 true 的[情况](#table1)）

```Go
// DefaultRetryIf Default retry condition, mainly used for idempotent requests.
// If this cannot be satisfied, you can implement your own retry condition.
func DefaultRetryIf(req *protocol.Request, resp *protocol.Response, err error) bool {
   // cannot retry if the request body is not rewindable
   if req.IsBodyStream() {
      return false
   }

   if isIdempotent(req, resp, err) {
      return true
   }
   // Retry non-idempotent requests if the server closes
   // the connection before sending the response.
   //
   // This case is possible if the server closes the idle
   // keep-alive connection on timeout.
   //
   // Apache and nginx usually do this.
   if err == io.EOF {
      return true
   }

   return false
}
func isIdempotent(req *protocol.Request, resp *protocol.Response, err error) bool {
   return req.Header.IsGet() ||
      req.Header.IsHead() ||
      req.Header.IsPut() ||
      req.Header.IsDelete() ||
      req.Header.IsOptions() ||
      req.Header.IsTrace()
}
```



<a id="table1">Table - 1</a> hertz源码 [doNonNilReqResp()](https://github.com/cloudwego/hertz/blob/develop/pkg/protocol/http1/client.go#L411) 中 canIdempotentRetry 为 true 的情况

| doNonNilReqResp() 返回 true 的情况                           |
| ------------------------------------------------------------ |
| err = conn.SetWriteDeadline(currentTime.Add(c.WriteTimeout)) |
| err = reqI.Write(req, zw)                                    |
| err = reqI.ProxyWrite(req, zw)                               |
| err = zw.Flush()                                             |
| err = conn.SetReadTimeout(c.ReadTimeout)                     |
| ( err = respI.ReadHeaderAndLimitBody() \|\| err = respI.ReadBodyStream() ) && (err != errs.ErrBodyTooLarge) |