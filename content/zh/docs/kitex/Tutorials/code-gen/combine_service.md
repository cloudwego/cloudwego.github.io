---
title: "Combine Service [已弃用]"
date: 2022-06-02
weight: 2
description: >
---

> **本功能仅支持 Thrift 场景**

**Combine Service 已经被弃用了。请尝试使用 [单 Server 多 Service](https://www.cloudwego.io/zh/docs/kitex/tutorials/advanced-feature/multi_service/) 功能。**

**只有当服务端使用 Combine Service 时，客户端才能利用 Combine Service。因此，如果客户端不知道服务端是否注册了 Combine Service，可能会出现“unknown service”等问题。[单 Server 多 Service](https://www.cloudwego.io/zh/docs/kitex/tutorials/advanced-feature/multi_service/) 功能不依赖于服务端是否使用 Combine Service。**

## 使用场景

有些服务提供了几十个方法，而对于调用方可能只请求其中一两个方法，为了避免这种大型 Service 带来的庞大的生成代码，Combine Service 可以让用户将原来一个 Service 的几十个方法拆分成多个 Service。比如原来的 Service 是：

```thrift
service ExampleService {
    ExampleResponse Method0(3: ExampleRequest req)
    ExampleResponse Method1(3: ExampleRequest req)
    ExampleResponse Method2(3: ExampleRequest req)
}
```

用户 IDL 定义可以拆分为三个 Service：

```thrift
service ExampleService0 {
    ExampleResponse Method0(3: ExampleRequest req)
}

service ExampleService1 {
    ExampleResponse Method1(3: ExampleRequest req)
}

service ExampleService2 {
    ExampleResponse Method2(3: ExampleRequest req)
}
```

调用方可以只保留其中一个 Service 生成代码，方法名和参数保持一致不影响 RPC 调用。

## 具体描述

当 root thrift 文件中存在形如下述定义时：

```thrift
service ExampleService0 {
    ExampleResponse Method0(3: ExampleRequest req)
}

service ExampleService1 {
    ExampleResponse Method1(3: ExampleRequest req)
}

service ExampleService2 {
    ExampleResponse Method2(3: ExampleRequest req)
}
```

带上`--combine-service` 参数后，会生成一个名为 CombineService 的新 service 及其对应的 client/server 代码。
其定义为：

```thrift
service CombineService {
    ExampleResponse Method0(3: ExampleRequest req)
    ExampleResponse Method1(3: ExampleRequest req)
    ExampleResponse Method2(3: ExampleRequest req)
}
```

当同时使用了`-service` 参数时，会使用 CombineService 作为 main package 中 server 对应的 service 。
注意： CombineService 只是 method 的聚合，因此当 method 名冲突时将无法生成 CombineService 。

Tips：

配合 `extends` 关键字，可以实现跨文件的 CombineService

如：

```
service ExampleService0 extends thriftA.Service0 {
}

service ExampleService1 extends thriftB.Service1 {
}

service ExampleService2 extends thriftC.Service2 {
}
```

## 使用示例

本功能只支持 Thrift 场景。例如目前有三个 Service 需要合并，编写 Thrift IDL 文件 `demo.thrift` 如下：

```Thrift
namespace go api

struct ExampleRequest {
	1: string message
}

struct ExampleResponse {
	1: string message
}

service ExampleService0 {
    ExampleResponse Method0(1: ExampleRequest req)
}

service ExampleService1 {
    ExampleResponse Method1(1: ExampleRequest req)
}

service ExampleService2 {
    ExampleResponse Method2(1: ExampleRequest req)
}
```

执行如下命令，添加 `--combine-service` 进行合并服务的代码生成：

```
kitex --combine-service -service demo.kitex.combine demo.thrift
```

得到的生成内容如下：

```
├── kitex_gen
    └── api
        ├── combineservice
        │   ├── client.go
        │   ├── combineservice.go
        │   ├── invoker.go
        │   └── server.go
        ├── demo.go
        ├── exampleservice0
        │   ├── client.go
        │   ├── exampleservice0.go
        │   ├── invoker.go
        │   └── server.go
        ├── exampleservice1
        │   ├── client.go
        │   ├── exampleservice1.go
        │   ├── invoker.go
        │   └── server.go
        ├── exampleservice2
        │   ├── client.go
        │   ├── exampleservice2.go
        │   ├── invoker.go
        │   └── server.go
        ├── k-consts.go
        └── k-demo.go
```

其中，`exampleservice0`，`exampleservice1`，`exampleservice2` 都是正常生成的代码

而 `combineservice` 则为 `--combine-service` 生成的合并服务的代码，其中各个方法都是对另外的 Service 进行的聚合，可以通过这个 Service 进行统一的使用。

所以在服务端启动时，只需要运行这个合并服务的 Service，就可以将所有的方法一起运行：

```go
func main() {
	svr := api.NewServer(new(combineservice.CombineService))

	err := svr.Run()
	if err != nil {
		log.Println(err.Error())
	}
}
```
