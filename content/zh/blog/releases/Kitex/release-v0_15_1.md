---
title: "Kitex Release v0.15.1"
linkTitle: "Release v0.15.1"
projects: ["Kitex"]
date: 2025-09-29
description: >
---

## **重要变更介绍**

### **公告**
1. **Go 版本支持变化**：Kitex 最低声明 Go 版本调整至 Go1.20，并支持至 Go1.25
   - 暂时不影响 Go v1.18/v1.19 编译，但声明到高版本后，后续版本会引入高版本特性

### **新特性**
1. **泛化调用：全新 v2 API 支持 multi services 和流式调用**

   Thrift 二进制泛化调用 API 提供 v2 版本，支持 multi services 和 streaming 调用，详细用法见[泛化调用使用指南](/zh/docs/kitex/tutorials/advanced-feature/generic-call/basic_usage)

2. **泛化调用：支持 unknown service handler**

   便于快速开发 streaming proxy，详见[Proxy 应用开发指南](/zh/docs/kitex/tutorials/advanced-feature/proxy_application_development)

3. **泛化调用：支持服务端 json/map 流式泛化调用**

   详见：[泛化调用使用指南](/zh/docs/kitex/tutorials/advanced-feature/generic-call/basic_usage)

4. **TTHeader Streaming：支持 ctx cancel 控制流生命周期**

   - 快速结束流式调用，节省模型资源
   - 对齐 gPRC，详细用法见[流生命周期控制最佳实践](/zh/docs/kitex/tutorials/basic-feature/streamx/StreamX_Lifecycle_Control)
   - 支持 Client 主动调用 cancel 结束流式调用
   - 支持 Client 感知所处 Handler 的 ctx cancel 信号，级联结束流式调用

5. **流式错误处理优化**

   - 快速对应具体错误场景，加速级联 cancel 链路问题排查，详情见[流错误处理最佳实践](/zh/docs/kitex/tutorials/basic-feature/streamx/StreamX_Error_Handling)
   - 级联 cancel 场景，错误描述包含完整 cancel 链路，快速定位主动 cancel 的第一跳服务
   - 错误描述包含具体的错误场景，以及与之唯一对应的错误码
   - 统一方便的 cancel 错误处理方式，无需使用繁琐的字符串匹配

### **功能/体验优化**
1. **泛化 Client：优化后台 goroutine 启动逻辑**

   从 Kitex v0.13.0 开始，一个泛化 Client 同时支持 Ping-Pong 和流式调用，并默认使用 TTHeader Streaming 协议，每个泛化 Client 都会自动开启一个后台 goroutine 用于清理 TTHeader Streaming 的空闲连接。

   若用户之前使用泛化 Client 的姿势不当(例如每次请求都创建一个泛化 Client)，升级到 Kitex v0.13.x 后会导致大量后台 goroutine 被创建，产生 goroutine 泄漏的现象，但实际上没使用流式泛化。

   v0.15.1 版本只有在真正使用到流式泛化时才会创建后台 goroutine。

### **代码生成工具 Kitex Tool**
1. **严格的枚举值检查**

   针对 Thrift IDL 定义枚举值溢出的场景，增加了严格的生成检查，详见[Kitex Tool 检查枚举类型说明](/zh/docs/kitex/tutorials/code-gen/idl_enumeration_type)

   该变更会导致部分产物生成失败，因为正确性已经存在问题，对服务风险较大！

### **特殊变更 - 少数服务可能会有影响**
> 对 99.9% 用户无影响的接口 Breaking Change

Kitex 会保证内部用户正常使用方式的兼容性。但个别用户可能对 Kitex 仓库的定义有依赖，Kitex 本次版本调整对这部分用户有影响。

本版本对 `remote.Message`、`rpcinfo.RPCInfo` 或 `generic.Generic` 接口非普通使用方式做了微调，如果有特殊的使用需要调整至符合新版本的接口定义。

## **详细变更**

