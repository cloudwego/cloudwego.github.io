---
title: "在middleware获取真实的request/response"
date: 2023-09-13
weight: 5
keywords: ["原本request", "原本response", "真实request", "真实response"]
description: ""
---

由于实现需要，endpoint.Endpoint 中传递的 req 和 resp 并不是真正用户所传递的 req 和 resp，而是由 KiteX 包装过一层的一个对象，具体为类似如下的一个结构。
# Thrift

```golang
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

# Protobuf

```golang
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
所以，对于业务方有三种方案获取到真实的 req 和 resp：
1. 如果你能确定调用的具体是哪个方法，用的 req 的类型，可以直接通过类型断言拿到具体的 Args 类型，然后通过 GetReq 方法就能拿到真正的 req；
2. 对于thrift生成代码，通过断言 GetFirstArgument 或者 GetResult，获取到 interface{}，然后进行类型断言成真实的 req 或者 resp（注意：由于返回的 interface{} 包含类型，interface{}判断nil无法拦截req/resp本身为空指针的情况，需判断断言后的req/resp是否为空指针）；
3. 通过反射方法获取真实的请求/响应体，参考代码：

```golang
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

