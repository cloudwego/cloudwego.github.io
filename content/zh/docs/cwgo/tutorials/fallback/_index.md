---
title: "Fallback"
linkTitle: "Fallback"
weight: 9
description: >
---

cwgo 工具支持回退功能，回退为 Kitex 或 Hz。

## 回退为 Kitex

```sh
cwgo fallback kitex [global options] command [command options] [arguments...]
```

### 示例

- 创建 hello.thrift

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

- 执行命令

```sh
cwgo fallback kitex -module {your_module_name} hello.thrift
```

Kitex 具体命令参考[文档](/zh/docs/kitex/tutorials/code-gen/code_generation/)

## 回退为 Hz

```sh
cwgo fallback hz [global options] command [command options] [arguments...]
```

### 示例

- 创建 hello.thrift

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

- 执行命令

```sh
cwgo fallback hz new -module {your_module_name} -idl hello.thrift
```

Hz 具体命令参考[文档](/zh/docs/hertz/tutorials/toolkit/command/)