### Feature
* feat(ttstream): support ctx cancel and detailed canceled error by @DMwangnima in [#1821](https://github.com/cloudwego/kitex/pull/1821) | [#1859](https://github.com/cloudwego/kitex/pull/1859) | [#1856](https://github.com/cloudwego/kitex/pull/1856)
> 特性：TTStream 支持上下文取消及详细的取消错误信息
* feat(generic): support new thrift binary generic call api, server streaming generic call and unknown service or method handler by @jayantxie in [#1837](https://github.com/cloudwego/kitex/pull/1837) | [#1857](https://github.com/cloudwego/kitex/pull/1857)
> 特性：支持新的 thrift 二进制泛化调用 api，服务端流式泛化调用和 unknown service or method handler
* feat(grpc): support dump MaxConcurrentStreams of HTTP2 Client by @DMwangnima in [#1820](https://github.com/cloudwego/kitex/pull/1820)
> 特性：gRPC 支持导出 HTTP2 客户端的 MaxConcurrentStreams 配置

### Fix
* fix(retry): shallow copy response to avoid data race by @jayantxie in [#1799](https://github.com/cloudwego/kitex/pull/1799) | [#1814](https://github.com/cloudwego/kitex/pull/1814)
> 修复：浅拷贝 response 以避免数据竞争
* fix(lbcache): check the existence before new Balancer to prevent leakage by @ppzqh in [#1825](https://github.com/cloudwego/kitex/pull/1825)
> 修复：负载均衡器缓存中创建新均衡器前检查存在性以防止泄漏
* fix(generic): descriptor.HTTPRequest.GetParam nil pointer exception by @jayantxie in [#1827](https://github.com/cloudwego/kitex/pull/1827)
> 修复：描述符 HTTPRequest.GetParam 的空指针异常
* fix(generic): fix generic write int range check by @HeyJavaBean in [#1861](https://github.com/cloudwego/kitex/pull/1861)
> 修复：泛化写入整数的范围检查
* fix(rpcinfo): protect bizErr and extra field of ri.Invocation by lock by @jayantxie in [#1850](https://github.com/cloudwego/kitex/pull/1850)
> 修复：通过锁保护 ri.Invocation 的 bizErr 和 extra 字段
* fix(timeout): remove timer pool to avoid timer race issue by @jayantxie in [#1858](https://github.com/cloudwego/kitex/pull/1858)
> 修复：移除计时器池以避免计时器竞争问题
* fix(tool): disable fast api for protobuf by @DMwangnima in [#1807](https://github.com/cloudwego/kitex/pull/1807)
> 修复：工具中为 Protobuf 禁用 Fast API
* fix(tool): skip pb code gen for arg -use by @xiaost in [#1819](https://github.com/cloudwego/kitex/pull/1819)
> 修复：工具中为 -use 参数跳过 PB 代码生成

### Optimize
* optimize(grpc): access metadata.MD without ToLower by @xiaost in [#1806](https://github.com/cloudwego/kitex/pull/1806)
> 优化：gRPC 访问 metadata.MD 时不转换为小写
* optimize(ttstream): lazy init cleaning task for ObjectPool to reduce the impact of lots of goroutines caused by creating too many Generic Client by @DMwangnima in [#1842](https://github.com/cloudwego/kitex/pull/1842)
> 优化：对象池延迟初始化清理任务，减少创建过多泛化客户端导致的大量 goroutine 影响
* optimize(tool): remove string deepcopy because the string type is read-only in Go by @jayantxie in [#1832](https://github.com/cloudwego/kitex/pull/1832)
> 优化：移除字符串深拷贝，因为 Go 中字符串类型是只读的

### Refactor
* refactor(ttstream): remove ttstream provider by @jayantxie in [#1805](https://github.com/cloudwego/kitex/pull/1805)
> 重构：移除 TTStream provider 接口
* refactor(rpcinfo): move service/method info from message to rpcinfo, remove protocol info from message and update min go version to 1.20 by @jayantxie in [#1818](https://github.com/cloudwego/kitex/pull/1818) | [#1855](https://github.com/cloudwego/kitex/pull/1855)
> 重构：将服务/方法信息从消息移至 rpcinfo，从消息中移除协议信息，并更新最低 Go 版本至 1.20
* refactor(server): remove service middleware and SupportedTransportsFunc api by @jayantxie in [#1839](https://github.com/cloudwego/kitex/pull/1839)
> 重构：移除服务中间件和 SupportedTransportsFunc API
* refactor(server): remove useless TargetSvcInfo field by @jayantxie in [#1840](https://github.com/cloudwego/kitex/pull/1840)
> 重构：移除无用的 TargetSvcInfo 字段

### Chore
* chore: update dependencies of kitex to support go 1.25 and new features by @jayantxie @AsterDY in [#1848](https://github.com/cloudwego/kitex/pull/1848) | [#1834](https://github.com/cloudwego/kitex/pull/1834) | [#1862](https://github.com/cloudwego/kitex/pull/1862) | [#1836](https://github.com/cloudwego/kitex/pull/1836)
>  chore：更新 kitex 依赖项以支持 go1.25 和新特性
* chore: update version v0.15.0 by @jayantxie in [#1864](https://github.com/cloudwego/kitex/pull/1864)
>  chore：更新版本至 v0.15.0
* docs: fix broken link to blogs by @scientiacoder in [#1813](https://github.com/cloudwego/kitex/pull/1813)
>  chore：修复博客的损坏链接
* chore: support custom ctx key to pass to downstream in Service-Inline by @Duslia in [#1709](https://github.com/cloudwego/kitex/pull/1709)
> 特性：在合并编译场景中支持传递自定义上下文 key 到下游
