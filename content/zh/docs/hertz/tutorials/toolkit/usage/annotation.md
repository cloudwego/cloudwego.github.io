---
title: 'IDL 注解说明'
date: 2023-02-21
weight: 6
description: >
---
**支持的 api 注解**

> Field 注解可用于 [参数绑定及校验](https://www.cloudwego.io/zh/docs/hertz/tutorials/basic-feature/binding-and-validate/)
>
> Method 注解可用于生成路由注册相关代码

## 支持的 api 注解

| _Field 注解_                             |                                         |
| ---------------------------------------- | --------------------------------------- |
| 注解                                     | 说明                                    |
| api.raw_body                             | 生成 "raw_body" tag                     |
| api.query                                | 生成 "query" tag                        |
| api.header                               | 生成 "header" tag                       |
| api.cookie                               | 生成 "cookie" tag                       |
| api.body                                 | 生成 "json" tag                         |
| api.path                                 | 生成 "path" tag                         |
| api.form                                 | 生成 "form" tag                         |
| api.go_tag (protobuf)<br>go.tag (thrift) | 透传 go_tag，会生成 go_tag 里定义的内容 |
| api.vd                                   | 生成 "vd" tag                           |

| _Method 注解_ |                         |
| ------------- | ----------------------- |
| 注解          | 说明                    |
| api.get       | 定义 GET 方法及路由     |
| api.post      | 定义 POST 方法及路由    |
| api.put       | 定义 PUT 方法及路由     |
| api.delete    | 定义 DELETE 方法及路由  |
| api.patch     | 定义 PATCH 方法及路由   |
| api.options   | 定义 OPTIONS 方法及路由 |
| api.head      | 定义 HEAD 方法及路由    |
| api.any       | 定义 ANY 方法及路由     |

## 使用方法

### Field 注解

Thrift：

```thrift
struct Demo {
    1: string Demo (api.query="demo", api.path="demo");
    2: string GoTag (go.tag="goTag:"tag"");
    3: string Vd (api.vd="$!='your string'");
}
```

Protobuf:

```protobuf
message Demo {
  string Demo = 1[(api.query)="demo",(api.path)="demo"];
  string GoTag = 2[(api.go_tag)="goTag:"tag""];
  string Vd = 3[(api.vd)="$!='your string'"];
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
