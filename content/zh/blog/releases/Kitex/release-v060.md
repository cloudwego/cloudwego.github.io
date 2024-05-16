---
title: "Kitex v0.6.0 版本发布"
linkTitle: "Release v0.6.0"
projects: ["Kitex"]
date: 2023-06-14
description: >
---

## 重要变更介绍

### 功能

**1. GRPC 元信息传递**

client 默认将 header 设置到 ctx，外部方法可利用 `GetHeaderMetadataFromCtx` 获取元信息。可用于 transmeta 内获取元信息并设置到 rpcinfo 中，或在中间件内获取 header 信息。

**2. Kitex 配置模块重构**

增加重试、熔断、超时、限流的 config item，支持 [configmanager](https://github.com/cloudwego/configmanager) 中间件定义的接口，用于支持与外部配置中心的扩展集成。

**3. Kitex - 工具**

- 支持在 thrift 生成代码中插入对象深拷贝函数，用于深拷贝源对象到目标对象，使用方式为 kitex 命令增加 `-deep-copy-api` 参数；
- 支持在 thrift 生成代码中插入 IDL 描述符注册代码，用于在运行时加载对应生成代码后，注册 IDL 描述符信息到 `github.com/cloudwego/kitex/pkg/reflection/thrift` 包内，并通过暴露的函数获取描述符信息，使用方式为在 kitex 命令 `thrift` 参数添加 `generate-reflection-info=true` ，如 `kitex -thrift generate-reflection-info=true ...` ；Kitex 在 v1.12.0 只支持了 IDL 描述符信息注册，更丰富的查询接口将在后续版本进行发布，同时 IDL 描述符注册函数生成也将修改为默认生成。

### 优化

**1. 重构 detection server 支持多种协议的探测**

旧版本 detection server 写死了 http2 作为探测协议，v1.12.0 版本支持用户传入实现了 `detection.DetectableServerTransHandler` 接口的 `remote.ServerTransHandler` 对应的 `remote.ServerTransHandlerFactory` 作为不定参数，配合默认的`remote.ServerTransHandler`处理未匹配的协议，实现多种协议兼容的Kitex Server。

**2. 一致性 hash**

一致性hash负载均衡中 `buildVirtualNodes` 使用 `virtualFactorLen` 初始化 `bytes` 数组， 空间可能不足容纳下 `VirtualNodeLen` 编号，导致 `address` 部分被覆盖。

**3. 长连接池埋点**

修复长连接池复用连接成功时打点未上报问题。

### 其他

升级 netpoll 库依赖至 v0.4.0 ，同时支持 [configmanager](https://github.com/cloudwego/configmanager) v0.2.0 版本。

---

## 详细变更

## Feature:

- [[#923](https://github.com/cloudwego/kitex/pull/923)] feat(grpc): grpc 客户端将 header 和 trailer 设置到 context 内，并提供接口从 context 获取 header
- [[#891](https://github.com/cloudwego/kitex/pull/891)] feat: 支持 rpc client 和 server 的服务合并，它可以将远端 rpc 调用改成本地的函数级调用。这个特性需要生成工具支持
- [[#946](https://github.com/cloudwego/kitex/pull/946)] feat: default server handler 支持通过trans pipeline执行Read函数
- [[#936](https://github.com/cloudwego/kitex/pull/936)] feat(config): 增加 重试、熔断、超时、限流 的 config item
- [[#924](https://github.com/cloudwego/kitex/pull/924)] [[#939](https://github.com/cloudwego/kitex/pull/939)] feat(code_gen): 支持生成深拷贝API代码功能
- [[#926](https://github.com/cloudwego/kitex/pull/926)] feat: 支持thrift反射信息注册
- [[#897](https://github.com/cloudwego/kitex/pull/897)] feat: 自定义模板中支持 loop_service

## Optimize:

- [[#961](https://github.com/cloudwego/kitex/pull/961)] optimize(tool): -use 参数支持自定义模板场景
- [[#966](https://github.com/cloudwego/kitex/pull/966)] optimize(ttheader): ttheader 的 headerFlags 处理增加类型检查
- [[#919](https://github.com/cloudwego/kitex/pull/919)] optimize: 使用 GoFunc 替代 go func 以避免 panic
- [[#960](https://github.com/cloudwego/kitex/pull/960)] optimize: 公开stats包以便在扩展仓库中重用
- [[#955](https://github.com/cloudwego/kitex/pull/955)] optimize: 移除 gonet transerver 中多余的 onRead 错误日志
- [[#954](https://github.com/cloudwego/kitex/pull/954)] optimize: 当 transHandler 没有实现 GracefulShutdown 接口时，不返回报错
- [[#941](https://github.com/cloudwego/kitex/pull/941)] optimize(callopt): 优化 callopt 的 debug 信息，减少 slice 扩张的可能性

## Fix:

- [[#963](https://github.com/cloudwego/kitex/pull/963)] fix(generic): 修复 map 泛化调用在 byte 类型字段 panic 的问题
- [[#901](https://github.com/cloudwego/kitex/pull/901)] fix(mux): 多路复用连接的 asynccallback 不创建新 goroutine，并且 server 等待所有 crrst 包都被 client 接收后再关闭
- [[#921](https://github.com/cloudwego/kitex/pull/921)] fix(loadbalance): 修复一致性 hash []byte 数组长度不够用的问题
- [[#922](https://github.com/cloudwego/kitex/pull/922)] fix(mux): 修复当开启 mux 并且使用 Kitex Protobuf 时，在退出时输出不合理的 error 问题
- [[#927](https://github.com/cloudwego/kitex/pull/927)] fix(connpool): 长连接池复用连接成功时进行上报

## Refactor:

- [[#958](https://github.com/cloudwego/kitex/pull/958)] refactor(errorHandler): 重构 error handler 定义，可以获取更新信息处理 error
- [[#943](https://github.com/cloudwego/kitex/pull/943)] refactor(client): 重构 client.Call 提升代码可读性
- [[#560](https://github.com/cloudwego/kitex/pull/560)] refactor: 重构server detection trans handler以支持多种协议的探测

## Tests:

- [[#900](https://github.com/cloudwego/kitex/pull/900)] test(generic): 添加使用 dynamicgo 的 thrift 反射泛化调用示例

## Chore:

- [[#976](https://github.com/cloudwego/kitex/pull/976)] chore: 更新 netpoll 版本到 v0.4.0 并且更新 thriftgo 版本到 v0.2.11
- [[#956](https://github.com/cloudwego/kitex/pull/956)] chore: 更新 configmanager 版本到 v0.2.0
- [[#948](https://github.com/cloudwego/kitex/pull/948)] chore: 使用 goimports -local github.com/cloudwego/kitex 调整仓库格式
