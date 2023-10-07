---
title: "Get the real Request/Response in Middleware"
date: 2023-09-13
weight: 5
keywords: ["real request", "real response"]
description: ""
---

Due to implementation needs, the req and resp passed in middlewares are not the req and resp passed by the real user, but an object wrapped by Kitex, specifically a structure similar to the following.
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

The above generated code can be seen in kitex_gen directory.
Therefore, there are three solutions for the business side to obtain the real req and resp:
1. If you can determine which method is being called and the type of req used, you can directly obtain the specific Args type through type assertion, and then obtain the real req through the GetReq method.
2. For thrift generated code, by asserting GetFirstArgument or GetResult , obtain interface{}, and then do type assertion to the real req or resp (Note: Since the returned interface{} contains a type, judging interface{} nil cannot intercept the case where req/resp itself is a null pointer, so we need to judge whether the asserted req/resp is a null pointer again);
3. Obtain the real request/response body through reflection method, refer to the code:

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

