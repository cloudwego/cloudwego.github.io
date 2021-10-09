---
title: "FAQ"
linkTitle: "FAQ"
date: 2021-10-9
weight: 5
description: >
---

这里列出与 Kitex 有关的常见问题。

## Kitex 框架

**Q: 支持 Windows 吗？**
* 暂时没有针对 Windows 做支持，如果本地开发环境是 Windows 建议使用 [WSL2](https://docs.microsoft.com/zh-cn/windows/wsl/install)。

**Q: 是否支持 HTTP？**
* Kitex 不专门提供 HTTP 请求支持，CloudWeGo 后续会开源 HTTP 框架 Hertz，预计开源时间是 2022 上半年。
* 如果是 API 网关场景，针对 Thrift 提供了 [HTTP 映射的泛化调用](https://www.cloudwego.io/zh/docs/tutorials/advanced-feature/generic_call/)，Kitex 会将 HTTP 请求做 Thrift 编码发给服务端。

**Q: 如何配置开启连接多路复用？**  
* 如果使用 Thrift 或 Kitex Protobuf ，开启连接多路复用：服务端配置 WithMuxTransport()，调用端配置 WithMuxConnection(1)。
* 如果使用 gRPC， 默认是连接多路复用。

**Q: 本地直连场景下，配置长连接池为什么没有生效？**  
* 本地测试 ip 需要改成 127.0.0.1，如 client.WithHostPorts("127.0.0.1:8888")。

**Q: Kitex Protobuf 和 gRPC 协议区别**  
* Kitex Protobuf 是 Kitex 自定义的 Protobuf 消息协议，协议格式类似 Thrift。
* gRPC 是对 gRPC 消息协议的支持，可以与 gRPC 框架互通。

**Q: 出现 Thrift 接口编译问题，如 not enough arguments in call to iprot.ReadStructBegin**  
* Kitex 依赖 Thrift v0.13，因为Apache Thrift v0.14 接口有 breaking change，无法直接升级。出现该问题是拉到了新版本的 Thrift，升级版本时建议不使用 -u 参数，可以执行命令固定版本 go mod edit -replace github.com/apache/thrift=github.com/apache/thrift@v0.13.0

## Kitex 代码生成工具

**Q: 安装代码生成工具，出现了 'not enough arguments' 问题**  
* 请开启go mod：GO111MODULE=on go get github.com/cloudwego/kitex/tool/cmd/kitex@latest

**Q: 新增接口重新生成代码，是否会覆盖handler.go**  
* kitex_gen/ 下的生成代码会重新生成覆盖，但服务端的 handler.go 不会覆盖，只会新增对应方法。



