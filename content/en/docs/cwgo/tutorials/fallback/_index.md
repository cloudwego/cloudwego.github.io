---
title: "Fallback"
linkTitle: "Fallback"
weight: 9
description: >
---

The cwgo tool supports fallback function, which can be either Kitex or Hz.

## Fallback to Kitex

```sh
cwgo fallback kitex [global options] command [command options] [arguments...]
```

### Example

- Create hello.thrift

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

- Execute Command

```sh
cwgo fallback kitex -module {your_module_name} hello.thrift
```

Kitex specific command reference [document](/docs/kitex/tutorials/code-gen/code_generation/)

## Fallback to Hz

```sh
cwgo fallback hz [global options] command [command options] [arguments...]
```

### Example

- Create hello.thrift

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

- Execute Command

```sh
cwgo fallback hz new -module {your_module_name} -idl hello.thrift
```

Hz specific command reference [document](/docs/hertz/tutorials/toolkit/command/)
