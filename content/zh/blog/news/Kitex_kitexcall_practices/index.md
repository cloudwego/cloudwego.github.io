---
date: 2024-05-31
title: "kitexcall：用 JSON 发起 RPC 请求的命令行神器"
projects: ["Kitex"]
linkTitle: "kitexcall：用 JSON 发起 RPC 请求的命令行神器"
keywords: ["Kitex", "CloudWeGo", "云原生", "开源", "Golang", "kitexcall", "RPC", "命令行"]
description: "本文介绍了通过 kitexcall 命令行工具实现给 Kitex 服务发送 RPC 请求及其原理"
author: <a href="https://github.com/Zzhiter" target="_blank">张哲</a>
---

## 背景

Kitex 是字节跳动基础架构服务框架团队推出的 Go 微服务 RPC 框架，支持 Thrift、Kitex Protobuf、gRPC 等消息协议，具有高性能、强可扩展的特点。Kitex 于 2021 年 9 月正式开源后，已在多家外部企业成功落地，为他们带来了真实的成本、性能和稳定性收益。
然而，对于开发者来说，有一个痛点是，为了验证 Server 端代码，发起 RPC 测试请求的流程比较繁琐。

## 痛点

给 Kitex 服务发送 RPC 测试请求的过程通常包括：
1. 生成客户端代码：根据 IDL 文件生成 Kitex Client 相关代码。
2. 构造测试请求：构建请求、调用方法、处理响应。
3. 配置多种选项：设置传输协议、元信息、异常处理等。
这一过程不仅耗时，且在频繁测试时，每次都需修改和编译代码，效率较低。一个能简化这些步骤、快速发送 RPC 请求的工具，将大幅提升开发效率。

## kitexcall 介绍

> 详情可以参考：https://github.com/kitex-contrib/kitexcall

为了简化开发者的工作，社区推出了 kitexcall 这个命令行工具，基于 Kitex 提供的 JSON 泛化调用，极大地简化了 Kitex 客户端的编写过程。开发者只需通过简单的命令行操作，就可以轻松发起 Kitex 请求，而不再需要编写繁琐的代码。

kitexcall 目前已发布 v0.1.1 版本，具备以下功能特点：
- 支持 Thrift/Protobuf：可以处理 Thrift 和 Protobuf 格式的 IDL。
- 支持多种传输协议：包括 Buffered、TTHeader、Framed、TTHeaderFramed，未来还将支持 gRPC。
- 灵活的客户端选项：支持指定常用的客户端选项，如 `client.WithHostPorts`。
- 多种数据输入方式：请求数据可以从命令行参数或本地文件读取。
- 元信息传递：支持单跳透传和持续透传的元信息，并接收服务器返回的反向透传元信息。
- 业务异常处理：接收并处理业务自定义的异常错误码和信息。
- 多种输出格式：默认输出人类友好的可读格式，未来将支持可解析的格式，便于与其他自动化工具集成。
下面，我们通过一个简单的例子，展示如何使用 kitexcall 发起一个 Kitex 请求。

## 使用示例
首先安装 kitexcall 命令行工具：
```go
go install github.com/kitex-contrib/kitexcall@latest
```

以  [kitex-examples](https://github.com/cloudwego/kitex-examples) 的 Echo 服务为例，将其 IDL 文件保存为 echo.thrift。

```go
namespace go api
struct Request {
    1: string message
}
struct Response {
    1: string message
}
service Echo {
    Response Echo(1: Request req)
}
```

为方便测试，你可以用如下步骤在本机启动这个 Echo 服务（默认监听 8888 端口）：

```go
$ git clone https://github.com/cloudwego/kitex-examples.git
$ cd kitex-examples/basic/server/
$ go run .
[Info] KITEX: server listen at addr=[::]:8888
```

使用 kitexcall 发起请求非常简单，只要在命令行中指定 IDL 文件、方法名称、请求报文（JSON 格式）和 Server 地址即可：

```go
kitexcall -idl-path echo.thrift -m echo -d '{"message": "hello"}' -e 127.0.0.1:8888
```

然后就可以看到 kitexcall 输出服务端返回的响应报文：

```go
[Status]: Success
{
    "message": "hello"
}
```

如果你希望从文件中读入请求数据，也可以先创建请求数据文件 input.json：

```go
{"message": "hello"}
```

并在 kitexcall 的参数中用 -f 参数指定文件名：

```go
kitexcall -idl-path echo.thrift -m echo -f input.json -e 127.0.0.1:8888
```

## 原理简介
kitexcall 工具基于 Kitex 提供的 JSON 泛化调用实现。其原理简单介绍如下：

1. Descriptor Provider

kitexcall 使用 Kitex 提供的 DescriptorProvider 接口来解析 Thrift 或 Protobuf 的 IDL 文件，获取服务定义。

2. 泛化对象创建

解析 IDL 文件后，kitexcall 创建泛化对象（如 JSONThriftGeneric 或 JSONPbGeneric），将 JSON 数据转换为内部请求格式，并将响应数据转换回 JSON 格式。

3. 客户端初始化

kitexcall 使用泛化对象和客户端选项（如传输协议、元信息处理等）来创建泛化客户端。该客户端可以调用 IDL 文件中定义的任何服务方法。

4. 请求构建与发送

kitexcall 从命令行输入或文件中读取 JSON 格式的请求数据，构建请求对象并发送请求，同时设置传输协议和元信息。

5. 响应处理
接收到响应后，kitexcall 将其格式化为 JSON 并输出。如果启用了元信息回传机制，还会输出从服务端返回的元信息。

## 未来展望
kitexcall 作为一个社区驱动的项目，致力于简化开发者使用 Kitex 进行 RPC 调用的过程。未来，我们计划在以下几个方面进行改进和扩展：
1. 计划支持 gRPC（含基于 gRPC/HTTP2 的 Thrift Streaming）协议，以适应更多的使用场景。

2. 支持通过服务发现获取 Kitex Server 地址。

3. 在 Kitex Server 支持 Reflection 能力之后，kitexcall 将跟进，实现无需 IDL 文件，即可获取服务详情和进行服务调用，使用将会更加便捷。

4. 支持可解析的输出格式（如 JSON），以便与其他自动化工具集成（例如 CI/CD、IDE 插件等场景）。

欢迎对 Kitex 和 kitexcall 感兴趣的开发者加入社区，共同贡献代码和创意。我们相信，在大家的共同努力下，kitexcall 将成为 Kitex 开发者手中的一把利器，让微服务开发变得更加高效和便捷。访问 [kitexcall](https://github.com/kitex-contrib/kitexcall) 了解更多信息，并加入我们吧！

### 项目地址
GitHub：https://github.com/cloudwego
