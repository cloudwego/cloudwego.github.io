---
title: 'IDL 注解说明'
date: 2023-02-21
weight: 6
keywords: [ "IDL 注解说明", "api 注解", "Field 注解", "Method 注解" ]
description: "hz 提供的 IDL 注解说明。"
---

**支持的 api 注解**

> Field
> 注解可用于 [参数绑定及校验](/zh/docs/hertz/tutorials/basic-feature/binding-and-validate/)
>
> Method 注解可用于生成路由注册相关代码

## 支持的 api 注解

### hz

Field 注解 tag
说明可参考 [支持的-tag](/zh/docs/hertz/tutorials/basic-feature/binding-and-validate/#%E6%94%AF%E6%8C%81%E7%9A%84-tag)。

| _Field 注解_                               |                                                                                          |
|------------------------------------------|------------------------------------------------------------------------------------------|
| 注解                                       | 说明                                                                                       |
| api.raw_body                             | 生成 "raw_body" tag                                                                        |
| api.query                                | 生成 "query" tag                                                                           |
| api.header                               | 生成 "header" tag                                                                          |
| api.cookie                               | 生成 "cookie" tag                                                                          |
| api.body                                 | 生成 "json" tag                                                                            |
| api.path                                 | 生成 "path" tag                                                                            |
| api.form                                 | 生成 "form" tag                                                                            |
| api.go_tag (protobuf)<br>go.tag (thrift) | 透传 go_tag，会生成 go_tag 里定义的内容                                                              |
| api.vd                                   | 生成 "vd" tag                                                                              |
| api.none                                 | 生成 "-" tag，详情参考 [api.none 注解说明](/zh/docs/hertz/tutorials/toolkit/more-feature/api_none/) |

| _Method 注解_ |                  |
|-------------|------------------|
| 注解          | 说明               |
| api.get     | 定义 GET 方法及路由     |
| api.post    | 定义 POST 方法及路由    |
| api.put     | 定义 PUT 方法及路由     |
| api.delete  | 定义 DELETE 方法及路由  |
| api.patch   | 定义 PATCH 方法及路由   |
| api.options | 定义 OPTIONS 方法及路由 |
| api.head    | 定义 HEAD 方法及路由    |
| api.any     | 定义 ANY 方法及路由     |

### hz client

除 [hz](#hz) 提供的注解外，为针对 client 的场景，额外增加了一种注解。

| _Client 注解_     |                  |
|-----------------|------------------|
| 注解              | 说明               |
| api.base_domain | 指定默认访问的请求 domain |

## 使用方法

### Field 注解

Thrift：

```thrift
struct Demo {
    1: string Demo (api.query="demo", api.path="demo");
    2: string GoTag (go.tag="goTag:\"tag\"");
    3: string Vd (api.vd="$!='your string'");
}
```

Protobuf:

```protobuf
message Demo {
    string Demo = 1[(api.query) = "demo", (api.path) = "demo"];
    string GoTag = 2[(api.go_tag) = "goTag:\"tag\""];
    string Vd = 3[(api.vd) = "$!='your string'"];
}
```

### Method 注解

Thrift：

```thrift
service Demo {
    Resp Method(1: Req request) (api.get="/route");
}
```

Protobuf:

```protobuf
service Demo {
    rpc Method(Req) returns(Resp) {
        option (api.get) = "/route";
    }
}
```

### Client 注解

Thrift：

```thrift
struct Demo {
    1: string HeaderValue (api.header="file1");
}

service Demo {
    Resp Method(1: Req request) (api.get="/route");
}(
    api.base_domain="http://127.0.0.1:8888";
)
```

Protobuf:

```protobuf
message Demo {
    string HeaderValue = 1[(api.header) = "file1"];
}

service Demo {
    rpc Method(Req) returns(Resp) {
        option (api.get) = "/route";
    }
    option (api.base_domain) = "http://127.0.0.1:8888";
}
```
