---
title: "thrift 使用示例"
linkTitle: "thrift 使用示例"
weight: 2
description: >
---

## RPC Server

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
}
```

### 执行命令

> Note: 项目位于非 GOPATH 下必须指定 gomod，GOPATH 下默认以相对于 GOPATH 的路径作为名字，可不指定 gomod。

```sh
cwgo server  --type RPC  --idl hello.thrift  --server_name hellotest --module {{your_module_name}}
```

### 生成代码

生成的代码目录结构及各文件的含义见 [Layout](/zh/docs/cwgo/tutorials/layout/)。

## HTTP Server

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
    HelloResp HelloMethod(1: HelloReq request) (api.get="/hello1");
}(
     api.base_domain="http://127.0.0.1:8888";
 )
```

### 执行命令

> Note: 项目位于非 GOPATH 下必须指定 gomod，GOPATH 下默认以相对于 GOPATH 的路径作为名字，可不指定 gomod。

```sh
cwgo server  --type HTTP  --idl hello.thrift  --server_name hellotest --module {{your_module_name}}
```

### 生成代码

生成的代码目录结构及各文件的含义见 [Layout](/zh/docs/cwgo/tutorials/layout/)。
