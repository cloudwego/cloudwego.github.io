---
title: "api.none 注解说明"
date: 2023-04-23
weight: 5
keywords: ["api.none", "thrift", "protobuf"]
description: "hz 提供的 api.none 注解说明。"
---

## 介绍

hz 生成的代码会自动为结构体添加 go tag，从而方便进行参数绑定。
而用户结构体的中某些"域"可能不想参与参数绑定或者序列化过程，因此我们提供了 "api.none" 注解，
使得生成的结构体的"域"的 go tag 为 "-"，从而避免参与参数绑定。

## thrift

定义:

```
struct HelloReq{
  1: string Hertz (api.none="true");
}
```

生成内容:

```go
type HelloReq struct {
	Hertz string `thrift:"Hertz,1" form:"-" json:"-" query:"-"`
}
```

## protobuf

定义:

```
message HelloReq {
  optional string Hertz = 1 [(api.none) = "true"];
}
```

生成内容:

```go
type HelloReq struct {
	state         protoimpl.MessageState
	sizeCache     protoimpl.SizeCache
	unknownFields protoimpl.UnknownFields

	Hertz *string `protobuf:"bytes,1,opt,name=Hertz" json:"-" form:"-" query:"-"`
}
```
