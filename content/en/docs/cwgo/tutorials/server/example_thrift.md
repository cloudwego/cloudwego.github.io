---
title: "thrift usage"
linkTitle: "thrift usage"
weight: 2
description: >
---

## RPC Server

### Write IDL

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

### Execute Command

> Note: If the project is located outside of GOPATH, gomod must be specified. GOPATH defaults to a path relative to GOPATH as the name, and gomod may not be specified.

```sh
cwgo server  --type RPC  --idl hello.thrift  --server_name hellotest --module {{your_module_name}}
```

### Generate Code

The directory structure of the generated code and the meanings of each file are shown in [Layout](/docs/cwgo/tutorials/layout/).

## HTTP Server

### Write IDL

Write a simple IDL for generating HTTP Server, which requires adding `api.$method` and `api.base_domain` annotations are used to fill in `uri` and `host`, please refer to them for details [Hertz IDL Annotation Description](/docs/hertz/tutorials/toolkit/annotation/).

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

### Execute Command

> Note: If the project is located outside of GOPATH, gomod must be specified. GOPATH defaults to a path relative to GOPATH as the name, and gomod may not be specified.

```sh
cwgo server  --type HTTP  --idl hello.thrift  --server_name hellotest --module {{your_module_name}}
```

### Generate Code

The directory structure of the generated code and the meanings of each file are shown in [Layout](/docs/cwgo/tutorials/layout/).
