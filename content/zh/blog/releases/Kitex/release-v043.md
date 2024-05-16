---
title: "Kitex v0.4.3 版本发布"
linkTitle: "Release v0.4.3"
projects: ["Kitex"]
date: 2022-11-02
description: >
---

## 重要变更介绍

### 功能

1. **扩展 client/server 生成模板** ：新增 client/server 模板扩展功能，可以通过配置定制，适用于统一定制 suite 场景，详见[扩展 Service 代码生成模板](/zh/docs/kitex/tutorials/code-gen/template_extension/)。
2. **业务异常** ：新增业务自定义异常支持，可区分于 RPC 异常返回 error，使用详见[业务异常](/zh/docs/kitex/tutorials/basic-feature/bizstatuserr/)，背景详见[Proposal](https://github.com/cloudwego/kitex/issues/511)。
3. **请求 Profiler** ：新增功能可用于为不同的 RPC 请求提供成本分析统计的能力。
4. **Context Middleware** : 新增 Context Middleware，用于请求粒度添加 Middleware。

### 优化

1. **Frugal 性能优化** ：支持在创建 Client/Server 阶段进行 Frugal “预编译”，减少动态编译对延迟的影响。
2. **连接池优化** ：重构连接池，完善空闲连接清理能力。

---

## 详细变更

### Feature

- [[#691](https://github.com/cloudwego/kitex/pull/691)] feat(client): 为 Client 添加上下文中间件，用于请求粒度添加中间件。
- [[#649](https://github.com/cloudwego/kitex/pull/649)] feat(connpool): 长连接池的新实现，支持最小空闲连接数及空闲连接清理。
- [[#672](https://github.com/cloudwego/kitex/pull/672)] feat(grpc): 为 kitex grpc 添加了元信息传递相关 api，包括 header，tailer，以及 peer 远端地址的获取接口。
- [[#613](https://github.com/cloudwego/kitex/pull/613)] feat(exception): 支持用户自定义异常用以区分 RPC 异常。
- [[#670](https://github.com/cloudwego/kitex/pull/670)] feat(exception): 支持 DetailError 格式化。
- [[#678](https://github.com/cloudwego/kitex/pull/678)] feat(tool): 为 kitex cmd 添加 git 和 record 参数。
- [[#662](https://github.com/cloudwego/kitex/pull/662)] feat(tool): 支持在创建 client 或者 server 的时候进行 frugal “预编译” (pretouch)。
- [[#657](https://github.com/cloudwego/kitex/pull/657)] feat(tool): 支持模板拓展。
- [[#527](https://github.com/cloudwego/kitex/pull/527)] feat(profiler): 为不同的 RPC 请求提供成本分析统计的能力。

### Optimize

- [[#690](https://github.com/cloudwego/kitex/pull/690)] optimize(meta): 移除 #503 添加 default metahandler 的错误逻辑。
- [[#638](https://github.com/cloudwego/kitex/pull/638)] optimize(generic): httppb 泛化支持 map/list 元素类型为 struct。
- [[#641](https://github.com/cloudwego/kitex/pull/641)] optimize(tool): 给 oneway 方法增加警告注释。

### Fix

- [[#611](https://github.com/cloudwego/kitex/pull/611)] fix(client): 在频繁重复创建 Client 场景下，修复由于 finalizer 未触发执行导致的资源泄漏。
- [[#698](https://github.com/cloudwego/kitex/pull/698)] fix(connpool): 根据 Get 返回的连接数减少值来调整 globalIdle。
- [[#636](https://github.com/cloudwego/kitex/pull/636)] fix(connpool): 修复当连接池在 `ForwardProxy` 实现中被重置后，连接池的 CloseCallback、统计上报失效的问题。
- [[#647](https://github.com/cloudwego/kitex/pull/647)] fix(grpc): 修复 grpc 连接级别窗口初始化时没有通知对端的问题，并同步了 grpc pr #5459。
- [[#639](https://github.com/cloudwego/kitex/pull/639)] fix(generic): 泛化调用支持 list<byte> 类型，map 读泛化增加 forJSON 选项。
- [[#655](https://github.com/cloudwego/kitex/pull/655)] fix(generic): 数值型常量作为泛化默认值时无法被正确解析。
- [[#654](https://github.com/cloudwego/kitex/pull/654)] fix(frugal): 修复较低版本 go 编译失败的问题。
- [[#682](https://github.com/cloudwego/kitex/pull/682)] fix(profiler): 修复 profiler 停止 pprof profile 采集的问题。
- [[#637](https://github.com/cloudwego/kitex/pull/637)] fix(tool): 修复 handler.go 模板里的 imports。
- [[#630](https://github.com/cloudwego/kitex/pull/630)] fix(tool): 对于没有声明 “service” 的 pb 文件，去掉生成文件末尾冗余的 kitex 声明。
- [[#627](https://github.com/cloudwego/kitex/pull/627)] fix(tool): 修复当一个 import 拥有不同的别名时 import 会丢失的问题。

### Refactor

- [[#651](https://github.com/cloudwego/kitex/pull/651)] refactor(server): 重构 server trans handler 的 read/write 接口，返回新的 context。

### Docs

- [[#656](https://github.com/cloudwego/kitex/pull/656)] docs: 删除 CONTRIBUTING 文档中的错误信息。
- [[#683](https://github.com/cloudwego/kitex/pull/683)] docs(kerrors): 修改了 kerrors WithCauseAndExtraMsg 方法注释。
- [[#625](https://github.com/cloudwego/kitex/pull/625)] chore: 修正 pull request 模板的语法问题。
- [[#623](https://github.com/cloudwego/kitex/pull/623)] chore: 修改 pull request 模板。

### Test & CI

- [[#646](https://github.com/cloudwego/kitex/pull/646)] test: 修复 InitRPCInfoFunc 未设置 rpcinfo 导致的单测失败。
- [[#680](https://github.com/cloudwego/kitex/pull/680)] test: 修复重试单测的 race 问题。
- [[#661](https://github.com/cloudwego/kitex/pull/661)] test: 增强 wpool 测试稳定性。
- [[#643](https://github.com/cloudwego/kitex/pull/643)] test: 为 detection server handler 添加测试。
- [[#632](https://github.com/cloudwego/kitex/pull/632)] test: 用 gomock 自动生成类替换手动编写的 mock 类。
- [[#697](https://github.com/cloudwego/kitex/pull/697)] chore(ci): 固定 skywalking-eyes 版本号。
- [[#652](https://github.com/cloudwego/kitex/pull/652)] chore(ci): 删除重复的测试，以减少单测所花费的时间。
- [[#588](https://github.com/cloudwego/kitex/pull/588)] chore(ci): 支持 codecov。
