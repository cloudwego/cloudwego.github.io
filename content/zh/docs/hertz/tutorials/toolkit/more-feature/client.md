---
title: 'hz client 代码生成'
date: 2023-02-20
weight: 4
description: >
---

## 介绍

基于 IDL 生成类似 RPC 形式的 http 请求一键调用，屏蔽掉创建和初始化 hertz client 的繁琐操作，并且实现和 hz 生成的 server 代码直接互通。

生成代码示例可以参考 [code](https://github.com/cloudwego/hertz-examples/tree/main/hz/hz_client) 。


## 使用说明

```shell
$ hz client -h
NAME:
   hz client - Generate hertz client based on IDL

USAGE:
   hz client [command options] [arguments...]

OPTIONS:
   --idl value [ --idl value ]                                        Specify the IDL file path. (.thrift or .proto)
   --module value, --mod value                                        Specify the Go module name to generate go.mod.
   --base_domain value                                                Specify the request domain.
   --model_dir value                                                  Specify the model path.
   --client_dir value                                                 Specify the client path. If not specified, IDL generated path is used for 'client' command; no client code is generated for 'new' command
   --proto_path value, -I value [ --proto_path value, -I value ]      Add an IDL search path for includes. (Valid only if idl is protobuf)
   --thriftgo value, -t value [ --thriftgo value, -t value ]          Specify arguments for the thriftgo. ({flag}={value})
   --protoc value, -p value [ --protoc value, -p value ]              Specify arguments for the protoc. ({flag}={value})
   --no_recurse                                                       Generate master model only. (default: false)
   --json_enumstr                                                     Use string instead of num for json enums when idl is thrift. (default: false)
   --unset_omitempty                                                  Remove 'omitempty' tag for generated struct. (default: false)
   --pb_camel_json_tag                                                Convert Name style for json tag to camel(Only works protobuf). (default: false)
   --snake_tag                                                        Use snake_case style naming for tags. (Only works for 'form', 'query', 'json') (default: false)
   --exclude_file value, -E value [ --exclude_file value, -E value ]  Specify the files that do not need to be updated.
   --protoc-plugins value [ --protoc-plugins value ]                  Specify plugins for the protoc. ({plugin_name}:{options}:{out_dir})
   --thrift-plugins value [ --thrift-plugins value ]                  Specify plugins for the thriftgo. ({plugin_name}:{options})
   --help, -h                                                         show help (default: false)
```


在生成代码的时候，只要使用以下五个选项即可:
- idl： 指定 idl 路径
- module： 指定项目的 go module，如果不指定则默认为相对于 "go path" 的路径
- model_dir： 指定项目生成的 model 路径，默认为 "biz/model"
- client_dir： 指定生成 client 桩代码的路径，默认为 "biz/model/{Namespace}"
- base_domain： 指定要访问的 domain，可以是 域名、 IP:PORT、service name(配合服务发现)，也可以在 IDL 中通过注解声明



```shell
hz client --idl=../idl/psm.thrift --model_dir=hertz_gen -t=template=slim --client_dir=hz_client
```


## 示例

### 基于 thrift IDL 生成 client

#### 定义 IDL

>IDL 的定义和语义与目前的定义完全相同，所以基本不用修改原先的 IDL 即可生成 client 代码
>但是为针对 client 的场景，增加了两种注解
>api.file_name： 指定文件
>api.base_domain： 指定默认访问的请求 domain

```thrift
namespace go toutiao.middleware.hertz_client

struct FormReq {
    1: string FormValue (api.form="form1"); // form 注解用来声明 form 参数("multipart/form-data")
    2: string FileValue (api.file_name="file1"); // file_name 用来声明要上传文件的 key，其实际的值为文件名
}

struct QueryReq {
    1: string QueryValue (api.query="query1"); // query 注解用来声明请求的 query 参数
}

struct PathReq {
    1: string PathValue (api.path="path1"); // path 注解用来声明url中的路由参数
}

struct BodyReq {
    1: string BodyValue (api.body="body"); // body 注解不管是否声明都将整个结构体以 json 的形式设置到 body
    2: string QueryValue (api.query="query2");
}

struct Resp {
    1: string Resp;
}

service HelloService {
    // api.post 用来声明请求的路由
    Resp FormMethod(1: FormReq request) (api.post="/form", api.handler_path="post");
    Resp QueryMethod(1: QueryReq request) (api.get="/query", api.handler_path="get");
    Resp PathMethod(1: PathReq request) (api.post="/path:path1", api.handler_path="post");
    Resp BodyMethod(1: BodyReq request) (api.post="/body", api.handler_path="post");
}(
    // api.base_domain 用来指定默认的 client 请求的 domain
    api.base_domain="http://127.0.0.1:8888";
)
```

#### 生成 client 代码

```shell
hz client --mod=a/b/c --idl=../idl/psm.thrift --model_dir=model --client_dir=hertz_client -t=template=slim
```

## 高级设置

### 请求级别的配置
> 以 thrift IDL 生成的代码为例

```go
func main() {
	generatedClient, err := hello_service.NewHelloServiceClient(
		"http://toutiao.hertz.testa", // 指定 psm 作为域名 
		)
	// 在发起调用的时候可指定请求级别的配置
    resp, rawResp, err := generatedClient.QueryMethod(
        context.Background(),
        QueryReq,
        config.WithSD(true), // 指定请求级别的设置，用来开启服务发现
        config.WithReadTimeout(), // 指定请求读超时
        )
    if err != nil {
       fmt.Println(err)
       return
    }
}
```

### 设置 client 中间件
> 以 thrift IDL 生成的代码为例

```go
func main() {
	generatedClient, err := hello_service.NewHelloServiceClient(
		"http://toutiao.hertz.testa", // 指定 psm 作为域名 
		hello_service.WithHertzClientMiddleware(), // 指定 client 的中间件 
		)
}
```

### 设置全局 header
>以 thrift IDL 生成的代码为例

有一些通用的 header 可能每次请求都需要携带，或者是一些不能定义到 IDL 中的 header，这时我们就可以通过 "WithHeader" 注入这些 header，使得每次发送请求都会携带这些header。
```go
func main() {
	generatedClient, err := hello_service.NewHelloServiceClient(
		"http://toutiao.hertz.testa", // 指定 psm 作为域名 
		hello_service.WithHeader(), // 指定每次发送请求都需要携带的header 
	)
}
```

### 配置 TLS
> 以 thrift IDL 生成的代码为例

Hertz client 的 TLS 走的是标准网络库，因此在使用生成的一键调用时需要配置为了标准网络库
```go
func main() {
	generatedClient, err := hello_service.NewHelloServiceClient("https://www.example.com"), 
	hello_service.WithHertzClientOption(
		client.WithDialer(standard.NewDialer()), // 使用标准库 
		client.WithTLSConfig(clientCfg), // TLS 配置 
		), 
	)
}
```
