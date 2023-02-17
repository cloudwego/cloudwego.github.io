---
title: "Client"
linkTitle: "Client"
weight: 3
description: >

---

# Client
cwgo 工具支持通过 IDL 生成 HTTP Client 或 RPC Client 的调用代码，方便用户开发。

# 基础命令

使用 ` cwgo client -h  `查看生成 client 代码的帮助命令。

```sh
$ cwgo client -h
NAME:
   cwgo client - generate RPC or HTTP client

                 Examples:
                   # Generate RPR client code
                   cwgo client --type RPC --idl  {{path/to/IDL_file.thrift}} --service {{svc_name}}

                   # Generate HTTP client code
                   cwgo client --type HTTP --idl  {{path/to/IDL_file.thrift}} --service {{svc_name}}


USAGE:
   cwgo client [command options] [arguments...]

OPTIONS:
   --service value                                                              Specify the service name.
   --type value                                                                 Specify the generate type. (RPC or HTTP) (default: "RPC")
   --module value, --mod value                                                  Specify the Go module name to generate go.mod.
   --idl value                                                                  Specify the IDL file path. (.thrift or .proto)
   --out_dir value, -o value                                                    Specify the output path. (default: biz/http)
   --registry value                                                             Specify the registry, default is None
   --proto_search_path value, -I value [ --proto_search_path value, -I value ]  Add an IDL search path for includes. (Valid only if idl is protobuf)
   --pass value [ --pass value ]                                                pass param to hz or kitex
   --help, -h                                                                   show help (default: false)
```

## 详细参数

```
--service    指定服务名称
--type       指定生成类型，支持参数 RPC、HTTP
--module     指定生成 module 名称
--idl        指定 IDL 文件路径
--out_dir    指定输出路径
--registry   指定服务注册组件，目前仅对 RPC 类型有用, 支持参数 ZK、NACOS、ETCD、POLARIS
--proto_search_path 添加 IDL 搜索路径，只对 pb 生效
--pass value 传递给 hz 和 kitex 的参数
```

# RPC Client

## 编写 IDL

```go
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

## 命令

```sh
cwgo client  --type RPC  --idl hello.thrift  --service hellotest
```

## 生成代码

```
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




# HTTP Client

## 编写 IDL

编写一个简单的 IDL 用于生成 HTTP Client，需要添加 `api.$method` 与 `api.base_domain` 用于填充 `uri` 与`host`。

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

## 命令

执行如下基础命令生成客户端

```sh
cwgo client  --type HTTP  --idl hello.thrift  --service hellotest
```

## 生成代码

`hello_service.go` 中提供了一个默认 client 实现 ，用户可以直接使用它。如果有自定义配置需求，则可以使用 `hertz_client.go` 中提供的 `options` 用于自定义复杂配置的Client。

```
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
