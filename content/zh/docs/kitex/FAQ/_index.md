---
title: "FAQ"
linkTitle: "FAQ"
date: 2021-10-9
weight: 5
keywords: ["Kitex", "HTTP", "Windows", "Thrift", "Q&A"]
description: "Kitex 常见问题解答。"
---

## Kitex 框架

**Q1: 支持 Windows 吗？**
* Kitex 在 v0.4.0 版本已支持在 Windows 环境下编译运行了。但代码生成工具暂未支持 Windows 环境。

**Q2: 是否支持 HTTP？**
* 目前 Kitex 没有支持 HTTP 请求，如果是 API 网关场景，针对 Thrift 提供了 [HTTP 映射的泛化调用](https://www.cloudwego.io/zh/docs/kitex/tutorials/advanced-feature/generic-call/)，Kitex 会将 HTTP 请求做 Thrift 编码发给服务端。
* HTTP 可以使用 CloudWeGo 开源的 HTTP 框架 [Hertz](https://www.cloudwego.io/zh/docs/hertz/)。

**Q3: 如何配置开启连接多路复用？**
* 如果使用 Thrift 或 Kitex Protobuf ，开启连接多路复用：服务端配置 WithMuxTransport()，调用端配置 WithMuxConnection(1)。
* 如果使用 gRPC， 默认是连接多路复用。

**Q4: 本地直连场景下，配置长连接池为什么没有生效？**
* 本地测试 ip 需要改成 127.0.0.1，如 client.WithHostPorts("127.0.0.1:8888")。

**Q5: Kitex Protobuf 和 gRPC 协议区别**
* Kitex Protobuf 是 Kitex 自定义的 Protobuf 消息协议，协议格式类似 Thrift。
* gRPC 是对 gRPC 消息协议的支持，可以与 gRPC 框架互通。

**Q6: 出现 Thrift 接口编译问题，如 not enough arguments in call to iprot.ReadStructBegin**
* Kitex 依赖 Thrift v0.13，因为Apache Thrift v0.14 接口有 breaking change，无法直接升级。出现该问题是拉到了新版本的 Thrift，升级版本时建议不使用 -u 参数，可以执行命令固定版本 go mod edit -replace github.com/apache/thrift=github.com/apache/thrift@v0.13.0

## Kitex 代码生成工具

**Q1: 安装代码生成工具，出现了 'not enough arguments' 问题**
* 请开启go mod：GO111MODULE=on go get github.com/cloudwego/kitex/tool/cmd/kitex@latest

**Q2: 为什么 IDL 里的 set 生成了 slice?**
* Apache Thrift 官方从 JSON 序列化的角度考虑，v0.11.0 开始，[将 set 的生成类型从 map 改为了 slice](https://issues.apache.org/jira/browse/THRIFT-4011)，Kitex 从兼容性角度考虑，对齐了该行为。

**Q3: 为什么有些字段名字后面多了条下划线?**
* Thrift 的官方实现为了避免命名冲突，限制了以「Result」和「Args」结尾的标识符。 官方 Thrift 的冲突规避策略：当 Thrift 文件中的类型名、Service 名和方法名，以 New 开头 或者 以 Result 或者 以 Args 结尾时，Thrift 会自动在名字末尾添加下划线。参考 https://jira.apache.org/jira/browse/THRIFT-4410，Kitex 使用了 Thriftgo 进行代码生成，Thriftgo 为了尽可能和官方实现保持一致，采取了类似的策略。

**Q4: 新增接口重新生成代码，是否会覆盖handler.go**
* kitex_gen/ 下的生成代码会重新生成覆盖，但服务端的 handler.go 不会覆盖，只会新增对应方法。

**Q5: 请问目前代码生成工具中的模板是否支持用户自定义?**
* 目前没有支持自定义模板的打算，因为传参设计会复杂很多。现在的插件机制完全可以实现任意等价的功能

**Q6: 代码生成工具中的 –type 是否可以通过 IDL 文件扩展名自动确定？**
* Kitex 在 v0.4.0 版本已支持根据文件后缀生成代码，无需再添加 -type 参数。
