---
title: "Kitex v0.4.0 版本发布"
linkTitle: "Release v0.4.0"
projects: ["Kitex"]
date: 2022-08-26
description: >
---

## 重要变更介绍

### 功能

1. **重试功能增强**：支持自定义结果重试；支持请求粒度配置重试，详见 [重试指南](/zh/docs/kitex/tutorials/service-governance/retry/)
2. **Frugal(thrift)**: 支持了 IDL 默认值；使用 Frugal 可以支持不生成编解码代码，详见 [frugal](/zh/docs/kitex/tutorials/advanced-feature/codec_frugal/#2-带上--thrift-frugal_tag-参数重新生成一次代码)
3. **Tool-Protobuf**：结合 go_package 配置支持依赖外部库，详见 [protobuf IDL 的注意事项](/zh/docs/kitex/tutorials/code-gen/code_generation/#使用-protobuf-idl-的注意事项)；支持从文件扩展名猜测 IDL 的类型，生成 proto 代码时无需再指定 type 参数
4. **Fastpb(protobuf)**: 支持 fastpb 优化 pb 编解码，并默认集成到 Kitex，详见 [fastpb](/zh/docs/kitex/tutorials/code-gen/fastpb/)
5. **泛化调用**：支持 HTTP+Protobuf 泛化调用
6. **Kitex 依赖库支持 Windows**：便于 Windows 环境运行（工具暂未支持）

### 优化和修复

1. **性能优化**：gRPC Unary 吞吐提升 46-70%，相比官方 gRPC 吞吐高 51%-70%，详见 [benchmark ](https://github.com/cloudwego/kitex-benchmark)
2. **泛化调用**：HTTP / Map / JSON 泛化调用支持了 Thrift 默认值

---

## 详细变更

### Feature

- [[#571](https://github.com/cloudwego/kitex/pull/571)] 功能(protobuf): 默认集成 [fastpb](https://github.com/cloudwego/fastpb) 到 Kitex，详情参考 [doc](/docs/kitex/tutorials/code-gen/fastpb/)。
- [[#592](https://github.com/cloudwego/kitex/pull/592)] 功能(generic): HTTP/Map/JSON 泛化调用支持 Thrift 默认值。
- [[#600](https://github.com/cloudwego/kitex/pull/600)] 功能(thrift): 支持当使用 frugal 时不生成编解码代码。
- [[#607](https://github.com/cloudwego/kitex/pull/607), [#610](https://github.com/cloudwego/kitex/pull/610)] 功能(proxyless): 提供 xDS 扩展的接口。支持基于 xDS 的流量路由，超时配置及服务发现。
- [[#541](https://github.com/cloudwego/kitex/pull/541)] 功能(trans): 传输层增加 go net 作为扩展，并在 Windows OS 下作为默认网络库。
- [[#540](https://github.com/cloudwego/kitex/pull/540)] 功能(retry): Retry 支持指定 error 或 resp 重试，同时新增 option 用来支持为方法设置重试策略。
- [[#533](https://github.com/cloudwego/kitex/pull/533)] 功能(generic): 泛化调用 js_conv 注解支持 map 类型转换。

### Optimize

- [[#522](https://github.com/cloudwego/kitex/pull/522), [#538](https://github.com/cloudwego/kitex/pull/538), [#605](https://github.com/cloudwego/kitex/pull/605)] 优化(grpc): 优化 gRPC 协议性能。
- [[#590](https://github.com/cloudwego/kitex/pull/590)] 优化(tool): 支持从文件扩展名猜测 IDL 的类型。
- [[#559](https://github.com/cloudwego/kitex/pull/559)] 优化(timeout): 在超时中间件中使用超时封装方法判断底层超时，用来忽略一些定制超时错误日志。
- [[#581](https://github.com/cloudwego/kitex/pull/581)] 优化(tool): Kitex 命令增加使用示例。

### Bugfix

- [[#564](https://github.com/cloudwego/kitex/pull/564)] 修复(oneway): 当 oneway 请求发送完毕后，关闭对应的连接，否则后续的发送到该连接上的请求会被阻塞在 server 端，直到 server 端把上一个 oneway 请求处理完。
- [[#577](https://github.com/cloudwego/kitex/pull/577), [#584](https://github.com/cloudwego/kitex/pull/584), [#602](https://github.com/cloudwego/kitex/pull/602)] 修复(rpcinfo): 修复长连接场景下 rpcinfo 复用问题。
- [[#578](https://github.com/cloudwego/kitex/pull/578)] 修复: 修复 long pool dump 可能导致 panic 的问题。
- [[#583](https://github.com/cloudwego/kitex/pull/583)] 修复(tool): 修复 protobuf 生成代码引用了错误的 package 名字的问题
- [[#587](https://github.com/cloudwego/kitex/pull/587)] 修复(tool): 生成代码的时候跳过指定了外部 import path 的 proto 文件。
- [[#594](https://github.com/cloudwego/kitex/pull/594)] 修复(generic): 泛化调用支持单引号中双引号带转义符的 tag 格式以兼容旧版本逻辑。
- [[#595](https://github.com/cloudwego/kitex/pull/595)] 修复: 修复 union 为 nil 时 BLength 会 panic 的问题。
- [[#589](https://github.com/cloudwego/kitex/pull/589), [#596](https://github.com/cloudwego/kitex/pull/596)] 修复(frugal): 修复 frugal build tag。

### Refactor

- [[#566](https://github.com/cloudwego/kitex/pull/566)] refactor(metainfo): 移除 HTTP2 header 中没有使用的 meta keys。
- [[#593](https://github.com/cloudwego/kitex/pull/593)] refactor(trans): 服务端支持通过 WithListener 配置 listener，其优先级高于 WithServiceAddr。
- [[#582](https://github.com/cloudwego/kitex/pull/582)] refactor(tool): kitex 工具以文件嵌入方式使用模板并导出部分 API 供外部使用。

### Test

- [[#579](https://github.com/cloudwego/kitex/pull/579)] test: 长连接池 dump 增加单测。
- [[#608](https://github.com/cloudwego/kitex/pull/608)] test: 修复 TestClientConnDecoupledFromApplicationRead 的 data race 问题。
- [[#609](https://github.com/cloudwego/kitex/pull/609)] test: 修复 gonet 单测中的端口冲突问题。
- [[#480](https://github.com/cloudwego/kitex/pull/480)] test: 给 client package 增加单测。

### Chore

- [[#558](https://github.com/cloudwego/kitex/pull/558)] ci: 修复 ci 中 setup-python 的问题。
- [[#487](https://github.com/cloudwego/kitex/pull/487)] ci: Workflow 中增加 golangci-lint。
- [[#580](https://github.com/cloudwego/kitex/pull/580)] chore: 修复 remote 模块中 go net 相关的错误拼写。
- [[#601](https://github.com/cloudwego/kitex/pull/601)] chore: 修复错误拼写并替换掉一些功能重复的代码。
- [[#604](https://github.com/cloudwego/kitex/pull/604)] chore: 升级 fastpb 到 v0.0.2。
- [[#603](https://github.com/cloudwego/kitex/pull/603)] chore: 升级 frugal 到 v0.1.2。

### Dependency Change

github.com/cloudwego/frugal v0.1.1 -> v0.1.3

github.com/cloudwego/netpoll v0.2.5 -> v0.2.6

github.com/cloudwego/thriftgo v0.1.2 -> v0.2.0

google.golang.org/protobuf v1.26.0 -> v1.28.0

github.com/choleraehyq/pid v0.0.13 -> v0.0.15

新增

github.com/cloudwego/fastpb v0.0.2

github.com/jhump/protoreflect v1.8.2
