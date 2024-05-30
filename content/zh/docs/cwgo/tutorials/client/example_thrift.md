---
title: "thrift 使用示例"
linkTitle: "thrift 使用示例"
weight: 2
description: >
---

## RPC Client

### 编写 IDL

```thrift
// hello.thrift
namespace go hello.example

struct HelloReq {
    1: string Name
}

struct HelloResp {
    1: string RespBody;
}

service HelloService {
    HelloResp HelloMethod(1: HelloReq request);
    HelloResp HelloMethod1(1: HelloReq request);
    HelloResp HelloMethod2(1: HelloReq request);
}
```

### 执行命令

> Note: 项目位于非 GOPATH 下必须指定 gomod，GOPATH 下默认以相对于 GOPATH 的路径作为名字，可不指定 gomod。

```sh
cwgo client  --type RPC  --idl hello.thrift  --server_name hellotest --module {{your_module_name}}
```

### 生成代码

```console
├── hello.thrift # IDL 文件
├── kitex_gen    # IDL 内容相关的生成代码
│   └── hello
│       └── example
│           ├── hello.go  # thriftgo 的产物，包含 hello.thrift 定义的内容的 go 代码
│           ├── helloservice
│           │   ├── client.go       # 提供了 NewClient API
│           │   ├── helloservice.go # 提供了 client.go 和 server.go 共用的一些定义
│           │   ├── invoker.go
│           │   └── server.go       # 提供了 NewServer API
│           ├── k-consts.go
│           └── k-hello.go # kitex 在 thriftgo 的产物之外生成的代码
└── rpc
    └── hellotest
        ├── hellotest_client.go   # client 包装代码
        ├── hellotest_default.go  # client 默认实现代码
        └── hellotest_init.go     # client 初始化代码
```

## HTTP Client

### 编写 IDL

编写一个简单的 IDL 用于生成 HTTP Server，需要添加 `api.$method` 与 `api.base_domain` 注解用于填充 `uri` 与 `host`，详见 [Hertz IDL 注解说明](/zh/docs/hertz/tutorials/toolkit/annotation/)。

```thrift
// hello.thrift
namespace go hello.example

struct HelloReq {
    1: string Name (api.query="name");
}

struct HelloResp {
    1: string RespBody;
}


service HelloService {
    HelloResp HelloMethod1(1: HelloReq request) (api.get="/hello1");
    HelloResp HelloMethod2(1: HelloReq request) (api.get="/hello2");
    HelloResp HelloMethod3(1: HelloReq request) (api.get="/hello3");
}(
     api.base_domain="http://127.0.0.1:8888";
 )
```

### 执行命令

> Note: 项目位于非 GOPATH 下必须指定 gomod，GOPATH 下默认以相对于 GOPATH 的路径作为名字，可不指定 gomod。

```sh
cwgo client  --type HTTP  --idl hello.thrift  --server_name hellotest --module {{your_module_name}}
```

### 生成代码

`hello_service.go` 中提供了一个默认 client 实现 ，用户可以直接使用它。如果有自定义配置需求，则可以使用 `hertz_client.go` 中提供的 `options` 用于自定义复杂配置的 Client。

```console
.
├── biz
│   └── http
│       └── hello_service
│           ├── hello_service.go # client 初始化以及调用代码
│           └── hertz_client.go  # client 具体实现代码
├── hello.thrift # IDL 文件
└── hertz_gen    #IDL 内容相关的生成代码
    └── hello
        └── example
            └── hello.go
```

client 默认实现代码

```go
var defaultClient, _ = NewHelloServiceClient("http://127.0.0.1:8888")

func HelloMethod1(context context.Context, req *example.HelloReq, reqOpt ...config.RequestOption) (resp *example.HelloResp, rawResponse *protocol.Response, err error) {
   return defaultClient.HelloMethod1(context, req, reqOpt...)
}

func HelloMethod2(context context.Context, req *example.HelloReq, reqOpt ...config.RequestOption) (resp *example.HelloResp, rawResponse *protocol.Response, err error) {
   return defaultClient.HelloMethod2(context, req, reqOpt...)
}

func HelloMethod3(context context.Context, req *example.HelloReq, reqOpt ...config.RequestOption) (resp *example.HelloResp, rawResponse *protocol.Response, err error) {
   return defaultClient.HelloMethod3(context, req, reqOpt...)
}
```
