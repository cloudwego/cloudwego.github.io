---
title: "Middleware Extensions"
date: 2021-08-31
weight: 1
description: >
---

## Middleware

Middleware is a relatively low level of extension. Most of the Kitex-based extension and secondary development functions are based on middleware to achieve. Kitex's Middleware is defined in `pkg/endpoint/endpoint.go`, the most important of which are two types:

1. `Endpoint` is a function that accepts ctx, req, resp and returns err. Please refer to the following "Example" code.

2. Middleware (hereinafter referred to as MW) is also a function that receives and returns an Endpoint.

```go
type Middleware func(Endpoint) Endpoint
```

In fact, a middleware is essentially a function that takes an Endpoint as input and returns an Endpoint as output. This ensures transparency to the application, as the application itself is unaware of whether it is being decorated by middleware. Due to this feature, middlewares can be nested and used in combination.

Middlewares are used in a chained manner. By invoking the provided next function, you can obtain the response (if any) and error returned by the subsequent middleware. Based on this, you can perform the necessary processing and return an error to the previous middleware (be sure to check for errors returned by next and avoid swallowing errors) or set the response accordingly.

### Client Middleware

#### How To Use

1. `client.WithMiddleware` adds Middleware to the current client, which is executed after service circuit breaker and timeout Middleware ;

2. `client.WithInstanceMW` adds middleware to the current client, which is executed after service discovery and load balance. If there is an instance circuit breaker, it will be executed after the instance circuit breaker (if Proxy is used, it will not be called, such as in Mesh mode).

3. `client.WithContextMiddlewares` set context middlewares, see bellow for the detail.

4. `client.WithErrorHandler` set the error handler middleware.

   > Note: the above functions should all be passed as options when creating the client.

#### Call Sequence

1. XDS routing, service level circuit breaker, timeout

2. Middlewares set by `client.WithContextMiddlewares`

3. Middlewares set by `client.WithMiddleware`

4. ACLMiddleware, see [Customized Access Control](/docs/kitex/tutorials/service-governance/access_control/)

5. Service Discovery , Instance circuit breaker , Instance-Level Middleware/Service Discovery, Proxy Middleware

6. Error handler set by `client.WithErrorHandler`

The above can be seen in [client.go](https://github.com/cloudwego/kitex/blob/develop/client/client.go)

#### Context Middleware

Context Middleware is essentially Client Middleware, but the difference is that it is controlled by ctx whether and which to inject middleware.
The introduction of Context Middleware is to provide a method that can inject Client Middleware globally or dynamically. Typical usage scenarios include statistics on which downstream interfaces are called.
Middleware can be injected into ctx using `ctx = client.WithContextMiddlewares(ctx, mw)`.
Note: Context Middleware executes before middleware set by `client.WithMiddleware()`.

### Server Middleware

#### How To Use

1. `server.WithMiddleware` adds Middleware to the current server.

2. `server.WithErrorHandler` set the error handler middleware.

   > Note: the above functions should all be passed as options when creating the server.

#### Call Sequence

1. Middleware set by `server.WithMiddleware`

2. ACLMiddleware, see [Customized Access Control](/docs/kitex/tutorials/service-governance/access_control/)

3. Error handler set by `client.WithErrorHandler`

The above can be seen in [server.go](https://github.com/cloudwego/kitex/blob/develop/server/server.go)

### Example

We can use the following example to see how to use Middleware.

#### Request/Reponse

If we need to print out the request content before the request, and then print out the response content after the request, we can write the following middleware (For the service which include streaming call, see the gRPC middleware below):

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
			if req := arg.GetFirstArgument().(*echo.Request; req != nil {
				klog.Debugf("Request Message: %v", req.Message)
			}
		}
		err := next(ctx, request, response)
		if result, ok := response.(utils.KitexResult); ok {
			if resp, ok := result.GetResult().(*echo.Response); ok {
				klog.Debugf("Response Message: %v", resp.Message)
                // resp.SetSuccess(...) could be used to replace customized response
				// But notice: the type should be the same with the response of this method
			}
		}
		return err
	}
}
```

The provided example is for illustrative purposes, and it is indeed important to exercise caution when implementing such logging practices in a production environment. Logging every request and response indiscriminately can indeed have performance implications, especially when dealing with large response bodies.

### Precautions

1. If RPCInfo is used in custom middleware, be aware that RPCInfo will be recycled after the rpc ends, so if you use goroutine operation RPCInfo in middleware, there will be issues . Please avoid such operations .
2. Middleware is a chained call, if you use `result. SetSuccess()` or some other way to modify the response in any middleware, the upstream middlewares will receive the modified response.

### gRPC Middleware

As we all know, in addition to Thrift, Kitex also supports the protobuf and gRPC encoding/decoding protocols. In the case of protobuf, it refers to using protobuf exclusively to define the payload format, and the service definition only includes unary methods. However, if streaming methods are introduced, Kitex will use the gRPC protocol for encoding/decoding and communication.

For services using protobuf (unary only), the development of middleware remains consistent with the previous context, as the design of both is identical.

However, if streaming methods are used, the development of middleware is completely different. Therefore, the usage of gRPC streaming middleware is explained separately as a standalone unit.

For streaming methods, such as client stream, server stream, bidirectional stream, etc., and considering that the sending and receiving of messages (Recv & Send) have their own business logic control, middleware can not cover the messages themselves. Therefore, if you want to implement request/response logging at the message level during Send/Recv operations, you need to wrap Kitex's streaming.Stream as follows:

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

Then, within the middleware, insert the wrapped streaming.Stream object at specific invocation points.

```go
import "github.com/cloudwego/kitex/pkg/streaming"

