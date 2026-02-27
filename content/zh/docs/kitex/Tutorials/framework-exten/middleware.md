---
title: "Middleware 扩展"
date: 2021-08-26
weight: 1
description: >
---

## Middleware

middleware 是一种比较 low level 的扩展方式，大部分基于 Kitex 的扩展和二次开发的功能都是基于 middleware 来实现的。
Kitex 的中间件定义在 `pkg/endpoint/endpoint.go` 中，其中最主要的是两个类型：

1. Endpoint 是一个函数，接受 ctx、req、resp ，返回 err，可参考下文「示例」代码；

2. Middleware（下称 MW ）也是一个函数，接收同时返回一个 Endpoint。

```go
type Middleware func(Endpoint) Endpoint
```

实际上一个中间件就是一个输入是 Endpoint，输出也是 Endpoint 的函数，这样保证了对应用的透明性，应用本身并不会知道是否被中间件装饰的。由于这个特性，中间件可以嵌套使用。

中间件是串连使用的，通过调用传入的 next，可以得到后一个中间件返回的 response（如果有）和 err，据此作出相应处理后，向前一个中间件返回 err（**务必将 err 向上返回** ）或者设置 response。

### 客户端中间件

#### 使用方法

1. `client.WithMiddleware` 在当前 client 中添加一个中间件，在 Service 熔断和超时中间件之后执行。

2. `client.WithInstanceMW` 在当前 client 中添加一个中间件，在服务发现、负载均衡之后执行，如果有实例熔断器，会在实例熔断器后执行（如果使用了 Proxy 则不会调用到，如 Mesh 模式下）。

3. `client.WithContextMiddlewares` 设置上下文中间件，详见下bel文。

4. `client.WithErrorHandler` 设置错误处理中间件。

   > 注意：上述函数都应该在创建 client 时作为传入的 Option。

#### 调用顺序

1. xDS 路由、服务级别熔断、超时

2. `client.WithContextMiddlewares` 设置的中间件

3. `client.WithMiddleware` 设置的中间件，按其在 Option 中的设置顺序执行

4. ACLMiddleware，参见[自定义访问控制](/zh/docs/kitex/tutorials/service-governance/access_control/)

5. 服务发现、实例熔断、实例级 Middleware / 服务发现、代理 Middleware

6. `client.WithErrorHandler` 设置的中间件

