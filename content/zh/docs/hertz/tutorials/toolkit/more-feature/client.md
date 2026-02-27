---
title: "hz client 代码生成"
date: 2023-02-20
weight: 4
keywords: ["hz client", "高级设置"]
description: "hz client 代码生成。"
---

## 介绍

基于 IDL 生成类似 RPC 形式的 http 请求一键调用，屏蔽掉创建和初始化 hertz client 的繁琐操作，并且实现和 hz 生成的 server 代码直接互通。

**该命令需指定 idl，否则不会生成任何内容。**

hz client 命令梳理可以参考 [hz client](/zh/docs/hertz/tutorials/toolkit/command/#client)。

hz client 生成的代码结构可以参考 [hz client](/zh/docs/hertz/tutorials/toolkit/layout/#hz-client)。

生成代码示例可以参考 [code](https://github.com/cloudwego/hertz-examples/tree/main/hz/hz_client) 。

## 示例

本示例基于 thrift 给出，protoc 与之类似。

### 定义 IDL

> IDL 的定义和语义与目前的定义完全相同，所以基本不用修改原先的 IDL 即可生成 client 代码。

> 但是为针对 client 的场景，增加了一种注解，
> api.base_domain：指定默认访问的请求 domain。

**注意**: 当使用 `api.any` 注解时，client 会自动生成 `post` 方法的 client 代码用于替换 `any`。

```thrift
namespace go toutiao.middleware.hertz_client

struct FormReq {
    1: string FormValue (api.form="form1"); // form 注解用来声明 form 参数 ("multipart/form-data")
}

struct QueryReq {
    1: string QueryValue (api.query="query1"); // query 注解用来声明请求的 query 参数
}

struct PathReq {
    1: string PathValue (api.path="path1"); // path 注解用来声明 url 中的路由参数
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

### 生成 client 代码

```shell
hz client --mod=a/b/c --idl=../idl/psm.thrift --model_dir=model --client_dir=hertz_client -t=template=slim
```

## 高级设置

### client 配置

> 以 thrift IDL 生成的代码为例

```go
func main() {
	generatedClient, err := hello_service.NewHelloServiceClient("https://www.example.com"),
	hello_service.WithHertzClientOption() // 指定 client 配置
}
```

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

> 以 thrift IDL 生成的代码为例

有一些通用的 header 可能每次请求都需要携带，或者是一些不能定义到 IDL 中的 header，这时我们就可以通过 "WithHeader" 注入这些 header，使得每次发送请求都会携带这些 header。

```go
func main() {
	generatedClient, err := hello_service.NewHelloServiceClient(
		"http://toutiao.hertz.testa", // 指定 psm 作为域名
		hello_service.WithHeader(), // 指定每次发送请求都需要携带的 header
	)
}
```

### 配置 TLS

> 以 thrift IDL 生成的代码为例

Hertz client 的 TLS 走的是标准网络库，因此在使用生成的一键调用时需要配置为标准网络库。

```go
func main() {
	generatedClient, err := hello_service.NewHelloServiceClient("https://www.example.com"),
	hello_service.WithHertzClientOption(
		client.WithDialer(standard.NewDialer()), // 使用标准库
		client.WithTLSConfig(clientCfg), // TLS 配置
	)
}
```

### 自定义 hertz client

> 以 thrift IDL 生成的代码为例

```go
func main() {
	generatedClient, err := hello_service.NewHelloServiceClient("https://www.example.com"),
	hello_service.WithHertzClient() // 指定自定义 hertz client
}
```