// A middleware that can be used for both client-side and server-side in Kitex with gRPC/Thrift/TTheader-protobuf
func DemoGRPCMiddleware(next endpoint.Endpoint) endpoint.Endpoint {
    return func(ctx context.Context, req, res interface{}) error {

        var Nil interface{} // can not switch nil directly in go
        switch Nil {
        case req: // The current middleware is used for the client-side and specifically designed for streaming methods
            err := next(ctx, req, res)
            // The stream object can only be obtained after the final endpoint returns
            if tmp, ok := res.(*streaming.Result); err == nil && ok {
                tmp.Stream = newWrappedStream(tmp.Stream) // wrap stream object
            }
            return err
        case res: // The current middleware is used for the server-side and specifically designed for streaming methods
            if tmp, ok := req.(*streaming.Args); ok {
                tmp.Stream = newWrappedStream(tmp.Stream) // wrap stream object
            }
        default: // pure unary method, or thrift method
            // do something else
        }
        return next(ctx, req, res)
    }
}
```

Explanation of the request/response parameter types obtained within the Kitex middleware in different scenarios of gRPC:

| Scenario                          | Request Type               | Response Type                |
| --------------------------------- | -------------------------- | ---------------------------- |
| Kitex-gRPC Server Unary/Streaming | \*streaming.Args           | nil                          |
| Kitex-gRPC Client Unary           | \*xxxservice.XXXMethodArgs | \*xxxservice.XXXMethodResult |
| Kitex-gRPC Client Streaming       | nil                        | \*streaming.Result           |

## Summary

Middleware is indeed a lower-level implementation of extensions, typically used to inject simple code containing specific functionalities. However, in complex scenarios, single middleware may not be sufficient to meet the business requirements. In such cases, a more comprehensive approach is needed, which involves assembling multiple middlewares or options into a complete middleware layer. Users can develop this requirement based on suites, refer to [Suite Extend](/zh/docs/kitex/tutorials/framework-exten/suite/)

## FAQ

### How to recover handler panic in middleware

Question:
A handler who wanted to recover their own business in middleware threw a panic and found that the panic had already been recovered by the framework.

Description:
The framework will recover and report the panic in Handler. If you want to capture panic in custom middleware, you can determine the type of error returned in middleware (whether it is `kerrors.ErrPanic`).

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

### How to get the real Request/Response in Middleware?

Due to implementation needs, the req and resp passed in middlewares are not the req and resp passed by the real user, but an object wrapped by Kitex, specifically a structure similar to the following.

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

The above generated code can be seen in kitex_gen directory.
Therefore, there are three solutions for the business side to obtain the real req and resp:

1. If you can determine which method is being called and the type of req used, you can directly obtain the specific Args type through type assertion, and then obtain the real req through the GetReq method.
2. For thrift generated code, by asserting `GetFirstArgument` or `GetResult` , obtain `interface{}`, and then do type assertion to the real req or resp (Note: Since the returned `interface{}` contains a type, judging `interface{}` nil cannot intercept the case where req/resp itself is a null pointer, so we need to judge whether the asserted req/resp is a null pointer again);
3. Obtain the real request/response body through reflection method, refer to the code:

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