以上可以详见 [client.go](https://github.com/cloudwego/kitex/blob/develop/client/client.go)

#### Context 中间件

Context 中间件本质上也是一种客户端中间件，但是区别是，其由 ctx 来控制是否注入以及注入哪些中间件。
Context 中间件的引入是为了提供一种能够全局或者动态注入 Client 中间件的方法，典型的使用场景比如统计某个接口调用了哪些下游。
可以通过 `ctx = client.WithContextMiddlewares(ctx, mw)` 来向 ctx 注入中间件。
注意：Context 中间件会在 `client.WithMiddleware` 设置的中间件之前执行。

### 服务端中间件

#### 使用方法

1. `server.WithMiddleware` 在当前 server 中添加一个中间件。

2. `server.WithErrorHandler` 设置错误处理中间件。

   > 注意：上述函数都应该在创建 server 时作为传入的 Option。

#### 调用顺序

1. `server.WithMiddleware` 设置的中间件，按其在 Option 中的设置顺序执行

2. ACLMiddleware，参见[自定义访问控制](/zh/docs/kitex/tutorials/service-governance/access_control/)

3. `server.WithErrorHandler` 设置的中间件

以上可以详见[server.go](https://github.com/cloudwego/kitex/blob/develop/server/server.go)

### 示例

我们可以通过以下这个例子来看一下如何使用中间件。

#### 获取 Request/Reponse

假如我们现在需要在请求前打印出 request 内容，再请求后打印出 response 内容，可以编写如下的 MW（包含 streaming 调用的服务参见下文 gRPC 中间件）：

```go
/*
type Request struct {
   Message        string            `thrift:"Message,1,required" frugal:"1,required,string" json:"Message"`
   Base           *base.Base        `thrift:"Base,255,optional" frugal:"255,optional,base.Base" json:"Base,omitempty"`
}

type Response struct {
   Message  string         `thrift:"Message,1,required" frugal:"1,required,string" json:"Message"`
   BaseResp *base.BaseResp `thrift:"BaseResp,255,optional" frugal:"255,optional,base.BaseResp" json:"BaseResp,omitempty"`
}
*/
import "github.com/cloudwego/kitex/pkg/utils"

func ExampleMiddleware(next endpoint.Endpoint) endpoint.Endpoint {
	return func(ctx context.Context, request, response interface{}) error {
		if arg, ok := request.(utils.KitexArgs); ok {
      if req := arg.GetFirstArgument().(*echo.Request); req != nil {
				klog.Debugf("Request Message: %v", req.Message)
			}
		}
		err := next(ctx, request, response)
		if result, ok := response.(utils.KitexResult); ok {
			if resp, ok := result.GetResult().(*echo.Response); ok {
				klog.Debugf("Response Message: %v", resp.Message)
				// result.SetSuccess(...) 可以用于替换自定义响应
				// 注意：自定义响应类型应与该 method 的响应类型相同
			}
		}
		return err
	}
}
```

以上方案仅为示例，**慎用于生产**：因为日志输出所有 req/resp 会有性能问题。无视 response 体大小，输出大量日志是一个非常消耗性能的操作，一个特别大的 response 可以是秒级的耗时。

### 注意事项

1. 如果自定义 middleware 中用到了 RPCInfo，注意 RPCInfo 在 rpc 结束之后会被回收。如果在 middleware 中开启 goroutine 操作 RPCInfo 有可能会出现问题，请避免这类操作。
2. Middleware 为链式调用，若在任一 middleware 中使用 `result.SetSuccess()` 或其他方式修改了 response，上游 middleware 会接收到修改后的 response。

### gRPC 中间件

众所周知，kitex 除了 thrift，还支持了 protobuf 和 gRPC 的编解码协议，其中 protobuf 是指只用 protobuf 来定义 payload 格式，并且其 service 定义里的方法只有 unary 方法的情况；一旦引入了 streaming 方法，那么 kitex 会使用 gRPC 协议来做编解码和通信。

使用 protobuf（仅 unary）的服务，其中间件的编写与上文一致，因为两者的设计是完全一样的。

如果使用了 streaming 方法，那么中间件的编写则是完全不同的。因此，这里单独将 gRPC streaming 的中间件的用法说明列为一个单元。

对于 streaming 方法，由于存在 client stream、server stream、bidirectional stream 等形式，并且 message 的收发（Recv & Send）都是有业务逻辑控制的，所以中间件并不能 cover 到 message 本身。因此，假设要在 Message 收发环节实现请求/响应的日志打印，需要对 Kitex 的 `streaming.Stream` 做如下封装：

```go
type wrappedStream struct {
        streaming.Stream
}

func (w *wrappedStream) RecvMsg(m interface{}) error {
        err := w.Stream.RecvMsg(m)
        log.Printf("Receive a message: %T(%v)", m, m)
        return err
}

func (w *wrappedStream) SendMsg(m interface{}) error {
        log.Printf("Send a message: %T(%v)", m, m)
        return w.Stream.SendMsg(m)
}

func newWrappedStream(s streaming.Stream) streaming.Stream {
        return &wrappedStream{s}
}

```

然后，在中间件内在特定调用时机插入封装后的 `streaming.Stream` 对象。

```go
import "github.com/cloudwego/kitex/pkg/streaming"

// 一个能同时适用于客户端和服务端的 kitex gRPC/thrift/ttheader-protobuf 的中间件
func DemoGRPCMiddleware(next endpoint.Endpoint) endpoint.Endpoint {
    return func(ctx context.Context, req, res interface{}) error {

        var Nil interface{} // go 里不能直接 switch nil
        switch Nil {
        case req: // 当前中间件用于客户端，并且是 streaming 方法
            err := next(ctx, req, res)
            // stream 对象要在最终 endpoint return 后才能获取
            if tmp, ok := res.(*streaming.Result); err == nil && ok {
                tmp.Stream = newWrappedStream(tmp.Stream) // 包装 stream 对象
            }
            return err
        case res: // 当前中间件用于服务端，并且是 streaming 方法
            if tmp, ok := req.(*streaming.Args); ok {
                tmp.Stream = newWrappedStream(tmp.Stream) // 包装 stream 对象
            }
        default: // 纯 unary 方法，或 thrift 方法
            // do something else
        }
        return next(ctx, req, res)
    }
}
```

在 Kitex middleware 内获取的 request/response 参数类型在 gRPC 不同场景下的说明：

| 场景                              | Request 类型               | Response 类型                |
| --------------------------------- | -------------------------- | ---------------------------- |
| Kitex-gRPC Server Unary/Streaming | \*streaming.Args           | nil                          |
| Kitex-gRPC Client Unary           | \*xxxservice.XXXMethodArgs | \*xxxservice.XXXMethodResult |
| Kitex-gRPC Client Streaming       | nil                        | \*streaming.Result           |

## 总结

Middleware 是一种比较低层次的扩展的实现，一般用于注入包含特定功能的简单代码。而在复杂场景下，一个 middleware 封装通常无法满足业务需求，这时候需要更完善的套件组装多个 middleware/options 来实现一个完整的中间层，用户可基于 suite 来进行开发，参考[扩展套件Suite](/zh/docs/kitex/tutorials/framework-exten/suite/)

## FAQ

### 如何在 middleware 里 recover handler 排除的 panic

问题：
想在 middleware 里 recover 自己业务的 handler 抛出的 panic，发现 panic 已经被框架 recover 了。

说明：
框架会 recover Handler 内的 panic 并上报。若希望在自定义的 middleware 中捕获 panic，可以在 middleware 内判断返回的 error 的类型（是否为 kerrors.ErrPanic）。

```go
func TestServerMiddleware(next endpoint.Endpoint) endpoint.Endpoint {
   return func(ctx context.Context, req, resp interface{}) (err error) {
      err = next(ctx, req, resp)
      if errors.Is(err, kerrors.ErrPanic) {
         fmt.Println("capture panic")
      }
      return err
   }
}
```

### 如何在中间件获取到真实的 Request / Response

由于实现需要，`endpoint.Endpoint` 中传递的 req 和 resp 并不是真正用户所传递的 req 和 resp，而是由 Kitex 包装过一层的一个对象，具体为类似如下的一个结构。

#### Thrift

```go
// req
type ${XService}${XMethod}Args struct {
    Req *${XRequest} `thrift:"req,1" json:"req"`
}

func (p *${XService}${XMethod}Args) GetFirstArgument() interface{} {
    return p.Req
}


// resp
type ${XService}${XMethod}Result struct {
    Success *${XResponse} `thrift:"success,0" json:"success,omitempty"`
}

func (p *${XService}${XMethod}Result) GetResult() interface{} {
    return p.Success
}
```

#### Protobuf

```go
// req
type ${XMethod}Args struct {
    Req *${XRequest}
}

func (p *${XMethod}Args) GetReq() *${XRequest} {
    if !p.IsSetReq() {
        return ${XMethod}Args_Req_DEFAULT
    }
    return p.Req
}


// resp
type ${XMethod}Result struct {
    Success *${XResponse}
}

func (p *${XMethod}Result) GetSuccess() *${XResponse} {
    if !p.IsSetSuccess() {
        return ${XMethod}Result_Success_DEFAULT
    }
    return p.Success
}
```

以上生成代码可以在 kitex_gen 中看到。
所以，用户有三种方案获取到真实的 req 和 resp：

1. 如果你能确定调用的具体是哪个方法，用的 req 的类型，可以直接通过类型断言拿到具体的 Args 类型，然后通过 GetReq 方法就能拿到真正的 req；
2. 对于 thrift 生成代码，通过断言 `GetFirstArgument` 或者 `GetResult`，获取到 `interface{}`，然后进行类型断言成真实的 req 或者 resp（注意：由于返回的 `interface{}` 包含类型，`interface{}` 判断 nil 无法拦截 req/resp 本身为空指针的情况，需判断断言后的 req/resp 是否为空指针）；
3. 通过反射方法获取真实的请求/响应体，参考代码：

```go
var ExampleMW endpoint.Middleware = func(next endpoint.Endpoint) endpoint.Endpoint {
    return func(ctx context.Context, request, response interface{}) error {
        reqV := reflect.ValueOf(request).MethodByName("GetReq").Call(nil)[0]
        log.Infof(ctx, "request: %T", reqV.Interface())
        err := next(ctx, request, response)
        respV := reflect.ValueOf(response).MethodByName("GetSuccess").Call(nil)[0]
        log.Infof(ctx, "response: %T", respV.Interface())
        return err
    }
}
```
